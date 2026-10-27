/**
 * List templates with "rishav" in name and submissions whose SGHA Details line contains "test".
 * Usage: node scripts/list-rishav-and-test-details.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const sequelize = require("../config/database");

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

async function main() {
  await sequelize.authenticate();

  const [templateRows] = await sequelize.query(
    `SELECT id, year, template_name, type, updated_at
     FROM Template
     WHERE template_name IS NOT NULL AND LOWER(template_name) LIKE '%rishav%'
     ORDER BY year, template_name, type`,
  );

  const [templateSets] = await sequelize.query(
    `SELECT year, template_name,
            GROUP_CONCAT(DISTINCT type ORDER BY type SEPARATOR ', ') AS parts
     FROM Template
     WHERE template_name IS NOT NULL AND LOWER(template_name) LIKE '%rishav%'
     GROUP BY year, template_name
     ORDER BY year, template_name`,
  );

  const [sghAgreements] = await sequelize.query(
    `SELECT SGHA_template_id AS id, template_name, status, client_id, createdAt
     FROM SGH_Agreement_Template
     WHERE LOWER(template_name) LIKE '%rishav%'
     ORDER BY createdAt DESC`,
  );

  const [submissions] = await sequelize.query(
    `SELECT submission_id, agreement_year, status, client_status, form_details, submission_timestamp
     FROM ClientAnnexASubmission
     ORDER BY submission_timestamp DESC`,
  );

  const rishavSubmissions = [];
  const testDetailsSubmissions = [];

  for (const row of submissions) {
    let fd = row.form_details;
    if (typeof fd === "string") {
      try {
        fd = JSON.parse(fd);
      } catch {
        fd = null;
      }
    }
    const templateName = fd?.template_name ?? "";
    const summary = buildSghaDetailsSummary(fd);

    if (String(templateName).toLowerCase().includes("rishav")) {
      rishavSubmissions.push({
        submission_id: row.submission_id,
        agreement_year: row.agreement_year,
        status: row.status,
        client_status: row.client_status,
        template_name: templateName,
        sgha_details: summary,
        submission_timestamp: row.submission_timestamp,
      });
    }

    if (summary.toLowerCase().includes("test")) {
      testDetailsSubmissions.push({
        submission_id: row.submission_id,
        agreement_year: row.agreement_year,
        status: row.status,
        client_status: row.client_status,
        template_name: templateName || null,
        sgha_details: summary,
        submission_timestamp: row.submission_timestamp,
      });
    }
  }

  const out = {
    database: process.env.DB_NAME,
    generatedAt: new Date().toISOString(),
    templatesWithRishavInName: {
      distinctSets: templateSets,
      allRows: templateRows,
    },
    sentAgreementsWithRishavInName: sghAgreements,
    submissionsWithRishavTemplateName: rishavSubmissions,
    submissionsWithTestInSghaDetailsColumn: testDetailsSubmissions,
  };

  console.log(JSON.stringify(out, null, 2));
  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
