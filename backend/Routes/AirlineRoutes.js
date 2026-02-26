const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const Airline = require('../Models/Airlines');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/checkPermission');
const { getIO } = require('../sockets/socketHandler');

// Add Airline
router.post('/add_airline/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
    const { airport_id, business_id, client_id, airline_name, iata, icao, airline_type } = req.body;
    let transaction;

    try {
        transaction = await sequelize.transaction();

        const newAirline = await Airline.create({
            airport_id,
            business_id,
            client_id,
            airline_name,
            iata,
            icao,
            airline_type
        }, { transaction });

        await transaction.commit();

        const io = getIO();
        io.emit('airlines-updated');
        io.emit('clients-updated');
        io.emit('airports-updated'); // Broadcast update to clients
        return res.status(201).json({ message: 'Airline added successfully', airline: newAirline });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('❌ Failed to add airline:', error);
        return res.status(500).json({ message: 'Failed to add airline', error: error.message });
    } finally {
        if (transaction && !transaction.finished) await transaction.rollback();
    }
});

// Edit Airline
router.put('/edit_airline/:airline_id/:page_name', authenticateToken, checkPermission('edit'), async (req, res) => {
    const { airline_id } = req.params;
    const { airport_id, business_id, client_id, airline_name, iata, icao, airline_type } = req.body;
    let transaction;

    try {
        transaction = await sequelize.transaction();
        const airline = await Airline.findByPk(airline_id, { transaction });

        if (!airline) return res.status(404).json({ message: 'Airline not found' });

        await airline.update({
            airport_id,
            business_id,
            client_id,
            airline_name,
            iata,
            icao,
            airline_type
        }, { transaction });

        await transaction.commit();

        const io = getIO();
        io.emit('airlines-updated');
        io.emit('clients-updated');
        io.emit('airports-updated'); // Broadcast update to clients
        return res.status(201).json({ message: 'Airline updated successfully', airline });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('❌ Failed to update airline:', error);
        return res.status(500).json({ message: 'Failed to update airline', error: error.message });
    } finally {
        if (transaction && !transaction.finished) await transaction.rollback();
    }
});

// Delete Airline
router.delete('/delete_airline/:airline_id/:page_name', authenticateToken, checkPermission('delete'), async (req, res) => {
    const { airline_id } = req.params;
    let transaction;

    try {
        transaction = await sequelize.transaction();
        const airline = await Airline.findByPk(airline_id, { transaction });

        if (!airline) return res.status(404).json({ message: 'Airline not found' });

        await airline.destroy({ transaction });
        await transaction.commit();

        const io = getIO();
        io.emit('airlines-updated');
        io.emit('clients-updated');
        io.emit('airports-updated'); // Broadcast update to clients
        return res.status(200).json({ message: 'Airline deleted successfully' });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('❌ Failed to delete airline:', error);
        return res.status(500).json({ message: 'Failed to delete airline', error: error.message });
    } finally {
        if (transaction && !transaction.finished) await transaction.rollback();
    }
});

// Duplicate Airline
router.post('/duplicate_airline/:airline_id/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
    const { airline_id } = req.params;
    let transaction;

    try {
        transaction = await sequelize.transaction();
        const original = await Airline.findByPk(airline_id, { transaction });

        if (!original) return res.status(404).json({ message: 'Original airline not found' });

        const duplicate = await Airline.create({
            airport_id: original.airport_id,
            business_id: original.business_id,
            client_id: original.client_id,
            airline_name: `${original.airline_name} (Copy)`,
            iata: original.iata,
            icao: original.icao,
            airline_type: original.airline_type
        }, { transaction });

        await transaction.commit();

        const io = getIO();
        io.emit('airlines-updated');
        io.emit('clients-updated');
        io.emit('airports-updated'); // Broadcast update to clients
        return res.status(201).json({ message: 'Airline duplicated successfully', airline: duplicate });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('❌ Failed to duplicate airline:', error);
        return res.status(500).json({ message: 'Failed to duplicate airline', error: error.message });
    } finally {
        if (transaction && !transaction.finished) await transaction.rollback();
    }
});

module.exports = router;
