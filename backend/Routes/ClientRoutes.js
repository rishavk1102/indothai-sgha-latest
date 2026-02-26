const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const Client = require('../Models/Client');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/checkPermission');
const { getIO } = require('../sockets/socketHandler');

router.post('/add_client/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
    const {
        business_id, airport_id, name, email, operator, contact_person, phone,
        pan, gstin, address1, address2, city, pincode, state, country, other_details
    } = req.body;

    let transaction;
    try {
        transaction = await sequelize.transaction();

        const newClient = await Client.create({
            business_id, airport_id, name, email, operator, contact_person, phone,
            pan, gstin, address1, address2, city, pincode, state, country, other_details
        }, { transaction });

        await transaction.commit();

        const io = getIO();
        io.emit('clients-updated');
        io.emit('airports-updated'); // Broadcast update to clients
        io.emit('businesses-updated'); // broadcast update
        return res.status(201).json({ message: 'Client added successfully', client: newClient });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('❌ Failed to add client:', error);
        return res.status(500).json({ message: 'Failed to add client', error: error.message });
    } finally {
        if (transaction && !transaction.finished) await transaction.rollback();
    }
});


router.put('/edit_client/:client_id/:page_name', authenticateToken, checkPermission('edit'), async (req, res) => {
    const { client_id } = req.params;
    const {
        business_id, airport_id, name, email, operator, contact_person, phone,
        pan, gstin, address1, address2, city, pincode, state, country, other_details
    } = req.body;

    let transaction;
    try {
        transaction = await sequelize.transaction();

        const client = await Client.findByPk(client_id, { transaction });
        if (!client) return res.status(404).json({ message: 'Client not found' });

        await client.update({
            business_id, airport_id, name, email, operator, contact_person, phone,
            pan, gstin, address1, address2, city, pincode, state, country, other_details
        }, { transaction });

        await transaction.commit();

        const io = getIO();
        io.emit('clients-updated');
        io.emit('airports-updated'); // Broadcast update to clients
        io.emit('businesses-updated'); // broadcast update
        return res.status(200).json({ message: 'Client updated successfully', client });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('❌ Failed to edit client:', error);
        return res.status(500).json({ message: 'Failed to edit client', error: error.message });
    } finally {
        if (transaction && !transaction.finished) await transaction.rollback();
    }
});


router.delete('/delete_client/:client_id/:page_name', authenticateToken, checkPermission('delete'), async (req, res) => {
    const { client_id } = req.params;

    let transaction;
    try {
        transaction = await sequelize.transaction();

        const client = await Client.findByPk(client_id, { transaction });
        if (!client) return res.status(404).json({ message: 'Client not found' });

        await client.destroy({ transaction });

        await transaction.commit();

        const io = getIO();
        io.emit('clients-updated');
        io.emit('airports-updated'); // Broadcast update to clients
        io.emit('businesses-updated'); // broadcast update
        return res.status(200).json({ message: 'Client deleted successfully' });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('❌ Failed to delete client:', error);
        return res.status(500).json({ message: 'Failed to delete client', error: error.message });
    } finally {
        if (transaction && !transaction.finished) await transaction.rollback();
    }
});


router.post('/duplicate_client/:client_id/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
    const { client_id } = req.params;

    let transaction;
    try {
        transaction = await sequelize.transaction();

        const client = await Client.findByPk(client_id, { transaction });
        if (!client) return res.status(404).json({ message: 'Client not found' });

        const duplicated = await Client.create({
            business_id: client.business_id,
            airport_id: client.airport_id,
            name: client.name + ' (Copy)',
            email: client.email,
            operator: client.operator,
            contact_person: client.contact_person,
            phone: client.phone,
            pan: client.pan,
            gstin: client.gstin,
            address1: client.address1,
            address2: client.address2,
            city: client.city,
            pincode: client.pincode,
            state: client.state,
            country: client.country,
            other_details: client.other_details
        }, { transaction });

        await transaction.commit();

        const io = getIO();
        io.emit('clients-updated');
        io.emit('airports-updated'); // Broadcast update to clients
        io.emit('businesses-updated'); // broadcast update
        return res.status(201).json({ message: 'Client duplicated successfully', client: duplicated });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('❌ Failed to duplicate client:', error);
        return res.status(500).json({ message: 'Failed to duplicate client', error: error.message });
    } finally {
        if (transaction && !transaction.finished) await transaction.rollback();
    }
});

module.exports = router;