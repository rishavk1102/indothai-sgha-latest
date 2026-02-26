const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Adjust the path as necessary

const ClientRegistrationLink = sequelize.define('ClientRegistrationLink', {
    client_registration_link_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    Client_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    link_url: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    token: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    registration: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    link_status: {
        type: DataTypes.ENUM('Active', 'Inactive'),
        allowNull: false,
        defaultValue: 'Active',
    },
}, {
    tableName: 'client_registration_link',
    timestamps: true,
});

module.exports = ClientRegistrationLink;