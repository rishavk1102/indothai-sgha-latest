const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Role = require('./Role');
const Page = require('./Page');

const Permission = sequelize.define('Permission', {
  permission_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  role_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Role,
      key: 'Role_id',
    },
    onDelete: 'CASCADE',
  },
  page_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Page,
      key: 'page_id',
    },
    onDelete: 'CASCADE',
  },
  can_view: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  can_add: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  can_edit: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  can_delete: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'permissions',
  timestamps: true,
});

module.exports = Permission;
