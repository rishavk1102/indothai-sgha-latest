const LetterTemplate = require('../Models_sgha/Letter_template');
const LetterSection = require('../Models_sgha/LetterSection');
const SGHAgreementTemplate = require('../Models_sgha/SGH_Agreement_Template');
const Business = require('../Models/Business');
const Client = require('../Models/Client');
const SGHA_Main_agreement = require('../Models_sgha/SGHA_Main_agreement');
const SGHA_Main_agreement_section = require('../Models_sgha/SGHA_Main_agreement_section');
const Section = require('../Models_sgha/Sections');
const SectionField = require('../Models_sgha/SectionFields');



const SghaTemplate = require('../Models_sgha/SGHA_Section_Template');
const SghaSection = require('../Models_sgha/SGHA_Section_Template_Sections');
const SghaTmplCat = require('../Models_sgha/SGHA_Section_Template_Category');
const Category = require('../Models/Category');



const createAnnexAAssociations = () => {

    LetterTemplate.hasMany(LetterSection, {
        foreignKey: 'template_id',
        as: 'sections'
    });

    LetterSection.belongsTo(LetterTemplate, {
        foreignKey: 'template_id',
        as: 'template'
    });

    // SGHAgreementTemplate ↔️ LetterTemplate (N:1)
    SGHAgreementTemplate.belongsTo(LetterTemplate, {
        foreignKey: 'letter_template_id',
        as: 'letterTemplate',
        onDelete: 'CASCADE'
    });
    LetterTemplate.hasMany(SGHAgreementTemplate, {
        foreignKey: 'letter_template_id',
        as: 'agreements'
    });

    // SGHAgreementTemplate ↔️ Business (N:1)
    SGHAgreementTemplate.belongsTo(Business, {
        foreignKey: 'business_id',
        as: 'business',
        onDelete: 'CASCADE'
    });
    Business.hasMany(SGHAgreementTemplate, {
        foreignKey: 'business_id',
        as: 'agreements'
    });

    // SGHAgreementTemplate ↔️ Client (N:1)
    SGHAgreementTemplate.belongsTo(Client, {
        foreignKey: 'client_id',
        as: 'client',
        onDelete: 'CASCADE'
    });
    Client.hasMany(SGHAgreementTemplate, {
        foreignKey: 'client_id',
        as: 'agreements'
    });




    // SGHA_Main_agreement ↔️ SGHA_Main_agreement_section (1:N)
    SGHA_Main_agreement.hasMany(SGHA_Main_agreement_section, {
        foreignKey: 'SGHA_Main_agreement_id',
        as: 'sections'
    });
    SGHA_Main_agreement_section.belongsTo(SGHA_Main_agreement, {
        foreignKey: 'SGHA_Main_agreement_id',
        as: 'agreement'
    });

    // SGHAgreementTemplate ↔️ SGHA_Main_agreement (N:1)
    SGHAgreementTemplate.belongsTo(SGHA_Main_agreement, {
        foreignKey: 'SGHA_Main_agreement_id',
        as: 'mainAgreement',
        onDelete: 'CASCADE'
    });
    SGHA_Main_agreement.hasMany(SGHAgreementTemplate, {
        foreignKey: 'SGHA_Main_agreement_id',
        as: 'templates'
    });


    // Section ↔️ SectionField (1:N)
    Section.hasMany(SectionField, {
        foreignKey: 'section_id',
        as: 'sectionFields',
        onDelete: 'CASCADE'
    });
    SectionField.belongsTo(Section, {
        foreignKey: 'section_id',
        as: 'section'
    });





    // Template → Sections (One-to-Many)
    SghaTemplate.hasMany(SghaSection, {
        foreignKey: 'SGHA_T_id',
        as: 'sections',
        onDelete: 'CASCADE'
    });
    SghaSection.belongsTo(SghaTemplate, {
        foreignKey: 'SGHA_T_id',
        as: 'template'
    });

    // Template ↔ Category (Many-to-Many through SghaTmplCat)
    SghaTemplate.belongsToMany(Category, {
        through: SghaTmplCat,
        foreignKey: 'SGHA_T_id',
        otherKey: 'category_id',
        as: 'categories'
    });
    Category.belongsToMany(SghaTemplate, {
        through: SghaTmplCat,
        foreignKey: 'category_id',
        otherKey: 'SGHA_T_id',
        as: 'templates'
    });






};

module.exports = createAnnexAAssociations;