const sequelize = require("../../config/database");
const { Op } = require("sequelize"); // Γ£à Import Op
const Airport = require("../../Models/Airport");
const FHR_Listing = require("../../Models/FHR_Listing");
const checkSocketPermission = require("../../middleware/checkSocketPermission");
const BasicDetails = require("../../Models/Basic_Details");
const ArrivalDetails = require("../../Models/Arrival_Details");
const DepartureDetails = require("../../Models/Departure_Details");
const ManPowerDetails = require("../../Models/Man_Power_Details");
const CargoDetails = require("../../Models/Cargo_Details");
const FHR = require("../../Models/FHR");
const Business = require('../../Models/Business');
const Client = require('../../Models/Client');
const Airline = require('../../Models/Airlines');
const Category = require('../../Models/Category');
const Aircraft = require('../../Models/Aircraft');
const FHR_Edit_Sessions = require('../../Models/FHR_Edit_Sessions');
const User = require('../../Models/User');
const moment = require('moment'); // Add this at the top if not already imported
const ProfileImage = require("../../Models/ProfileImage");
const AdditionalEquipment = require('../../Models/Additional_Equipment'); // make sure it's imported

module.exports = (io, socket) => {

    socket.on('view-fhr-listings', async ({
        role_id,
        page_name,
        limit = 25,
        searchTerm = '',
        airport_id
    }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('view-fhr-listings-error', { message: error });
        }

        try {
            const whereClause = {
                status: { [Op.in]: ['Draft', 'Pending'] }
            };

            if (airport_id) {
                whereClause.airport_id = airport_id;
            }

            if (searchTerm) {
                whereClause[Op.or] = [
                    { flight_no: { [Op.like]: `%${searchTerm}%` } },
                    { station: { [Op.like]: `%${searchTerm}%` } },
                    { type: { [Op.like]: `%${searchTerm}%` } },
                    { Fhr_type: { [Op.like]: `%${searchTerm}%` } },
                    { airline_name: { [Op.like]: `%${searchTerm}%` } },
                    { aircraft_type: { [Op.like]: `%${searchTerm}%` } }
                ];
            }

            const listings = await FHR_Listing.findAll({
                where: whereClause,
                include: [
                    {
                        model: Airport,
                        as: 'airport',
                        attributes: ['airport_id', 'name', 'iata']
                    }
                ],
                order: [
                    ['date_of_flight', 'ASC'],
                    ['st', 'ASC']
                ],
                limit: Number(limit)
            });

            if (!listings || listings.length === 0) {
                return socket.emit('view-fhr-listings-success', []);
            }
            // For each listing, attach active editors
            const enrichedListings = await Promise.all(listings.map(async (listing) => {
                const editors = await FHR_Edit_Sessions.findAll({
                    where: {
                        fhr_id: listing.fhr_id,
                        is_active: true
                    },
                    include: [{
                        model: User,
                        as: 'editor',
                        attributes: ['user_id', 'first_name', 'last_name'],
                        include: [{
                            model: ProfileImage,
                            as: 'profileImage',
                            attributes: ['img_url']
                        }]
                    }]
                });

                return {
                    ...listing.toJSON(),
                    active_editors: editors.map(session => session.editor)
                };
            }));

            socket.emit('view-fhr-listings-success', enrichedListings);
        } catch (err) {
            console.error('Γ¥î Failed to fetch FHR listings:', err);
            socket.emit('view-fhr-listings-error', {
                message: 'Failed to fetch FHR listings.',
                error: err.message
            });
        }
    });


    socket.on('view-fhr-by-id', async ({ role_id, page_name, fhr_id }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);

        if (!allowed) {
            return socket.emit('view-fhr-by-id-error', { message: error });
        }

        try {
            const fhrData = await FHR.findOne({
                where: { fhr_id },
                attributes: { exclude: ['category_id'] },
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
                    },
                    {
                        model: Airline,
                        as: 'airline',
                        attributes: ['airline_id', 'airline_name', 'iata']
                    },
                    {
                        model: Aircraft,
                        as: 'aircraft',
                        attributes: ['aircraft_id', 'type_name', 'currency', 'AAI_levy']
                    }
                ]
            });

            if (!fhrData) {
                return socket.emit('view-fhr-by-id-error', {
                    message: 'No FHR data found for the provided ID.'
                });
            }

            socket.emit('view-fhr-by-id-success', fhrData);
        } catch (err) {
            console.error('Γ¥î Failed to fetch FHR by ID:', err);
            socket.emit('view-fhr-by-id-error', {
                message: 'Failed to fetch FHR details.',
                error: err.message
            });
        }
    });



    socket.on('fetch-basic-details', async ({ role_id, page_name, fhr_id }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);

        if (!allowed) {
            return socket.emit('fetch-basic-details-error', { message: error });
        }

        try {
            const basicDetails = await BasicDetails.findOne({
                where: { fhr_id }
            });

            if (!basicDetails) {
                return socket.emit('fetch-basic-details-error', {
                    message: 'No basic details found for the provided FHR ID.'
                });
            }

            // Fetch active edit users for this FHR & section
            const activeEditors = await FHR_Edit_Sessions.findAll({
                where: {
                    fhr_id,
                    section: 'Basic_Details',
                    is_active: true
                },
                include: [{
                    model: User, as: 'editor', attributes: ['user_id', 'first_name', 'last_name'],
                    include: [{ model: ProfileImage, as: 'profileImage', attributes: ['img_url'] }]
                }]
            });

            // Fetch the last user who edited (latest non-active session)
            const lastEditorSession = await FHR_Edit_Sessions.findOne({
                where: {
                    fhr_id,
                    section: 'Basic_Details',
                    is_active: false
                },
                order: [['last_active_at', 'DESC']],
                include: [{
                    model: User, as: 'editor', attributes: ['user_id', 'first_name', 'last_name'],
                    include: [{ model: ProfileImage, as: 'profileImage', attributes: ['img_url'] }]
                }]
            });

            socket.emit('fetch-basic-details-success', {
                ...basicDetails.toJSON(), // Γ£à Pass the basic details
                active_editors: activeEditors.map(s => s.editor),
                last_edited_by: lastEditorSession?.editor || null
            });
        } catch (err) {
            console.error('Γ¥î Failed to fetch basic details:', err);
            socket.emit('fetch-basic-details-error', {
                message: 'Failed to fetch basic details.',
                error: err.message
            });
        }
    });


    socket.on('fetch-arrival-details', async ({ role_id, page_name, fhr_id }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);

        if (!allowed) {
            return socket.emit('fetch-arrival-details-error', { message: error });
        }

        try {
            const data = await ArrivalDetails.findOne({ where: { fhr_id } });
            if (!data) {
                return socket.emit('fetch-arrival-details-error', { message: 'Arrival details not found.' });
            }

            // Fetch active edit users for this FHR & section
            const activeEditors = await FHR_Edit_Sessions.findAll({
                where: {
                    fhr_id,
                    section: 'Arrival_Details',
                    is_active: true
                },
                include: [{
                    model: User, as: 'editor', attributes: ['user_id', 'first_name', 'last_name'],
                    include: [{ model: ProfileImage, as: 'profileImage', attributes: ['img_url'] }]
                }]
            });

            // Fetch the last user who edited (latest non-active session)
            const lastEditorSession = await FHR_Edit_Sessions.findOne({
                where: {
                    fhr_id,
                    section: 'Arrival_Details',
                    is_active: false
                },
                order: [['last_active_at', 'DESC']],
                include: [{
                    model: User, as: 'editor', attributes: ['user_id', 'first_name', 'last_name'],
                    include: [{ model: ProfileImage, as: 'profileImage', attributes: ['img_url'] }]
                }]
            });


            socket.emit('fetch-arrival-details-success', {
                ...data.toJSON(), // Γ£à Pass the basic details
                active_editors: activeEditors.map(s => s.editor),
                last_edited_by: lastEditorSession?.editor || null
            });
        } catch (err) {
            socket.emit('fetch-arrival-details-error', { message: 'Error fetching arrival details.', error: err.message });
        }
    });



    socket.on('fetch-departure-details', async ({ role_id, page_name, fhr_id }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);

        if (!allowed) {
            return socket.emit('fetch-departure-details-error', { message: error });
        }

        try {
            const data = await DepartureDetails.findOne({ where: { fhr_id } });
            if (!data) {
                return socket.emit('fetch-departure-details-error', { message: 'Departure details not found.' });
            }
            // Fetch active edit users for this FHR & section
            const activeEditors = await FHR_Edit_Sessions.findAll({
                where: {
                    fhr_id,
                    section: 'Departure_Details',
                    is_active: true
                },
                include: [{
                    model: User, as: 'editor', attributes: ['user_id', 'first_name', 'last_name'],
                    include: [{ model: ProfileImage, as: 'profileImage', attributes: ['img_url'] }]
                }]
            });

            // Fetch the last user who edited (latest non-active session)
            const lastEditorSession = await FHR_Edit_Sessions.findOne({
                where: {
                    fhr_id,
                    section: 'Departure_Details',
                    is_active: false
                },
                order: [['last_active_at', 'DESC']],
                include: [{
                    model: User, as: 'editor', attributes: ['user_id', 'first_name', 'last_name'],
                    include: [{ model: ProfileImage, as: 'profileImage', attributes: ['img_url'] }]
                }]
            });


            socket.emit('fetch-departure-details-success', {
                ...data.toJSON(), // Γ£à Pass the basic details
                active_editors: activeEditors.map(s => s.editor),
                last_edited_by: lastEditorSession?.editor || null
            });
        } catch (err) {
            socket.emit('fetch-departure-details-error', { message: 'Error fetching departure details.', error: err.message });
        }
    });


    socket.on('fetch-cargo-details', async ({ role_id, page_name, fhr_id }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);

        if (!allowed) {
            return socket.emit('fetch-cargo-details-error', { message: error });
        }

        try {
            const data = await CargoDetails.findOne({ where: { fhr_id } });
            if (!data) {
                return socket.emit('fetch-cargo-details-error', { message: 'Cargo details not found.' });
            }
            // Fetch active edit users for this FHR & section
            const activeEditors = await FHR_Edit_Sessions.findAll({
                where: {
                    fhr_id,
                    section: 'Cargo_Details',
                    is_active: true
                },
                include: [{
                    model: User, as: 'editor', attributes: ['user_id', 'first_name', 'last_name'],
                    include: [{ model: ProfileImage, as: 'profileImage', attributes: ['img_url'] }]
                }]
            });

            // Fetch the last user who edited (latest non-active session)
            const lastEditorSession = await FHR_Edit_Sessions.findOne({
                where: {
                    fhr_id,
                    section: 'Cargo_Details',
                    is_active: false
                },
                order: [['last_active_at', 'DESC']],
                include: [{
                    model: User, as: 'editor', attributes: ['user_id', 'first_name', 'last_name'],
                    include: [{ model: ProfileImage, as: 'profileImage', attributes: ['img_url'] }]
                }]
            });


            socket.emit('fetch-cargo-details-success', {
                ...data.toJSON(), // Γ£à Pass the basic details
                active_editors: activeEditors.map(s => s.editor),
                last_edited_by: lastEditorSession?.editor || null
            });
        } catch (err) {
            socket.emit('fetch-cargo-details-error', { message: 'Error fetching cargo details.', error: err.message });
        }
    });



    socket.on('fetch-manpower-details', async ({ role_id, page_name, fhr_id }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);

        if (!allowed) {
            return socket.emit('fetch-manpower-details-error', { message: error });
        }

        try {
            const data = await ManPowerDetails.findOne({ where: { fhr_id } });
            if (!data) {
                return socket.emit('fetch-manpower-details-error', { message: 'Manpower details not found.' });
            }
            // Fetch active edit users for this FHR & section
            const activeEditors = await FHR_Edit_Sessions.findAll({
                where: {
                    fhr_id,
                    section: 'Man_Power_Details',
                    is_active: true
                },
                include: [{
                    model: User, as: 'editor', attributes: ['user_id', 'first_name', 'last_name'],
                    include: [{ model: ProfileImage, as: 'profileImage', attributes: ['img_url'] }]
                }]
            });

            // Fetch the last user who edited (latest non-active session)
            const lastEditorSession = await FHR_Edit_Sessions.findOne({
                where: {
                    fhr_id,
                    section: 'Man_Power_Details',
                    is_active: false
                },
                order: [['last_active_at', 'DESC']],
                include: [{
                    model: User, as: 'editor', attributes: ['user_id', 'first_name', 'last_name'],
                    include: [{ model: ProfileImage, as: 'profileImage', attributes: ['img_url'] }]
                }]
            });
            socket.emit('fetch-manpower-details-success', {
                ...data.toJSON(), // Γ£à Pass the basic details
                active_editors: activeEditors.map(s => s.editor),
                last_edited_by: lastEditorSession?.editor || null
            });
        } catch (err) {
            socket.emit('fetch-manpower-details-error', { message: 'Error fetching manpower details.', error: err.message });
        }
    });



    socket.on('fetch-additional-equipment-editors', async ({ role_id, page_name, fhr_id }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);

        if (!allowed) {
            return socket.emit('fetch-additional-equipment-editors-error', { message: error });
        }

        try {
            // Fetch active editors for Additional_Equipment
            const activeEditors = await FHR_Edit_Sessions.findAll({
                where: {
                    fhr_id,
                    section: 'Additional_Equipment',
                    is_active: true
                },
                include: [{
                    model: User,
                    as: 'editor',
                    attributes: ['user_id', 'first_name', 'last_name'],
                    include: [{
                        model: ProfileImage,
                        as: 'profileImage',
                        attributes: ['img_url']
                    }]
                }]
            });

            // Fetch the last non-active session (last editor)
            const lastEditorSession = await FHR_Edit_Sessions.findOne({
                where: {
                    fhr_id,
                    section: 'Additional_Equipment',
                    is_active: false
                },
                order: [['last_active_at', 'DESC']],
                include: [{
                    model: User,
                    as: 'editor',
                    attributes: ['user_id', 'first_name', 'last_name'],
                    include: [{
                        model: ProfileImage,
                        as: 'profileImage',
                        attributes: ['img_url']
                    }]
                }]
            });

            // ≡ƒöì Fetch Additional Equipment data for the given fhr_id
            const equipmentData = await AdditionalEquipment.findAll({
                where: { fhr_id },
                order: [['additional_equipment_id', 'ASC']]
            });

            socket.emit('fetch-additional-equipment-editors-success', {
                active_editors: activeEditors.map(s => s.editor),
                last_edited_by: lastEditorSession?.editor || null,
                equipment_data: equipmentData
            });
        } catch (err) {
            console.error('Γ¥î Failed to fetch additional equipment editors:', err);
            socket.emit('fetch-additional-equipment-editors-error', {
                message: 'Failed to fetch editor information.',
                error: err.message
            });
        }
    });












    socket.on('view-fhr-drafts', async ({
        role_id,
        page_name,
        limit = 25,
        searchTerm = '',
        airport_id,
        start_date,
        end_date
    }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('view-fhr-drafts-error', { message: error });
        }

        try {
            const whereClause = {
                status: { [Op.in]: ['Draft'] }
            };

            if (airport_id) {
                whereClause.airport_id = airport_id;
            }

            if (start_date && end_date) {
                const start = moment(start_date).startOf('day').toDate(); // 00:00:00
                const end = moment(end_date).endOf('day').toDate();       // 23:59:59.999

                whereClause.date_of_flight = {
                    [Op.between]: [start, end]
                };
            }


            if (searchTerm) {
                whereClause[Op.or] = [
                    { flight_no: { [Op.like]: `%${searchTerm}%` } },
                    { station: { [Op.like]: `%${searchTerm}%` } },
                    { type: { [Op.like]: `%${searchTerm}%` } },
                    { airline_name: { [Op.like]: `%${searchTerm}%` } },
                    { aircraft_type: { [Op.like]: `%${searchTerm}%` } }
                ];
            }

            const listings = await FHR_Listing.findAll({
                where: whereClause,
                include: [
                    {
                        model: Airport,
                        as: 'airport',
                        attributes: ['airport_id', 'name', 'iata'],
                    }
                ],
                order: [
                    ['date_of_flight', 'ASC'],
                    ['st', 'ASC']
                ],
                limit: Number(limit)
            });

            socket.emit('view-fhr-drafts-success', listings || []);
        } catch (err) {
            console.error('Γ¥î Failed to fetch draft FHRs:', err);
            socket.emit('view-fhr-drafts-error', {
                message: 'Failed to fetch draft FHRs.',
                error: err.message
            });
        }
    });




    socket.on('view-fhr-pending', async ({
        role_id,
        page_name,
        limit = 25,
        searchTerm = '',
        airport_id,
        start_date,
        end_date
    }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('view-fhr-pending-error', { message: error });
        }

        try {
            const whereClause = {
                status: { [Op.in]: ['Pending'] }
            };

            if (airport_id) {
                whereClause.airport_id = airport_id;
            }
            if (start_date && end_date) {
                const start = moment(start_date).startOf('day').toDate(); // 00:00:00
                const end = moment(end_date).endOf('day').toDate();       // 23:59:59.999

                whereClause.date_of_flight = {
                    [Op.between]: [start, end]
                };
            }
            if (searchTerm) {
                whereClause[Op.or] = [
                    { flight_no: { [Op.like]: `%${searchTerm}%` } },
                    { station: { [Op.like]: `%${searchTerm}%` } },
                    { type: { [Op.like]: `%${searchTerm}%` } },
                    { airline_name: { [Op.like]: `%${searchTerm}%` } },
                    { aircraft_type: { [Op.like]: `%${searchTerm}%` } }
                ];
            }

            const listings = await FHR_Listing.findAll({
                where: whereClause,
                include: [
                    {
                        model: Airport,
                        as: 'airport',
                        attributes: ['airport_id', 'name', 'iata'],
                    },
                    {
                        model: FHR,
                        as: 'fhr', // optional if you want full parent details
                        attributes: ['fhr_id'],
                        include: [
                            {
                                model: ArrivalDetails,
                                as: 'arrival_details'
                            },
                            {
                                model: DepartureDetails,
                                as: 'departure_details'
                            },
                        ]

                    }
                ],
                order: [
                    ['date_of_flight', 'ASC'],
                    ['st', 'ASC']
                ],
                limit: Number(limit)
            });

            socket.emit('view-fhr-pending-success', listings || []);
        } catch (err) {
            console.error('Γ¥î Failed to fetch pending FHRs:', err);
            socket.emit('view-fhr-pending-error', {
                message: 'Failed to fetch pending FHRs.',
                error: err.message
            });
        }
    });



    socket.on('view-fhr-submitted', async ({
        role_id,
        page_name,
        limit = 25,
        searchTerm = '',
        airport_id,
        start_date,
        end_date
    }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('view-fhr-submitted-error', { message: error });
        }

        try {
            const whereClause = {
                status: { [Op.in]: ['Submitted'] }
            };

            if (airport_id) {
                whereClause.airport_id = airport_id;
            }

            if (start_date && end_date) {
                const start = moment(start_date).startOf('day').toDate(); // 00:00:00
                const end = moment(end_date).endOf('day').toDate();       // 23:59:59.999

                whereClause.date_of_flight = {
                    [Op.between]: [start, end]
                };
            }

            if (searchTerm) {
                whereClause[Op.or] = [
                    { flight_no: { [Op.like]: `%${searchTerm}%` } },
                    { station: { [Op.like]: `%${searchTerm}%` } },
                    { type: { [Op.like]: `%${searchTerm}%` } },
                    { airline_name: { [Op.like]: `%${searchTerm}%` } },
                    { aircraft_type: { [Op.like]: `%${searchTerm}%` } }
                ];
            }

            const listings = await FHR_Listing.findAll({
                where: whereClause,
                include: [
                    {
                        model: Airport,
                        as: 'airport',
                        attributes: ['airport_id', 'name', 'iata'],
                    },
                    {
                        model: FHR,
                        as: 'fhr', // optional if you want full parent details
                        attributes: ['fhr_id'],
                        include: [
                            {
                                model: ArrivalDetails,
                                as: 'arrival_details'
                            },
                            {
                                model: DepartureDetails,
                                as: 'departure_details'
                            },
                        ]

                    }
                ],
                order: [
                    ['date_of_flight', 'ASC'],
                    ['st', 'ASC']
                ],
                limit: Number(limit)
            });

            socket.emit('view-fhr-submitted-success', listings || []);
        } catch (err) {
            console.error('Γ¥î Failed to fetch submitted FHRs:', err);
            socket.emit('view-fhr-submitted-error', {
                message: 'Failed to fetch submitted FHRs.',
                error: err.message
            });
        }
    });





    socket.on('view-fhr-completed', async ({
        role_id,
        page_name,
        limit = 25,
        searchTerm = '',
        airport_id,
        start_date,
        end_date
    }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('view-fhr-completed-error', { message: error });
        }

        try {
            const whereClause = {
                status: { [Op.in]: ['Completed'] }
            };

            if (airport_id) {
                whereClause.airport_id = airport_id;
            }
            if (start_date && end_date) {
                const start = moment(start_date).startOf('day').toDate(); // 00:00:00
                const end = moment(end_date).endOf('day').toDate();       // 23:59:59.999

                whereClause.date_of_flight = {
                    [Op.between]: [start, end]
                };
            }

            if (searchTerm) {
                whereClause[Op.or] = [
                    { flight_no: { [Op.like]: `%${searchTerm}%` } },
                    { station: { [Op.like]: `%${searchTerm}%` } },
                    { type: { [Op.like]: `%${searchTerm}%` } },
                    { airline_name: { [Op.like]: `%${searchTerm}%` } },
                    { aircraft_type: { [Op.like]: `%${searchTerm}%` } }
                ];
            }

            const listings = await FHR_Listing.findAll({
                where: whereClause,
                include: [
                    {
                        model: Airport,
                        as: 'airport',
                        attributes: ['airport_id', 'name', 'iata'],
                    },
                    {
                        model: FHR,
                        as: 'fhr', // optional if you want full parent details
                        attributes: ['fhr_id'],
                        include: [
                            {
                                model: ArrivalDetails,
                                as: 'arrival_details'
                            },
                            {
                                model: DepartureDetails,
                                as: 'departure_details'
                            },
                        ]

                    }
                ],
                order: [
                    ['date_of_flight', 'ASC'],
                    ['st', 'ASC']
                ],
                limit: Number(limit)
            });

            socket.emit('view-fhr-completed-success', listings || []);
        } catch (err) {
            console.error('Γ¥î Failed to fetch completed FHRs:', err);
            socket.emit('view-fhr-completed-error', {
                message: 'Failed to fetch completed FHRs.',
                error: err.message
            });
        }
    });




    socket.on('view-fhr-cancelled', async ({
        role_id,
        page_name,
        limit = 25,
        searchTerm = '',
        airport_id,
        start_date,
        end_date
    }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('view-fhr-cancelled-error', { message: error });
        }

        try {
            const whereClause = {
                status: { [Op.in]: ['Cancelled'] }
            };

            if (airport_id) {
                whereClause.airport_id = airport_id;
            }
            if (start_date && end_date) {
                const start = moment(start_date).startOf('day').toDate(); // 00:00:00
                const end = moment(end_date).endOf('day').toDate();       // 23:59:59.999

                whereClause.date_of_flight = {
                    [Op.between]: [start, end]
                };
            }

            if (searchTerm) {
                whereClause[Op.or] = [
                    { flight_no: { [Op.like]: `%${searchTerm}%` } },
                    { station: { [Op.like]: `%${searchTerm}%` } },
                    { type: { [Op.like]: `%${searchTerm}%` } },
                    { airline_name: { [Op.like]: `%${searchTerm}%` } },
                    { aircraft_type: { [Op.like]: `%${searchTerm}%` } }
                ];
            }

            const listings = await FHR_Listing.findAll({
                where: whereClause,
                include: [
                    {
                        model: Airport,
                        as: 'airport',
                        attributes: ['airport_id', 'name', 'iata'],
                    },
                    {
                        model: FHR,
                        as: 'fhr', // optional if you want full parent details
                        attributes: ['fhr_id'],
                        include: [
                            {
                                model: ArrivalDetails,
                                as: 'arrival_details'
                            },
                            {
                                model: DepartureDetails,
                                as: 'departure_details'
                            },
                        ]

                    }
                ],
                order: [
                    ['date_of_flight', 'ASC'],
                    ['st', 'ASC']
                ],
                limit: Number(limit)
            });

            socket.emit('view-fhr-cancelled-success', listings || []);
        } catch (err) {
            console.error('Γ¥î Failed to fetch cancelled FHRs:', err);
            socket.emit('view-fhr-cancelled-error', {
                message: 'Failed to fetch cancelled FHRs.',
                error: err.message
            });
        }
    });











    socket.on('view-full-fhr-by-id', async ({ role_id, page_name, fhr_id }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);

        if (!allowed) {
            return socket.emit('view-full-fhr-by-id-error', { message: error });
        }

        try {
            const fhrData = await FHR.findOne({
                where: { fhr_id },
                attributes: { exclude: ['category_id'] },
                include: [
                    {
                        model: Business,
                        as: 'business',
                        attributes: ['business_id', 'name', 'gstin', 'address1', 'address2', 'city', 'state', 'pincode', 'country', 'email', 'phone', 'bank', 'branch', 'account_no', 'ifsc', 'swift_code', 'cin', 'phone']
                    },
                    {
                        model: Airport,
                        as: 'airport',
                        attributes: ['airport_id', 'name', 'iata']
                    },
                    {
                        model: Client,
                        as: 'client',
                        attributes: ['client_id', 'name', 'gstin', 'address1', 'address2', 'city', 'state', 'pincode', 'country',]
                    },
                    {
                        model: Airline,
                        as: 'airline',
                        attributes: ['airline_id', 'airline_name', 'iata']
                    },
                    {
                        model: Aircraft,
                        as: 'aircraft',
                        attributes: ['aircraft_id', 'type_name', 'currency', 'AAI_levy']
                    },
                    {
                        model: User,
                        as: 'submittedUser',
                        attributes: ['user_id', 'first_name', 'last_name', 'email'],
                        include: [
                            {
                                model: ProfileImage,
                                as: 'profileImage',
                                attributes: ['img_url']
                            }
                        ]
                    },
                    {
                        model: BasicDetails,
                        as: 'basic_details'
                    },
                    {
                        model: ArrivalDetails,
                        as: 'arrival_details'
                    },
                    {
                        model: DepartureDetails,
                        as: 'departure_details'
                    },
                    {
                        model: ManPowerDetails,
                        as: 'man_power_details'
                    },
                    {
                        model: CargoDetails,
                        as: 'cargo_details'
                    }
                ]
            });

            if (!fhrData) {
                return socket.emit('view-full-fhr-by-id-error', {
                    message: 'No FHR found for the given ID.'
                });
            }

            socket.emit('view-full-fhr-by-id-success', fhrData);
        } catch (err) {
            console.error('Γ¥î Failed to fetch full FHR:', err);
            socket.emit('view-full-fhr-by-id-error', {
                message: 'Failed to fetch full FHR details.',
                error: err.message
            });
        }
    });






};
