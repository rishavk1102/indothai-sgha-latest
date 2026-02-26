const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const ClientAnnexASubmission = require('./ClientAnnexASubmission');

const SubmissionComment = sequelize.define('SubmissionComment', {
  comment_id: {
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
  parent_comment_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'SubmissionComments',
      key: 'comment_id',
    },
    onDelete: 'CASCADE',
    comment: 'Null for top-level comments, set for replies',
  },
  sender_type: {
    type: DataTypes.ENUM('Client', 'Employee'),
    allowNull: false,
  },
  sender_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'client_registration_id for Client, user_id for Employee',
  },
  sender_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  timestamps: true,
  tableName: 'SubmissionComments',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

// Self-referencing association for replies
SubmissionComment.hasMany(SubmissionComment, {
  foreignKey: 'parent_comment_id',
  as: 'replies',
});
SubmissionComment.belongsTo(SubmissionComment, {
  foreignKey: 'parent_comment_id',
  as: 'parent',
});

// Association with submission
ClientAnnexASubmission.hasMany(SubmissionComment, {
  foreignKey: 'submission_id',
  as: 'comments',
});
SubmissionComment.belongsTo(ClientAnnexASubmission, {
  foreignKey: 'submission_id',
  as: 'submission',
});

module.exports = SubmissionComment;
