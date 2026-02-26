// Migration script to add type and content columns to NewSghaTemplate table
// Run with: node add_template_columns.js

const sequelize = require('./config/database');

async function addColumns() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    // Check if columns exist first
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'NewSghaTemplate' 
      AND COLUMN_NAME IN ('type', 'content')
    `);

    const existingColumns = columns.map(col => col.COLUMN_NAME);
    console.log('\n📋 Existing columns:', existingColumns);

    // Add type column if it doesn't exist
    if (!existingColumns.includes('type')) {
      await sequelize.query(`
        ALTER TABLE NewSghaTemplate 
        ADD COLUMN type ENUM('Main Agreement', 'Annex A', 'Annex B') NULL
        AFTER template_year
      `);
      console.log('✅ Added "type" column');
    } else {
      console.log('ℹ️  "type" column already exists');
    }

    // Add content column if it doesn't exist
    if (!existingColumns.includes('content')) {
      await sequelize.query(`
        ALTER TABLE NewSghaTemplate 
        ADD COLUMN content LONGTEXT NULL
        AFTER type
      `);
      console.log('✅ Added "content" column');
    } else {
      console.log('ℹ️  "content" column already exists');
    }

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.error('Full error:', error);
  } finally {
    await sequelize.close();
  }
}

addColumns();

