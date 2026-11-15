const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const Aircraft = require('../Models/Aircraft');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/checkPermission');
const { getIO } = require('../sockets/socketHandler');
const ChargeType = require('../Models/ChargeType');
const AircraftCharges = require('../Models/Aircraft_Charges');

// Add Charge Type
router.post('/add_charge_type/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
    const { name, description } = req.body;
    let transaction;

    try {
        transaction = await sequelize.transaction();

        const newChargeType = await ChargeType.create({
            name,
            description
        }, { transaction });

        await transaction.commit();
        const io = getIO();
        io.emit('ChargeTypesUpdated'); // Broadcast update


        return res.status(201).json({ message: 'Charge type added successfully', chargeType: newChargeType });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Γ¥î Failed to add charge type:', error);
        return res.status(500).json({ message: 'Failed to add charge type', error: error.message });
    } finally {
        if (transaction && !transaction.finished) await transaction.rollback();
    }
});




router.post('/add_charge/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
    const {
        aircraft_id,
        category_id,
        charge_type_id,
        service,
        unit,
        rate_type,
        reference_charge_type_id,
        count,
        include_aai,
        rate,
        aai_levy,
        total_rate,
        of_count,
        of_rate,
        of_aai_levy,
        total_of_rate
    } = req.body;

    let transaction;
    try {
        transaction = await sequelize.transaction();

        const newCharge = await AircraftCharges.create({
            aircraft_id,
            category_id,
            charge_type_id,
            service,
            unit,
            rate_type,
            reference_charge_type_id,
            count,
            include_aai,
            rate,
            aai_levy,
            total_rate,
            of_count,
            of_rate,
            of_aai_levy,
            total_of_rate
        }, { transaction });

        await transaction.commit();
        const io = getIO();
        io.emit('AircraftChargesUpdated'); // Broadcast update
        return res.status(201).json({ message: 'Charge added successfully', charge: newCharge });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Γ¥î Failed to add charge:', error);
        return res.status(500).json({ message: 'Failed to add charge', error: error.message });
    }
    finally {
        if (transaction && !transaction.finished) await transaction.rollback();
    }
});



router.put('/edit_charge/:charges_id/:page_name', authenticateToken, checkPermission('edit'), async (req, res) => {
    const { charges_id } = req.params;
    const {
        aircraft_id,
        category_id,
        charge_type_id,
        service,
        unit,
        rate_type,
        reference_charge_type_id,
        count,
        include_aai,
        rate,
        aai_levy,
        total_rate,
        of_count,
        of_rate,
        of_aai_levy,
        total_of_rate
    } = req.body;

    let transaction;
    try {
        transaction = await sequelize.transaction();

        const charge = await AircraftCharges.findByPk(charges_id, { transaction });
        if (!charge) return res.status(404).json({ message: 'Charge not found' });

        await charge.update({
            aircraft_id,
            category_id,
            charge_type_id,
            service,
            unit,
            rate_type,
            reference_charge_type_id,
            count,
            include_aai,
            rate,
            aai_levy,
            total_rate,
            of_count,
            of_rate,
            of_aai_levy,
            total_of_rate
        }, { transaction });

        await transaction.commit();
        const io = getIO();
        io.emit('AircraftChargesUpdated'); // Broadcast update
        return res.status(200).json({ message: 'Charge updated successfully', charge });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Γ¥î Failed to update charge:', error);
        return res.status(500).json({ message: 'Failed to update charge', error: error.message });
    } finally {
        if (transaction && !transaction.finished) await transaction.rollback();
    }
});


router.delete('/delete_charge/:charges_id/:page_name', authenticateToken, checkPermission('delete'), async (req, res) => {
    const { charges_id } = req.params;

    let transaction;
    try {
        transaction = await sequelize.transaction();

        const charge = await AircraftCharges.findByPk(charges_id, { transaction });
        if (!charge) return res.status(404).json({ message: 'Charge not found' });

        await charge.destroy({ transaction });
        await transaction.commit();
        const io = getIO();
        io.emit('AircraftChargesUpdated'); // Broadcast update
        return res.status(200).json({ message: 'Charge deleted successfully' });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Γ¥î Failed to delete charge:', error);
        return res.status(500).json({ message: 'Failed to delete charge', error: error.message });
    } finally {
        if (transaction && !transaction.finished) await transaction.rollback();
    }
});


router.post('/duplicate_charge/:charges_id/:page_name', authenticateToken, checkPermission('edit'), async (req, res) => {
    const { charges_id } = req.params;

    let transaction;
    try {
        transaction = await sequelize.transaction();

        const original = await AircraftCharges.findByPk(charges_id, { transaction });
        if (!original) return res.status(404).json({ message: 'Original charge not found' });

        const duplicate = await AircraftCharges.create({
            aircraft_id: original.aircraft_id,
            category_id: original.category_id,
            charge_type_id: original.charge_type_id,
            service: `${original.service} (Copy)`,
            unit: original.unit,
            rate_type: original.rate_type,
            reference_charge_type_id: original.reference_charge_type_id,
            count: original.count,
            include_aai: original.include_aai,
            rate: original.rate,
            aai_levy: original.aai_levy,
            total_rate: original.total_rate,
            of_count: original.of_count,
            of_rate: original.of_rate,
            of_aai_levy: original.of_aai_levy,
            total_of_rate: original.total_of_rate
        }, { transaction });

        await transaction.commit();
        const io = getIO();
        io.emit('AircraftChargesUpdated'); // Broadcast update
        return res.status(201).json({ message: 'Charge duplicated successfully', charge: duplicate });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Γ¥î Failed to duplicate charge:', error);
        return res.status(500).json({ message: 'Failed to duplicate charge', error: error.message });
    } finally {
        if (transaction && !transaction.finished) await transaction.rollback();
    }
});


module.exports = router;
