// Quick script to check if the table exists and show its structure
// Run with: node debug_table_check.js

const sequelize = require('./config/database');

async function checkTable() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    // Try to query the table
    const [results] = await sequelize.query("SHOW TABLES LIKE '%template%' OR SHOW TABLES LIKE '%sgha%'");
    console.log('\n📋 Tables containing "template" or "sgha":');
    console.log(results);

    // Check for the specific table name
    const [tables] = await sequelize.query("SHOW TABLES");
    console.log('\n📋 All tables:');
    tables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`${index + 1}. ${tableName}`);
    });

    // Try to describe the table if it exists
    try {
      const [columns] = await sequelize.query("DESCRIBE sgha_template_content");
      console.log('\n📋 Table structure for "sgha_template_content":');
      console.log(columns);
    } catch (e) {
      console.log('\n❌ Table "sgha_template_content" does not exist or has a different name');
      console.log('Please check what table name you used when creating the database');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkTable();

