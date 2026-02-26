const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const LetterTemplate = require('./Letter_template'); // Import the LetterTemplate model

const LetterSection = sequelize.define('LetterSection', {
  section_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  template_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: LetterTemplate,
      key: 'template_id',
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
  tableName: 'letter_sections',
});

module.exports = LetterSection;
