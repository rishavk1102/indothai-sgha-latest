const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const MainAgreement = require('./MainAgreement');

const MainAgreementSection = sequelize.define('MainAgreementSection', {
    mas_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    ma_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: MainAgreement,
            key: 'ma_id',
        },
        onDelete: 'CASCADE',
    },
    section_type: {
        type: DataTypes.ENUM('heading', 'subheading', 'subchild', 'textarea', 'texteditor'),
        allowNull: false,
    },
    section_body: {
        type: DataTypes.TEXT,
        allowNull: true,
    }
}, {
    timestamps: true, // automatically creates createdAt & updatedAt
    tableName: 'MainAgreementSection',
});

module.exports = MainAgreementSection;