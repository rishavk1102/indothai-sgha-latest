const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const Aircraft = require('../Models/Aircraft');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/checkPermission');
const { getIO } = require('../sockets/socketHandler');

// Add Aircraft
router.post('/add_aircraft/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
  const { airline_id, Aircraft_category_id, type_name, currency, AAI_levy } = req.body;
  let transaction;

  try {
    transaction = await sequelize.transaction();

    const newAircraft = await Aircraft.create({
      airline_id,
      Aircraft_category_id,
      type_name,
      currency,
      AAI_levy
    }, { transaction });

    await transaction.commit();

    const io = getIO();
    io.emit('aircrafts-updated');

    return res.status(201).json({ message: 'Aircraft added successfully', aircraft: newAircraft });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('❌ Failed to add aircraft:', error);
    return res.status(500).json({ message: 'Failed to add aircraft', error: error.message });
  } finally {
    if (transaction && !transaction.finished) await transaction.rollback();
  }
});

// Edit Aircraft
router.put('/edit_aircraft/:aircraft_id/:page_name', authenticateToken, checkPermission('edit'), async (req, res) => {
  const { aircraft_id } = req.params;
  const { airline_id, Aircraft_category_id, type_name, currency, AAI_levy } = req.body;
  let transaction;

  try {
    transaction = await sequelize.transaction();
    const aircraft = await Aircraft.findByPk(aircraft_id, { transaction });

    if (!aircraft) return res.status(404).json({ message: 'Aircraft not found' });

    await aircraft.update({
      airline_id,
      Aircraft_category_id,
      type_name,
      currency,
      AAI_levy
    }, { transaction });

    await transaction.commit();

    const io = getIO();
    io.emit('aircrafts-updated');

    return res.status(200).json({ message: 'Aircraft updated successfully', aircraft });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('❌ Failed to update aircraft:', error);
    return res.status(500).json({ message: 'Failed to update aircraft', error: error.message });
  } finally {
    if (transaction && !transaction.finished) await transaction.rollback();
  }
});

// Delete Aircraft
router.delete('/delete_aircraft/:aircraft_id/:page_name', authenticateToken, checkPermission('delete'), async (req, res) => {
  const { aircraft_id } = req.params;
  let transaction;

  try {
    transaction = await sequelize.transaction();
    const aircraft = await Aircraft.findByPk(aircraft_id, { transaction });

    if (!aircraft) return res.status(404).json({ message: 'Aircraft not found' });

    await aircraft.destroy({ transaction });
    await transaction.commit();

    const io = getIO();
    io.emit('aircrafts-updated');

    return res.status(200).json({ message: 'Aircraft deleted successfully' });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('❌ Failed to delete aircraft:', error);
    return res.status(500).json({ message: 'Failed to delete aircraft', error: error.message });
  } finally {
    if (transaction && !transaction.finished) await transaction.rollback();
  }
});

// Duplicate Aircraft
router.post('/duplicate_aircraft/:aircraft_id/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
  const { aircraft_id } = req.params;
  let transaction;

  try {
    transaction = await sequelize.transaction();
    const original = await Aircraft.findByPk(aircraft_id, { transaction });

    if (!original) return res.status(404).json({ message: 'Original aircraft not found' });

    const duplicate = await Aircraft.create({
      airline_id: original.airline_id,
      Aircraft_category_id: original.Aircraft_category_id,
      type_name: `${original.type_name} (Copy)`,
      currency: original.currency,
      AAI_levy: original.AAI_levy
    }, { transaction });

    await transaction.commit();

    const io = getIO();
    io.emit('aircrafts-updated');

    return res.status(201).json({ message: 'Aircraft duplicated successfully', aircraft: duplicate });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('❌ Failed to duplicate aircraft:', error);
    return res.status(500).json({ message: 'Failed to duplicate aircraft', error: error.message });
  } finally {
    if (transaction && !transaction.finished) await transaction.rollback();
  }
});

module.exports = router;
