const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const FHR = require('./FHR');
const AircraftCharges = require('./Aircraft_Charges');
const AdditionalEquipment = sequelize.define('Additional_Equipment', {
  additional_equipment_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  fhr_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: FHR,
      key: 'fhr_id'
    },
    onDelete: 'CASCADE'
  },
  charges_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: AircraftCharges,
      key: 'charges_id'
    },
    onDelete: 'CASCADE'
  },
  tariff_line_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  /** Urgent extras not on the Active SGHA / walk-up tariff. */
  is_adhoc: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  /** Manual unit rate for ad-hoc rows (required to rate). */
  unit_rate: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  service_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  service_type: {
    type: DataTypes.STRING,
    allowNull: true
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: true
  },

  total_no_used: {
    type: DataTypes.INTEGER,
    allowNull: true
  },

  time_slots: {
    type: DataTypes.JSON, // Γ£à FIXED: Not JSON[]
    allowNull: true
  },

  total_time: {
    type: DataTypes.STRING,
    allowNull: true
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },

}, {
  tableName: 'Additional_Equipment',
  timestamps: true
});

module.exports = AdditionalEquipment;
