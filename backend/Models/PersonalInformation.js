const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const PersonalInformation = sequelize.define('PersonalInformation', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        references: {
            model: User,
            key: 'user_id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    },
    pan_card_no: {
        type: DataTypes.STRING(20),
    },
    passport_no: {
        type: DataTypes.STRING(20),
        allowNull: true,
    },
    aadhar_no: {
        type: DataTypes.STRING(20),
    },
    nationality: {
        type: DataTypes.STRING(50),
    },
    religion: {
        type: DataTypes.STRING(50),
    },
    marital_status: {
        type: DataTypes.STRING(50),
    },
    employment_of_spouse: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    no_of_children: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    date_of_birth: {
        type: DataTypes.DATE,
    },
    Address1: {
        type: DataTypes.STRING(255),
    },
    Address2: {
        type: DataTypes.STRING(255),
    },
    City: {
        type: DataTypes.STRING(100),
    },
    State: {
        type: DataTypes.STRING(100),
    },
    gender: {
        type: DataTypes.ENUM('Male', 'Female'),
        allowNull: false
    },
    Country: {
        type: DataTypes.STRING(255),
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    timestamps: false,
    tableName: 'PersonalInformation',
});

module.exports = PersonalInformation;
