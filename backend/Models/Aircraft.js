const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Airline = require('./Airlines');
const AircraftCategory = require('./AircraftCategory');
 
const Aircraft = sequelize.define('Aircraft', {
  aircraft_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
  Aircraft_category_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: AircraftCategory,
      key: 'Aircraft_category_id'
    },
    onDelete: 'CASCADE'
  },

  type_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING,
    allowNull: false
  },
  AAI_levy: {
    type: DataTypes.FLOAT,
    allowNull: false,
    comment: 'Percentage value for AAI levy'
  }
}, {
  tableName: 'Aircraft',
  timestamps: true
});

module.exports = Aircraft;
