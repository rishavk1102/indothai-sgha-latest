const FHR = require('../Models/FHR');
const Business = require('../Models/Business');
const Client = require('../Models/Client');
const Airport = require('../Models/Airport');
const Airline = require('../Models/Airlines');
const Category = require('../Models/Category');
const Aircraft = require('../Models/Aircraft');
const User = require('../Models/User');

const FHR_Listing = require('../Models/FHR_Listing');
const BasicDetails = require('../Models/Basic_Details');
const ArrivalDetails = require('../Models/Arrival_Details');
const DepartureDetails = require('../Models/Departure_Details');
const ManPowerDetails = require('../Models/Man_Power_Details');
const CargoDetails = require('../Models/Cargo_Details');
const AdditionalEquipment = require('../Models/Additional_Equipment');
const EquipmentTime = require('../Models/Equipment_Time');
const FHR_Users = require('../Models/FHR_users');
const FHREditSessions = require('../Models/FHR_Edit_Sessions');
const Aircraft_Charges = require('../Models/Aircraft_Charges');
const AdditionalEquipmentCreation = require('../Models/Additional_equipment_creation');
const ChargeType = require('../Models/ChargeType');
const ExcelData = require('../Models/Excel_data');
const ExcelFile = require('../Models/ExcelFile');

// Associations
const createFHRAssociations = () => {
    FHR.belongsTo(Business, {
        foreignKey: 'business_id',
        as: 'business',
        onDelete: 'CASCADE'
    });
    Business.hasMany(FHR, {
        foreignKey: 'business_id',
        as: 'fhrs',
        onDelete: 'CASCADE'
    });

    FHR.belongsTo(Client, {
        foreignKey: 'client_id',
        as: 'client',
        onDelete: 'CASCADE'
    });
    Client.hasMany(FHR, {
        foreignKey: 'client_id',
        as: 'fhrs',
        onDelete: 'CASCADE'
    });

    FHR.belongsTo(Airport, {
        foreignKey: 'airport_id',
        as: 'airport',
        onDelete: 'CASCADE'
    });
    Airport.hasMany(FHR, {
        foreignKey: 'airport_id',
        as: 'fhrs',
        onDelete: 'CASCADE'
    });

    FHR.belongsTo(Airline, {
        foreignKey: 'airline_id',
        as: 'airline',
        onDelete: 'CASCADE'
    });
    Airline.hasMany(FHR, {
        foreignKey: 'airline_id',
        as: 'fhrs',
        onDelete: 'CASCADE'
    });

    FHR.belongsTo(Category, {
        foreignKey: 'category_id',
        as: 'category',
        onDelete: 'CASCADE'
    });
    Category.hasMany(FHR, {
        foreignKey: 'category_id',
        as: 'fhrs',
        onDelete: 'CASCADE'
    });

    FHR.belongsTo(Aircraft, {
        foreignKey: 'aircraft_id',
        as: 'aircraft',
        onDelete: 'CASCADE'
    });
    Aircraft.hasMany(FHR, {
        foreignKey: 'aircraft_id',
        as: 'fhrs',
        onDelete: 'CASCADE'
    });

    FHR.belongsTo(User, {
        foreignKey: 'submitted_by',
        as: 'submittedUser',
        onDelete: 'SET NULL'
    });
    User.hasMany(FHR, {
        foreignKey: 'submitted_by',
        as: 'submittedFhrs',
        onDelete: 'SET NULL'
    });

    // Γ₧ñ FHR_Listing Γåö Airport
    FHR_Listing.belongsTo(Airport, {
        foreignKey: 'airport_id',
        as: 'airport',
        onDelete: 'CASCADE'
    });
    Airport.hasMany(FHR_Listing, {
        foreignKey: 'airport_id',
        as: 'fhr_listings',
        onDelete: 'CASCADE'
    });
    // Γ₧ñ FHR hasMany child tables
    FHR.hasMany(FHR_Listing, { foreignKey: 'fhr_id', as: 'fhr_listings', onDelete: 'CASCADE' });
    FHR_Listing.belongsTo(FHR, { foreignKey: 'fhr_id', as: 'fhr' });

    FHR.hasOne(BasicDetails, { foreignKey: 'fhr_id', as: 'basic_details', onDelete: 'CASCADE' });
    BasicDetails.belongsTo(FHR, { foreignKey: 'fhr_id', as: 'fhr' });

    FHR.hasOne(ArrivalDetails, { foreignKey: 'fhr_id', as: 'arrival_details', onDelete: 'CASCADE' });
    ArrivalDetails.belongsTo(FHR, { foreignKey: 'fhr_id', as: 'fhr' });

    FHR.hasOne(DepartureDetails, { foreignKey: 'fhr_id', as: 'departure_details', onDelete: 'CASCADE' });
    DepartureDetails.belongsTo(FHR, { foreignKey: 'fhr_id', as: 'fhr' });

    FHR.hasOne(ManPowerDetails, { foreignKey: 'fhr_id', as: 'man_power_details', onDelete: 'CASCADE' });
    ManPowerDetails.belongsTo(FHR, { foreignKey: 'fhr_id', as: 'fhr' });

    FHR.hasOne(CargoDetails, { foreignKey: 'fhr_id', as: 'cargo_details', onDelete: 'CASCADE' });
    CargoDetails.belongsTo(FHR, { foreignKey: 'fhr_id', as: 'fhr' });

    FHR.hasMany(AdditionalEquipment, { foreignKey: 'fhr_id', as: 'additional_equipments', onDelete: 'CASCADE' });
    AdditionalEquipment.belongsTo(FHR, { foreignKey: 'fhr_id', as: 'fhr' });

    // Γ₧ñ EquipmentTime Γåö AdditionalEquipment
    AdditionalEquipment.hasMany(EquipmentTime, {
        foreignKey: 'additional_equipment_id',
        as: 'equipment_times',
        onDelete: 'CASCADE'
    });
    EquipmentTime.belongsTo(AdditionalEquipment, {
        foreignKey: 'additional_equipment_id',
        as: 'additional_equipment',
        onDelete: 'CASCADE'
    });

    // Γ₧ñ FHR Γåö Users through FHR_Users
    FHR.hasMany(FHR_Users, {
        foreignKey: 'fhr_id',
        as: 'assigned_users',
        onDelete: 'CASCADE'
    });
    FHR_Users.belongsTo(FHR, {
        foreignKey: 'fhr_id',
        as: 'fhr',
        onDelete: 'CASCADE'
    });

    User.hasMany(FHR_Users, {
        foreignKey: 'user_id',
        as: 'fhr_assignments',
        onDelete: 'CASCADE'
    });
    FHR_Users.belongsTo(User, {
        foreignKey: 'user_id',
        as: 'user',
        onDelete: 'CASCADE'
    });

    // FHR_Edit_Sessions ΓåÆ FHR
    FHREditSessions.belongsTo(FHR, {
        foreignKey: 'fhr_id',
        as: 'fhr',
        onDelete: 'CASCADE'
    });
    FHR.hasMany(FHREditSessions, {
        foreignKey: 'fhr_id',
        as: 'editSessions',
        onDelete: 'CASCADE'
    });

    // FHR_Edit_Sessions ΓåÆ User
    FHREditSessions.belongsTo(User, {
        foreignKey: 'user_id',
        as: 'editor',
        onDelete: 'CASCADE'
    });
    User.hasMany(FHREditSessions, {
        foreignKey: 'user_id',
        as: 'editSessions',
        onDelete: 'CASCADE'
    });

    // Inside AircraftCharges.js or association config file
    Aircraft_Charges.hasOne(AdditionalEquipment, {
        foreignKey: 'charges_id',
        as: 'additional_equipment',
        onDelete: 'CASCADE'
    });

    AdditionalEquipment.belongsTo(Aircraft_Charges, {
        foreignKey: 'charges_id',
        as: 'charges',
        onDelete: 'CASCADE'
    });
    
    FHR.hasOne(AdditionalEquipmentCreation, {
        foreignKey: 'fhr_id',
        as: 'additional_equipment_creation',
        onDelete: 'CASCADE'
    });

    AdditionalEquipmentCreation.belongsTo(FHR, {
        foreignKey: 'fhr_id',
        as: 'fhr',
        onDelete: 'CASCADE'
    });

    // Charge catalog + Excel import (kept here so IndoThai UserAssociations stays untouched)
    Aircraft.hasMany(Aircraft_Charges, {
        foreignKey: 'aircraft_id',
        as: 'charges',
        onDelete: 'CASCADE'
    });
    Aircraft_Charges.belongsTo(Aircraft, {
        foreignKey: 'aircraft_id',
        as: 'aircraft'
    });

    ChargeType.hasMany(Aircraft_Charges, {
        foreignKey: 'charge_type_id',
        as: 'charges',
        onDelete: 'CASCADE'
    });
    Aircraft_Charges.belongsTo(ChargeType, {
        foreignKey: 'charge_type_id',
        as: 'chargeType'
    });
    ChargeType.hasMany(Aircraft_Charges, {
        foreignKey: 'reference_charge_type_id',
        as: 'ReferencedCharges',
        onDelete: 'CASCADE'
    });
    Aircraft_Charges.belongsTo(ChargeType, {
        foreignKey: 'reference_charge_type_id',
        as: 'ReferencedChargeType'
    });

    Aircraft_Charges.belongsTo(Category, {
        foreignKey: 'category_id',
        as: 'category',
        onDelete: 'CASCADE'
    });
    Category.hasMany(Aircraft_Charges, {
        foreignKey: 'category_id',
        as: 'charges',
        onDelete: 'CASCADE'
    });

    ExcelData.belongsTo(Aircraft, {
        foreignKey: 'aircraft_id',
        as: 'aircraft',
        onDelete: 'CASCADE'
    });
    Aircraft.hasMany(ExcelData, {
        foreignKey: 'aircraft_id',
        as: 'excel_data',
        onDelete: 'CASCADE'
    });
    ExcelData.belongsTo(User, {
        foreignKey: 'inserted_by_user_id',
        as: 'inserted_by',
        onDelete: 'CASCADE'
    });
    User.hasMany(ExcelData, {
        foreignKey: 'inserted_by_user_id',
        as: 'uploaded_excel_data',
        onDelete: 'CASCADE'
    });
    ExcelFile.belongsTo(User, {
        foreignKey: 'inserted_by_user_id',
        as: 'inserted_by',
        onDelete: 'CASCADE'
    });
    User.hasMany(ExcelFile, {
        foreignKey: 'inserted_by_user_id',
        as: 'uploaded_excel_files',
        onDelete: 'CASCADE'
    });

    FHR.belongsTo(ExcelData, {
        foreignKey: 'excel_data_id',
        as: 'excel_data',
        onDelete: 'SET NULL'
    });
};
module.exports = createFHRAssociations;
