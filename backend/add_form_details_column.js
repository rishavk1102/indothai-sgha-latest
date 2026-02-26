// Migration script to add form_details column to ClientAnnexASubmission table
// Run with: node add_form_details_column.js

const sequelize = require('./config/database');
const { DataTypes } = require('sequelize');

async function addColumn() {
  try {
    await sequelize.authenticate();
    const queryInterface = sequelize.getQueryInterface();
    const tableDesc = await queryInterface.describeTable('ClientAnnexASubmission');
    if (tableDesc.form_details) {
      console.log('ℹ️  form_details column already exists');
      return;
    }
    await queryInterface.addColumn('ClientAnnexASubmission', 'form_details', {
      type: DataTypes.JSON,
      allowNull: true,
    });
    console.log('✅ Added form_details column to ClientAnnexASubmission');
  } catch (error) {
    try {
      await sequelize.query(`
        ALTER TABLE ClientAnnexASubmission
        ADD COLUMN form_details JSON NULL
      `);
      console.log('✅ Added form_details column (raw SQL)');
    } catch (sqlErr) {
      if (sqlErr.message && sqlErr.message.includes('Duplicate column')) {
        console.log('ℹ️  form_details column already exists');
        return;
      }
      console.error('❌ Migration error:', sqlErr.message);
      throw sqlErr;
    }
  } finally {
    await sequelize.close();
  }
}

addColumn().then(() => process.exit(0)).catch(() => process.exit(1));
