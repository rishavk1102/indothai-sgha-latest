const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const FHR = require('./FHR'); // Make sure you have a model file for FHR

const BasicDetails = sequelize.define('Basic_Details', {
  basic_details_id: {
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
  ice_no: {
    type: DataTypes.STRING,
    allowNull: true
  },
  epcg_no: {
    type: DataTypes.STRING,
    allowNull: true
  },
  country_of_origin_of_service: {
    type: DataTypes.STRING,
    allowNull: true
  },
  place_of_delivery_of_service: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Submitted', 'Cancelled', 'Draft'),
    allowNull: false,
    defaultValue: 'Draft'
  }
}, {
  tableName: 'Basic_Details',
  timestamps: true
});

module.exports = BasicDetails;
