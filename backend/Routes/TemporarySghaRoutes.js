const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const {
    authenticateToken
} = require('../middleware/authMiddleware');
const nodemailer = require('nodemailer');
require('dotenv').config();
const {
    checkPermission
} = require('../middleware/checkPermission');
const {
    getIO
} = require('../sockets/socketHandler'); // adjust the path as needed
const Temporary_Sgha = require('../Models/Temporary_Sgha');
const ClientRegistration = require('../Models/Client_Registration');
const Airport = require('../Models/Airport');
const Business = require('../Models/Business');
const FlightType = require('../Models/FlightType');
const Category = require('../Models/Category');
const Client = require('../Models/Client');


// Add Multiple Temporary SGHAs
router.post('/add_multiple_temporary_sgha/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
    let transaction;

    try {
        transaction = await sequelize.transaction();

        const { sghas } = req.body; // Expecting an array of SGHA objects
        if (!Array.isArray(sghas) || sghas.length === 0) {
            return res.status(400).json({ message: "At least one SGHA is required" });
        }

        const createdSghas = [];
        const clientCache = new Map(); // to avoid duplicate client creation in this batch

        for (const sgha of sghas) {
            const {
                client_id,
                clientData,
                client_registration_id,
                airport_id,
                business_id,
                flight_type_id,
                category_id,
                status
            } = sgha;

            let finalClientId = client_id;

            // Step 1: If clientData is provided, create or reuse client
            if (!finalClientId && clientData) {
                const cacheKey = `${clientData.email}-${clientData.business_id}-${clientData.airport_id}`;
                if (clientCache.has(cacheKey)) {
                    // ✅ Reuse already created client in this batch
                    finalClientId = clientCache.get(cacheKey);
                } else {
                    // ✅ Create new client
                    const {
                        name,
                        email,
                        operator,
                        contact_person,
                        phone,
                        pan,
                        gstin,
                        address1,
                        address2,
                        city,
                        pincode,
                        state,
                        country,
                        other_details
                    } = clientData;

                    const newClient = await Client.create({
                        client_registration_id,
                        business_id,
                        airport_id,
                        name,
                        email,
                        operator,
                        contact_person,
                        phone,
                        pan,
                        gstin,
                        address1,
                        address2,
                        city,
                        pincode,
                        state,
                        country,
                        other_details
                    }, { transaction });

                    finalClientId = newClient.client_id;
                    clientCache.set(cacheKey, finalClientId);
                }
            }

            if (!finalClientId) {
                await transaction.rollback();
                return res.status(400).json({ message: "Each SGHA must have either client_id or clientData" });
            }

            // Step 2: Create Temporary SGHA
            const newSgha = await Temporary_Sgha.create(
                {
                    client_id: finalClientId,
                    client_registration_id,
                    airport_id,
                    business_id,
                    flight_type_id,
                    category_id,
                    status: status || "Draft"
                },
                { transaction }
            );

            createdSghas.push(newSgha);
        }

        await transaction.commit();

        // Step 3: Emit socket updates
        const io = getIO();
        io.emit('temporarySgha-updated');
        io.emit('clients-updated');
        io.emit('airports-updated');

        return res.status(201).json({ message: "Temporary SGHAs added successfully", sghas: createdSghas });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error("❌ Failed to add Temporary SGHAs:", error);
        return res.status(500).json({ message: "Failed to add Temporary SGHAs", error: error.message });
    } finally {
        if (transaction && !transaction.finished) await transaction.rollback();
    }
});


// Delete Temporary SGHA
router.delete('/delete_temporary_sgha/:page_name/:temp_sgha_id', authenticateToken, checkPermission('delete'), async (req, res) => {
    let transaction;

    try {
        transaction = await sequelize.transaction();

        const { temp_sgha_id } = req.params;

        // Step 1: Find SGHA
        const sgha = await Temporary_Sgha.findByPk(temp_sgha_id, { transaction });
        if (!sgha) {
            await transaction.rollback();
            return res.status(404).json({ message: "Temporary SGHA not found" });
        }

        // Step 2: Delete SGHA
        await sgha.destroy({ transaction });

        await transaction.commit();

        // Step 3: Emit socket updates
        const io = getIO();
        io.emit('temporarySgha-updated');
        io.emit('clients-updated');
        io.emit('airports-updated');

        return res.status(200).json({ message: "Temporary SGHA deleted successfully" });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error("❌ Failed to delete Temporary SGHA:", error);
        return res.status(500).json({ message: "Failed to delete Temporary SGHA", error: error.message });
    } finally {
        if (transaction && !transaction.finished) await transaction.rollback();
    }
});




module.exports = router;