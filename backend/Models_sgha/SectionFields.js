const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Section = require('./Sections'); // adjust the path as needed

const SectionField = sequelize.define('SectionField', {
    section_field_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    section_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Section,
            key: 'section_id'
        },
        onDelete: 'CASCADE'
    },
    section_field_name: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    section_field_type: {
        type: DataTypes.ENUM('heading', 'subheading', 'text'),
        allowNull: false
    },
    required: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    value_amount: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'SectionFields',
    timestamps: false
});

module.exports = SectionField;
