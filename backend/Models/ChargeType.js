const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ChargeType = sequelize.define('ChargeType', {
  charge_type_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'ChargeType',
  timestamps: true
});

module.exports = ChargeType;
