const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const FHR = require('./FHR'); // Ensure FHR model exists and is correctly referenced

const ArrivalDetails = sequelize.define('Arrival_Details', {
  arrival_details_id: {
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
  sta: {
    type: DataTypes.DATE,
    allowNull: true
  },
  ata: {
    type: DataTypes.DATE,
    allowNull: true
  },
  sta_ata_diff: {
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
  tableName: 'Arrival_Details',
  timestamps: true
});

module.exports = ArrivalDetails;
