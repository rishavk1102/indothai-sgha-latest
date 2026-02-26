const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const AnnexSection = require('./AnnexSection');

const AnnexTableRow = sequelize.define('AnnexTableRow', {
  row_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  annx_sec_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: AnnexSection,
      key: 'annx_sec_id',
    },
    onDelete: 'CASCADE',
  },
  section: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
}, {
  timestamps: true, // createdAt + updatedAt
  tableName: 'AnnexTableRow',
});

module.exports = AnnexTableRow;