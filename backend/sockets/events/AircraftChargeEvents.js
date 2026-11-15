const sequelize = require("../../config/database");
const { Op } = require("sequelize"); // Γ£à Import Op
const Business = require("../../Models/Business");
const Airport = require("../../Models/Airport");
const Client = require("../../Models/Client");
const Airline = require("../../Models/Airlines");
const ChargeType = require("../../Models/ChargeType");
const Aircraft_Charges = require("../../Models/Aircraft_Charges");
const Category = require("../../Models/Category");
const AdditionalEquipmentCreation = require('../../Models/Additional_equipment_creation');
const checkSocketPermission = require("../../middleware/checkSocketPermission");


module.exports = (io, socket) => {

    socket.on('fetch-charge-types', async ({ role_id, page_name }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('fetch-charge-types-error', { message: error });
        }

        try {
            const chargeTypes = await ChargeType.findAll({
                attributes: ['charge_type_id', 'name', 'description'],
                order: [['name', 'ASC']]
            });

            if (!chargeTypes || chargeTypes.length === 0) {
                return socket.emit('fetch-charge-types-error', {
                    message: 'No charge types found.'
                });
            }

            socket.emit('fetch-charge-types-success', chargeTypes);
        } catch (err) {
            console.error('Γ¥î Failed to fetch charge types:', err);
            socket.emit('fetch-charge-types-error', {
                message: 'Failed to fetch charge types.',
                error: err.message
            });
        }
    });


    socket.on('view-aircraft-charges', async ({
        role_id,
        page_name,
        sortOrder = "ASC",
        limit = 15,
        searchTerm = "",
        aircraft_id
    }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('view-aircraft-charges-error', { message: error });
        }

        try {
            if (!aircraft_id) {
                return socket.emit('view-aircraft-charges-error', {
                    message: 'Aircraft ID is required.'
                });
            }

            const whereClause = { aircraft_id };

            // Apply searchTerm on service, unit, or rate_type
            if (searchTerm) {
                whereClause[Op.or] = [
                    { service: { [Op.like]: `%${searchTerm}%` } },
                ];
            }

            const charges = await Aircraft_Charges.findAll({
                where: whereClause,
                include: [
                    {
                        model: ChargeType,
                        as: 'chargeType',
                        attributes: ['charge_type_id', 'name', 'description']
                    },
                    {
                        model: ChargeType,
                        as: 'ReferencedChargeType',
                        attributes: ['charge_type_id', 'name', 'description']
                    },
                    {
                        model: Category,
                        as: 'category',
                        attributes: ['category_id', 'name']
                    },
                ],
                order: [['charges_id', sortOrder]],
                limit: Number(limit)
            });

            if (!charges || charges.length === 0) {
                return socket.emit('view-aircraft-charges-error', {
                    message: 'No charges found for this aircraft.'
                });
            }

            socket.emit('view-aircraft-charges-success', charges);
        } catch (err) {
            console.error('Γ¥î Failed to fetch aircraft charges:', err);
            socket.emit('view-aircraft-charges-error', {
                message: 'Failed to fetch aircraft charges.',
                error: err.message
            });
        }
    });




    socket.on('fetch-additional-equipment-status', async ({ fhr_id, role_id, page_name }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);

        if (!allowed) {
            return socket.emit('fetch-additional-equipment-status-error', { message: error });
        }

        try {
            const record = await AdditionalEquipmentCreation.findOne({
                where: { fhr_id },
                attributes: ['creation_status']
            });

            // Γ₧ñ Case 1: No record found ΓåÆ return false
            if (!record) {
                return socket.emit('fetch-additional-equipment-status-success', false);
            }

            // Γ₧ñ Case 2: Record found ΓåÆ return actual status (true/false)
            return socket.emit('fetch-additional-equipment-status-success', record.creation_status);

        } catch (err) {
            console.error('Γ¥î Failed to fetch additional equipment creation:', err);
            socket.emit('fetch-additional-equipment-status-error', {
                message: 'Failed to fetch additional equipment creation.',
                error: err.message
            });
        }
    });





};
