const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Airport = require('./Airport');

const UserAirport = sequelize.define('UserAirport', {
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
   airport_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Airport,
            key: 'airport_id'
        },
        onDelete: 'CASCADE'
    },
}, {
    tableName: 'UserAirport',
    timestamps: true
});

module.exports = UserAirport;
