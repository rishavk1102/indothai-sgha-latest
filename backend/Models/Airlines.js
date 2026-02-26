const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Airport = require('./Airport');
const Business = require('./Business');
const Client = require('./Client');

const Airline = sequelize.define('Airline', {
  airline_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  airport_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Airport,
      key: 'airport_id'
    },
    onDelete: 'CASCADE'
  },
  business_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Business,
      key: 'business_id'
    },
    onDelete: 'CASCADE'
  },
  client_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Client,
      key: 'client_id'
    },
    onDelete: 'CASCADE'
  },
  airline_name: {
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
  airline_type: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'Airline',
  timestamps: true
});

module.exports = Airline;
