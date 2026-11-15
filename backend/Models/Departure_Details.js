const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const FHR = require('./FHR'); // Ensure FHR model exists and is correctly referenced

const Departure_Details = sequelize.define('Departure_Details', {
  departure_details_id: {
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
  flight_no: {
    type: DataTypes.STRING,
    allowNull: true
  },
  flight_weight: {
    type: DataTypes.STRING,
    allowNull: true
  },
  flight_region: {
    type: DataTypes.STRING,
    allowNull: true
  },
  flight_type: {
    type: DataTypes.STRING,
    allowNull: true
  },
  operator: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bay_no: {
    type: DataTypes.STRING,
    allowNull: true
  },
  gate_no: {
    type: DataTypes.STRING,
    allowNull: true
  },
  airport: {
    type: DataTypes.STRING,
    allowNull: true
  },
  std: {
    type: DataTypes.DATE,
    allowNull: true
  },
  atd: {
    type: DataTypes.DATE,
    allowNull: true
  },
  std_atd_diff: {
    type: DataTypes.STRING,
    allowNull: true
  },
  crew_count: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  pax_members: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  loading_start: {
    type: DataTypes.DATE,
    allowNull: true
  },
  loading_over: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Submitted', 'Cancelled', 'Draft'),
    allowNull: false,
    defaultValue: 'Draft'
  }
}, {
  tableName: 'Departure_Details',
  timestamps: true
});

module.exports = Departure_Details;
