const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const ClientAnnexBSubmission = require('./ClientAnnexBSubmission');

const AnnexBSubmissionVariables = sequelize.define('AnnexBSubmissionVariables', {
  variable_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  annex_b_submission_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: ClientAnnexBSubmission,
      key: 'annex_b_submission_id',
    },
    onDelete: 'CASCADE',
  },
  variable_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Name of the variable (e.g., aircraft_options, additional_charges, or custom variables)',
  },
  variable_value: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Value of the variable (can be JSON string for complex data)',
  },
}, {
  timestamps: true,
  tableName: 'AnnexBSubmissionVariables',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['annex_b_submission_id', 'variable_name'],
      name: 'unique_annex_b_submission_variable',
    },
    {
      fields: ['annex_b_submission_id'],
      name: 'idx_annex_b_submission_id',
    },
    {
      fields: ['variable_name'],
      name: 'idx_variable_name',
    },
  ],
});

AnnexBSubmissionVariables.belongsTo(ClientAnnexBSubmission, {
  foreignKey: 'annex_b_submission_id',
  as: 'submission',
});

module.exports = AnnexBSubmissionVariables;
