/**
 * Delete Template rows with "rishav" in name and submissions whose SGHA Details line contains "test".
 * Usage: node scripts/delete-rishav-and-test-details.js [--dry-run]
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const sequelize = require("../config/database");

const dryRun = process.argv.includes("--dry-run");

function buildSghaDetailsSummary(fd) {
  if (!fd || typeof fd !== "object") return "—";
  if (typeof fd === "string") {
    try {
      fd = JSON.parse(fd);
    } catch {
      return "—";
    }
  }
  const parts = [];
  if (fd.airport_city || fd.airport_iata || fd.airport_name) {
    const airportBits = [
      fd.airport_city || fd.airport_name,
      fd.airport_iata ? `(${fd.airport_iata})` : null,
    ].filter(Boolean);
    if (airportBits.length) parts.push(airportBits.join(" "));
  }
  if (fd.company_name) parts.push(fd.company_name);
  if (fd.contact_person) parts.push(`Contact: ${fd.contact_person}`);
  if (fd.applicable_for) parts.push(fd.applicable_for);
  const services = [];
  if (fd.ramp) services.push("Ramp");
  if (fd.comp) services.push("COMP");
  if (fd.cargo) services.push("Cargo");
  if (services.length) parts.push(services.join(", "));
  if (fd.rate) parts.push(`Rate: ${fd.rate}`);
  return parts.length ? parts.join(" · ") : "—";
}

async function deleteSubmissionsByIds(ids, t) {
  const steps = [];
  if (!ids.length) return steps;

  const idList = ids.join(",");
  const tables = [
    ["CommentNotifications", `DELETE FROM CommentNotifications WHERE submission_id IN (${idList})`],
    ["SubmissionComments", `DELETE FROM SubmissionComments WHERE submission_id IN (${idList})`],
    ["CommentSessions", `DELETE FROM CommentSessions WHERE submission_id IN (${idList})`],
    ["SubmissionEditHistory", `DELETE FROM SubmissionEditHistory WHERE submission_id IN (${idList})`],
    ["SubmissionVariables", `DELETE FROM SubmissionVariables WHERE submission_id IN (${idList})`],
    ["Submission", `DELETE FROM Submission WHERE annex_a_submission_id IN (${idList})`],
    ["ClientAnnexASubmission", `DELETE FROM ClientAnnexASubmission WHERE submission_id IN (${idList})`],
  ];

  for (const [name, sql] of tables) {
    if (dryRun) {
      const [[row]] = await sequelize.query(
        sql.replace(/^DELETE FROM (\w+) WHERE/, "SELECT COUNT(*) AS c FROM $1 WHERE"),
        { transaction: t },
      );
      steps.push({ table: name, wouldDelete: Number(row.c) });
    } else {
      const [, meta] = await sequelize.query(sql, { transaction: t });
      steps.push({ table: name, deleted: meta?.affectedRows ?? meta });
    }
  }
  return steps;
}

async function run() {
  await sequelize.authenticate();
  const t = await sequelize.transaction();

  try {
    const [submissions] = await sequelize.query(
      `SELECT submission_id, form_details FROM ClientAnnexASubmission`,
      { transaction: t },
    );

    const submissionIds = [];
    for (const row of submissions) {
      let fd = row.form_details;
      if (typeof fd === "string") {
        try {
          fd = JSON.parse(fd);
        } catch {
          fd = null;
        }
      }
      const summary = buildSghaDetailsSummary(fd);
      if (summary.toLowerCase().includes("test")) {
        submissionIds.push(row.submission_id);
      }
    }

    const [[templateCount]] = await sequelize.query(
      `SELECT COUNT(*) AS c FROM Template
       WHERE template_name IS NOT NULL AND LOWER(template_name) LIKE '%rishav%'`,
      { transaction: t },
    );

    const plan = {
      dryRun,
      submissionIdsToDelete: submissionIds,
      rishavTemplateRows: Number(templateCount.c),
    };

    const steps = await deleteSubmissionsByIds(submissionIds, t);

    if (dryRun) {
      steps.push({ table: "Template", wouldDelete: Number(templateCount.c) });
    } else {
      const [, meta] = await sequelize.query(
        `DELETE FROM Template WHERE template_name IS NOT NULL AND LOWER(template_name) LIKE '%rishav%'`,
        { transaction: t },
      );
      steps.push({ table: "Template", deleted: meta?.affectedRows ?? meta });
    }

    if (dryRun) {
      await t.rollback();
      console.log(JSON.stringify({ plan, steps }, null, 2));
      console.log("\nDry run only. Re-run without --dry-run to delete.");
    } else {
      await t.commit();
      console.log(JSON.stringify({ plan, steps }, null, 2));
      console.log("\nDeleted Rishav templates and test SGHA Details submissions.");
    }
  } catch (e) {
    await t.rollback();
    throw e;
  } finally {
    await sequelize.close();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
