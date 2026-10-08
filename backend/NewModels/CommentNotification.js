const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CommentNotification = sequelize.define('CommentNotification', {
  notification_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  recipient_type: {
    type: DataTypes.ENUM('Client', 'Employee'),
    allowNull: false,
  },
  recipient_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  submission_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  comment_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  author_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  author_type: {
    type: DataTypes.ENUM('Client', 'Employee'),
    allowNull: false,
  },
  snippet: {
    type: DataTypes.STRING(180),
    allowNull: false,
    defaultValue: '',
  },
  context_label: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '',
  },
  read_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'CommentNotifications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['recipient_type', 'recipient_id', 'read_at'] },
    { fields: ['submission_id'] },
  ],
});

module.exports = CommentNotification;
