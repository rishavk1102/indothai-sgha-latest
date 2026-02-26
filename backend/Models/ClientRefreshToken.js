const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Your Sequelize instance
const Client_Registration = require('./Client_Registration');


const ClientRefreshToken = sequelize.define('ClientRefreshToken', {
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
      key: 'client_registration_id'
    },
    onDelete: 'CASCADE'
  },
  token: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  tableName: 'ClientRefreshToken',
  timestamps: false,
});

module.exports = ClientRefreshToken;
