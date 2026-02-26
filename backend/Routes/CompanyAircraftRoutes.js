const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const CompanyAircraft = require('../NewModels/CompanyAircraft');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/checkPermission');
const { getIO } = require('../sockets/socketHandler');

// ✅ Add CompanyAircraft
router.post('/add_company_aircraft/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
  const {
    business_id,
    airport_id,
    Aircraft_name,
    Aircraft_model,
    Company_name,
    MTOW,
    Limit_per_incident,
    Price_per_Limit_inr,
    Price_per_Limit_usd,
    Flight_type
  } = req.body;

  let transaction;
  try {
    transaction = await sequelize.transaction();

    const newCompanyAircraft = await CompanyAircraft.create({
      business_id,
      airport_id,
      Aircraft_name,
      Aircraft_model,
      Company_name,
      MTOW,
      Limit_per_incident,
      Price_per_Limit_inr,
      Price_per_Limit_usd,
      Flight_type
    }, { transaction });

    await transaction.commit();

    const io = getIO();
    io.emit('company-aircrafts-updated');

    return res.status(201).json({ message: 'Company Aircraft added successfully', aircraft: newCompanyAircraft });
  } catch (error) {
    console.error('❌ Failed to add company aircraft:', error);
    return res.status(500).json({ message: 'Failed to add company aircraft', error: error.message });
  } finally {
    if (transaction && !transaction.finished) await transaction.rollback();
  }
});

// ✅ Edit CompanyAircraft
router.put('/edit_company_aircraft/:aircraft_id/:page_name', authenticateToken, checkPermission('edit'), async (req, res) => {
  const { aircraft_id } = req.params;
  const {
    business_id,
    airport_id,
    Aircraft_name,
    Aircraft_model,
    Company_name,
    MTOW,
    Limit_per_incident,
    Price_per_Limit_inr,
    Price_per_Limit_usd,
    Flight_type
  } = req.body;

  let transaction;
  try {
    transaction = await sequelize.transaction();
    const aircraft = await CompanyAircraft.findByPk(aircraft_id, { transaction });

    if (!aircraft) return res.status(404).json({ message: 'Company Aircraft not found' });

    await aircraft.update({
      business_id,
      airport_id,
      Aircraft_name,
      Aircraft_model,
      Company_name,
      MTOW,
      Limit_per_incident,
      Price_per_Limit_inr,
      Price_per_Limit_usd,
      Flight_type
    }, { transaction });

    await transaction.commit();

    const io = getIO();
    io.emit('company-aircrafts-updated');

    return res.status(200).json({ message: 'Company Aircraft updated successfully', aircraft });
  } catch (error) {
    console.error('❌ Failed to update company aircraft:', error);
    return res.status(500).json({ message: 'Failed to update company aircraft', error: error.message });
  } finally {
    if (transaction && !transaction.finished) await transaction.rollback();
  }
});

// ✅ Delete CompanyAircraft
router.delete('/delete_company_aircraft/:aircraft_id/:page_name', authenticateToken, checkPermission('delete'), async (req, res) => {
  const { aircraft_id } = req.params;
  let transaction;

  try {
    transaction = await sequelize.transaction();
    const aircraft = await CompanyAircraft.findByPk(aircraft_id, { transaction });

    if (!aircraft) return res.status(404).json({ message: 'Company Aircraft not found' });

    await aircraft.destroy({ transaction });
    await transaction.commit();

    const io = getIO();
    io.emit('company-aircrafts-updated');

    return res.status(200).json({ message: 'Company Aircraft deleted successfully' });
  } catch (error) {
    console.error('❌ Failed to delete company aircraft:', error);
    return res.status(500).json({ message: 'Failed to delete company aircraft', error: error.message });
  } finally {
    if (transaction && !transaction.finished) await transaction.rollback();
  }
});


module.exports = router;