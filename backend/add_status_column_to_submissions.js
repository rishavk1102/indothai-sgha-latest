// Script to add status column to ClientAnnexASubmission table
// Run with: node add_status_column_to_submissions.js

const sequelize = require('./config/database');

async function addStatusColumn() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    // Check if column exists
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'ClientAnnexASubmission'
      AND COLUMN_NAME = 'status'
    `);

    if (columns.length > 0) {
      console.log('ℹ️  Column "status" already exists');
      console.log('   Current definition:', columns[0]);
    } else {
      console.log('📝 Adding "status" column to ClientAnnexASubmission table...');
      
      // Add status column with ENUM type and default value
      await sequelize.query(`
        ALTER TABLE ClientAnnexASubmission 
        ADD COLUMN status ENUM('Pending', 'Completed', 'Suspended', 'Cancelled', 'Expired') 
        NOT NULL 
        DEFAULT 'Pending'
        AFTER submission_timestamp
      `);
      
      console.log('✅ Column "status" added successfully!');
    }

    // Show updated table structure
    const [allColumns] = await sequelize.query(`
      DESCRIBE ClientAnnexASubmission
    `);
    console.log('\n📋 Updated table structure:');
    console.table(allColumns);

    console.log('\n✅ Script completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await sequelize.close();
  }
}

addStatusColumn();

