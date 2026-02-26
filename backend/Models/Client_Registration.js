const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Role = require('./Role'); // Assuming you have a Role model

const ClientRegistration = sequelize.define('Client_Registration', {
  client_registration_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
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
    allowNull: true
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
    allowNull: true
  },
  address2: {
    type: DataTypes.STRING,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  pincode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true
  },
  other_details: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  Role_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Role,
      key: 'Role_id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
  user_type: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Client'
  }
}, {
  tableName: 'Client_Registration',
  timestamps: true
});

module.exports = ClientRegistration;
