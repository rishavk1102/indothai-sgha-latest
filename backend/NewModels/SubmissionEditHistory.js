const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const ClientAnnexASubmission = require('./ClientAnnexASubmission');

const SubmissionEditHistory = sequelize.define('SubmissionEditHistory', {
  edit_id: {
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
  editor_type: {
    type: DataTypes.ENUM('Client', 'Employee'),
    allowNull: false,
  },
  editor_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'client_registration_id for Client, user_id for Employee',
  },
  editor_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  previous_data: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Snapshot of checkbox_selections before the edit',
  },
  new_data: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Snapshot of checkbox_selections after the edit',
  },
  changes_summary: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Structured summary of what changed: { added: [], removed: [], modified: [] }',
  },
  edit_note: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Optional note from the editor describing the change',
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Version number for this submission (increments with each edit)',
  },
}, {
  timestamps: true,
  tableName: 'SubmissionEditHistory',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

// Associations
ClientAnnexASubmission.hasMany(SubmissionEditHistory, {
  foreignKey: 'submission_id',
  as: 'editHistory',
});
SubmissionEditHistory.belongsTo(ClientAnnexASubmission, {
  foreignKey: 'submission_id',
  as: 'submission',
});

module.exports = SubmissionEditHistory;
