const {
  DataTypes
} = require('sequelize');
const sequelize = require('../config/database');

// Import foreign models
const LetterTemplate = require('./Letter_template');
// const MainAnnexure = require('./MainAnnexure');
const Business = require('../Models/Business');
const Client = require('../Models/Client');
const SGHA_Main_agreement = require('./SGHA_Main_agreement');
const SGHAgreementTemplate = sequelize.define('SGHAgreementTemplate', {
  SGHA_template_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  template_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  SGHA_Main_agreement_id: {
    type: DataTypes.INTEGER,
    references: {
      model: SGHA_Main_agreement,
      key: 'SGHA_Main_agreement_id'
    },
    onDelete: 'CASCADE'
  },
  // main_annexure_id: {
  //   type: DataTypes.INTEGER,
  //   references: {
  //     model: MainAnnexure,
  //     key: 'main_annexure_id'
  //   },
  //   onDelete: 'CASCADE'
  // }

  business_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Business, // Must match the table name
      key: 'business_id'
    },
    onDelete: 'CASCADE'
  },

  client_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Client,
      key: 'client_id'
    },
    onDelete: 'CASCADE'
  },
  status: {
    type: DataTypes.ENUM('Draft', 'Submitted', 'Sent', 'Approved', 'Rejected'),
    defaultValue: 'Draft',
  },

}, {
  tableName: 'SGH_Agreement_Template',
  timestamps: true
});


module.exports = SGHAgreementTemplate;