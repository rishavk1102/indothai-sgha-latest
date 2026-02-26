const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NewSghaTemplate = sequelize.define('NewSghaTemplate', {
  SGHA_Template_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  template_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  template_year:{
    type: DataTypes.STRING,
    allowNull:false,
  },
  type: {
    type: DataTypes.ENUM('Main Agreement', 'Annex A', 'Annex B'),
    allowNull: true,
    field: 'type', // Explicitly map to column name (Sequelize will escape it)
  },
  content: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: 'NewSghaTemplate',
});

module.exports = NewSghaTemplate;