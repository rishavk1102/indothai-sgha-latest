const sequelize = require("../../config/database");
const { Op } = require("sequelize"); // ✅ Import Op
const Business = require("../../Models/Business");
const Airport = require("../../Models/Airport");
const Client = require("../../Models/Client");
const Airline = require("../../Models/Airlines");
const checkSocketPermission = require("../../middleware/checkSocketPermission");


module.exports = (io, socket) => {

    socket.on('view-airlines', async ({
        role_id,
        page_name,
        sortOrder = 'ASC',
        limit = 15,
        searchTerm = '',
        airport_id,
        client_id
    }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('view-airlines-error', { message: error });
        }

        try {
            const whereClause = {};

            if (searchTerm) {
                whereClause[Op.or] = [
                    { airline_name: { [Op.like]: `%${searchTerm}%` } },
                    { type_of_aircraft: { [Op.like]: `%${searchTerm}%` } },
                    { iata: { [Op.like]: `%${searchTerm}%` } },
                    { icao: { [Op.like]: `%${searchTerm}%` } }
                ];
            }

            if (airport_id) {
                whereClause.business_id = airport_id;
            }
            if (client_id) {
                whereClause.client_id = client_id;
            }

            const airlines = await Airline.findAll({
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
                        model: Client,
                        as: 'client',
                        attributes: ['client_id', 'name']
                    }
                ],
                order: [['airline_id', sortOrder]],
                limit: Number(limit)
            });

            if (!airlines || airlines.length === 0) {
                return socket.emit('view-airlines-error', { message: 'No airlines found.' });
            }

            socket.emit('view-airlines-success', airlines);
        } catch (err) {
            console.error('❌ Failed to fetch airlines:', err);
            socket.emit('view-airlines-error', {
                message: 'Failed to fetch airlines.',
                error: err.message
            });
        }
    });


    socket.on('fetch-airlines', async ({ role_id, page_name }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('fetch-airlines-error', { message: error });
        }

        try {
            const airlines = await Airline.findAll({
                attributes: ['airline_id', 'airline_name', 'iata'],
            });

            if (!airlines || airlines.length === 0) {
                return socket.emit('fetch-airlines-error', {
                    message: 'No airlines found.',
                });
            }

            socket.emit('fetch-airlines-success', airlines);
        } catch (err) {
            console.error('❌ Failed to fetch airlines:', err);
            socket.emit('fetch-airlines-error', {
                message: 'Failed to fetch airlines.',
                error: err.message,
            });
        }
    });






    socket.on('fetch-airline-by-id', async ({ role_id, page_name, airline_id }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('fetch-airline-by-id-error', { message: error });
        }

        try {
            const airline = await Airline.findByPk(airline_id, {
                include: [
                    {
                        model: Airport,
                        as: 'airport',
                        attributes: ['airport_id', 'name', 'iata', 'icao', 'address1', 'address2', 'city', 'state', 'pincode', 'country']
                    },
                    {
                        model: Client,
                        as: 'client',
                        attributes: ['client_id', 'name', 'email', 'operator', 'phone', 'address1', 'address2', 'city', 'state', 'pincode', 'country']
                    }
                ]
            });

            if (!airline) {
                return socket.emit('fetch-airline-by-id-error', {
                    message: 'Airline not found',
                });
            }

            socket.emit('fetch-airline-by-id-success', airline);
        } catch (err) {
            console.error('❌ Failed to fetch airline by ID:', err);
            socket.emit('fetch-airline-by-id-error', {
                message: 'Failed to fetch airline by ID',
                error: err.message,
            });
        }
    });


    socket.on('fetch-airlines-by-params', async ({ role_id, page_name, client_id, airport_id, business_id }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('fetch-airlines-by-params-error', { message: error });
        }

        try {
            const whereClause = {};

            if (client_id) whereClause.client_id = client_id;
            if (airport_id) whereClause.airport_id = airport_id;
            if (business_id) whereClause.business_id = business_id;

            const airlines = await Airline.findAll({
                attributes: ['airline_id', 'airline_name', 'iata'],
                where: whereClause
            });

            if (!airlines || airlines.length === 0) {
                return socket.emit('fetch-airlines-by-params-error', {
                    message: 'No airlines found with the given filters.',
                });
            }

            socket.emit('fetch-airlines-by-params-success', airlines);
        } catch (err) {
            console.error('❌ Failed to fetch airlines:', err);
            socket.emit('fetch-airlines-by-params-error', {
                message: 'Failed to fetch airlines.',
                error: err.message,
            });
        }
    });






};