const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const MenuGroup = require('./MenuGroup');

const Page = sequelize.define('Page', {
  page_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  path: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  icon_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  order_index: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  menu_group_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // null = standalone page
    references: {
      model: MenuGroup,
      key: 'menu_group_id',
    },
    onDelete: 'SET NULL',
  },
  show_in_menu: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true, // true = show in sidebar, false = internal page
  },
}, {
  tableName: 'pages',
  timestamps: true,
});

module.exports = Page;
