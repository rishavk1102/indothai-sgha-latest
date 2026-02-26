const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Airport = require('../Models/Airport');
const Business = require('../Models/Business');

const CompanyAircraft = sequelize.define('CompanyAircraft', {
    aircraft_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    business_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Business,
            key: 'business_id'
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

    Aircraft_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    Aircraft_model: {
        type: DataTypes.STRING,
        allowNull: false
    },
    Company_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    MTOW: {
        type: DataTypes.STRING,
        allowNull: true
    },
    Limit_per_incident: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    Price_per_Limit_inr: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    Price_per_Limit_usd: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    Flight_type: {
        type: DataTypes.ENUM('Domestic', 'International'),
        defaultValue: 'Domestic'
    },

}, {
    tableName: 'CompanyAircraft',
    timestamps: true
});

module.exports = CompanyAircraft;