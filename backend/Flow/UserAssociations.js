const Business = require('../Models/Business');
const Airport = require('../Models/Airport');
const User = require('../Models/User');
const Role = require('../Models/Role');
// const BankInformation = require('../Models/BankInformation');
const PersonalInformation = require('../Models/PersonalInformation');
// const EmergencyContact = require('../Models/EmergencyContact');
const RefreshToken = require('../Models/RefreshToken');
const ProfileImage = require('../Models/ProfileImage');
const UserDocuments = require('../Models/UserDocuments');
const Permission = require('../Models/Permission');
const Page = require('../Models/Page');
const MenuGroup = require('../Models/MenuGroup');
const UserBusiness = require('../Models/UserBusiness');
const Client = require('../Models/Client');
const Airline = require('../Models/Airlines');
const Aircraft = require('../Models/Aircraft');
const UserAirport = require('../Models/UserAirports');
const Category = require('../Models/Category');
const AircraftCategory = require('../Models/AircraftCategory');
const FlightType = require('../Models/FlightType');
const ServicePrice = require('../Models/ServicePrice');

const CompanyAircraft = require('../NewModels/CompanyAircraft');
const ClientRegistration = require('../Models/Client_Registration');
const ClientAirport = require('../Models/Client_Airports');
const ClientBusiness = require('../Models/Client_Businesses');
const ClientRefreshToken = require('../Models/ClientRefreshToken');
const Additional_charges = require('../Models/Additional_charges');
const Temporary_Sgha = require('../Models/Temporary_Sgha');
const NewAdditionalCharges = require('../NewModels/NewAdditionalCharges');
const ClientAnnexASubmission = require('../NewModels/ClientAnnexASubmission');
const ClientAnnexBSubmission = require('../NewModels/ClientAnnexBSubmission');
const AnnexBSubmissionVariables = require('../NewModels/AnnexBSubmissionVariables');
const Submission = require('../NewModels/Submission');
// Associations
const createUserAssociations = () => {

    // User ↔ Business (Many-to-Many)
    User.belongsToMany(Business, {
        through: UserBusiness,
        foreignKey: 'user_id',
        otherKey: 'business_id',
        as: 'businesses', // user.businesses
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });

    Business.belongsToMany(User, {
        through: UserBusiness,
        foreignKey: 'business_id',
        otherKey: 'user_id',
        as: 'users', // business.users
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });


    // User ↔ Airport (Many-to-Many)
    User.belongsToMany(Airport, {
        through: UserAirport,
        foreignKey: 'user_id',
        otherKey: 'airport_id',
        as: 'airports', // user.airports
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });

    Airport.belongsToMany(User, {
        through: UserAirport,
        foreignKey: 'airport_id',
        otherKey: 'user_id',
        as: 'users', // airport.users
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });

    // Role has many Users
    Role.hasMany(User, {
        foreignKey: 'Role_id',
        as: 'users',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    });
    User.belongsTo(Role, {
        foreignKey: 'Role_id',
        as: 'role',
    });

    // User has one PersonalInformation
    User.hasOne(PersonalInformation, {
        foreignKey: 'user_id',
        as: 'personalInformation',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    PersonalInformation.belongsTo(User, {
        foreignKey: 'user_id',
        as: 'user',
    });

    // // User has multiple EmergencyContacts
    // User.hasOne(EmergencyContact, {
    //     foreignKey: 'user_id',
    //     as: 'emergencyContacts',
    //     onDelete: 'CASCADE',
    //     onUpdate: 'CASCADE',
    // });
    // EmergencyContact.belongsTo(User, {
    //     foreignKey: 'user_id',
    //     as: 'user'
    // });

    // // User has one BankDetails
    // User.hasOne(BankInformation, {
    //     foreignKey: 'user_id',
    //     as: 'bankDetails', // Assign unique alias for BankDetails
    //     onDelete: 'CASCADE',
    //     onUpdate: 'CASCADE',
    // });
    // BankInformation.belongsTo(User, { foreignKey: 'user_id', as: 'userBankDetails' });

    // User has one ProfileImage
    User.hasOne(ProfileImage, {
        foreignKey: 'user_id',
        as: 'profileImage', // Assign unique alias for ProfileImage
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    ProfileImage.belongsTo(User, { foreignKey: 'user_id', as: 'userProfileImage' });

    // User has many RefreshTokens
    User.hasOne(RefreshToken, {
        foreignKey: 'user_id',
        as: 'refreshTokens',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    RefreshToken.belongsTo(User, {
        foreignKey: 'user_id',
        as: 'user',
    });

    // User has many UserDocuments
    User.hasMany(UserDocuments, {
        foreignKey: 'user_id',
        as: 'documents',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    UserDocuments.belongsTo(User, {
        foreignKey: 'user_id',
        as: 'user',
    });



    Role.hasMany(Permission, { foreignKey: 'role_id' });
    Permission.belongsTo(Role, { foreignKey: 'role_id' });

    Page.hasMany(Permission, { foreignKey: 'page_id' });
    Permission.belongsTo(Page, { foreignKey: 'page_id' });


    // Associations
    // Relation: One MenuGroup hasMany Pages
    MenuGroup.hasMany(Page, { foreignKey: 'menu_group_id', as: 'pages' });
    Page.belongsTo(MenuGroup, { foreignKey: 'menu_group_id', as: 'menu_group' });


    // --- Airport <-> Business ---
    Airport.belongsTo(Business, {
        foreignKey: 'business_id',
        as: 'business', // ✅ Each airport belongs to one business
        onDelete: 'CASCADE'
    });

    Business.hasMany(Airport, {
        foreignKey: 'business_id',
        as: 'airports', // ✅ Rename alias to 'airports' to avoid conflict
        onDelete: 'CASCADE'
    });


    // Business -> Client (One-to-Many)
    Business.hasMany(Client, {
        foreignKey: 'business_id',
        as: 'clients',
        onDelete: 'CASCADE'
    });
    Client.belongsTo(Business, {
        foreignKey: 'business_id',
        as: 'business',
        onDelete: 'CASCADE'
    });

    // Airport -> Client (One-to-Many)
    Airport.hasMany(Client, {
        foreignKey: 'airport_id',
        as: 'clients',
        onDelete: 'CASCADE'
    });
    Client.belongsTo(Airport, {
        foreignKey: 'airport_id',
        as: 'airport',
        onDelete: 'CASCADE'
    });

    // Airport -> Airline (One-to-Many)
    Airport.hasMany(Airline, {
        foreignKey: 'airport_id',
        as: 'airlines',
        onDelete: 'CASCADE'
    });
    Airline.belongsTo(Airport, {
        foreignKey: 'airport_id',
        as: 'airport',
        onDelete: 'CASCADE'
    });

    // Business -> Airline (One-to-Many)
    Business.hasMany(Airline, {
        foreignKey: 'business_id',
        as: 'airlines',
        onDelete: 'CASCADE'
    });
    Airline.belongsTo(Business, {
        foreignKey: 'business_id',
        as: 'business',
        onDelete: 'CASCADE'
    });

    // Client -> Airline (One-to-Many)
    Client.hasMany(Airline, {
        foreignKey: 'client_id',
        as: 'airlines',
        onDelete: 'CASCADE'
    });
    Airline.belongsTo(Client, {
        foreignKey: 'client_id',
        as: 'client',
        onDelete: 'CASCADE'
    });


    // Airline -> Aircraft (One-to-Many)
    Airline.hasMany(Aircraft, {
        foreignKey: 'airline_id',
        as: 'aircrafts',
        onDelete: 'CASCADE'
    });
    Aircraft.belongsTo(Airline, {
        foreignKey: 'airline_id',
        as: 'airline',
        onDelete: 'CASCADE'
    });





    // ClientRegistration ↔ Role (Many-to-One)
    Role.hasMany(ClientRegistration, {
        foreignKey: 'Role_id',
        as: 'clientRegistrations',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    });
    ClientRegistration.belongsTo(Role, {
        foreignKey: 'Role_id',
        as: 'role',
    });

    // ClientAirport ↔ ClientRegistration (Many-to-One)
    ClientRegistration.hasMany(ClientAirport, {
        foreignKey: 'client_registration_id',
        as: 'clientAirports',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    ClientAirport.belongsTo(ClientRegistration, {
        foreignKey: 'client_registration_id',
        as: 'clientRegistration',
    });

    // ClientAirport ↔ Airport (Many-to-One)
    Airport.hasMany(ClientAirport, {
        foreignKey: 'airport_id',
        as: 'clientAirports',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    ClientAirport.belongsTo(Airport, {
        foreignKey: 'airport_id',
        as: 'airport',
    });

    // ClientBusiness ↔ ClientRegistration (Many-to-One)
    ClientRegistration.hasMany(ClientBusiness, {
        foreignKey: 'client_registration_id',
        as: 'clientBusinesses',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    ClientBusiness.belongsTo(ClientRegistration, {
        foreignKey: 'client_registration_id',
        as: 'clientRegistration',
    });

    // ClientBusiness ↔ Business (Many-to-One)
    Business.hasMany(ClientBusiness, {
        foreignKey: 'business_id',
        as: 'clientBusinesses',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    ClientBusiness.belongsTo(Business, {
        foreignKey: 'business_id',
        as: 'business',
    });

    // Client ↔ ClientRegistration (Many-to-One)
    ClientRegistration.hasMany(Client, {
        foreignKey: 'client_registration_id',
        as: 'clients',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    Client.belongsTo(ClientRegistration, {
        foreignKey: 'client_registration_id',
        as: 'clientRegistration',
    });


    // One ClientRegistration has one RefreshToken
    ClientRegistration.hasOne(ClientRefreshToken, {
        foreignKey: 'client_registration_id',
        as: 'refreshToken',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });

    // RefreshToken belongs to one ClientRegistration
    ClientRefreshToken.belongsTo(ClientRegistration, {
        foreignKey: 'client_registration_id',
        as: 'client'
    });


    // AircraftCategory ↔ Aircraft
    AircraftCategory.hasMany(Aircraft, {
        foreignKey: 'Aircraft_category_id',
        as: 'aircrafts',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });

    Aircraft.belongsTo(AircraftCategory, {
        foreignKey: 'Aircraft_category_id',
        as: 'category',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });

    // ServicePrice ↔ AircraftCategory
    ServicePrice.belongsTo(AircraftCategory, {
        foreignKey: 'Aircraft_category_id',
        as: 'aircraftCategory', // changed alias
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    AircraftCategory.hasMany(ServicePrice, {
        foreignKey: 'Aircraft_category_id',
        as: 'servicePrices',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });

    // ServicePrice ↔ FlightType
    ServicePrice.belongsTo(FlightType, {
        foreignKey: 'Flight_type_id',
        as: 'flightType',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    FlightType.hasMany(ServicePrice, {
        foreignKey: 'Flight_type_id',
        as: 'servicePrices',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });

    // ServicePrice ↔ Business
    ServicePrice.belongsTo(Business, {
        foreignKey: 'Business_id',
        as: 'business',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    Business.hasMany(ServicePrice, {
        foreignKey: 'Business_id',
        as: 'servicePrices',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });

    // ServicePrice ↔ Airport
    ServicePrice.belongsTo(Airport, {
        foreignKey: 'Airport_id',
        as: 'airport',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    Airport.hasMany(ServicePrice, {
        foreignKey: 'Airport_id',
        as: 'servicePrices',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });


    // ServicePrice ↔ Category (Services)
    ServicePrice.belongsTo(Category, {
        foreignKey: 'category_id',
        as: 'serviceCategory', // changed alias
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    Category.hasMany(ServicePrice, {
        foreignKey: 'category_id',
        as: 'servicePrices',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });



    Business.hasMany(Additional_charges, {
        foreignKey: 'Business_id',
        as: 'additionalCharges',
        onDelete: 'CASCADE',
    });
    Additional_charges.belongsTo(Business, {
        foreignKey: 'Business_id',
        as: 'business'
    });

    Airport.hasMany(Additional_charges, {
        foreignKey: 'Airport_id',
        as: 'additionalCharges',
        onDelete: 'CASCADE',
    });
    Additional_charges.belongsTo(Airport, {
        foreignKey: 'Airport_id',
        as: 'airport'
    });


    Temporary_Sgha.belongsTo(ClientRegistration, {
        foreignKey: 'client_registration_id',
        as: 'clientRegistration',
        onDelete: 'CASCADE',
    });
    ClientRegistration.hasMany(Temporary_Sgha, {
        foreignKey: 'client_registration_id',
        as: 'temporarySghas',
        onDelete: 'CASCADE',
    });

    Temporary_Sgha.belongsTo(Airport, {
        foreignKey: 'airport_id',
        as: 'airport',
        onDelete: 'CASCADE',
    });
    Airport.hasMany(Temporary_Sgha, {
        foreignKey: 'airport_id',
        as: 'temporarySghas',
        onDelete: 'CASCADE',
    });
    Temporary_Sgha.belongsTo(Business, {
        foreignKey: 'business_id',
        as: 'business',
        onDelete: 'CASCADE',
    });
    Business.hasMany(Temporary_Sgha, {
        foreignKey: 'business_id',
        as: 'temporarySghas',
        onDelete: 'CASCADE',
    });
    Temporary_Sgha.belongsTo(FlightType, {
        foreignKey: 'flight_type_id',
        as: 'flightType',
        onDelete: 'CASCADE',
    });
    FlightType.hasMany(Temporary_Sgha, {
        foreignKey: 'flight_type_id',
        as: 'temporarySghas',
        onDelete: 'CASCADE',
    });
    Temporary_Sgha.belongsTo(Category, {
        foreignKey: 'category_id',
        as: 'category',
        onDelete: 'CASCADE',
    });
    Category.hasMany(Temporary_Sgha, {
        foreignKey: 'category_id',
        as: 'temporarySghas',
        onDelete: 'CASCADE',
    });
    Temporary_Sgha.belongsTo(Client, {
        foreignKey: 'client_id',
        as: 'client',
        onDelete: 'CASCADE',
    });
    Client.hasMany(Temporary_Sgha, {
        foreignKey: 'client_id',
        as: 'temporarySghas',
        onDelete: 'CASCADE',
    });


    // ✅ Business ↔ CompanyAircraft
    Business.hasMany(CompanyAircraft, {
        foreignKey: 'business_id',
        as: 'companyAircrafts',
        onDelete: 'CASCADE',
    });
    CompanyAircraft.belongsTo(Business, {
        foreignKey: 'business_id',
        as: 'business',
        onDelete: 'CASCADE',
    });

    // ✅ Airport ↔ CompanyAircraft
    Airport.hasMany(CompanyAircraft, {
        foreignKey: 'airport_id',
        as: 'companyAircrafts',
        onDelete: 'CASCADE',
    });
    CompanyAircraft.belongsTo(Airport, {
        foreignKey: 'airport_id',
        as: 'airport',
        onDelete: 'CASCADE',
    });


     // ✅ Business ↔ NewAdditionalCharges
    Business.hasMany(NewAdditionalCharges, {
        foreignKey: 'Business_id',
        as: 'newAdditionalCharges',   // ✅ renamed
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    NewAdditionalCharges.belongsTo(Business, {
        foreignKey: 'Business_id',
        as: 'businessNewCharges',     // ✅ renamed
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });

    // ✅ Airport ↔ NewAdditionalCharges
    Airport.hasMany(NewAdditionalCharges, {
        foreignKey: 'Airport_id',
        as: 'newAdditionalCharges',   // ✅ renamed
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    NewAdditionalCharges.belongsTo(Airport, {
        foreignKey: 'Airport_id',
        as: 'airportNewCharges',      // ✅ renamed
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });

    // ClientAnnexASubmission ↔ Client_Registration
    ClientAnnexASubmission.belongsTo(ClientRegistration, {
        foreignKey: 'client_registration_id',
        as: 'clientRegistration',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    ClientRegistration.hasMany(ClientAnnexASubmission, {
        foreignKey: 'client_registration_id',
        as: 'annexASubmissions',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });

    // ClientAnnexBSubmission ↔ Client_Registration
    ClientAnnexBSubmission.belongsTo(ClientRegistration, {
        foreignKey: 'client_registration_id',
        as: 'clientRegistration',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    ClientRegistration.hasMany(ClientAnnexBSubmission, {
        foreignKey: 'client_registration_id',
        as: 'annexBSubmissions',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });

    // ClientAnnexBSubmission ↔ AnnexBSubmissionVariables
    ClientAnnexBSubmission.hasMany(AnnexBSubmissionVariables, {
        foreignKey: 'annex_b_submission_id',
        as: 'variables',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });

    // Submission links Annex A and Annex B submissions
    Submission.belongsTo(ClientRegistration, {
        foreignKey: 'client_registration_id',
        as: 'clientRegistration',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    Submission.belongsTo(ClientAnnexASubmission, {
        foreignKey: 'annex_a_submission_id',
        as: 'annexASubmission',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    Submission.belongsTo(ClientAnnexBSubmission, {
        foreignKey: 'annex_b_submission_id',
        as: 'annexBSubmission',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    ClientRegistration.hasMany(Submission, {
        foreignKey: 'client_registration_id',
        as: 'submissions',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    ClientAnnexASubmission.hasOne(Submission, {
        foreignKey: 'annex_a_submission_id',
        as: 'submissionLink',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    ClientAnnexBSubmission.hasOne(Submission, {
        foreignKey: 'annex_b_submission_id',
        as: 'submissionLink',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });

};
module.exports = createUserAssociations;