// models/Role.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Role = sequelize.define('Role', {
  Role_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  role_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  role_description: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
}, {
  timestamps: true,
  tableName: 'Role',
});

module.exports = Role;
