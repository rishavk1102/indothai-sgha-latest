require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const sequelize = require('../config/database');

async function main() {
  const [rows] = await sequelize.query(`
    SELECT submission_id, status, effective_from, effective_to,
           JSON_UNQUOTE(JSON_EXTRACT(form_details, '$.rate')) AS rate,
           JSON_UNQUOTE(JSON_EXTRACT(form_details, '$.airport_id')) AS airport_id,
           client_registration_id
    FROM ClientAnnexASubmission
    ORDER BY submission_id DESC
    LIMIT 8
  `);
  console.log('submissions', rows);

  const [vars] = await sequelize.query(`
    SELECT submission_id, variable_name, LEFT(variable_value, 220) AS v
    FROM SubmissionVariables
    WHERE variable_name IN ('aircraft_options', 'additional_charges')
    ORDER BY submission_id DESC
    LIMIT 8
  `);
  console.log('vars', vars);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
