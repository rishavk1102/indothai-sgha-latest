const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
// Associations
const AnnxSec = require('./Annxsec');
const AnnxSubSec = require('./AnnxSubSec');
const AnnxSubPart = require('./AnnxSubPart');
// CategoryMapp Table
const CategoryMapp = sequelize.define('CategoryMapp', {
  catmap_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Category', // using tableName string because Category is defined separately
      key: 'category_id'
    },
    onDelete: 'CASCADE'
  },
  sec_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: AnnxSec,
      key: 'sec_id'
    },
    onDelete: 'SET NULL'
  },
  subsec_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: AnnxSubSec,
      key: 'subsec_id'
    },
    onDelete: 'SET NULL'
  },
  subpart_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: AnnxSubPart,
      key: 'subpart_id'
    },
    onDelete: 'SET NULL'
  }
}, {
  tableName: 'category_mapp',
  timestamps: true
});
module.exports = CategoryMapp;