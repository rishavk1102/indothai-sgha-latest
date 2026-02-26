// models/Temporary_Sgha.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ClientRegistration = require('./Client_Registration');
const Airport = require('./Airport');
const Business = require('./Business');
const FlightType = require('./FlightType');
const Category = require('./Category');
const Client = require('./Client');

const Temporary_Sgha = sequelize.define('Temporary_Sgha', {
  temp_sgha_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  client_registration_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: ClientRegistration,
      key: 'client_registration_id',
    },
    onDelete: 'CASCADE',
  },
  airport_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Airport,
      key: 'airport_id',
    },
    onDelete: 'CASCADE',
  },
  business_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Business,
      key: 'business_id',
    },
    onDelete: 'CASCADE',
  },
  flight_type_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: FlightType,
      key: 'Flight_type_id',
    },
    onDelete: 'CASCADE',
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Category,
      key: 'category_id',
    },
    onDelete: 'CASCADE',
  },
  client_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Client,
      key: 'client_id',
    },
    onDelete: 'CASCADE',
  },
  status: {
    type: DataTypes.ENUM('Draft'),
    allowNull: false,
    defaultValue: 'Draft',
  },
}, {
  tableName: 'Temporary_Sgha',
  timestamps: true, // ✅ adds createdAt and updatedAt
});

module.exports = Temporary_Sgha;
