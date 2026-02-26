// models/sgha_tmpl_cat.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const SghaTemplate = require('./SGH_Agreement_Template');
const Category = require('../Models/Category');

const SghaTmplCat = sequelize.define('SghaTmplCat', {
  SGHA_T_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: SghaTemplate,
      key: 'SGHA_T_id'
    }
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Category,
      key: 'category_id'
    }
  }
}, {
  tableName: 'sgha_tmpl_cats',   // shortened
  timestamps: true
});

module.exports = SghaTmplCat;
