// Migration: add template_name to Template table for multiple templates per year
// Run with: node add_template_name_column.js

const sequelize = require('./config/database');
const { DataTypes } = require('sequelize');

async function run() {
  try {
    await sequelize.authenticate();
    const queryInterface = sequelize.getQueryInterface();
    const tableDesc = await queryInterface.describeTable('Template');
    if (tableDesc.template_name) {
      console.log('ℹ️  template_name column already exists');
      return;
    }
    await queryInterface.addColumn('Template', 'template_name', {
      type: DataTypes.STRING(255),
      allowNull: true,
    });
    console.log('✅ Added template_name column to Template');
  } catch (err) {
    try {
      await sequelize.query(
        'ALTER TABLE Template ADD COLUMN template_name VARCHAR(255) NULL'
      );
      console.log('✅ Added template_name column (raw SQL)');
    } catch (e) {
      if (e.message && e.message.includes('Duplicate')) {
        console.log('ℹ️  template_name column already exists');
        return;
      }
      throw e;
    }
  } finally {
    await sequelize.close();
  }
}

run().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
