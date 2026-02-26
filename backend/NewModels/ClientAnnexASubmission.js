const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Client_Registration = require('../Models/Client_Registration');

const ClientAnnexASubmission = sequelize.define('ClientAnnexASubmission', {
  submission_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  client_registration_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Client_Registration,
      key: 'client_registration_id',
    },
    onDelete: 'CASCADE',
  },
  agreement_year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2025,
  },
  checkbox_selections: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Stores the complete Annex A checkbox state including serviceTypes and all sections',
  },
  submission_timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  status: {
    type: DataTypes.ENUM('Pending', 'In Progress', 'Completed', 'Suspended', 'Cancelled', 'Expired'),
    allowNull: false,
    defaultValue: 'Pending',
    comment: 'Status of the submission: Pending, In Progress, Completed, Suspended, Cancelled, or Expired',
  },
  client_status: {
    type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
    allowNull: true,
  },
  effective_from: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  effective_to: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  form_details: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Add New SGHA form data: company, address, flight type, services, applicable for, rate, etc.',
  },
}, {
  timestamps: true,
  tableName: 'ClientAnnexASubmission',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = ClientAnnexASubmission;

