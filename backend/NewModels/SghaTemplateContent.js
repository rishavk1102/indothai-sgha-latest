const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SghaTemplateContent = sequelize.define('SghaTemplateContent', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  type: {
    type: DataTypes.ENUM('Main Agreement', 'Annex A', 'Annex B'),
    allowNull: true,
  },
  content: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: 'sgha_template_content', // Adjust this to match your actual table name
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = SghaTemplateContent;

