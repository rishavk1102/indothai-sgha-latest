const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const ClientAnnexASubmission = require('./ClientAnnexASubmission');

const SubmissionVariables = sequelize.define('SubmissionVariables', {
  variable_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  submission_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: ClientAnnexASubmission,
      key: 'submission_id',
    },
    onDelete: 'CASCADE',
  },
  variable_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Name of the variable (e.g., annex_a_selection, aircraft_options, additional_charges, or custom variables)',
  },
  variable_value: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Value of the variable (can be JSON string for complex data)',
  },
}, {
  timestamps: true,
  tableName: 'SubmissionVariables',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['submission_id', 'variable_name'],
      name: 'unique_submission_variable',
    },
    {
      fields: ['submission_id'],
      name: 'idx_submission_id',
    },
    {
      fields: ['variable_name'],
      name: 'idx_variable_name',
    },
  ],
});

// Define associations
SubmissionVariables.belongsTo(ClientAnnexASubmission, {
  foreignKey: 'submission_id',
  as: 'submission',
});

module.exports = SubmissionVariables;

