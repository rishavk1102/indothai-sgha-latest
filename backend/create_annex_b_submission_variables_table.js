// Script to create AnnexBSubmissionVariables table
// Run with: node create_annex_b_submission_variables_table.js
// Ensure ClientAnnexBSubmission table exists first (run create_client_annex_b_submission_table.js)

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
      AND TABLE_NAME = 'AnnexBSubmissionVariables'
    `);

    if (tables.length > 0) {
      console.log('ℹ️  Table "AnnexBSubmissionVariables" already exists');
      const [columns] = await sequelize.query(`
        DESCRIBE AnnexBSubmissionVariables
      `);
      console.log('\n📋 Current table structure:');
      console.table(columns);
      return;
    }

    console.log('📝 Creating "AnnexBSubmissionVariables" table...');

    // Create table
    await sequelize.query(`
      CREATE TABLE AnnexBSubmissionVariables (
        variable_id INT AUTO_INCREMENT PRIMARY KEY,
        annex_b_submission_id INT NOT NULL,
        variable_name VARCHAR(255) NOT NULL,
        variable_value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (annex_b_submission_id) REFERENCES ClientAnnexBSubmission(annex_b_submission_id) ON DELETE CASCADE,
        UNIQUE KEY unique_annex_b_submission_variable (annex_b_submission_id, variable_name),
        INDEX idx_annex_b_submission_id (annex_b_submission_id),
        INDEX idx_variable_name (variable_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Table "AnnexBSubmissionVariables" created successfully!');

    // Show table structure
    const [allColumns] = await sequelize.query(`
      DESCRIBE AnnexBSubmissionVariables
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
