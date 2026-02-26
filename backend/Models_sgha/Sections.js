const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Section = sequelize.define('Section', {
    section_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    section_heading: {
        type: DataTypes.STRING,
        allowNull: false
    },

}, {
    tableName: 'Sections',
    timestamps: true
});

module.exports = Section;
