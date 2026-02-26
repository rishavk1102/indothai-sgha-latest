const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Client_Registration = require('../Models/Client_Registration');
const ClientAnnexASubmission = require('./ClientAnnexASubmission');
const ClientAnnexBSubmission = require('./ClientAnnexBSubmission');

/**
 * Submission table links Annex A and Annex B submissions into one logical submission.
 * Stores annex_a_submission_id and annex_b_submission_id for the same client/year flow.
 */
const Submission = sequelize.define('Submission', {
  id: {
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
  annex_a_submission_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: ClientAnnexASubmission,
      key: 'submission_id',
    },
    onDelete: 'CASCADE',
    comment: 'FK to ClientAnnexASubmission.submission_id',
  },
  annex_b_submission_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: ClientAnnexBSubmission,
      key: 'annex_b_submission_id',
    },
    onDelete: 'CASCADE',
    comment: 'FK to ClientAnnexBSubmission.annex_b_submission_id',
  },
}, {
  timestamps: true,
  tableName: 'Submission',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['annex_a_submission_id', 'annex_b_submission_id'],
      name: 'unique_annex_a_b_pair',
    },
    { fields: ['client_registration_id'], name: 'idx_submission_client' },
    { fields: ['agreement_year'], name: 'idx_submission_year' },
  ],
});

module.exports = Submission;
