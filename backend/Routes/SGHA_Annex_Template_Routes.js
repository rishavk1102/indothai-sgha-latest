const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const SghaTemplate = require('../Models_sgha/SGHA_Section_Template');
const SghaSection = require('../Models_sgha/SGHA_Section_Template_Sections');
const SghaTmplCat = require('../Models_sgha/SGHA_Section_Template_Category');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/checkPermission');
const { getIO } = require('../sockets/socketHandler');


// Add SGHA Template + Sections + Categories
router.post(
    '/add_sgha_template/:page_name',
    authenticateToken,
    checkPermission('add'),
    async (req, res) => {
        const { template_name, Section_position, sections, categories } = req.body;
        let transaction;

        try {
            transaction = await sequelize.transaction();

            // 1️⃣ Create template
            const newTemplate = await SghaTemplate.create(
                { template_name, Section_position },
                { transaction }
            );

            // 2️⃣ Add sections (if provided)
            if (Array.isArray(sections) && sections.length > 0) {
                await SghaSection.bulkCreate(
                    sections.map((s) => ({
                        SGHA_T_id: newTemplate.SGHA_T_id,
                        subheading: s.SGHA_section_Subheading,
                        body: s.SGHA_Section_body,
                    })),
                    { transaction }
                );
            }

            // 3️⃣ Link categories (if provided)
            if (Array.isArray(categories) && categories.length > 0) {
                await SghaTmplCat.bulkCreate(
                    categories.map((catId) => ({
                        SGHA_T_id: newTemplate.SGHA_T_id,
                        category_id: catId,
                    })),
                    { transaction }
                );
            }

            await transaction.commit();

            // 4️⃣ Emit socket update
            const io = getIO();
            io.emit('sgha-templates-updated');

            return res
                .status(201)
                .json({ message: 'SGHA Template added successfully' });
        } catch (error) {
            if (transaction) await transaction.rollback();
            console.error('❌ Failed to add SGHA Template:', error);
            return res.status(500).json({ message: 'Failed to add SGHA Template', error: error.message });
        } finally {
            if (transaction && !transaction.finished) await transaction.rollback();
        }
    }
);




// Update SGHA Template + Sections + Categories
router.put(
    '/update_sgha_template/:SGHA_T_id/:page_name',
    authenticateToken,
    checkPermission('edit'),
    async (req, res) => {
        const { SGHA_T_id } = req.params;
        const { template_name, Section_position, sections, categories } = req.body;
        let transaction;

        try {
            transaction = await sequelize.transaction();

            // 1️⃣ Update template name
            const template = await SghaTemplate.findByPk(SGHA_T_id);
            if (!template) {
                return res.status(404).json({ message: 'Template not found' });
            }

            await template.update(
                { template_name, Section_position },
                { transaction }
            );

            // 2️⃣ Update sections (strategy: delete old & insert new)
            if (Array.isArray(sections)) {
                await SghaSection.destroy({
                    where: { SGHA_T_id: SGHA_T_id },
                    transaction,
                });

                if (sections.length > 0) {
                    await SghaSection.bulkCreate(
                        sections.map((s) => ({
                            SGHA_T_id: SGHA_T_id,
                            subheading: s.SGHA_section_Subheading,
                            body: s.SGHA_Section_body,
                        })),
                        { transaction }
                    );
                }
            }

            // 3️⃣ Update categories (strategy: delete old & insert new)
            if (Array.isArray(categories)) {
                await SghaTmplCat.destroy({
                    where: { SGHA_T_id: SGHA_T_id },
                    transaction,
                });

                if (categories.length > 0) {
                    await SghaTmplCat.bulkCreate(
                        categories.map((catId) => ({
                            SGHA_T_id: SGHA_T_id,
                            category_id: catId,
                        })),
                        { transaction }
                    );
                }
            }

            await transaction.commit();

            // 4️⃣ Emit socket update
            const io = getIO();
            io.emit('sgha-templates-updated');

            return res
                .status(200)
                .json({ message: 'SGHA Template updated successfully', template });
        } catch (error) {
            if (transaction) await transaction.rollback();
            console.error('❌ Failed to update SGHA Template:', error);
            return res.status(500).json({ message: 'Failed to update SGHA Template', error: error.message });
        } finally {
            if (transaction && !transaction.finished) await transaction.rollback();
        }
    }
);



// Delete SGHA Template + Sections + Categories
router.delete(
    '/delete_sgha_template/:SGHA_T_id/:page_name',
    authenticateToken,
    checkPermission('delete'),
    async (req, res) => {
        const { SGHA_T_id } = req.params;
        let transaction;

        try {
            transaction = await sequelize.transaction();

            // 1️⃣ Delete category links
            await SghaTmplCat.destroy({
                where: { SGHA_T_id: SGHA_T_id },
                transaction
            });

            // 2️⃣ Delete sections
            await SghaSection.destroy({
                where: { SGHA_T_id: SGHA_T_id },
                transaction
            });

            // 3️⃣ Delete template
            const deletedCount = await SghaTemplate.destroy({
                where: { SGHA_T_id: SGHA_T_id },
                transaction
            });

            if (!deletedCount) {
                throw new Error('Template not found');
            }

            await transaction.commit();

            // 4️⃣ Emit socket update
            const io = getIO();
            io.emit('sgha-templates-updated');

            return res
                .status(200)
                .json({ message: 'SGHA Template deleted successfully' });
        } catch (error) {
            if (transaction) await transaction.rollback();
            console.error('❌ Failed to delete SGHA Template:', error);
            return res.status(500).json({ message: 'Failed to delete SGHA Template', error: error.message });
        } finally {
            if (transaction && !transaction.finished) await transaction.rollback();
        }
    }
);





module.exports = router;
