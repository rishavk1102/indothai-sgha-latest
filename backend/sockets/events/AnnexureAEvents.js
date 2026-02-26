const Section = require('../../Models_sgha/Sections');
const SectionField = require('../../Models_sgha/SectionFields');
const sequelize = require('../../config/database');
const checkSocketPermission = require("../../middleware/checkSocketPermission");
module.exports = (io, socket) => {

    socket.on('fetch-sections', async ({
        role_id,
        page_name,
    }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('permissions-error', { message: error });
        }

        try {
            const sections = await Section.findAll({
                include: [
                    {
                        model: SectionField,
                        as: 'sectionFields',

                    }
                ],
                order: [
                    ['section_id', 'ASC'],
                    [{ model: SectionField, as: 'sectionFields' }, 'section_field_id', 'ASC']
                ]
            });

            socket.emit('sections-fetched-success', {
                message: 'Sections fetched successfully',
                sections
            });
        } catch (error) {
            console.error('❌ Failed to fetch sections:', error);

            socket.emit('sections-fetched-error', {
                message: 'Failed to fetch sections',
                error: error.message
            });
        }
    });


    socket.on('fetch-section', async (data) => {
        const {
            section_id,
            role_id,
            page_name,
        } = data;

        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('permissions-error', { message: error });
        }

        try {
            const section = await Section.findOne({
                where: { section_id },
                include: {
                    model: SectionField,
                    as: 'sectionFields'
                }
            });

            if (!section) {
                return socket.emit('fetch-section-error', {
                    message: 'Section not found'
                });
            }

            socket.emit('fetch-section-success', section);
        } catch (error) {
            console.error('❌ Failed to fetch section:', error);

            socket.emit('fetch-section-error', {
                message: 'Failed to fetch section',
                error: error.message
            });
        }
    });

};
