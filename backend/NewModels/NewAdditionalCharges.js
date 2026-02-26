const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
// Import related models
const Business = require('../Models/Business');
const Airport = require('../Models/Airport');

const NewAdditionalCharges = sequelize.define('NewAdditionalCharges', {
    Additional_charges_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    Business_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Business,
            key: 'Business_id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    Airport_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Airport,
            key: 'Airport_id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    Service_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    Remarks: {
        type: DataTypes.STRING,
        allowNull: true
    },
    unit_or_measure: {
        type: DataTypes.STRING,
        allowNull: true
    },
    rate_inr: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    rate_usd: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    Charge_type: {
        type: DataTypes.ENUM('Domestic', 'International'),
        defaultValue: 'Domestic'
    },
}, {
    tableName: 'NewAdditionalCharges',
    timestamps: true   // ✅ createdAt & updatedAt
});

module.exports = NewAdditionalCharges;