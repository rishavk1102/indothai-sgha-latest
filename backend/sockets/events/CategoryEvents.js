const sequelize = require("../../config/database");
const { Op } = require("sequelize"); // ✅ Import Op
const Category = require("../../Models/Category");
const checkSocketPermission = require("../../middleware/checkSocketPermission");


module.exports = (io, socket) => {
    socket.on('view-categories', async ({
        role_id,
        page_name,
        sortOrder = "ASC",
        limit = 15,
        searchTerm = ""
    }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('view-categories-error', { message: error });
        }

        try {
            const whereClause = {};

            if (searchTerm) {
                whereClause[Op.or] = [
                    { name: { [Op.like]: `%${searchTerm}%` } },
                    { description: { [Op.like]: `%${searchTerm}%` } }
                ];
            }

            const categories = await Category.findAll({
                where: whereClause,
                order: [['category_id', sortOrder]],
                limit: Number(limit)
            });

            if (!categories || categories.length === 0) {
                return socket.emit('view-categories-error', {
                    message: 'No categories found.'
                });
            }

            socket.emit('view-categories-success', categories);
        } catch (err) {
            console.error('❌ Failed to fetch categories:', err);
            socket.emit('view-categories-error', {
                message: 'Failed to fetch categories.',
                error: err.message
            });
        }
    });

    socket.on('fetch-categories', async ({
        role_id,
        page_name,
        sortOrder = "ASC",
        searchTerm = ""
    }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('fetch-categories-error', { message: error });
        }

        try {
            const whereClause = {};

            if (searchTerm) {
                whereClause[Op.or] = [
                    { name: { [Op.like]: `%${searchTerm}%` } },
                    { description: { [Op.like]: `%${searchTerm}%` } }
                ];
            }

            const categories = await Category.findAll({
                where: whereClause,
                order: [['category_id', sortOrder]],
            });

            if (!categories || categories.length === 0) {
                return socket.emit('fetch-categories-error', {
                    message: 'No categories found.'
                });
            }

            socket.emit('fetch-categories-success', categories);
        } catch (err) {
            console.error('❌ Failed to fetch categories:', err);
            socket.emit('fetch-categories-error', {
                message: 'Failed to fetch categories.',
                error: err.message
            });
        }
    });


};