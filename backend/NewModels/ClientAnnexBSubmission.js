const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Client_Registration = require('../Models/Client_Registration');

const ClientAnnexBSubmission = sequelize.define('ClientAnnexBSubmission', {
  annex_b_submission_id: {
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
}, {
  timestamps: true,
  tableName: 'ClientAnnexBSubmission',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = ClientAnnexBSubmission;
