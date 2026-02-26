const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SGHA_Main_agreement = sequelize.define('SGHA_Main_agreement', {
  SGHA_Main_agreement_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  template_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  timestamps: true,
  tableName: 'SGHA_Main_agreement',
});

module.exports = SGHA_Main_agreement;

