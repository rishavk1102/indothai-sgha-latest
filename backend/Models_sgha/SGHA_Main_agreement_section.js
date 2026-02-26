const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const SGHA_Main_agreement = require('./SGHA_Main_agreement'); // Import the LetterTemplate model

const SGHA_Main_agreement_section = sequelize.define('SGHA_Main_agreement_section', {
  SGHA_Main_agreement_section_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  SGHA_Main_agreement_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: SGHA_Main_agreement,
      key: 'SGHA_Main_agreement_id',
    },
    onDelete: 'CASCADE', // Delete sections if the parent template is deleted
  },
  section_heading: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  section_body: {
    type: DataTypes.TEXT('long'), // Content of the section
    allowNull: false,
  },
  section_order: {
    type: DataTypes.INTEGER, // Order for sorting sections within a template
    allowNull: false,
  },
}, {
  timestamps: true,
  tableName: 'SGHA_Main_agreement_section',
});

module.exports = SGHA_Main_agreement_section;
