const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const FHR = require('./FHR');
const User = require('./User'); // Assuming your User model is named 'User'

const FHR_Users = sequelize.define('FHR_Users', {
    fhr_user_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    fhr_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: FHR,
            key: 'fhr_id'
        },
        onDelete: 'CASCADE'
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
    entry_time: {
        type: DataTypes.DATE,
        allowNull: false
    },
    exit_time: {
        type: DataTypes.DATE,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('Working', 'Exited'),
        allowNull: false,
        defaultValue: 'Working'
    }
}, {
    tableName: 'FHR_Users',
    timestamps: true
});

module.exports = FHR_Users;
