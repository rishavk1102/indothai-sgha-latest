const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Adjust the path according to your project structure
const User = require('./User'); // Import the User model

const PasswordResetToken = sequelize.define('PasswordResetToken', {
  token_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'user_id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    allowNull: false,
  },
  token: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  timestamps: false,
  tableName: 'PasswordResetTokens',  // Explicitly define the table name
});

module.exports = PasswordResetToken;
