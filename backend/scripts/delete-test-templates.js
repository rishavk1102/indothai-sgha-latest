/**
 * Delete all DB rows tied to "test" templates (case-insensitive name match).
 * Usage: node scripts/delete-test-templates.js [--dry-run]
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const sequelize = require("../config/database");

const dryRun = process.argv.includes("--dry-run");
const LIKE = "%test%";

const submissionFilter = `
  LOWER(JSON_UNQUOTE(JSON_EXTRACT(form_details, '$.template_name'))) LIKE LOWER(:like)
`;

async function countQuery(sql, replacements) {
  const [[row]] = await sequelize.query(sql, { replacements });
  return Number(row?.c ?? 0);
}

async function run() {
  await sequelize.authenticate();
  const t = await sequelize.transaction();

  try {
    const [submissionRows] = await sequelize.query(
      `SELECT submission_id FROM ClientAnnexASubmission WHERE ${submissionFilter}`,
      { replacements: { like: LIKE }, transaction: t },
    );
    const submissionIds = submissionRows.map((r) => r.submission_id);

    const [sghRows] = await sequelize.query(
      `SELECT SGHA_template_id, SGHA_Main_agreement_id, template_name
       FROM SGH_Agreement_Template WHERE LOWER(template_name) LIKE LOWER(:like)`,
      { replacements: { like: LIKE }, transaction: t },
    );
    const mainAgreementIds = [
      ...new Set(
        sghRows.map((r) => r.SGHA_Main_agreement_id).filter((id) => id != null),
      ),
    ];

    const plan = {
      dryRun,
      submissionIds,
      sghAgreementTemplates: sghRows,
      mainAgreementIdsToCheck: mainAgreementIds,
    };

    const steps = [];

    if (submissionIds.length) {
      const idList = submissionIds.join(",");
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
          const c = await countQuery(
            sql.replace(/^DELETE FROM (\w+) WHERE/, "SELECT COUNT(*) AS c FROM $1 WHERE"),
            {},
          );
          steps.push({ table: name, wouldDelete: c });
        } else {
          const [, meta] = await sequelize.query(sql, { transaction: t });
          steps.push({ table: name, deleted: meta?.affectedRows ?? meta });
        }
      }
    }

    const templateCount = await countQuery(
      "SELECT COUNT(*) AS c FROM Template WHERE template_name IS NOT NULL AND LOWER(template_name) LIKE LOWER(:like)",
      { like: LIKE },
    );
    if (dryRun) {
      steps.push({ table: "Template", wouldDelete: templateCount });
    } else {
      const [, meta] = await sequelize.query(
        `DELETE FROM Template WHERE template_name IS NOT NULL AND LOWER(template_name) LIKE LOWER(:like)`,
        { replacements: { like: LIKE }, transaction: t },
      );
      steps.push({ table: "Template", deleted: meta?.affectedRows ?? meta });
    }

    if (sghRows.length) {
      if (dryRun) {
        steps.push({ table: "SGH_Agreement_Template", wouldDelete: sghRows.length });
      } else {
        const [, meta] = await sequelize.query(
          `DELETE FROM SGH_Agreement_Template WHERE LOWER(template_name) LIKE LOWER(:like)`,
          { replacements: { like: LIKE }, transaction: t },
        );
        steps.push({ table: "SGH_Agreement_Template", deleted: meta?.affectedRows ?? meta });
      }
    }

    for (const mainId of mainAgreementIds) {
      const [[stillUsed]] = await sequelize.query(
        `SELECT COUNT(*) AS c FROM SGH_Agreement_Template WHERE SGHA_Main_agreement_id = :id`,
        { replacements: { id: mainId }, transaction: t },
      );
      if (Number(stillUsed.c) > 0) continue;

      const [[mainRow]] = await sequelize.query(
        `SELECT template_name FROM SGHA_Main_agreement WHERE SGHA_Main_agreement_id = :id`,
        { replacements: { id: mainId }, transaction: t },
      );
      const mainName = mainRow?.template_name || "";
      if (!mainName.toLowerCase().includes("test")) continue;

      if (dryRun) {
        steps.push({ table: "SGHA_Main_agreement_section", mainId, wouldDelete: "sections for orphan test main" });
        steps.push({ table: "SGHA_Main_agreement", mainId, wouldDelete: 1 });
      } else {
        await sequelize.query(
          `DELETE FROM SGHA_Main_agreement_section WHERE SGHA_Main_agreement_id = :id`,
          { replacements: { id: mainId }, transaction: t },
        );
        await sequelize.query(
          `DELETE FROM SGHA_Main_agreement WHERE SGHA_Main_agreement_id = :id`,
          { replacements: { id: mainId }, transaction: t },
        );
        steps.push({ table: "SGHA_Main_agreement", mainId, deleted: true });
      }
    }

    if (dryRun) {
      await t.rollback();
      console.log(JSON.stringify({ plan, steps }, null, 2));
      console.log("\nDry run only — no changes committed. Re-run without --dry-run to delete.");
    } else {
      await t.commit();
      console.log(JSON.stringify({ plan: { submissionIds, sghRows }, steps }, null, 2));
      console.log("\nDeleted test-related data.");
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
