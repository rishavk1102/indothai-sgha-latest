// Script to create ClientAnnexBSubmission table
// Run with: node create_client_annex_b_submission_table.js
// Run this before create_annex_b_submission_variables_table.js

const sequelize = require('./config/database');
const ClientAnnexBSubmission = require('./NewModels/ClientAnnexBSubmission');

async function createTable() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    // Check if table exists
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'ClientAnnexBSubmission'
    `);

    if (tables.length > 0) {
      console.log('ℹ️  Table "ClientAnnexBSubmission" already exists');

      // Show table structure
      const [columns] = await sequelize.query(`
        DESCRIBE ClientAnnexBSubmission
      `);
      console.log('\n📋 Table structure:');
      console.table(columns);
    } else {
      console.log('📝 Creating table "ClientAnnexBSubmission"...');

      // Use Sequelize sync to create the table
      await ClientAnnexBSubmission.sync({ force: false, alter: false });

      console.log('✅ Table "ClientAnnexBSubmission" created successfully!');

      // Show table structure
      const [columns] = await sequelize.query(`
        DESCRIBE ClientAnnexBSubmission
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
