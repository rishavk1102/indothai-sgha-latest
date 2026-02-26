const NewSghaTemplate = require('../NewModels/NewSghaTemplate');
const MainAgreement = require('../NewModels/MainAgreement');
const MainAgreementSection = require('../NewModels/MainAgreementSection');
const Annex = require('../NewModels/Annex');
const AnnexSection = require('../NewModels/AnnexSection');
const AnnexTableRow = require('../NewModels/AnnexTableRow');
const createAnnxAssociations = () => {
    // ✅ SGHA Template ↔ Main Agreement
    NewSghaTemplate.hasMany(MainAgreement, {
        foreignKey: 'SGHA_Template_id',
        as: 'mainAgreements',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    MainAgreement.belongsTo(NewSghaTemplate, {
        foreignKey: 'SGHA_Template_id',
        as: 'sghaTemplate',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });

    // ✅ Main Agreement ↔ Main Agreement Section
    MainAgreement.hasMany(MainAgreementSection, {
        foreignKey: 'ma_id',
        as: 'sections',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    MainAgreementSection.belongsTo(MainAgreement, {
        foreignKey: 'ma_id',
        as: 'mainAgreement',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });

    // ✅ SGHA Template ↔ Annex
    NewSghaTemplate.hasMany(Annex, {
        foreignKey: 'st_id',
        as: 'annexes',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    Annex.belongsTo(NewSghaTemplate, {
        foreignKey: 'st_id',
        as: 'sghaTemplate',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });

    // ✅ Annex ↔ Annex Section
    Annex.hasMany(AnnexSection, {
        foreignKey: 'annex_id',
        as: 'sections',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    AnnexSection.belongsTo(Annex, {
        foreignKey: 'annex_id',
        as: 'annex',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });

    // ✅ Annex Section ↔ Annex Table Row
    AnnexSection.hasMany(AnnexTableRow, {
        foreignKey: 'annx_sec_id',
        as: 'tableRows',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    AnnexTableRow.belongsTo(AnnexSection, {
        foreignKey: 'annx_sec_id',
        as: 'annexSection',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });

};
module.exports = createAnnxAssociations;