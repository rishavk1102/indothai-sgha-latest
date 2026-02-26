const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LetterTemplate = sequelize.define('LetterTemplate', {
  template_id: {
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
  tableName: 'letter_templates',
});

module.exports = LetterTemplate;

