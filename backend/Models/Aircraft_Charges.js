const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Aircraft = require('./Aircraft');
const ChargeType = require('./ChargeType');
const Category = require('./Category');
const AircraftCharges = sequelize.define('Aircraft_Charges', {
    charges_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
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
    category_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // set to false if mandatory
        references: {
            model: Category,
            key: 'category_id'
        }
    },
    charge_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: ChargeType,
            key: 'charge_type_id'
        },
    },
    service: {
        type: DataTypes.STRING,
        allowNull: true
    },
    unit: {
        type: DataTypes.STRING,
        allowNull: true
    },
    rate_type: {
        type: DataTypes.ENUM('Fixed', 'Percentage'),
        allowNull: false,
        defaultValue: 'Fixed'
    },
    reference_charge_type_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: ChargeType,
            key: 'charge_type_id'
        }
    },
    count: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    include_aai: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    rate: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    aai_levy: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    total_rate: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    of_count: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    of_rate: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    of_aai_levy: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    total_of_rate: {
        type: DataTypes.FLOAT,
        allowNull: true
    }
}, {
    tableName: 'Aircraft_Charges',
    timestamps: true
});

module.exports = AircraftCharges;
