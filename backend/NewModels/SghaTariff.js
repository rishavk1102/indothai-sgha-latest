const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SghaTariff = sequelize.define(
  'SghaTariff',
  {
    tariff_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    kind: {
      type: DataTypes.ENUM('Sgha', 'Walkup'),
      allowNull: false,
      defaultValue: 'Sgha',
    },
    submission_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    client_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    client_registration_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    business_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    airport_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    currency: {
      type: DataTypes.STRING(8),
      allowNull: false,
      defaultValue: 'INR',
    },
    effective_from: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    effective_to: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('Active', 'Superseded', 'Expired'),
      allowNull: false,
      defaultValue: 'Active',
    },
    approved_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    final_pdf_ref: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
  },
  {
    tableName: 'sgha_tariff',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['submission_id'] },
      { fields: ['client_id', 'airport_id', 'status'] },
      { fields: ['client_registration_id', 'status'] },
    ],
  }
);

// Soft associations for list/detail joins (FKs are not DB-enforced here).
try {
  const Client = require('../Models/Client');
  const Airport = require('../Models/Airport');
  const Business = require('../Models/Business');
  SghaTariff.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
  SghaTariff.belongsTo(Airport, { foreignKey: 'airport_id', as: 'airport' });
  SghaTariff.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });
} catch (err) {
  // Models may not be registered yet during isolated scripts.
}

module.exports = SghaTariff;
