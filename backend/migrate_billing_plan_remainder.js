// Additive alters for remaining billing plan items.
// Run: node migrate_billing_plan_remainder.js
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

  console.log('updating invoice.status ENUM…');
  await sequelize.query(`
    ALTER TABLE \`invoice\`
    MODIFY \`status\` ENUM(
      'Draft',
      'Under review',
      'Issued',
      'Voided',
      'Credit note'
    ) NOT NULL DEFAULT 'Draft'
  `);
  console.log('invoice.status ENUM updated');

  await addColumn(
    'invoice',
    'approved_by',
    '`approved_by` INT NULL AFTER `bill_from`'
  );
  await addColumn(
    'invoice',
    'approved_at',
    '`approved_at` DATETIME NULL AFTER `approved_by`'
  );
  await addColumn(
    'invoice',
    'credits_invoice_id',
    '`credits_invoice_id` INT NULL AFTER `issued_at`'
  );

  await addColumn(
    'Additional_Equipment',
    'tariff_line_id',
    '`tariff_line_id` INT NULL AFTER `charges_id`'
  );

  console.log('nulling Additional_Equipment.charges_id…');
  await sequelize.query(
    'ALTER TABLE `Additional_Equipment` MODIFY `charges_id` INT NULL'
  );
  console.log('done');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
