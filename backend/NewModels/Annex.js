const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const NewSghaTemplate = require('./NewSghaTemplate');

const Annex = sequelize.define('Annex', {
  annex_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  SGHA_Template_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: NewSghaTemplate,
      key: 'SGHA_Template_id',
    },
    onDelete: 'CASCADE',
  },
  annex_header: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  timestamps: true,  // creates createdAt & updatedAt
  tableName: 'Annex',
});

module.exports = Annex;