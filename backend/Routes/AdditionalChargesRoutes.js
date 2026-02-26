const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const Additional_charges = require('../Models/Additional_charges');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/checkPermission');
const { getIO } = require('../sockets/socketHandler');


// ➕ Add Additional Charge
router.post('/add_additional_charge/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
  const { Business_id, Airport_id, Desc_of_service, Sub_section, unit_or_measure, rate } = req.body;
  let transaction;

  try {
    transaction = await sequelize.transaction();

    const newCharge = await Additional_charges.create({
      Business_id,
      Airport_id,
      Desc_of_service,
      Sub_section,
      unit_or_measure,
      rate
    }, { transaction });

    await transaction.commit();

    const io = getIO();
    io.emit('additional-charges-updated');

    return res.status(201).json({ message: 'Additional charge added successfully', additionalCharge: newCharge });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('❌ Failed to add additional charge:', error);
    return res.status(500).json({ message: 'Failed to add additional charge', error: error.message });
  } finally {
    if (transaction && !transaction.finished) await transaction.rollback();
  }
});


// ✏️ Edit Additional Charge
router.put('/edit_additional_charge/:Additional_charges_id/:page_name', authenticateToken, checkPermission('edit'), async (req, res) => {
  const { Additional_charges_id } = req.params;
  const { Business_id, Airport_id, Desc_of_service, Sub_section, unit_or_measure, rate } = req.body;
  let transaction;

  try {
    transaction = await sequelize.transaction();

    const charge = await Additional_charges.findByPk(Additional_charges_id, { transaction });
    if (!charge) return res.status(404).json({ message: 'Additional charge not found' });

    await charge.update({
      Business_id,
      Airport_id,
      Desc_of_service,
      Sub_section,
      unit_or_measure,
      rate
    }, { transaction });

    await transaction.commit();

    const io = getIO();
    io.emit('additional-charges-updated');

    return res.status(200).json({ message: 'Additional charge updated successfully', additionalCharge: charge });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('❌ Failed to update additional charge:', error);
    return res.status(500).json({ message: 'Failed to update additional charge', error: error.message });
  } finally {
    if (transaction && !transaction.finished) await transaction.rollback();
  }
});


// 🗑️ Delete Additional Charge
router.delete('/delete_additional_charge/:charge_id/:page_name', authenticateToken, checkPermission('delete'), async (req, res) => {
  const { charge_id } = req.params;
  let transaction;

  try {
    transaction = await sequelize.transaction();

    const charge = await Additional_charges.findByPk(charge_id, { transaction });
    if (!charge) return res.status(404).json({ message: 'Additional charge not found' });

    await charge.destroy({ transaction });
    await transaction.commit();

    const io = getIO();
    io.emit('additional-charges-updated');

    return res.status(200).json({ message: 'Additional charge deleted successfully' });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('❌ Failed to delete additional charge:', error);
    return res.status(500).json({ message: 'Failed to delete additional charge', error: error.message });
  } finally {
    if (transaction && !transaction.finished) await transaction.rollback();
  }
});


// 📄 Duplicate Additional Charge
router.post('/duplicate_additional_charge/:charge_id/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
  const { charge_id } = req.params;
  let transaction;

  try {
    transaction = await sequelize.transaction();

    const original = await Additional_charges.findByPk(charge_id, { transaction });
    if (!original) return res.status(404).json({ message: 'Original additional charge not found' });

    const duplicate = await Additional_charges.create({
      Business_id: original.Business_id,
      Airport_id: original.Airport_id,
      Desc_of_service: `${original.Desc_of_service} (Copy)`,
      Sub_section: original.Sub_section,
      unit_or_measure: original.unit_or_measure,
      rate: original.rate
    }, { transaction });

    await transaction.commit();

    const io = getIO();
    io.emit('additional-charges-updated');

    return res.status(201).json({ message: 'Additional charge duplicated successfully', additionalCharge: duplicate });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('❌ Failed to duplicate additional charge:', error);
    return res.status(500).json({ message: 'Failed to duplicate additional charge', error: error.message });
  } finally {
    if (transaction && !transaction.finished) await transaction.rollback();
  }
});

module.exports = router;
