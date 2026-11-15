const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const ExcelFile = sequelize.define('ExcelFile', {
  excel_file_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  file_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  file_url: {
    type: DataTypes.STRING,
    allowNull: false
  },
  inserted_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'user_id'
    },
    onDelete: 'CASCADE'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'ExcelFile',
  timestamps: true
});

module.exports = ExcelFile;
