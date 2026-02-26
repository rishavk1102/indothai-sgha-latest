const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Annex = require('./Annex');

const AnnexSection = sequelize.define('AnnexSection', {
  annx_sec_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  annex_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Annex,
      key: 'annex_id',
    },
    onDelete: 'CASCADE',
  },
  section_type: {
    type: DataTypes.ENUM(
      'heading',
      'subheading',
      'subchild',
      'textarea',
      'texteditor',
      'table',
    ),
    allowNull: false,
  },
  section_body: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
}, {
  timestamps: true, // createdAt + updatedAt
  tableName: 'AnnexSection',
});

module.exports = AnnexSection;