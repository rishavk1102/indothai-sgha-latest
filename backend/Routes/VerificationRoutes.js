const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const { Op } = require('sequelize'); // Import Sequelize operators
const User = require('../Models/User');
const Role = require('../Models/Role');
const UserDocuments = require('../Models/UserDocuments');
const { authenticateToken } = require('../middleware/authMiddleware');
const PersonalInformation = require('../Models/PersonalInformation');
// const BankInformation = require('../Models/BankInformation');
// const EmergencyContact = require('../Models/EmergencyContact');
const ProfileImage = require('../Models/ProfileImage');
const UserBusiness = require('../Models/UserBusiness');
const UserAirport = require('../Models/UserAirports');
const { checkPermission } = require('../middleware/checkPermission');
const { getIO } = require('../sockets/socketHandler'); // adjust the path as needed
//Employee Promotion 
router.post('/update-user-role-location/:page_name', authenticateToken, checkPermission('edit'), async (req, res) => {
    const { user_id, user_type, date_of_joining, business_ids = [], airport_ids = [] } = req.body;

    let transaction;

    // Check if the user_type is 'SuperAdmin'
    if (user_type === 'SuperAdmin') {
        return res.status(400).json({ message: 'Cannot update user to SuperAdmin role' });
    }

    try {
        // Start a transaction
        transaction = await sequelize.transaction();
        const role = await Role.findOne({
            where: {
                role_name: {
                    [Op.eq]: user_type,
                    [Op.not]: 'SuperAdmin',
                },
            },
            transaction
        });
        if (!role) {
            await transaction.rollback(); // Rollback transaction if role is not found
            return res.status(404).json({ message: 'Role not found or role is SuperAdmin' });
        }

        // Step 2: Update the Role_id and user_type in the User table
        const userUpdateResult = await User.update(
            { Role_id: role.Role_id, user_type: role.role_name, joining_date: date_of_joining, },
            { where: { user_id: user_id }, transaction }
        );
        // Check if user record was updated
        if (userUpdateResult[0] === 0) {
            await transaction.rollback();
            return res.status(404).json({ message: 'User not found' });
        }

        // 3. Update User ↔ Business associations
        await UserBusiness.destroy({ where: { user_id }, transaction }); // remove old
        const businessLinks = business_ids.map(bid => ({ user_id, business_id: bid }));
        if (businessLinks.length) {
            await UserBusiness.bulkCreate(businessLinks, { transaction });
        }

        // 4. Update User ↔ Airport associations
        await UserAirport.destroy({ where: { user_id }, transaction }); // remove old
        const airportLinks = airport_ids.map(aid => ({ user_id, airport_id: aid }));
        if (airportLinks.length) {
            await UserAirport.bulkCreate(airportLinks, { transaction });
        }
        // Commit the transaction
        await transaction.commit();
        return res.status(200).json({ message: 'User role, location, and employee details updated successfully' });
    } catch (error) {
        if (transaction) await transaction.rollback(); // Rollback if any error occurs
        console.error('Error updating user role and location:', error);
        return res.status(500).json({ message: 'Internal server error' });
    } finally {
        // Ensure that transaction is rolled back if it wasn't already committed
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});




router.get('/unverified_count/:page_name', authenticateToken, checkPermission('view'), async (req, res) => {
    try {
        const count = await User.count({
            where: { user_type: 'Unverified' }
        });
        res.status(200).json({ count });
    } catch (error) {
        console.error('Error fetching unverified users count:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


router.get('/users_unverified/:page_name', authenticateToken, checkPermission('view'), async (req, res) => {
    try {
        const unverifiedUsers = await User.findAll({
            where: { user_type: 'Unverified' },
            include: [
                {
                    model: UserDocuments,
                    as: 'documents',
                    attributes: ['document_url'],
                },
                {
                    model: PersonalInformation,
                    as: 'personalInformation',
                },
                // {
                //     model: BankInformation,
                //     as: 'bankDetails',
                // },
                // {
                //     model: EmergencyContact,
                //     as: 'emergencyContacts',
                // },
                {
                    model: ProfileImage,
                    as: 'profileImage',
                    attributes: ['img_url'],
                },
            ],
        });
        res.status(200).json(unverifiedUsers);
    } catch (error) {
        console.error('Error fetching unverified users and their documents:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


router.put('/user/update-airports/:page_name/:user_id', authenticateToken, checkPermission('edit'), async (req, res) => {
    const { user_id } = req.params;
    const { airport_ids } = req.body;

    if (!Array.isArray(airport_ids) || airport_ids.length === 0) {
        return res.status(400).json({ message: 'Please provide a valid list of airport IDs.' });
    }

    let transaction;

    try {
        // Start transaction
        transaction = await sequelize.transaction();

        // Fetch user inside transaction
        const user = await User.findByPk(user_id, { transaction });

        if (!user) {
            await transaction.rollback();
            return res.status(404).json({ message: 'User not found.' });
        }

        // Prevent updates for SuperAdmin
        if (user.user_type === 'SuperAdmin') {
            await transaction.rollback();
            return res.status(403).json({ message: 'Cannot modify airports for a SuperAdmin user.' });
        }

        // Remove old airport links
        await UserAirport.destroy({ where: { user_id }, transaction });

        // Create new airport links
        const newLinks = airport_ids.map((airport_id) => ({ user_id, airport_id }));
        if (newLinks.length > 0) {
            await UserAirport.bulkCreate(newLinks, { transaction });
        }

        // Commit
        await transaction.commit();

        const io = getIO();
        io.emit("Airports-updated", { user_id }); // Broadcast the new info

        return res.status(200).json({ message: 'User airports updated successfully.' });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('❌ Error updating user airports:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    } finally {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});




router.put('/user/update-businesses/:page_name/:user_id', authenticateToken, checkPermission('edit'), async (req, res) => {
    const { user_id } = req.params;
    const { business_ids } = req.body;

    if (!Array.isArray(business_ids) || business_ids.length === 0) {
        return res.status(400).json({ message: 'Please provide a valid list of business IDs.' });
    }

    let transaction;

    try {
        // Begin transaction
        transaction = await sequelize.transaction();

        // Fetch the user in transaction
        const user = await User.findByPk(user_id, { transaction });

        if (!user) {
            await transaction.rollback();
            return res.status(404).json({ message: 'User not found.' });
        }

        if (user.user_type === 'SuperAdmin') {
            await transaction.rollback();
            return res.status(403).json({ message: 'Cannot modify businesses for a SuperAdmin user.' });
        }

        // Remove old business associations
        await UserBusiness.destroy({ where: { user_id }, transaction });

        // Add new business associations
        const businessLinks = business_ids.map(business_id => ({
            user_id,
            business_id
        }));

        if (businessLinks.length > 0) {
            await UserBusiness.bulkCreate(businessLinks, { transaction });
        }

        await transaction.commit();

        const io = getIO();
        io.emit("businesses-updated", { user_id }); // Broadcast the new info


        return res.status(200).json({ message: 'User businesses updated successfully.' });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('❌ Error updating user businesses:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    } finally {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});



module.exports = router;