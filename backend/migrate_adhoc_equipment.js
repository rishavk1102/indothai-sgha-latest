// Additive: ad-hoc Additional Equipment columns.
// Run: node migrate_adhoc_equipment.js
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
    'Additional_Equipment',
    'is_adhoc',
    '`is_adhoc` TINYINT(1) NOT NULL DEFAULT 0 AFTER `tariff_line_id`'
  );
  await addColumn(
    'Additional_Equipment',
    'unit_rate',
    '`unit_rate` DECIMAL(12,2) NULL AFTER `is_adhoc`'
  );
  console.log('done');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
