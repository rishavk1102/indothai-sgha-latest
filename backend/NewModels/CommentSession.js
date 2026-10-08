const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CommentSession = sequelize.define('CommentSession', {
  session_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  submission_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('open', 'closed'),
    allowNull: false,
    defaultValue: 'open',
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  closed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  started_by_type: {
    type: DataTypes.ENUM('Client', 'Employee'),
    allowNull: false,
  },
  started_by_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  started_by_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: 'CommentSessions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = CommentSession;
