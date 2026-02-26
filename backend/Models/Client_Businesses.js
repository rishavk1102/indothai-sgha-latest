const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Client_Registration = require('./Client_Registration');
const Business = require('./Business');

const ClientBusiness = sequelize.define('ClientBusiness', {
    Client_business_id: {
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
    business_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Business,
            key: 'business_id'
        },
        onDelete: 'CASCADE'
    }
}, {
    tableName: 'ClientBusiness',
    timestamps: true
});

module.exports = ClientBusiness;
