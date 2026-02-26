const sequelize = require('../../config/database');
const LetterTemplate = require('../../Models_sgha/Letter_template');
const LetterSection = require('../../Models_sgha/LetterSection');
const checkSocketPermission = require("../../middleware/checkSocketPermission");
const {
    Op
} = require('sequelize');
module.exports = (io, socket) => {
    socket.on('create-or-update-letter-template', async (data) => {
        const {
            role_id,
            page_name,
            template_id,
            template_name,
            sections
        } = data;

        const {
            allowed,
            error
        } = await checkSocketPermission(role_id, 'add', page_name);
        if (!allowed) {
            return socket.emit('letter-template-error', {
                message: error || 'Permission denied'
            });
        }
        let transaction;

        try {
            if (!sections || !Array.isArray(sections) || sections.length === 0) {
                return socket.emit('letter-template-error', {
                    message: 'Sections are required and must be a non-empty array'
                });
            }

            transaction = await sequelize.transaction();

            // Update flow
            if (template_id) {
                const existingTemplate = await LetterTemplate.findByPk(template_id, {
                    transaction
                });

                if (!existingTemplate) {
                    await transaction.rollback();
                    return socket.emit('letter-template-error', {
                        message: 'Template not found'
                    });
                }

                await existingTemplate.update({
                    template_name,
                }, {
                    transaction
                });

                await LetterSection.destroy({
                    where: {
                        template_id
                    },
                    transaction
                });

                const updatedSections = sections.map(section => ({
                    template_id,
                    section_heading: section.section_heading,
                    section_body: section.section_body,
                    section_order: section.section_order
                }));

                await LetterSection.bulkCreate(updatedSections, {
                    transaction
                });

                await transaction.commit();

                return socket.emit('letter-template-success', {
                    message: 'Template updated successfully',
                    template: existingTemplate
                });
            }

            // Create flow
            const newTemplate = await LetterTemplate.create({
                template_name,
            }, {
                transaction
            });

            const newSections = sections.map(section => ({
                template_id: newTemplate.template_id,
                section_heading: section.section_heading,
                section_body: section.section_body,
                section_order: section.section_order
            }));

            await LetterSection.bulkCreate(newSections, {
                transaction
            });

            await transaction.commit();

            socket.emit('letter-template-success', {
                message: 'Template created successfully',
                template: newTemplate
            });

            io.emit('letter-templates-updated');

        } catch (error) {
            if (transaction) await transaction.rollback();
            console.error('❌ Failed to create/update letter template:', error);

            socket.emit('letter-template-error', {
                message: 'An error occurred',
                error: error.message
            });
        } finally {
            if (transaction && !transaction.finished) {
                await transaction.rollback();
            }
        }
    });


    socket.on('fetch-all-letter-templates', async ({
        role_id,
        page_name
    }) => {
        const {
            allowed,
            error
        } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('fetch-airports-error', {
                message: error
            });
        }
        try {
            const templates = await LetterTemplate.findAll({
                attributes: ['template_id', 'template_name', 'createdAt', 'updatedAt']
            });

            socket.emit('letter-templates-fetched', {
                templates
            });
        } catch (error) {
            console.error('❌ Error fetching letter templates:', error);
            socket.emit('letter-templates-error', {
                success: false,
                message: 'Internal Server Error',
                error: error.message
            });
        }
    });


    socket.on('delete-letter-template', async (data) => {
        const {
            template_id,
            role_id,
            page_name
        } = data;

        const {
            allowed,
            error
        } = await checkSocketPermission(role_id, 'delete', page_name);
        if (!allowed) {
            return socket.emit('fetch-airports-error', {
                message: error
            });
        }

        let transaction;

        try {
            transaction = await sequelize.transaction();

            const existingTemplate = await LetterTemplate.findByPk(template_id, {
                transaction
            });

            if (!existingTemplate) {
                await transaction.rollback();
                return socket.emit('delete-letter-template-error', {
                    message: 'Template not found'
                });
            }

            // Delete sections first
            await LetterSection.destroy({
                where: {
                    template_id
                },
                transaction
            });

            // Delete the template
            await existingTemplate.destroy({
                transaction
            });

            await transaction.commit();

            socket.emit('delete-letter-template-success', {
                message: 'Template and associated sections deleted successfully'
            });

            io.emit('letter-templates-updated'); // Optional broadcast
        } catch (error) {
            if (transaction) await transaction.rollback();
            console.error('❌ Error deleting template:', error);

            socket.emit('delete-letter-template-error', {
                message: 'An error occurred',
                error: error.message
            });
        } finally {
            if (transaction && !transaction.finished) {
                await transaction.rollback();
            }
        }
    });


    socket.on('fetch-letter-template-by-id', async (data) => {
        const {
            template_id,
            role_id,
            page_name
        } = data;

        const {
            allowed,
            error
        } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('fetch-airports-error', {
                message: error
            });
        }
        try {
            const template = await LetterTemplate.findOne({
                where: {
                    template_id
                },
                include: [{
                    model: LetterSection,
                    as: 'sections',
                    attributes: ['section_id', 'section_heading', 'section_body', 'section_order'],
                    separate: true,
                    order: [
                        ['section_order', 'ASC']
                    ]
                }]
            });

            if (!template) {
                return socket.emit('fetch-letter-template-error', {
                    message: 'Letter template not found'
                });
            }

            socket.emit('fetch-letter-template-success', {
                template_id: template.template_id,
                template_name: template.template_name,
                createdAt: template.createdAt,
                updatedAt: template.updatedAt,
                sections: template.sections
            });

        } catch (error) {
            console.error('❌ Error fetching letter template by ID:', error);
            socket.emit('fetch-letter-template-error', {
                message: 'Internal Server Error',
                error: error.message
            });
        }
    });

    socket.on('search-letter-template', async (data) => {
        const {
            searchTerm,
            role_id,
            page_name,
            user_id
        } = data;
        const {
            allowed,
            error
        } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('fetch-airports-error', {
                message: error
            });
        }
        try {
            const letterTemplates = await LetterTemplate.findAll({
                where: {
                    template_name: {
                        [Op.like]: `%${searchTerm}%`
                    }
                },
                order: [
                    ['createdAt', 'DESC']
                ]
            });

            socket.emit('search-letter-template-success', {
                message: 'Fetched letter templates successfully',
                letterTemplates
            });
        } catch (error) {
            console.error('❌ Failed to search letter templates:', error);
            socket.emit('search-letter-template-error', {
                message: 'Failed to search letter templates',
                error: error.message
            });
        }
    });


};