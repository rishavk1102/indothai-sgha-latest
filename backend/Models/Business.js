const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Business = sequelize.define('Business', {
  business_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  contact_person: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  landline: {
    type: DataTypes.STRING,
    allowNull: false
  },
  pan: {
    type: DataTypes.STRING,
    allowNull: false
  },
  gstin: {
    type: DataTypes.STRING,
    allowNull: false
  },
  cin: {
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
  bank: {
    type: DataTypes.STRING,
    allowNull: false
  },
  branch: {
    type: DataTypes.STRING,
    allowNull: false
  },
  account_no: {
    type: DataTypes.STRING,
    allowNull: false
  },
  ifsc: {
    type: DataTypes.STRING,
    allowNull: false
  },
  swift_code: {
    type: DataTypes.STRING,
    allowNull: false
  },
  creation_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  }
}, {
  tableName: 'Business',
  timestamps: true
});

module.exports = Business;
