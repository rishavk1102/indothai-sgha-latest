const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const SghaTariff = require('./SghaTariff');

const SghaTariffLine = sequelize.define(
  'SghaTariffLine',
  {
    tariff_line_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    tariff_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: SghaTariff,
        key: 'tariff_id',
      },
      onDelete: 'CASCADE',
    },
    service_code: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(512),
      allowNull: false,
    },
    line_type: {
      type: DataTypes.ENUM('Base handling', 'Additional'),
      allowNull: false,
    },
    aircraft_category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    flight_type_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    unit: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    rate: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    levy_rate: {
      type: DataTypes.DECIMAL(8, 4),
      allowNull: true,
    },
    tax_code: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    min_charge: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    included_qty: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    source_ref: {
      type: DataTypes.STRING(128),
      allowNull: true,
      comment: 'ServicePrice / Additional_charges / aircraft_options id',
    },
    source_payload: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Frozen snapshot of the negotiated source row',
    },
  },
  {
    tableName: 'sgha_tariff_line',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['tariff_id'] },
      { fields: ['tariff_id', 'service_code'] },
      { fields: ['line_type'] },
    ],
  }
);

SghaTariff.hasMany(SghaTariffLine, {
  foreignKey: 'tariff_id',
  as: 'lines',
  onDelete: 'CASCADE',
});
SghaTariffLine.belongsTo(SghaTariff, {
  foreignKey: 'tariff_id',
  as: 'tariff',
});

module.exports = SghaTariffLine;
