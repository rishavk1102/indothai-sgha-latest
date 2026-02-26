const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Role = require('./Role');

const User = sequelize.define('User', {
    user_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    first_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    last_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    phone_no: {
        type: DataTypes.STRING,
        allowNull: false
    },
    alternate_no: {
        type: DataTypes.STRING,
        allowNull: true
    },
    personal_email: {
        type: DataTypes.STRING,
        allowNull: true
    },
    employee_no: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    joining_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    Role_id: {
        type: DataTypes.INTEGER,
        references: {
            model: Role,
            key: 'Role_id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    },
    user_type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Unverified'
    }
}, {
    tableName: 'User',
    timestamps: true
});

module.exports = User;
