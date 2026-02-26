const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Template = sequelize.define('Template', {
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
    field: 'type',
  },
  content: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  template_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: null,
    comment: 'Optional name for multiple templates per year; null = default template',
  },
}, {
  timestamps: true,
  tableName: 'Template',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Template;

