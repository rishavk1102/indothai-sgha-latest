// Models/ServicePrice.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Business = require('./Business');
const Airport = require('./Airport');
const AircraftCategory = require('./AircraftCategory');
const FlightType = require('./FlightType');
const Category = require('./Category');
const ServicePrice = sequelize.define('ServicePrice', {
    Service_Price_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    Business_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Business,
            key: 'business_id',
        },
        onDelete: 'CASCADE',
    },
    Airport_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Airport,
            key: 'airport_id',
        },
        onDelete: 'CASCADE',
    },
    Aircraft_category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: AircraftCategory,
            key: 'Aircraft_category_id',
        },
        onDelete: 'CASCADE',
    },
    Flight_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: FlightType,
            key: 'flight_type_id',
        },
        onDelete: 'CASCADE',
    },
    category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Category,
            key: 'category_id',
        },
        onDelete: 'CASCADE',
    },
    Price: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
}, {
    tableName: 'service_price',
    timestamps: true, // createdAt, updatedAt
});

module.exports = ServicePrice;
