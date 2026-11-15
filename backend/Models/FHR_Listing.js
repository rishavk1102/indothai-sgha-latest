const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const FHR = require('./FHR');
const ExcelData = require('./Excel_data');
const FHR_Listing = sequelize.define('FHR_Listing', {
    fhr_listing_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    airport_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Airport',
            key: 'airport_id'
        },
        onDelete: 'CASCADE'
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
    excel_data_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: ExcelData,
            key: 'excel_data_id'
        },
        onDelete: 'CASCADE'
    },
    airline_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    aircraft_type: {
        type: DataTypes.STRING,
        allowNull: false
    },
    client_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('Departure', 'Arrival'),
        allowNull: false
    },
    Fhr_type: {
        type: DataTypes.ENUM('Schedule', 'Non-Schedule'),
        allowNull: false,
        defaultValue: 'Schedule'
    },
    flight_no: {
        type: DataTypes.STRING,
        allowNull: false
    },
    station: {
        type: DataTypes.STRING,
        allowNull: false
    },
    st: {
        type: DataTypes.TIME,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('Draft', 'Pending', 'Submitted', 'Completed', 'Cancelled'),
        allowNull: false,
        defaultValue: 'Draft'
    },
    date_of_flight: {
        type: DataTypes.DATE,
        allowNull: false
    },
}, {
    tableName: 'FHR_Listing',
    timestamps: true
});

module.exports = FHR_Listing;
