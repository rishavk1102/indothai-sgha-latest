const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const FlightType = require('../Models/FlightType');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/checkPermission');
const { getIO } = require('../sockets/socketHandler');
/**
 * ===========================
 * FLIGHT TYPE ROUTES
 * ===========================
 */
// Add
router.post('/add_flight_type/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
  const { Flight_type_name } = req.body;
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const newFlightType = await FlightType.create({ Flight_type_name }, { transaction });
    await transaction.commit();

    getIO().emit('flight-types-updated');
    res.status(201).json({ message: 'Flight Type added successfully', flightType: newFlightType });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('❌ Failed to add Flight Type:', error);
    res.status(500).json({ message: 'Failed to add Flight Type', error: error.message });
  }
});

// Edit
router.put('/edit_flight_type/:Flight_type_id/:page_name', authenticateToken, checkPermission('edit'), async (req, res) => {
  const { Flight_type_id } = req.params;
  const { Flight_type_name } = req.body;
  let transaction;

  try {
    transaction = await sequelize.transaction();
    const flightType = await FlightType.findByPk(Flight_type_id, { transaction });

    if (!flightType) return res.status(404).json({ message: 'Flight Type not found' });

    await flightType.update({ Flight_type_name }, { transaction });
    await transaction.commit();

    getIO().emit('flight-types-updated');
    res.status(200).json({ message: 'Flight Type updated successfully', flightType });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('❌ Failed to update Flight Type:', error);
    res.status(500).json({ message: 'Failed to update Flight Type', error: error.message });
  }
});

// Delete
router.delete('/delete_flight_type/:Flight_type_id/:page_name', authenticateToken, checkPermission('delete'), async (req, res) => {
  const { Flight_type_id } = req.params;
  let transaction;

  try {
    transaction = await sequelize.transaction();
    const flightType = await FlightType.findByPk(Flight_type_id, { transaction });

    if (!flightType) return res.status(404).json({ message: 'Flight Type not found' });

    await flightType.destroy({ transaction });
    await transaction.commit();

    getIO().emit('flight-types-updated');
    res.status(200).json({ message: 'Flight Type deleted successfully' });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('❌ Failed to delete Flight Type:', error);
    res.status(500).json({ message: 'Failed to delete Flight Type', error: error.message });
  }
});

// Duplicate
router.post('/duplicate_flight_type/:Flight_type_id/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
  const { Flight_type_id } = req.params;
  let transaction;

  try {
    transaction = await sequelize.transaction();
    const original = await FlightType.findByPk(Flight_type_id, { transaction });

    if (!original) return res.status(404).json({ message: 'Original Flight Type not found' });

    const duplicate = await FlightType.create({
      Flight_type_name: `${original.Flight_type_name} (Copy)`
    }, { transaction });

    await transaction.commit();

    getIO().emit('flight-types-updated');
    res.status(201).json({ message: 'Flight Type duplicated successfully', flightType: duplicate });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('❌ Failed to duplicate Flight Type:', error);
    res.status(500).json({ message: 'Failed to duplicate Flight Type', error: error.message });
  }
});

module.exports = router;