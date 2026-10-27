/**
 * List templates/agreements whose names look like tests (contains "test", case-insensitive).
 * Usage: node scripts/list-test-templates.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const sequelize = require("../config/database");

const LIKE = "%test%";

async function safeQuery(label, sql, replacements = {}) {
  try {
    const [rows] = await sequelize.query(sql, { replacements });
    return { label, rows: rows || [], error: null };
  } catch (e) {
    return { label, rows: [], error: e.message };
  }
}

async function main() {
  await sequelize.authenticate();

  const blocks = await Promise.all([
    safeQuery(
      "Template (year + named SGHA content — employee editor)",
      `SELECT id, year, template_name, type, updated_at
       FROM Template
       WHERE template_name IS NOT NULL
         AND LOWER(template_name) LIKE LOWER(:like)
       ORDER BY year, template_name, type`,
      { like: LIKE },
    ),
    safeQuery(
      "NewSghaTemplate (legacy SGHA content table)",
      `SELECT SGHA_Template_id AS id, template_name, template_year, type, updatedAt
       FROM NewSghaTemplate
       WHERE LOWER(template_name) LIKE LOWER(:like)
       ORDER BY template_year, template_name, type`,
      { like: LIKE },
    ),
    safeQuery(
      "SGH_Agreement_Template (employee → client sent packages)",
      `SELECT SGHA_template_id AS id, template_name, status, client_id, business_id, createdAt
       FROM SGH_Agreement_Template
       WHERE LOWER(template_name) LIKE LOWER(:like)
       ORDER BY createdAt DESC`,
      { like: LIKE },
    ),
    safeQuery(
      "SGHA_Main_agreement (main letter copies)",
      `SELECT SGHA_Main_agreement_id AS id, template_name, createdAt
       FROM SGHA_Main_agreement
       WHERE LOWER(template_name) LIKE LOWER(:like)
       ORDER BY template_name`,
      { like: LIKE },
    ),
    safeQuery(
      "letter_templates",
      `SELECT letter_template_id AS id, template_name, createdAt
       FROM letter_templates
       WHERE LOWER(template_name) LIKE LOWER(:like)
       ORDER BY template_name`,
      { like: LIKE },
    ),
    safeQuery(
      "ClientAnnexASubmission (client submissions — template in form_details)",
      `SELECT submission_id, agreement_year, status, client_status,
              JSON_UNQUOTE(JSON_EXTRACT(form_details, '$.template_name')) AS template_name,
              JSON_UNQUOTE(JSON_EXTRACT(form_details, '$.template_year')) AS template_year,
              submission_timestamp
       FROM ClientAnnexASubmission
       WHERE LOWER(JSON_UNQUOTE(JSON_EXTRACT(form_details, '$.template_name'))) LIKE LOWER(:like)
       ORDER BY submission_timestamp DESC`,
      { like: LIKE },
    ),
    safeQuery(
      "TemplateYears + named templates (distinct year/name from NewSghaTemplate)",
      `SELECT DISTINCT template_year AS year, template_name
       FROM NewSghaTemplate
       WHERE LOWER(template_name) LIKE LOWER(:like)
       ORDER BY template_year, template_name`,
      { like: LIKE },
    ),
  ]);

  const out = {
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    filter: 'template_name contains "test" (case-insensitive)',
    generatedAt: new Date().toISOString(),
    sections: {},
  };

  for (const b of blocks) {
    out.sections[b.label] = b.error
      ? { error: b.error, count: 0, items: [] }
      : { count: b.rows.length, items: b.rows };
  }

  console.log(JSON.stringify(out, null, 2));
  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
