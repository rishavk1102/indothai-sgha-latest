// Create-only invoice tables. Run: node create_invoice_tables.js
require('dotenv').config();
const sequelize = require('./config/database');
const Invoice = require('./NewModels/Invoice');
const InvoiceLine = require('./NewModels/InvoiceLine');
const InvoiceFhr = require('./NewModels/InvoiceFhr');

async function tableExists(tableName) {
  const [rows] = await sequelize.query(
    `SELECT TABLE_NAME
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = :tableName`,
    { replacements: { tableName } }
  );
  return rows.length > 0;
}

async function main() {
  await sequelize.authenticate();
  for (const model of [Invoice, InvoiceLine, InvoiceFhr]) {
    const tableName = model.getTableName();
    const name = typeof tableName === 'string' ? tableName : tableName.tableName;
    if (await tableExists(name)) {
      console.log(`exists: ${name}`);
      continue;
    }
    console.log(`creating: ${name}`);
    await model.sync({ force: false, alter: false });
    console.log(`created: ${name}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
