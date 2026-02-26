const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Business = require('./Business');
const Airport = require('./Airport');
const Client_Registration = require('./Client_Registration');

const Client = sequelize.define('Client', {
  client_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  client_registration_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Client_Registration,
      key: 'client_registration_id'
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
  airport_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Airport,
      key: 'airport_id'
    },
    onDelete: 'CASCADE'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  operator: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contact_person: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  pan: {
    type: DataTypes.STRING,
    allowNull: true
  },
  gstin: {
    type: DataTypes.STRING,
    allowNull: true
  },
  address1: {
    type: DataTypes.STRING,
    allowNull: false
  },
  address2: {
    type: DataTypes.STRING,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false
  },
  pincode: {
    type: DataTypes.STRING,
    allowNull: false
  },
  state: {
    type: DataTypes.STRING,
    allowNull: false
  },
  country: {
    type: DataTypes.STRING,
    allowNull: false
  },
  other_details: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
}, {
  tableName: 'Client',
  timestamps: true
});

module.exports = Client;
