const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Business = require('./Business');
const Client = require('./Client');
const Airport = require('./Airport');
const Airline = require('./Airlines');
const Category = require('./Category');
const Aircraft = require('./Aircraft');
const ExcelData = require('./Excel_data');

const FHR = sequelize.define('FHR', {
  fhr_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
  airport_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Airport,
      key: 'airport_id'
    },
    onDelete: 'CASCADE'
  },
  airline_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Airline,
      key: 'airline_id'
    },
    onDelete: 'CASCADE'
  },

  excel_data_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: ExcelData,
      key: 'excel_data_id'
    },
    onDelete: 'CASCADE'
  },
  aircraft_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Aircraft,
      key: 'aircraft_id'
    },
    onDelete: 'CASCADE'
  },
  type: {
    type: DataTypes.ENUM('Arrival', 'Departure', 'Both'),
    allowNull: false
  },
  Fhr_type: {
    type: DataTypes.ENUM('Schedule', 'Non-Schedule'),
    allowNull: false,
    defaultValue: 'Schedule'
  },
  declaration1: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  declaration2: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  submitted_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'User',
      key: 'user_id'
    },
    onDelete: 'SET NULL'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cancellation_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  issue_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Draft', 'Pending', 'Submitted', 'Completed', 'Cancelled'),
    allowNull: false,
    defaultValue: 'Draft'
  }
}, {
  tableName: 'FHR',
  timestamps: true
});

module.exports = FHR;
