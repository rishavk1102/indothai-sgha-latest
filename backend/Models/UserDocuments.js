const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // adjust the path as necessary
const User = require('./User'); // assuming the User model is in the same folder

const UserDocuments = sequelize.define('UserDocuments', {
  document_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'user_id', // should match the actual primary key field in User model
    },
    allowNull: false,
    onDelete: 'CASCADE', // deletes document if associated user is deleted
  },
  document_url: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  timestamps: true, // enables createdAt and updatedAt fields
  tableName: 'UserDocuments', // specify table name
});

module.exports = UserDocuments;
