const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const FHR = require('./FHR');
const User = require('./User');

const FHREditSessions = sequelize.define('FHR_Edit_Sessions', {
    session_id: {
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
    section: {
        type: DataTypes.ENUM(
            'Basic_Details',
            'Arrival_Details',
            'Departure_Details',
            'Man_Power_Details',
            'Cargo_Details',
            'Additional_Equipment'
        ),
        allowNull: false
    },
    started_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    last_active_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    tableName: 'FHR_Edit_Sessions',
    timestamps: false
});

module.exports = FHREditSessions;
