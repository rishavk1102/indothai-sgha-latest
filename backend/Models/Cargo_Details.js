const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const FHR = require('./FHR');

const CargoDetails = sequelize.define('Cargo_Details', {
  cargo_details_id: {
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
  no_of_trips: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  start_time: {
    type: DataTypes.DATE, // ΓÅ░ Includes both date and time
    allowNull: true
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  total_time: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Submitted', 'Cancelled', 'Draft'),
    allowNull: false,
    defaultValue: 'Draft'
  }
}, {
  tableName: 'Cargo_Details',
  timestamps: true
});

module.exports = CargoDetails;
