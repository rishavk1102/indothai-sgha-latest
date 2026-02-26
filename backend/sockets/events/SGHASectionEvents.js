const sequelize = require('../../config/database');
const { Op } = require('sequelize');
const SghaTemplate = require('../../Models_sgha/SGHA_Section_Template');
const SghaSection = require('../../Models_sgha/SGHA_Section_Template_Sections');
const SghaTmplCat = require('../../Models_sgha/SGHA_Section_Template_Category');
const Category = require('../../Models/Category');  // assuming you have this
const Template = require('../../NewModels/Template');
const checkSocketPermission = require("../../middleware/checkSocketPermission");

module.exports = (io, socket) => {

    socket.on('view-sgha-templates', async ({
        role_id,
        page_name,
        sortOrder = "ASC",
        limit = 15,
        searchTerm = ""
    }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('view-sgha-templates-error', { message: error });
        }

        try {
            const whereClause = {};
            if (searchTerm) {
                whereClause.template_name = { [Op.like]: `%${searchTerm}%` };
            }

            const templates = await SghaTemplate.findAll({
                where: whereClause,
                include: [
                    {
                        model: SghaSection,
                        as: 'sections',
                        attributes: ['SGHA_ST_id', 'subheading', 'body']
                    },
                    {
                        model: Category,
                        as: 'categories',
                        attributes: ['category_id', 'name'],
                        through: { attributes: [] } // hide join table
                    }
                ],
                order: [
                    ['SGHA_T_id', sortOrder],               // order templates
                    [{ model: SghaSection, as: 'sections' }, 'SGHA_ST_id', 'ASC'] // order sections
                ],
                limit: Number(limit)
            });

            if (!templates || templates.length === 0) {
                return socket.emit('view-sgha-templates-error', {
                    message: 'No SGHA Templates found.'
                });
            }

            // Try to fetch new format content from Template table for each template
            const templatesWithContent = await Promise.all(templates.map(async (template) => {
                const templateData = template.toJSON();
                
                // Try to find matching content in Template table
                // Try different years and types
                const possibleYears = [2024, 2025, 2026, new Date().getFullYear()];
                const possibleTypes = ['Annex A', 'Annex B', 'Main Agreement'];
                
                for (const year of possibleYears) {
                    for (const type of possibleTypes) {
                        try {
                            const templateContent = await Template.findOne({
                                where: { year, type }
                            });
                            
                            if (templateContent && templateContent.content) {
                                let content = templateContent.content;
                                
                                // Parse if string
                                if (typeof content === 'string') {
                                    try {
                                        content = JSON.parse(content);
                                    } catch (e) {
                                        continue;
                                    }
                                }
                                
                                // Check if it's the new format
                                if (Array.isArray(content) && content.length > 0) {
                                    const isNewFormat = content.some(item => 
                                        item && item.type && (
                                            item.type === 'heading_no' || 
                                            item.type === 'heading' || 
                                            item.type === 'subheading_no' || 
                                            item.type === 'subheading' || 
                                            item.type === 'editor'
                                        )
                                    );
                                    
                                    if (isNewFormat) {
                                        templateData.sectionsData = content;
                                        templateData.contentYear = year;
                                        templateData.contentType = type;
                                        break;
                                    }
                                }
                            }
                        } catch (e) {
                            continue;
                        }
                    }
                    if (templateData.sectionsData) break;
                }
                
                return templateData;
            }));

            socket.emit('view-sgha-templates-success', templatesWithContent);
        } catch (err) {
            console.error('❌ Failed to fetch SGHA Templates:', err);
            socket.emit('view-sgha-templates-error', {
                message: 'Failed to fetch SGHA Templates.',
                error: err.message,
            });
        }
    });



    socket.on('fetch-sgha-template', async ({ role_id, page_name, SGHA_T_id }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('fetch-sgha-template-error', { message: error });
        }

        try {
            if (!SGHA_T_id) {
                return socket.emit('fetch-sgha-template-error', {
                    message: 'SGHA_T_id is required.'
                });
            }

            // 🔹 Find template containing the given section
            const template = await SghaTemplate.findOne({
                where: { SGHA_T_id },  // ✅ filter by template id
                include: [
                    {
                        model: SghaSection,
                        as: 'sections',
                        attributes: ['SGHA_ST_id', 'subheading', 'body']
                    },
                    {
                        model: Category,
                        as: 'categories',
                        attributes: ['category_id', 'name'],
                        through: { attributes: [] } // ✅ hide join table
                    }
                ]
            });

            if (!template) {
                return socket.emit('fetch-sgha-template-error', {
                    message: `No SGHA Template found for section ID ${SGHA_T_id}.`
                });
            }

            const templateData = template.toJSON();
            
            // Try to fetch new format content from Template table
            const possibleYears = [2024, 2025, 2026, new Date().getFullYear()];
            const possibleTypes = ['Annex A', 'Annex B', 'Main Agreement'];
            
            for (const year of possibleYears) {
                for (const type of possibleTypes) {
                    try {
                        const templateContent = await Template.findOne({
                            where: { year, type }
                        });
                        
                        if (templateContent && templateContent.content) {
                            let content = templateContent.content;
                            
                            // Parse if string
                            if (typeof content === 'string') {
                                try {
                                    content = JSON.parse(content);
                                } catch (e) {
                                    continue;
                                }
                            }
                            
                            // Check if it's the new format
                            if (Array.isArray(content) && content.length > 0) {
                                const isNewFormat = content.some(item => 
                                    item && item.type && (
                                        item.type === 'heading_no' || 
                                        item.type === 'heading' || 
                                        item.type === 'subheading_no' || 
                                        item.type === 'subheading' || 
                                        item.type === 'editor'
                                    )
                                );
                                
                                if (isNewFormat) {
                                    templateData.sectionsData = content;
                                    templateData.contentYear = year;
                                    templateData.contentType = type;
                                    break;
                                }
                            }
                        }
                    } catch (e) {
                        continue;
                    }
                }
                if (templateData.sectionsData) break;
            }

            socket.emit('fetch-sgha-template-success', templateData);
        } catch (err) {
            console.error('❌ Failed to fetch SGHA Template:', err);
            socket.emit('fetch-sgha-template-error', {
                message: 'Failed to fetch SGHA Template.',
                error: err.message,
            });
        }
    });

};