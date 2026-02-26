// Script to create SubmissionVariables table
// Run with: node create_submission_variables_table.js

const sequelize = require('./config/database');

async function createTable() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    // Check if table exists
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'SubmissionVariables'
    `);

    if (tables.length > 0) {
      console.log('ℹ️  Table "SubmissionVariables" already exists');
      const [columns] = await sequelize.query(`
        DESCRIBE SubmissionVariables
      `);
      console.log('\n📋 Current table structure:');
      console.table(columns);
      return;
    }

    console.log('📝 Creating "SubmissionVariables" table...');
    
    // Create table
    await sequelize.query(`
      CREATE TABLE SubmissionVariables (
        variable_id INT AUTO_INCREMENT PRIMARY KEY,
        submission_id INT NOT NULL,
        variable_name VARCHAR(255) NOT NULL,
        variable_value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (submission_id) REFERENCES ClientAnnexASubmission(submission_id) ON DELETE CASCADE,
        UNIQUE KEY unique_submission_variable (submission_id, variable_name),
        INDEX idx_submission_id (submission_id),
        INDEX idx_variable_name (variable_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('✅ Table "SubmissionVariables" created successfully!');

    // Show table structure
    const [allColumns] = await sequelize.query(`
      DESCRIBE SubmissionVariables
    `);
    console.log('\n📋 Table structure:');
    console.table(allColumns);

    console.log('\n✅ Script completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await sequelize.close();
  }
}

createTable();

