const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const FHR = require('./FHR');

const AdditionalEquipmentCreation = sequelize.define('Additional_equipment_creation', {
  additional_equipment_creation_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  fhr_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: FHR,
      key: 'fhr_id'
    },
    onDelete: 'CASCADE',
    unique: true // Ensures one-to-one relationship
  },
  creation_status: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'Additional_equipment_creation',
  timestamps: true
});

module.exports = AdditionalEquipmentCreation;
