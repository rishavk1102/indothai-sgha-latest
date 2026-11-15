const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Aircraft = require('./Aircraft');
const User = require('./User');

const ExcelData = sequelize.define('ExcelData', {
    excel_data_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    aircraft_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Aircraft,
            key: 'aircraft_id'
        },
        onDelete: 'CASCADE'
    },
    arrival_flight_no: {
        type: DataTypes.STRING,
        allowNull: true
    },
    departure_flight_no: {
        type: DataTypes.STRING,
        allowNull: true
    },
    type_of_aircraft: {
        type: DataTypes.STRING,
        allowNull: true
    },
    from_iata: {
        type: DataTypes.STRING,
        allowNull: true
    },
    to_iata: {
        type: DataTypes.STRING,
        allowNull: true
    },
    days: {
        type: DataTypes.STRING,
        allowNull: true
    },
    sta: {
        type: DataTypes.TIME,
        allowNull: true
    },
    std: {
        type: DataTypes.TIME,
        allowNull: true
    },
    wef: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    wet: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    fhr_creation_status: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    inserted_by_user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'user_id'
        },
        onDelete: 'CASCADE'
    },
    remarks: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'ExcelData',
    timestamps: true, // Adds createdAt and updatedAt
});

module.exports = ExcelData;
