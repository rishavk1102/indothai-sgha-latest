const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const NewAdditionalCharges = require('../NewModels/NewAdditionalCharges');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/checkPermission');
const { getIO } = require('../sockets/socketHandler');

// ✅ Add New Additional Charges
router.post('/add_additional_charge/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
  const { Business_id, Airport_id, Service_name, Remarks, unit_or_measure, rate_inr, rate_usd, Charge_type } = req.body;
  let transaction;

  try {
    transaction = await sequelize.transaction();

    const newCharge = await NewAdditionalCharges.create({
      Business_id,
      Airport_id,
      Service_name,
      Remarks,
      unit_or_measure,
      rate_inr,
      rate_usd,
      Charge_type
    }, { transaction });

    await transaction.commit();

    const io = getIO();
    io.emit('additional-charges-updated');

    return res.status(201).json({ message: 'Additional charge added successfully', charge: newCharge });
  } catch (error) {
    console.error('❌ Failed to add additional charge:', error);
    return res.status(500).json({ message: 'Failed to add additional charge', error: error.message });
  } finally {
    if (transaction && !transaction.finished) await transaction.rollback();
  }
});

// ✅ Edit Additional Charges
router.put('/edit_additional_charge/:id/:page_name', authenticateToken, checkPermission('edit'), async (req, res) => {
  const { id } = req.params;
  const { Business_id, Airport_id, Service_name, Remarks, unit_or_measure, rate_inr, rate_usd, Charge_type } = req.body;
  let transaction;

  try {
    transaction = await sequelize.transaction();
    const charge = await NewAdditionalCharges.findByPk(id, { transaction });

    if (!charge) return res.status(404).json({ message: 'Additional charge not found' });

    await charge.update({
      Business_id,
      Airport_id,
      Service_name,
      Remarks,
      unit_or_measure,
      rate_inr,
      rate_usd,
      Charge_type
    }, { transaction });

    await transaction.commit();

    const io = getIO();
    io.emit('additional-charges-updated');

    return res.status(200).json({ message: 'Additional charge updated successfully', charge });
  } catch (error) {
    console.error('❌ Failed to update additional charge:', error);
    return res.status(500).json({ message: 'Failed to update additional charge', error: error.message });
  } finally {
    if (transaction && !transaction.finished) await transaction.rollback();
  }
});

// ✅ Delete Additional Charges
router.delete('/delete_additional_charge/:id/:page_name', authenticateToken, checkPermission('delete'), async (req, res) => {
  const { id } = req.params;
  let transaction;

  try {
    transaction = await sequelize.transaction();
    const charge = await NewAdditionalCharges.findByPk(id, { transaction });

    if (!charge) return res.status(404).json({ message: 'Additional charge not found' });

    await charge.destroy({ transaction });
    await transaction.commit();

    const io = getIO();
    io.emit('additional-charges-updated');

    return res.status(200).json({ message: 'Additional charge deleted successfully' });
  } catch (error) {
    console.error('❌ Failed to delete additional charge:', error);
    return res.status(500).json({ message: 'Failed to delete additional charge', error: error.message });
  } finally {
    if (transaction && !transaction.finished) await transaction.rollback();
  }
});


module.exports = router;
