const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MenuGroup = sequelize.define('MenuGroup', {
  menu_group_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  icon_url: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  order_index: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: 'menu_groups',
  timestamps: true,
});

module.exports = MenuGroup;
