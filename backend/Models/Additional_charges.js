const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
// Import related models
const Business = require('./Business'); 
const Airport = require('./Airport');  

const Additional_charges = sequelize.define('Additional_charges', {
  Additional_charges_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  Business_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Business,
      key: 'Business_id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  Airport_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Airport,
      key: 'Airport_id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  Desc_of_service: {
    type: DataTypes.STRING,
    allowNull: false
  },
  Sub_section: {
    type: DataTypes.STRING,
    allowNull: true
  },
  unit_or_measure: {
    type: DataTypes.STRING,
    allowNull: true
  },
  rate: {
    type: DataTypes.FLOAT,
    allowNull: false
  }
}, {
  tableName: 'Additional_charges',
  timestamps: true   // ✅ createdAt & updatedAt
});

module.exports = Additional_charges;
