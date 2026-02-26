const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const ServicePrice = require('../Models/ServicePrice');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/checkPermission');
const { getIO } = require('../sockets/socketHandler');



// =========================
// Add Service Price
// =========================
router.post('/add_service_price/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
  const { Business_id, Airport_id, Aircraft_category_id, category_id, Flight_type_id, Price } = req.body;
  let transaction;

  try {
    transaction = await sequelize.transaction();

    // 🔍 Check if the exact same record already exists
    const existingServicePrice = await ServicePrice.findOne({
      where: {
        Business_id,
        Airport_id,
        Aircraft_category_id,
        category_id,
        Flight_type_id,
      }
    });

    if (existingServicePrice) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Service Price with the exact same details already exists' });
    }

    // ✅ If not found, create new record
    const newServicePrice = await ServicePrice.create({
      Business_id,
      Airport_id,
      Aircraft_category_id,
      Flight_type_id,
      category_id,
      Price
    }, { transaction });

    await transaction.commit();

    const io = getIO();
    io.emit('service-prices-updated');

    return res.status(201).json({ message: 'Service Price added successfully', servicePrice: newServicePrice });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('❌ Failed to add service price:', error);
    return res.status(500).json({ message: 'Failed to add service price', error: error.message });
  } finally {
    if (transaction && !transaction.finished) await transaction.rollback();
  }
});


// =========================
// Edit Service Price
// =========================
router.put('/edit_service_price/:service_price_id/:page_name', authenticateToken, checkPermission('edit'), async (req, res) => {
  const { service_price_id } = req.params;
  const { Business_id, Airport_id, Aircraft_category_id, category_id, Flight_type_id, Price } = req.body;
  let transaction;

  try {
    transaction = await sequelize.transaction();
    const servicePrice = await ServicePrice.findByPk(service_price_id, { transaction });

    if (!servicePrice) return res.status(404).json({ message: 'Service Price not found' });

    await servicePrice.update({
      Business_id,
      Airport_id,
      Aircraft_category_id,
      category_id,
      Flight_type_id,
      Price
    }, { transaction });

    await transaction.commit();

    const io = getIO();
    io.emit('service-prices-updated');

    return res.status(200).json({ message: 'Service Price updated successfully', servicePrice });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('❌ Failed to update service price:', error);
    return res.status(500).json({ message: 'Failed to update service price', error: error.message });
  } finally {
    if (transaction && !transaction.finished) await transaction.rollback();
  }
});

// =========================
// Delete Service Price
// =========================
router.delete('/delete_service_price/:service_price_id/:page_name', authenticateToken, checkPermission('delete'), async (req, res) => {
  const { service_price_id } = req.params;
  let transaction;

  try {
    transaction = await sequelize.transaction();
    const servicePrice = await ServicePrice.findByPk(service_price_id, { transaction });

    if (!servicePrice) return res.status(404).json({ message: 'Service Price not found' });

    await servicePrice.destroy({ transaction });
    await transaction.commit();

    const io = getIO();
    io.emit('service-prices-updated');

    return res.status(200).json({ message: 'Service Price deleted successfully' });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('❌ Failed to delete service price:', error);
    return res.status(500).json({ message: 'Failed to delete service price', error: error.message });
  } finally {
    if (transaction && !transaction.finished) await transaction.rollback();
  }
});

// =========================
// Duplicate Service Price
// =========================
router.post('/duplicate_service_price/:service_price_id/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
  const { service_price_id } = req.params;
  let transaction;

  try {
    transaction = await sequelize.transaction();
    const original = await ServicePrice.findByPk(service_price_id, { transaction });

    if (!original) return res.status(404).json({ message: 'Original Service Price not found' });

    const duplicate = await ServicePrice.create({
      Business_id: original.Business_id,
      Airport_id: original.Airport_id,
      Aircraft_category_id: original.Aircraft_category_id,
      Flight_type_id: original.Flight_type_id,
      category_id: original.category_id,
      Price: original.Price
    }, { transaction });

    await transaction.commit();

    const io = getIO();
    io.emit('service-prices-updated');

    return res.status(201).json({ message: 'Service Price duplicated successfully', servicePrice: duplicate });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('❌ Failed to duplicate service price:', error);
    return res.status(500).json({ message: 'Failed to duplicate service price', error: error.message });
  } finally {
    if (transaction && !transaction.finished) await transaction.rollback();
  }
});

module.exports = router;