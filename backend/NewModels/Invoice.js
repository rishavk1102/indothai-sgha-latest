const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Invoice = sequelize.define(
  'Invoice',
  {
    invoice_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    invoice_no: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    client_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    business_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    airport_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    period_from: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    period_to: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    currency: {
      type: DataTypes.STRING(8),
      allowNull: false,
      defaultValue: 'INR',
    },
    subtotal: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },
    tax_total: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },
    grand_total: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM(
        'Draft',
        'Under review',
        'Issued',
        'Voided',
        'Credit note'
      ),
      allowNull: false,
      defaultValue: 'Draft',
    },
    bill_to: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    bill_from: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    approved_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    issued_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    issued_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    credits_invoice_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    unlocked_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    unlocked_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'invoice',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { unique: true, fields: ['invoice_no'] },
      { fields: ['client_id', 'status'] },
      { fields: ['business_id', 'status'] },
    ],
  }
);

try {
  const Client = require('../Models/Client');
  const Airport = require('../Models/Airport');
  const Business = require('../Models/Business');
  Invoice.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
  Invoice.belongsTo(Airport, { foreignKey: 'airport_id', as: 'airport' });
  Invoice.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });
} catch (err) {
  // Isolated scripts may load models out of order.
}

module.exports = Invoice;
