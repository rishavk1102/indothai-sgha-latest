// const Section = require('../../Template_Models/Sections');
// const SectionField = require('../../Template_Models/SectionFields');
const sequelize = require('../../config/database');
// const MainAnnexure = require('../../Template_Models/MainAnnexure');
// const AnnexureSection = require('../../Template_Models/AnnexureSection_new');
// const AnnexureSectionField = require('../../Template_Models/AnnexureSectionField');
const {
    Op
} = require('sequelize');
const LetterTemplate = require('../../Models_sgha/Letter_template');
const LetterSection = require('../../Models_sgha/LetterSection');
const SGHAgreementTemplate = require('../../Models_sgha/SGH_Agreement_Template');
const Business = require('../../Models/Business');
const Client = require('../../Models/Client');
const SGHA_Main_agreement = require('../../Models_sgha/SGHA_Main_agreement');
const SGHA_Main_agreement_section = require('../../Models_sgha/SGHA_Main_agreement_section');
const checkSocketPermission = require("../../middleware/checkSocketPermission");

module.exports = (io, socket) => {
    socket.on('add-sgh-agreement-template', async (data) => {
        const {
            template_name,
            letter_template_id,
            main_annexure_id,
            status,
            business_id,
            client_id,
            role_id,
            page_name
        } = data;
        const {
            allowed,
            error
        } = await checkSocketPermission(role_id, 'add', page_name);
        if (!allowed) {
            return socket.emit('view-airports-error', {
                message: error
            });
        }
        let transaction;

        try {
            transaction = await sequelize.transaction();

            // 1️⃣ Fetch LetterTemplate with its Sections
            const letterTemplate = await LetterTemplate.findOne({
                where: { template_id:letter_template_id },
                include: [{
                    model: LetterSection,
                    as: 'sections',
                    attributes: ['section_heading', 'section_body', 'section_order'],
                    separate: true,
                    order: [['section_order', 'ASC']]
                }],
                transaction
            });

            if (!letterTemplate) {
                throw new Error('Letter template not found');
            }

            // 3️⃣ Create SGHA_Main_agreement
            const mainAgreement = await SGHA_Main_agreement.create({
                template_name: letterTemplate.template_name,
            }, { transaction });

            // 4️⃣ Create SGHA_Main_agreement_section entries
            const sectionData = letterTemplate.sections.map(section => ({
                SGHA_Main_agreement_id: mainAgreement.SGHA_Main_agreement_id,
                section_heading: section.section_heading,
                section_body: section.section_body,
                section_order: section.section_order
            }));

            await SGHA_Main_agreement_section.bulkCreate(sectionData, { transaction });


            const newTemplate = await SGHAgreementTemplate.create({
                template_name,
                SGHA_Main_agreement_id: mainAgreement.SGHA_Main_agreement_id,
                status,
                business_id,
                client_id
                // main_annexure_id
            }, {
                transaction
            });

            await transaction.commit();

            socket.emit('sgh-agreement-template-add-success', {
                message: 'SGH Agreement Template created successfully',
                template: newTemplate
            });

            io.emit('sgh-agreement-templates-updated');
        } catch (error) {
            if (transaction) await transaction.rollback();
            console.error('❌ Failed to add SGH Agreement Template:', error);
            socket.emit('sgh-agreement-template-add-error', {
                message: 'Failed to add SGH Agreement Template',
                error: error.message
            });
        }
    });


    socket.on('fetch-all-sgh-agreement-templates', async ({
        role_id,
        page_name
    }) => {
        const {
            allowed,
            error
        } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('fetch-all-sgh-agreement-templates-error', {
                message: error
            });
        }
        try {
            const templates = await SGHAgreementTemplate.findAll({
                 include: [
                {
                    model: SGHA_Main_agreement,
                    as: 'mainAgreement', // ✅ updated alias from associations
                    include: [
                        {
                            model: SGHA_Main_agreement_section,
                            as: 'sections',
                            attributes: [
                                'SGHA_Main_agreement_section_id',
                                'section_heading',
                                'section_body',
                                'section_order'
                            ],
                            separate: true,
                            order: [['section_order', 'ASC']]
                        }
                    ]
                },
                {
                    model: Business,
                    as: 'business',
                },
                {
                    model: Client,
                    as: 'client',
                },

                    // {
                    //     model: MainAnnexure,
                    //     as: 'annexure',
                    //     include: [
                    //         {
                    //             model: AnnexureSection,
                    //             as: 'sections',
                    //             include: [
                    //                 {
                    //                     model: AnnexureSectionField,
                    //                     as: 'fields',
                    //                 }
                    //             ]
                    //         }
                    //     ],
                    //     order: [
                    //         [{ model: AnnexureSection, as: 'sections' }, 'annexure_section_id', 'ASC'],
                    //         [
                    //             { model: AnnexureSection, as: 'sections' },
                    //             { model: AnnexureSectionField, as: 'fields' },
                    //             'annexure_section_field_id', 'ASC'
                    //         ]
                    //     ]
                    // }
                ],
                order: [
                    ['createdAt', 'DESC']
                ]
            });

            // // ✅ Manual sorting for safety (in case order doesn't apply deeply)
            // for (const template of templates) {
            //     const annexure = template.annexure;
            //     if (annexure?.sections) {
            //         // Sort fields in each section
            //         for (const section of annexure.sections) {
            //             if (section.fields) {
            //                 section.fields.sort((a, b) => a.annexure_section_field_id - b.annexure_section_field_id);
            //             }
            //         }

            //         // Sort sections
            //         annexure.sections.sort((a, b) => a.annexure_section_id - b.annexure_section_id);
            //     }
            // }

            socket.emit('sgh-agreement-templates-data', {
                message: 'Fetched SGH Agreement Templates successfully',
                templates
            });
        } catch (error) {
            console.error('❌ Failed to fetch SGH Agreement Templates:', error);
            socket.emit('sgh-agreement-templates-fetch-error', {
                message: 'Failed to fetch SGH Agreement Templates',
                error: error.message
            });
        }
    });


    socket.on('fetch-sent-sgha-by-registration', async (data) => {
        const {
            client_registration_id
        } = data;

        try {
            // Step 1: Find clients linked to the registration ID
            const clients = await Client.findAll({
                where: {
                    client_registration_id
                },
                attributes: ['client_id']
            });

            if (clients.length === 0) {
                return socket.emit('fetch-sent-sgha-by-registration-error', {
                    message: 'No clients found for this registration ID'
                });
            }

            const clientIds = clients.map(client => client.client_id);

            // Step 2: Fetch SGHA templates with status 'Sent' for those client IDs
            const agreements = await SGHAgreementTemplate.findAll({
                where: {
                    client_id: {
                        [Op.in]: clientIds
                    },
                    status: 'Sent'
                },
                include: [{
                    model: Client,
                    as: 'client',

                },
                {
                    model: Business,
                    as: 'business',
                },
                {
                    model: SGHA_Main_agreement,
                    as: 'mainAgreement', // ✅ updated alias from associations
                    include: [
                        {
                            model: SGHA_Main_agreement_section,
                            as: 'sections',
                            attributes: [
                                'SGHA_Main_agreement_section_id',
                                'section_heading',
                                'section_body',
                                'section_order'
                            ],
                            separate: true,
                            order: [['section_order', 'ASC']]
                        }
                    ]
                },
                ],
                order: [
                    ['createdAt', 'DESC']
                ]
            });

            socket.emit('fetch-sent-sgha-by-registration-success', {
                message: 'Fetched SGHA templates successfully',
                agreements
            });

        } catch (error) {
            console.error('❌ Error fetching SGHA agreements:', error);
            socket.emit('fetch-sent-sgha-by-registration-error', {
                message: 'Failed to fetch SGHA templates',
                error: error.message
            });
        }
    });






};