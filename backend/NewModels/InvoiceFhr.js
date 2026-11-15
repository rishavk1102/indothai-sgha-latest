const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Invoice = require('./Invoice');

const InvoiceFhr = sequelize.define(
  'InvoiceFhr',
  {
    invoice_fhr_id: {
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
      allowNull: false,
    },
  },
  {
    tableName: 'invoice_fhr',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { unique: true, fields: ['invoice_id', 'fhr_id'] },
      { fields: ['fhr_id'] },
    ],
  }
);

Invoice.hasMany(InvoiceFhr, {
  foreignKey: 'invoice_id',
  as: 'fhrs',
  onDelete: 'CASCADE',
});
InvoiceFhr.belongsTo(Invoice, {
  foreignKey: 'invoice_id',
  as: 'invoice',
});

module.exports = InvoiceFhr;
