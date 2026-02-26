const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const NewSghaTemplate = require('./NewSghaTemplate');

const MainAgreement = sequelize.define('MainAgreement', {
    ma_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    SGHA_Template_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: NewSghaTemplate,
            key: 'SGHA_Template_id',
        },
        onDelete: 'CASCADE', // Delete sections if the parent template is deleted
    },
    Main_template_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, {
    timestamps: true,
    tableName: 'MainAgreement',
});

module.exports = MainAgreement;