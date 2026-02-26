const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TemplateYears = sequelize.define('TemplateYears', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: 'TemplateYears',
  createdAt: 'created_at',
  updatedAt: false, // Disable updated_at since it doesn't exist in the table
});

module.exports = TemplateYears;

