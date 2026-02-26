const sequelize = require("../../config/database");
const { Op } = require("sequelize"); // ✅ Import Op
const AircraftCategory = require('../../Models/AircraftCategory');
const FlightType = require('../../Models/FlightType');
const checkSocketPermission = require("../../middleware/checkSocketPermission");

module.exports = (io, socket) => {
    /**
       * View Aircraft Categories
       */
    socket.on('view-aircraft-categories', async ({
        role_id,
        page_name,
        sortOrder = "ASC",
        limit = 15,
        searchTerm = ""
    }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('view-aircraft-categories-error', { message: error });
        }

        try {
            const whereClause = {};
            if (searchTerm) {
                whereClause[Op.or] = [
                    { Category_name: { [Op.like]: `%${searchTerm}%` } }
                ];
            }

            const categories = await AircraftCategory.findAll({
                where: whereClause,
                order: [['Aircraft_category_id', sortOrder]],
                limit: Number(limit)
            });

            if (!categories || categories.length === 0) {
                return socket.emit('view-aircraft-categories-error', {
                    message: 'No Aircraft Categories found.',
                });
            }

            socket.emit('view-aircraft-categories-success', categories);
        } catch (err) {
            console.error('❌ Failed to fetch Aircraft Categories:', err);
            socket.emit('view-aircraft-categories-error', {
                message: 'Failed to fetch Aircraft Categories.',
                error: err.message,
            });
        }
    });



    socket.on('get-aircraft-categories', async ({
        role_id,
        page_name,
        searchTerm = ""
    }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('get-aircraft-categories-error', { message: error });
        }

        try {
            const whereClause = {};
            if (searchTerm) {
                whereClause[Op.or] = [
                    { Category_name: { [Op.like]: `%${searchTerm}%` } }
                ];
            }

            const categories = await AircraftCategory.findAll({
                where: whereClause
            });

            if (!categories || categories.length === 0) {
                return socket.emit('get-aircraft-categories-error', {
                    message: 'No Aircraft Categories found.',
                });
            }

            socket.emit('get-aircraft-categories-success', categories);
        } catch (err) {
            console.error('❌ Failed to fetch Aircraft Categories:', err);
            socket.emit('get-aircraft-categories-error', {
                message: 'Failed to fetch Aircraft Categories.',
                error: err.message,
            });
        }
    });


    /**
     * View Flight Types
     */
    socket.on('view-flight-types', async ({
        role_id,
        page_name,
        sortOrder = "ASC",
        limit = 15,
        searchTerm = ""
    }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('view-flight-types-error', { message: error });
        }

        try {
            const whereClause = {};
            if (searchTerm) {
                whereClause[Op.or] = [
                    { Flight_type_name: { [Op.like]: `%${searchTerm}%` } }
                ];
            }

            const flightTypes = await FlightType.findAll({
                where: whereClause,
                order: [['Flight_type_id', sortOrder]],
                limit: Number(limit)
            });

            if (!flightTypes || flightTypes.length === 0) {
                return socket.emit('view-flight-types-error', {
                    message: 'No Flight Types found.',
                });
            }

            socket.emit('view-flight-types-success', flightTypes);
        } catch (err) {
            console.error('❌ Failed to fetch Flight Types:', err);
            socket.emit('view-flight-types-error', {
                message: 'Failed to fetch Flight Types.',
                error: err.message,
            });
        }
    });



    socket.on('get-flight-types', async ({
        role_id,
        page_name,
    }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('get-flight-types-error', { message: error });
        }

        try {
            const flightTypes = await FlightType.findAll({
            });

            if (!flightTypes || flightTypes.length === 0) {
                return socket.emit('get-flight-types-error', {
                    message: 'No Flight Types found.',
                });
            }

            socket.emit('get-flight-types-success', flightTypes);
        } catch (err) {
            console.error('❌ Failed to fetch Flight Types:', err);
            socket.emit('get-flight-types-error', {
                message: 'Failed to fetch Flight Types.',
                error: err.message,
            });
        }
    });


    // ✅ Fetch Flight Types
    socket.on('fetch-flight-types', async ({
        role_id,
        page_name,
        searchTerm = ""
    }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('fetch-flight-types-error', { message: error });
        }

        try {
            const whereClause = {};
            if (searchTerm) {
                whereClause[Op.or] = [
                    { flight_type_name: { [Op.like]: `%${searchTerm}%` } } // assuming column is flight_type_name
                ];
            }

            const flightTypes = await FlightType.findAll({
                where: whereClause
            });

            if (!flightTypes || flightTypes.length === 0) {
                return socket.emit('get-flight-types-error', {
                    message: 'No Flight Types found.',
                });
            }

            socket.emit('fetch-flight-types-success', flightTypes);
        } catch (err) {
            console.error('❌ Failed to fetch Flight Types:', err);
            socket.emit('fetch-flight-types-error', {
                message: 'Failed to fetch Flight Types.',
                error: err.message,
            });
        }
    });


};