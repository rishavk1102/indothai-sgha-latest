const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AircraftCategory = sequelize.define('AircraftCategory', {
  Aircraft_category_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  Category_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  timestamps: true,
  tableName: 'aircraft_category',
});

module.exports = AircraftCategory;
