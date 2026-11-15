// Create-only FHR tables. Never alter existing SGHA tables.
// Run: node create_fhr_tables.js

const sequelize = require('./config/database');

const models = [
  require('./Models/ChargeType'),
  require('./Models/Aircraft_Charges'),
  require('./Models/ExcelFile'),
  require('./Models/Excel_data'),
  require('./Models/FHR'),
  require('./Models/FHR_Listing'),
  require('./Models/FHR_users'),
  require('./Models/FHR_Edit_Sessions'),
  require('./Models/FHR_Edit_Fields'),
  require('./Models/Basic_Details'),
  require('./Models/Arrival_Details'),
  require('./Models/Departure_Details'),
  require('./Models/Man_Power_Details'),
  require('./Models/Cargo_Details'),
  require('./Models/Additional_Equipment'),
  require('./Models/Additional_equipment_creation'),
  require('./Models/Equipment_Time'),
];

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

async function createTables() {
  try {
    await sequelize.authenticate();
    console.log('Database connection successful');

    for (const model of models) {
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

    console.log('FHR create-only sync completed');
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

createTables();
