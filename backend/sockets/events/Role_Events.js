const sequelize = require("../../config/database");
const { Op } = require("sequelize"); // ✅ Import Op
const Role = require("../../Models/Role");
const Permission = require("../../Models/Permission");
const Page = require("../../Models/Page");
const checkSocketPermission = require("../../middleware/checkSocketPermission");

module.exports = (io, socket) => {
    socket.on("fetch-roles-permissions", async ({ role_id, page_name, sortOrder = "ASC", limit = 15, searchTerm = "" }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);

        if (!allowed) {
            return socket.emit("roles-permissions-error", {
                message: error || `Access denied for viewing ${page_name}`
            });
        }

        try {
            const rolesWithPermissions = await Role.findAll({
                where: searchTerm
                    ? {
                        role_name: {
                            [Op.like]: `%${searchTerm}%`
                        }
                    }
                    : {},
                include: [
                    {
                        model: Permission,
                        include: [Page]
                    }
                ],
                order: [['role_id', sortOrder]],
                limit: Number(limit)
            });

            socket.emit("roles-permissions-success", rolesWithPermissions);
        } catch (err) {
            console.error("❌ Error fetching roles:", err);
            socket.emit("roles-permissions-error", {
                message: "Failed to fetch roles.",
                error: err.message
            });
        }
    });

};