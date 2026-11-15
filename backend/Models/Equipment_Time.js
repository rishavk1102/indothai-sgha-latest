const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const AdditionalEquipment = require('./Additional_Equipment');

const EquipmentTime = sequelize.define('Equipment_Time', {
  equipment_time_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  additional_equipment_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: AdditionalEquipment,
      key: 'additional_equipment_id'
    },
    onDelete: 'CASCADE'
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'Equipment_Time',
  timestamps: true
});

module.exports = EquipmentTime;
