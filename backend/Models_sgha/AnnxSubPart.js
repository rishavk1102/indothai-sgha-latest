const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const AnnxSubSec = require('./AnnxSubSec');
// AnnxSubPart Table
const AnnxSubPart = sequelize.define('AnnxSubPart', {
  subpart_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  subsec_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: AnnxSubSec,
      key: 'subsec_id'
    },
    onDelete: 'CASCADE'
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'annxsubpart',
  timestamps: true
});

module.exports = AnnxSubPart;
