// models/sgha_section.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const SghaTemplate = require('./SGHA_Section_Template');

const SghaSection = sequelize.define('SghaSection', {
  SGHA_ST_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  SGHA_T_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: SghaTemplate,
      key: 'SGHA_T_id'
    }
  },
  subheading: {
    type: DataTypes.STRING,
    allowNull: false
  },
  body: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  }
}, {
  tableName: 'sgha_sections',   // shortened
  timestamps: true
});

module.exports = SghaSection;

