const sequelize = require("../../config/database");
const { Op } = require("sequelize"); // ✅ Import Op
const Business = require("../../Models/Business");
const Airport = require("../../Models/Airport");
const Client = require("../../Models/Client");
const Airline = require("../../Models/Airlines");
const User = require("../../Models/User");
const checkSocketPermission = require("../../middleware/checkSocketPermission");

module.exports = (io, socket) => {


    socket.on('view-airports', async ({
        role_id,
        page_name,
        sortOrder = "ASC",
        limit = 15,
        searchTerm = "",
        business_id
    }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('view-airports-error', { message: error });
        }

        try {
            const whereClause = {};

            // Optional: search term filtering
            if (searchTerm) {
                whereClause[Op.or] = [
                    { name: { [Op.like]: `%${searchTerm}%` } },
                    { iata: { [Op.like]: `%${searchTerm}%` } },
                    { icao: { [Op.like]: `%${searchTerm}%` } },
                    { city: { [Op.like]: `%${searchTerm}%` } },
                    { state: { [Op.like]: `%${searchTerm}%` } }
                ];
            }

            // Optional: business filter
            if (business_id) {
                whereClause.business_id = business_id;
            }

            const airports = await Airport.findAll({
                where: whereClause,
                include: [
                    {
                        model: Business,
                        as: 'business',
                        attributes: ['business_id', 'name'],
                    },
                    {
                        model: Client,
                        as: 'clients',
                        attributes: ['client_id', 'name']
                    },
                    {
                        model: Airline,
                        as: 'airlines',
                        attributes: ['airline_id', 'airline_name', 'airline_type']
                    }
                ],
                order: [['airport_id', sortOrder]],
                limit: Number(limit)
            });

            if (!airports || airports.length === 0) {
                return socket.emit('view-airports-error', {
                    message: 'No airports found.',
                });
            }

            socket.emit('view-airports-success', airports);
        } catch (err) {
            console.error('❌ Failed to fetch airports:', err);
            socket.emit('view-airports-error', {
                message: 'Failed to fetch airports.',
                error: err.message,
            });
        }
    });


    // socket.on('fetch-airports', async ({ role_id, page_name }) => {
    //     const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
    //     if (!allowed) {
    //         return socket.emit('fetch-airports-error', { message: error });
    //     }

    //     try {
    //         const airports = await Airport.findAll({
    //             attributes: ['airport_id', 'name', 'iata'],
    //         });

    //         if (!airports || airports.length === 0) {
    //             return socket.emit('fetch-airports-error', {
    //                 message: 'No airports found.',
    //             });
    //         }

    //         socket.emit('fetch-airports-success', airports);
    //     } catch (err) {
    //         console.error('❌ Failed to fetch airports:', err);
    //         socket.emit('fetch-airports-error', {
    //             message: 'Failed to fetch airports.',
    //             error: err.message,
    //         });
    //     }
    // });


    socket.on('fetch-airports', async ({ role_id, page_name, user_id }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('fetch-airports-error', { message: error });
        }

        try {
            if (!user_id) {
                return socket.emit('fetch-airports-error', {
                    message: 'Missing user ID.',
                });
            }

            const user = await User.findByPk(user_id, {
                include: {
                    model: Airport,
                    as: 'airports',
                    attributes: ['airport_id', 'name', 'iata'],
                    through: { attributes: [] } // exclude join table
                }
            });

            if (!user || !user.airports || user.airports.length === 0) {
                return socket.emit('fetch-airports-error', {
                    message: 'No associated airports found.',
                });
            }

            socket.emit('fetch-airports-success', user.airports);
        } catch (err) {
            console.error('❌ Failed to fetch airports:', err);
            socket.emit('fetch-airports-error', {
                message: 'Failed to fetch airports.',
                error: err.message,
            });
        }
    });




    socket.on('fetch-airports-by-business', async ({ role_id, page_name, business_id }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('fetch-airports-by-business-error', { message: error });
        }

        try {
            const airports = await Airport.findAll({
                where: { business_id },
                attributes: ['airport_id', 'name', 'iata'],
            });
            if (!airports || airports.length === 0) {
                return socket.emit('fetch-airports-by-business-error', {
                    message: 'No airports found.',
                });
            }
            socket.emit('fetch-airports-by-business-success', airports);
        } catch (err) {
            console.error('❌ Failed to fetch airports:', err);
            socket.emit('fetch-airports-by-business-error', {
                message: 'Failed to fetch airports.',
                error: err.message,
            });
        }
    });


socket.on('fetch-all-airports', async ({ role_id, page_name }) => {
    const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
    if (!allowed) {
        return socket.emit('fetch-all-airports-error', { message: error });
    }

    try {
        const airports = await Airport.findAll({
            include: [
                {
                    model: Business,
                    as: 'business',
                    attributes: ['business_id', 'name'],
                },
            ],
        });

        if (!airports || airports.length === 0) {
            return socket.emit('fetch-all-airports-error', {
                message: 'No airports found.',
            });
        }

        socket.emit('fetch-all-airports-success', airports);
    } catch (err) {
        console.error('❌ Failed to fetch airports:', err);
        socket.emit('fetch-all-airports-error', {
            message: 'Failed to fetch airports.',
            error: err.message,
        });
    }
});






};  
