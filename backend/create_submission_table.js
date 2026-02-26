// Script to create Submission table (links Annex A and Annex B submission IDs)
// Run with: node create_submission_table.js
// Ensure ClientAnnexASubmission and ClientAnnexBSubmission tables exist first.

const sequelize = require('./config/database');
const Submission = require('./NewModels/Submission');

async function createTable() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'Submission'
    `);

    if (tables.length > 0) {
      console.log('ℹ️  Table "Submission" already exists');
      const [columns] = await sequelize.query(`DESCRIBE Submission`);
      console.log('\n📋 Table structure:');
      console.table(columns);
    } else {
      console.log('📝 Creating table "Submission"...');
      await Submission.sync({ force: false, alter: false });
      console.log('✅ Table "Submission" created successfully!');
      const [columns] = await sequelize.query(`DESCRIBE Submission`);
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
