const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const AnnxSec = require('./Annxsec');

// AnnxSubSec Table
const AnnxSubSec = sequelize.define('AnnxSubSec', {
  subsec_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  sec_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: AnnxSec,
      key: 'sec_id'
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
  tableName: 'annxsubsec',
  timestamps: true
});

module.exports = AnnxSubSec;
