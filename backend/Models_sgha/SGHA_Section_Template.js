// models/sgha_template.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SghaTemplate = sequelize.define('SghaTemplate', {
  SGHA_T_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  template_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  Section_position: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'sgha_templates',   // shortened
  timestamps: true
});

module.exports = SghaTemplate;
