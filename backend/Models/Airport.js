const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Business = require('./Business');

const Airport = sequelize.define('Airport', {
  airport_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  business_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Business, // Must match the table name
      key: 'business_id'
    },
    onDelete: 'CASCADE'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  iata: {
    type: DataTypes.STRING,
    allowNull: false
  },
  icao: {
    type: DataTypes.STRING,
    allowNull: false
  },
  address1: {
    type: DataTypes.STRING,
    allowNull: false
  },
  address2: {
    type: DataTypes.STRING,
    allowNull: false
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false
  },
  state: {
    type: DataTypes.STRING,
    allowNull: false
  },
  pincode: {
    type: DataTypes.STRING,
    allowNull: false
  },
  country: {
    type: DataTypes.STRING,
    allowNull: false
  },
  icon: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'Airport',
  timestamps: true
});

module.exports = Airport;
