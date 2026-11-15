const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const FHR = require('./FHR'); // Ensure FHR model exists

const ManPowerDetails = sequelize.define('Man_Power_Details', {
  man_power_id: {
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
    onDelete: 'CASCADE'
  },
  arrival_wheel_chair: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  departure_wheel_chair: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  total_wheel_chair: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  maas: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Submitted', 'Cancelled', 'Draft'),
    allowNull: false,
    defaultValue: 'Draft'
  }
}, {
  tableName: 'Man_Power_Details',
  timestamps: true
});

module.exports = ManPowerDetails;
