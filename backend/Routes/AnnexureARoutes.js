const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const Section = require('../Models_sgha/Sections');
const SectionField = require('../Models_sgha/SectionFields');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/checkPermission');
const { getIO } = require('../sockets/socketHandler');

// Add Section with Fields
router.post('/add_section/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
    const { section_heading, section_fields = [] } = req.body;
    let transaction;

    try {
        transaction = await sequelize.transaction();

        // 1️⃣ Create section
        const section = await Section.create({ section_heading }, { transaction });

        // 2️⃣ Create associated section fields
        const createdFields = await Promise.all(section_fields.map(field =>
            SectionField.create({
                section_id: section.section_id,
                section_field_name: field.section_field_name,
                section_field_type: field.section_field_type,
                required: field.required || false,
                value_amount: field.value_amount || null
            }, { transaction })
        ));

        await transaction.commit();

        // 3️⃣ Emit socket update if needed
        const io = getIO();
        io.emit('sections-updated');

        return res.status(201).json({
            message: 'Section added successfully',
        });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('❌ Failed to add section:', error);
        return res.status(500).json({ message: 'Failed to add section', error: error.message });
    } finally {
        if (transaction && !transaction.finished) await transaction.rollback();
    }
});


// Update Section and Fields
router.put('/update_section/:page_name', authenticateToken, checkPermission('edit'), async (req, res) => {
    const { section_id, section_heading, section_fields = [] } = req.body;
    let transaction;

    try {
        transaction = await sequelize.transaction();

        // 1️⃣ Update section heading
        await Section.update(
            { section_heading },
            { where: { section_id }, transaction }
        );

        // 2️⃣ Loop through fields
        for (const field of section_fields) {
            if (field.section_field_id) {
                // Update existing field
                await SectionField.update({
                    section_field_name: field.section_field_name,
                    section_field_type: field.section_field_type,
                    required: field.required || false,
                    value_amount: field.value_amount || null
                }, {
                    where: { section_field_id: field.section_field_id },
                    transaction
                });
            } else {
                // Create new field
                await SectionField.create({
                    section_id,
                    section_field_name: field.section_field_name,
                    section_field_type: field.section_field_type,
                    required: field.required || false,
                    value_amount: field.value_amount || null
                }, { transaction });
            }
        }

        await transaction.commit();

        const io = getIO();
        io.emit('sections-updated');

        return res.status(200).json({ message: 'Section updated successfully' });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('❌ Failed to update section:', error);
        return res.status(500).json({ message: 'Failed to update section', error: error.message });
    } finally {
        if (transaction && !transaction.finished) await transaction.rollback();
    }
});


router.delete('/delete_section/:page_name/:section_id', authenticateToken, checkPermission('delete'), async (req, res) => {
  const { section_id } = req.params;
  let transaction;

  try {
    transaction = await sequelize.transaction();

    // 1️⃣ Delete all related fields first
    await SectionField.destroy({ where: { section_id }, transaction });

    // 2️⃣ Delete the section itself
    await Section.destroy({ where: { section_id }, transaction });

    await transaction.commit();

    const io = getIO();
    io.emit('sections-updated');

    return res.status(200).json({ message: 'Section and fields deleted successfully' });

  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('❌ Failed to delete section:', error);
    return res.status(500).json({ message: 'Failed to delete section', error: error.message });
  } finally {
    if (transaction && !transaction.finished) await transaction.rollback();
  }
});


module.exports = router;