const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const FHR = require('./FHR');
const User = require('./User');
const FHREditSessions = require('./FHR_Edit_Sessions');

const FHREditFields = sequelize.define('FHR_Edit_Fields', {
  edit_field_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  session_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: FHREditSessions,
      key: 'session_id'
    },
    onDelete: 'CASCADE'
  },
  fhr_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: FHR,
      key: 'fhr_id'
    },
    onDelete: 'CASCADE'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'user_id'
    },
    onDelete: 'CASCADE'
  },
 section: {
    type: DataTypes.ENUM(
      'Basic_Details',
      'Arrival_Details',
      'Departure_Details',
      'Man_Power_Details',
      'Cargo_Details',
      'Additional_Equipment'
    ),
    allowNull: false
  },
  field_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  old_value: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  current_value: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
}, {
  tableName: 'FHR_Edit_Fields',
  timestamps: false
});

module.exports = FHREditFields;
