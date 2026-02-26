const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const Business = require('../Models/Business');
const Airport = require('../Models/Airport');
const Client = require('../Models/Client');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/checkPermission');
const { getIO } = require('../sockets/socketHandler'); // adjust the path as needed

// Add Business
router.post('/add_business/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
    const {
        name,
        contact_person,
        email,
        phone,
        landline,
        pan,
        gstin,
        cin,
        address1,
        address2,
        city,
        pincode,
        state,
        country,
        bank,
        branch,
        account_no,
        ifsc,
        swift_code,
        creation_date
    } = req.body;

    let transaction;
    try {
        transaction = await sequelize.transaction();

        const newBusiness = await Business.create({
            name,
            contact_person,
            email,
            phone,
            landline,
            pan,
            gstin,
            cin,
            address1,
            address2,
            city,
            pincode,
            state,
            country,
            bank,
            branch,
            account_no,
            ifsc,
            swift_code,
            creation_date
        }, { transaction });

        await transaction.commit();

        const io = getIO();
        io.emit('businesses-updated'); // broadcast update

        return res.status(201).json({
            message: 'Business created successfully',
            business: newBusiness
        });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('❌ Failed to add business:', error);

        return res.status(500).json({
            message: 'Failed to add business',
            error: error.message
        });
    }
    finally {
        // Explicitly rollback if transaction is still open
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});


// Edit Business
router.put('/business/:business_id/:page_name', authenticateToken, checkPermission('edit'), async (req, res) => {
    const { business_id } = req.params;
    const {
        name,
        contact_person,
        email,
        phone,
        landline,
        pan,
        gstin,
        cin,
        address1,
        address2,
        city,
        pincode,
        state,
        country,
        bank,
        branch,
        account_no,
        ifsc,
        swift_code
    } = req.body;

    let transaction;
    try {
        transaction = await sequelize.transaction();

        const business = await Business.findByPk(business_id, { transaction });

        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }

        await business.update({
            name,
            contact_person,
            email,
            phone,
            landline,
            pan,
            gstin,
            cin,
            address1,
            address2,
            city,
            pincode,
            state,
            country,
            bank,
            branch,
            account_no,
            ifsc,
            swift_code
        }, { transaction });

        await transaction.commit();

        const io = getIO();
        io.emit('businesses-updated'); // broadcast update

        return res.status(200).json({
            message: 'Business updated successfully',
            business
        });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('❌ Failed to edit business:', error);

        return res.status(500).json({
            message: 'Failed to update business',
            error: error.message
        });
    }
    finally {
        // Explicitly rollback if transaction is still open
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});


// Duplicate Business
router.post('/duplicate_business/:business_id/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
    const { business_id} = req.params;

    let transaction;
    try {
        transaction = await sequelize.transaction();

        // Fetch original business
        const original = await Business.findByPk(business_id);
        if (!original) {
            return res.status(404).json({ message: 'Original business not found' });
        }

        // Create a new business with copied data
        const newBusiness = await Business.create({
            name: `${original.name} (Duplicate)`,
            contact_person: original.contact_person,
            email: original.email,
            phone: original.phone,
            landline: original.landline,
            pan: original.pan,
            gstin: original.gstin,
            cin: original.cin,
            address1: original.address1,
            address2: original.address2,
            city: original.city,
            pincode: original.pincode,
            state: original.state,
            country: original.country,
            bank: original.bank,
            branch: original.branch,
            account_no: original.account_no,
            ifsc: original.ifsc,
            swift_code: original.swift_code,
            creation_date: original.creation_date
        }, { transaction });

        await transaction.commit();

        const io = getIO();
        io.emit('businesses-updated');

        return res.status(201).json({
            message: 'Business duplicated successfully',
        });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('❌ Failed to duplicate business:', error);

        return res.status(500).json({
            message: 'Failed to duplicate business',
            error: error.message
        });
    } finally {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});

// Fetch Businesses
router.get('/fetch_businesses_test', async (req, res) => {
    const { searchTerm = "", sortOrder = "ASC", limit = 50 } = req.query;

    try {
        const businesses = await Business.findAll({
            where: searchTerm
                ? {
                    [Op.or]: [
                        { name: { [Op.like]: `%${searchTerm}%` } },
                        { contact_person: { [Op.like]: `%${searchTerm}%` } },
                        { email: { [Op.like]: `%${searchTerm}%` } },
                        { city: { [Op.like]: `%${searchTerm}%` } },
                        { state: { [Op.like]: `%${searchTerm}%` } }
                    ]
                }
                : {},
            include: [
                {
                    model: Airport,
                    as: 'airports',
                },
                {
                    model: Client,
                    as: 'clients',
                },
            ],
            order: [['business_id', sortOrder]],
            limit: Number(limit)
        });

        if (!businesses || businesses.length === 0) {
            return res.status(404).json({
                message: 'No businesses found.',
            });
        }

        return res.status(200).json({
            message: 'Businesses fetched successfully',
            data: businesses,
        });
    } catch (error) {
        console.error("❌ Failed to fetch businesses:", error);
        return res.status(500).json({
            message: 'Failed to fetch businesses',
            error: error.message,
        });
    }
});


module.exports = router;