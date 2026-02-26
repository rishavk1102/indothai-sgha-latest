const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const AircraftCategory = require('../Models/AircraftCategory');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/checkPermission');
const { getIO } = require('../sockets/socketHandler');

/**
 * ===========================
 * AIRCRAFT CATEGORY ROUTES
 * ===========================
 */
// Add
router.post('/add_aircraft_category/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
  const { Category_name } = req.body;
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const newCategory = await AircraftCategory.create({ Category_name }, { transaction });
    await transaction.commit();

    getIO().emit('aircraft-categories-updated');
    res.status(201).json({ message: 'Aircraft Category added successfully', category: newCategory });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('❌ Failed to add Aircraft Category:', error);
    res.status(500).json({ message: 'Failed to add Aircraft Category', error: error.message });
  }
});

// Edit
router.put('/edit_aircraft_category/:Aircraft_category_id/:page_name', authenticateToken, checkPermission('edit'), async (req, res) => {
  const { Aircraft_category_id } = req.params;
  const { Category_name } = req.body;
  let transaction;

  try {
    transaction = await sequelize.transaction();
    const category = await AircraftCategory.findByPk(Aircraft_category_id, { transaction });

    if (!category) return res.status(404).json({ message: 'Aircraft Category not found' });

    await category.update({ Category_name }, { transaction });
    await transaction.commit();

    getIO().emit('aircraft-categories-updated');
    res.status(200).json({ message: 'Aircraft Category updated successfully', category });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('❌ Failed to update Aircraft Category:', error);
    res.status(500).json({ message: 'Failed to update Aircraft Category', error: error.message });
  }
});

// Delete
router.delete('/delete_aircraft_category/:Aircraft_category_id/:page_name', authenticateToken, checkPermission('delete'), async (req, res) => {
  const { Aircraft_category_id } = req.params;
  let transaction;

  try {
    transaction = await sequelize.transaction();
    const category = await AircraftCategory.findByPk(Aircraft_category_id, { transaction });

    if (!category) return res.status(404).json({ message: 'Aircraft Category not found' });

    await category.destroy({ transaction });
    await transaction.commit();

    getIO().emit('aircraft-categories-updated');
    res.status(200).json({ message: 'Aircraft Category deleted successfully' });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('❌ Failed to delete Aircraft Category:', error);
    res.status(500).json({ message: 'Failed to delete Aircraft Category', error: error.message });
  }
});

// Duplicate
router.post('/duplicate_aircraft_category/:Aircraft_category_id/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
  const { Aircraft_category_id } = req.params;
  let transaction;

  try {
    transaction = await sequelize.transaction();
    const original = await AircraftCategory.findByPk(Aircraft_category_id, { transaction });

    if (!original) return res.status(404).json({ message: 'Original Aircraft Category not found' });

    const duplicate = await AircraftCategory.create({
      Category_name: `${original.Category_name} (Copy)`
    }, { transaction });

    await transaction.commit();

    getIO().emit('aircraft-categories-updated');
    res.status(201).json({ message: 'Aircraft Category duplicated successfully', category: duplicate });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('❌ Failed to duplicate Aircraft Category:', error);
    res.status(500).json({ message: 'Failed to duplicate Aircraft Category', error: error.message });
  }
});
module.exports = router;