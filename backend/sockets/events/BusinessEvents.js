const sequelize = require("../../config/database");
const { Op } = require("sequelize"); // ✅ Import Op
const Business = require("../../Models/Business");
const Airport = require("../../Models/Airport");
const checkSocketPermission = require("../../middleware/checkSocketPermission");
const Client = require("../../Models/Client");
const User = require("../../Models/User");

module.exports = (io, socket) => {

    // VIEW All Businesses
    socket.on('view-businesses', async ({ role_id, page_name, sortOrder = "ASC", limit = 15, searchTerm = "" }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('view-businesses-error', { message: error });
        }

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
                return socket.emit('view-businesses-error', {
                    message: 'No businesses found.',
                });
            }

            socket.emit('view-businesses-success', businesses);
        } catch (err) {
            console.error('❌ Failed to fetch businesses:', err);
            socket.emit('view-businesses-error', {
                message: 'Failed to fetch businesses.',
                error: err.message,
            });
        }
    });



    socket.on('fetch-businesses', async ({ role_id, page_name, user_id }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('fetch-businesses-error', { message: error });
        }

        try {
            if (!user_id) {
                return socket.emit('fetch-businesses-error', {
                    message: 'Missing user ID.',
                });
            }

            const user = await User.findByPk(user_id, {
                include: {
                    model: Business,
                    as: 'businesses',
                    attributes: ['business_id', 'name'],
                    through: { attributes: [] } // exclude join table
                }
            });

            if (!user || !user.businesses || user.businesses.length === 0) {
                return socket.emit('fetch-businesses-error', {
                    message: 'No associated businesses found.',
                });
            }

            socket.emit('fetch-businesses-success', user.businesses);
        } catch (err) {
            console.error('❌ Failed to fetch businesses:', err);
            socket.emit('fetch-businesses-error', {
                message: 'Failed to fetch businesses.',
                error: err.message,
            });
        }
    });




};