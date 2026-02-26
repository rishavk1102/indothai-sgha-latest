// models/ProfileImage.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const ProfileImage = sequelize.define('ProfileImage', {
  profile_img_id: {
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
  },
  img_url: {
    type: DataTypes.STRING(255),
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: false,
  tableName: 'ProfileImage',
});

module.exports = ProfileImage;
