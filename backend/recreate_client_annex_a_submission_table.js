// Script to recreate ClientAnnexASubmission table with status column
// Run with: node recreate_client_annex_a_submission_table.js
// WARNING: This will delete all existing data in the table!

const sequelize = require('./config/database');
const ClientAnnexASubmission = require('./NewModels/ClientAnnexASubmission');

async function recreateTable() {
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
      console.log('⚠️  Table "ClientAnnexASubmission" exists');
      console.log('📋 Current table structure:');
      const [columns] = await sequelize.query(`DESCRIBE ClientAnnexASubmission`);
      console.table(columns);
      
      console.log('\n🗑️  Dropping existing table...');
      await sequelize.query(`DROP TABLE IF EXISTS ClientAnnexASubmission`);
      console.log('✅ Table dropped successfully');
    }

    console.log('\n📝 Creating new table with status column...');
    
    // Use Sequelize sync with force: true to recreate the table
    await ClientAnnexASubmission.sync({ force: true });
    
    console.log('✅ Table "ClientAnnexASubmission" recreated successfully with status column!');
    
    // Show new table structure
    const [newColumns] = await sequelize.query(`DESCRIBE ClientAnnexASubmission`);
    console.log('\n📋 New table structure:');
    console.table(newColumns);

    console.log('\n✅ Script completed successfully!');
    console.log('⚠️  Note: All previous data has been deleted.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await sequelize.close();
  }
}

recreateTable();

