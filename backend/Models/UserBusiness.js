const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Business = require('./Business');

const UserBusiness = sequelize.define('UserBusiness', {
    user_business_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'user_id'
        },
        onDelete: 'CASCADE'
    },
    business_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Business,
            key: 'business_id'
        },
        onDelete: 'CASCADE'
    }
}, {
    tableName: 'UserBusiness',
    timestamps: true
});

module.exports = UserBusiness;
