const sequelize = require("../../config/database");
const { Op } = require("sequelize");
const Additional_charges = require("../../Models/Additional_charges");
const Business = require("../../Models/Business");
const Airport = require("../../Models/Airport");
const NewAdditionalCharges = require('../../NewModels/NewAdditionalCharges');
const checkSocketPermission = require("../../middleware/checkSocketPermission");

module.exports = (io, socket) => {
    // 🔎 VIEW all additional charges (with search + sort + pagination)
    socket.on('view-additional-charges', async ({
        role_id,
        page_name,
        sortOrder = "ASC",
        limit = 15,
        searchTerm = "",
        Business_id,
        Airport_id
    }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('view-additional-charges-error', { message: error });
        }

        try {
            // Build WHERE clause
            let whereClause = {
                Business_id,
                Airport_id
            };

            // 🔹 Apply search filter
            if (searchTerm) {
                whereClause[Op.or] = [
                    { Desc_of_service: { [Op.like]: `%${searchTerm}%` } },
                    { Sub_section: { [Op.like]: `%${searchTerm}%` } },
                    { unit_or_measure: { [Op.like]: `%${searchTerm}%` } }
                ];
            }

            const charges = await Additional_charges.findAll({
                where: whereClause,
                order: [["Additional_charges_id", sortOrder]],
                limit: Number(limit)
            });

            if (!charges || charges.length === 0) {
                return socket.emit('view-additional-charges-no-content', {
                    status: 204,
                    message: "No additional charges found."
                });
            }

            socket.emit('view-additional-charges-success', charges);
        } catch (err) {
            console.error("❌ Failed to fetch additional charges:", err);
            socket.emit('view-additional-charges-error', {
                message: "Failed to fetch additional charges",
                error: err.message
            });
        }
    });


    // 📌 FETCH additional charges by Business or Airport
    socket.on('fetch-additional-charges', async ({ role_id, page_name, Business_id, Airport_id }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('fetch-additional-charges-error', { message: error });
        }

        try {
            const whereClause = {};
            if (Business_id) whereClause.Business_id = Business_id;
            if (Airport_id) whereClause.Airport_id = Airport_id;

            const charges = await Additional_charges.findAll({
                where: whereClause,
                include: [
                    { model: Business, as: "business", attributes: ["business_id", "name"] },
                    { model: Airport, as: "airport", attributes: ["airport_id", "name", "code"] }
                ]
            });

            if (!charges || charges.length === 0) {
                return socket.emit('fetch-additional-charges-error', { message: "No additional charges found." });
            }

            socket.emit('fetch-additional-charges-success', charges);
        } catch (err) {
            console.error("❌ Failed to fetch additional charges:", err);
            socket.emit('fetch-additional-charges-error', { message: "Failed to fetch additional charges", error: err.message });
        }
    });


    // 🔎 VIEW all New Additional Charges (with search + sort + pagination)
    socket.on('view-new-additional-charges', async ({
        role_id,
        page_name,
        sortOrder = "ASC",
        limit = 15,
        searchTerm = "",
        Business_id,
        Airport_id
    }) => {
        // Check if user is a client - clients can view additional charges without page permission
        const Role = require('../../Models/Role');
        let isClient = false;
        try {
            const role = await Role.findByPk(role_id);
            if (role && role.role_name === 'Client') {
                isClient = true;
            }
        } catch (err) {
            console.error('Error checking role:', err);
        }

        // Only check permission if not a client
        if (!isClient) {
            const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
            if (!allowed) {
                return socket.emit('view-new-additional-charges-error', { message: error });
            }
        }

        try {
            // Build WHERE clause - only add filters if provided
            let whereClause = {};

            if (Business_id) {
                whereClause.Business_id = Business_id;
            }
            if (Airport_id) {
                whereClause.Airport_id = Airport_id;
            }

            // 🔹 Apply search filter
            if (searchTerm) {
                whereClause[Op.or] = [
                    { Service_name: { [Op.like]: `%${searchTerm}%` } },
                    { Remarks: { [Op.like]: `%${searchTerm}%` } },
                    { unit_or_measure: { [Op.like]: `%${searchTerm}%` } }
                ];
            }

            const charges = await NewAdditionalCharges.findAll({
                where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
                include: [
                    { model: Business, as: "businessNewCharges",},
                    { model: Airport, as: "airportNewCharges", }
                ],
                order: [["Additional_charges_id", sortOrder]],
                limit: Number(limit)
            });

            // Return empty array instead of error when no charges found
            if (!charges || charges.length === 0) {
                return socket.emit('view-new-additional-charges-success', []);
            }

            socket.emit('view-new-additional-charges-success', charges);
        } catch (err) {
            console.error("❌ Failed to fetch new additional charges:", err);
            socket.emit('view-new-additional-charges-error', {
                message: "Failed to fetch new additional charges",
                error: err.message
            });
        }
    });



};
