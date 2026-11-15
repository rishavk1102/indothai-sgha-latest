const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FhrRating = sequelize.define(
  'FhrRating',
  {
    rating_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    fhr_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    tariff_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    rating_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('Rated', 'Needs review'),
      allowNull: false,
      defaultValue: 'Needs review',
    },
    reason: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    currency: {
      type: DataTypes.STRING(8),
      allowNull: true,
    },
    rated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    rated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'fhr_rating',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ fields: ['fhr_id'] }, { fields: ['tariff_id'] }, { fields: ['status'] }],
  }
);

module.exports = FhrRating;
