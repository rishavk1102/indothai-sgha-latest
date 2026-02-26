const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Airport = require('./Airport');
const Client_Registration = require('./Client_Registration');

const ClientAirport = sequelize.define('ClientAirport', {
    Client_Airport_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    client_registration_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Client_Registration,
            key: 'client_registration_id'
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
    tableName: 'ClientAirport',
    timestamps: true
});

module.exports = ClientAirport;
