const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const SghaTemplate = require('./SGHA_Section_Template');

// AnnxSec Table
const AnnxSec = sequelize.define('AnnxSec', {
  sec_id: {
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
    },
    onDelete: 'CASCADE'
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false
  },
  title: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'annxsec',
  timestamps: true
});
module.exports = AnnxSec;