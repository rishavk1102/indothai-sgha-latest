// Create-only / additive alters for meeting gaps. Run: node migrate_billing_meeting_gaps.js
require('dotenv').config();
const sequelize = require('./config/database');

async function columnExists(table, column) {
  const [rows] = await sequelize.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = :table
       AND COLUMN_NAME = :column`,
    { replacements: { table, column } }
  );
  return rows.length > 0;
}

async function addColumn(table, column, ddl) {
  if (await columnExists(table, column)) {
    console.log(`exists: ${table}.${column}`);
    return;
  }
  console.log(`adding: ${table}.${column}`);
  await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN ${ddl}`);
  console.log(`added: ${table}.${column}`);
}

async function main() {
  await sequelize.authenticate();

  await addColumn(
    'invoice',
    'unlocked_by',
    '`unlocked_by` INT NULL AFTER `issued_at`'
  );
  await addColumn(
    'invoice',
    'unlocked_at',
    '`unlocked_at` DATETIME NULL AFTER `unlocked_by`'
  );

  await addColumn(
    'sgha_tariff',
    'kind',
    "`kind` ENUM('Sgha','Walkup') NOT NULL DEFAULT 'Sgha' AFTER `tariff_id`"
  );

  // Walkup tariffs have no SGHA submission / registration.
  console.log('nulling sgha_tariff.submission_id / client_registration_id…');
  await sequelize.query(
    'ALTER TABLE `sgha_tariff` MODIFY `submission_id` INT NULL'
  );
  await sequelize.query(
    'ALTER TABLE `sgha_tariff` MODIFY `client_registration_id` INT NULL'
  );
  console.log('done');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
