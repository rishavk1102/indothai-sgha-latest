const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const FhrRating = require('./FhrRating');

const FhrChargeLine = sequelize.define(
  'FhrChargeLine',
  {
    charge_line_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    rating_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: FhrRating,
        key: 'rating_id',
      },
      onDelete: 'CASCADE',
    },
    fhr_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    tariff_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    tariff_line_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    description: {
      type: DataTypes.STRING(512),
      allowNull: false,
    },
    line_type: {
      type: DataTypes.ENUM('Base handling', 'Additional'),
      allowNull: false,
    },
    qty: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 1,
    },
    unit: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    unit_rate: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    levy: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    tax: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    source: {
      type: DataTypes.ENUM('Tariff', 'Manual'),
      allowNull: false,
      defaultValue: 'Tariff',
    },
    override_reason: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    override_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: 'fhr_charge_line',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['fhr_id'] },
      { fields: ['rating_id'] },
      { fields: ['tariff_line_id'] },
    ],
  }
);

FhrRating.hasMany(FhrChargeLine, {
  foreignKey: 'rating_id',
  as: 'lines',
  onDelete: 'CASCADE',
});
FhrChargeLine.belongsTo(FhrRating, {
  foreignKey: 'rating_id',
  as: 'rating',
});

module.exports = FhrChargeLine;
