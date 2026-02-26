// Script to create ClientAnnexASubmission table
// Run with: node create_client_annex_a_submission_table.js
// This ensures the table exists even if sequelize.sync() hasn't run yet

const sequelize = require('./config/database');
const ClientAnnexASubmission = require('./NewModels/ClientAnnexASubmission');

async function createTable() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    // Check if table exists
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'ClientAnnexASubmission'
    `);

    if (tables.length > 0) {
      console.log('ℹ️  Table "ClientAnnexASubmission" already exists');
      
      // Show table structure
      const [columns] = await sequelize.query(`
        DESCRIBE ClientAnnexASubmission
      `);
      console.log('\n📋 Table structure:');
      console.table(columns);
    } else {
      console.log('📝 Creating table "ClientAnnexASubmission"...');
      
      // Use Sequelize sync to create the table
      await ClientAnnexASubmission.sync({ force: false, alter: false });
      
      console.log('✅ Table "ClientAnnexASubmission" created successfully!');
      
      // Show table structure
      const [columns] = await sequelize.query(`
        DESCRIBE ClientAnnexASubmission
      `);
      console.log('\n📋 Table structure:');
      console.table(columns);
    }

    console.log('\n✅ Script completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await sequelize.close();
  }
}

createTable();

