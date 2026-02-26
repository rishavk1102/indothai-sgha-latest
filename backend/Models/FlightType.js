const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FlightType = sequelize.define('FlightType', {
  Flight_type_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  Flight_type_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  timestamps: true,
  tableName: 'flight_type',
});

module.exports = FlightType;
