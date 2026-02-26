const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Adjust the path according to your project structure
const ClientRegistration = require('./Client_Registration'); // Import the User model

const ResetPasswordTokenClient = sequelize.define('ResetPasswordTokenClient', {
  token_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  client_registration_id: {
    type: DataTypes.INTEGER,
    references: {
      model: ClientRegistration,
      key: 'client_registration_id',
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
  tableName: 'ResetPasswordTokenClient',  // Explicitly define the table name
});

module.exports = ResetPasswordTokenClient;
