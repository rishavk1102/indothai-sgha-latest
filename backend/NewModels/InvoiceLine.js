const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Invoice = require('./Invoice');

const InvoiceLine = sequelize.define(
  'InvoiceLine',
  {
    invoice_line_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    invoice_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Invoice,
        key: 'invoice_id',
      },
      onDelete: 'CASCADE',
    },
    fhr_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    charge_line_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    description: {
      type: DataTypes.STRING(512),
      allowNull: false,
    },
    line_type: {
      type: DataTypes.STRING(64),
      allowNull: true,
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
  },
  {
    tableName: 'invoice_line',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ fields: ['invoice_id'] }, { fields: ['fhr_id'] }],
  }
);

Invoice.hasMany(InvoiceLine, {
  foreignKey: 'invoice_id',
  as: 'lines',
  onDelete: 'CASCADE',
});
InvoiceLine.belongsTo(Invoice, {
  foreignKey: 'invoice_id',
  as: 'invoice',
});

module.exports = InvoiceLine;
