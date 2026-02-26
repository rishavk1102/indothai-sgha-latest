const sequelize = require("../../config/database");
const { Op } = require("sequelize"); // ✅ Import Op
const Business = require("../../Models/Business");
const Airport = require("../../Models/Airport");
const Client = require("../../Models/Client");
const Airline = require("../../Models/Airlines");
const checkSocketPermission = require("../../middleware/checkSocketPermission");


module.exports = (io, socket) => {

    socket.on('view-clients', async ({
        role_id,
        page_name,
        sortOrder = "ASC",
        limit = 15,
        searchTerm = "",
        business_id
    }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('view-clients-error', { message: error });
        }

        try {
            const whereClause = {};

            // Optional search term filtering (matches name, email, contact_person, city)
            if (searchTerm) {
                whereClause[Op.or] = [
                    { name: { [Op.like]: `%${searchTerm}%` } },
                    { email: { [Op.like]: `%${searchTerm}%` } },
                    { contact_person: { [Op.like]: `%${searchTerm}%` } },
                    { city: { [Op.like]: `%${searchTerm}%` } }
                ];
            }

            // Optional business filter
            if (business_id) {
                whereClause.business_id = business_id;
            }


            const clients = await Client.findAll({
                where: whereClause,
                include: [
                    {
                        model: Business,
                        as: 'business',
                        attributes: ['business_id', 'name']
                    },
                    {
                        model: Airport,
                        as: 'airport',
                        attributes: ['airport_id', 'name', 'iata']
                    },
                    {
                        model: Airline,
                        as: 'airlines',
                        attributes: ['airline_id', 'airline_name', 'airline_type']
                    }
                ],
                order: [['client_id', sortOrder]],
                limit: Number(limit)
            });

            if (!clients || clients.length === 0) {
                return socket.emit('view-clients-error', {
                    message: 'No clients found.'
                });
            }

            socket.emit('view-clients-success', clients);
        } catch (err) {
            console.error('❌ Failed to fetch clients:', err);
            socket.emit('view-clients-error', {
                message: 'Failed to fetch clients.',
                error: err.message
            });
        }
    });

    socket.on('fetch-clients-by-business', async ({ role_id, page_name, business_id, airport_id }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('fetch-clients-by-business-error', { message: error });
        }
        try {
            const clients = await Client.findAll({
                where: { business_id, airport_id },
                attributes: ['client_id', 'name']
            });
            if (!clients || clients.length === 0) {
                return socket.emit('fetch-clients-by-business-error', {
                    message: 'No clients found.'
                });
            }
            socket.emit('fetch-clients-by-business-success', clients);
        } catch (err) {
            console.error('❌ Failed to fetch clients:', err);
            socket.emit('fetch-clients-by-business-error', {
                message: 'Failed to fetch clients.',
                error: err.message
            });
        }
    });

    socket.on('fetch-clients-by-airport', async ({ role_id, page_name, airport_id }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('fetch-clients-by-airport-error', { message: error });
        }
        try {
            const clients = await Client.findAll({
                where: { airport_id },
                attributes: ['client_id', 'name']
            });
            if (!clients || clients.length === 0) {
                return socket.emit('fetch-clients-by-airport-error', {
                    message: 'No clients found.'
                });
            }
            socket.emit('fetch-clients-by-airport-success', clients);
        } catch (err) {
            console.error('❌ Failed to fetch clients:', err);
            socket.emit('fetch-clients-by-airport-error', {
                message: 'Failed to fetch clients.',
                error: err.message
            });
        }
    });

    socket.on('fetch-clients-by-only-business', async ({ role_id, page_name, business_id }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('fetch-clients-by-business-error', { message: error });
        }
        try {
            const clients = await Client.findAll({
                where: { business_id },
                attributes: ['client_id', 'name']
            });
            if (!clients || clients.length === 0) {
                return socket.emit('fetch-clients-by-only-business-error', {
                    message: 'No clients found.'
                });
            }
            socket.emit('fetch-clients-by-only-business-success', clients);
        } catch (err) {
            console.error('❌ Failed to fetch clients:', err);
            socket.emit('fetch-clients-by-only-business-error', {
                message: 'Failed to fetch clients.',
                error: err.message
            });
        }
    });

    // Fetch client by registration_id to get business_id and airport_id
    socket.on('fetch-client-by-registration', async ({ role_id, page_name, client_registration_id }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('fetch-client-by-registration-error', { message: error });
        }
        try {
            const client = await Client.findOne({
                where: { client_registration_id },
                attributes: ['client_id', 'business_id', 'airport_id'],
                order: [['client_id', 'ASC']] // Get the first client record
            });
            if (!client) {
                return socket.emit('fetch-client-by-registration-error', {
                    message: 'No client found for this registration ID.'
                });
            }
            socket.emit('fetch-client-by-registration-success', client);
        } catch (err) {
            console.error('❌ Failed to fetch client by registration:', err);
            socket.emit('fetch-client-by-registration-error', {
                message: 'Failed to fetch client.',
                error: err.message
            });
        }
    });




};