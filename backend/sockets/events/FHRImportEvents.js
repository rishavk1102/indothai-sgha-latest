const sequelize = require("../../config/database");
const { Op } = require("sequelize"); // Γ£à Import Op
const ExcelData = require("../../Models/Excel_data");
const ExcelFile = require("../../Models/ExcelFile");
const User = require("../../Models/User");
const Aircraft = require("../../Models/Aircraft");
const Airline = require("../../Models/Airlines");
const Business = require("../../Models/Business");
const Airport = require("../../Models/Airport");
const Client = require("../../Models/Client");
const ProfileImage = require("../../Models/ProfileImage");
const checkSocketPermission = require("../../middleware/checkSocketPermission");


module.exports = (io, socket) => {

    socket.on('view-excel-data', async ({
        role_id,
        page_name,
        sortOrder = "ASC",
        limit = 15,
        searchTerm = "",
        aircraft_id
    }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('view-excel-data-error', { message: error });
        }

        try {
            const whereClause = {};

            if (searchTerm) {
                whereClause[Op.or] = [
                    { arrival_flight_no: { [Op.like]: `%${searchTerm}%` } },
                    { departure_flight_no: { [Op.like]: `%${searchTerm}%` } },
                    { type_of_aircraft: { [Op.like]: `%${searchTerm}%` } },
                    { from_iata: { [Op.like]: `%${searchTerm}%` } },
                    { to_iata: { [Op.like]: `%${searchTerm}%` } },
                    { days: { [Op.like]: `%${searchTerm}%` } }
                ];
            }

            // if (aircraft_id) {
            //     whereClause.aircraft_id = aircraft_id;
            // }

            const excelDataList = await ExcelData.findAll({
                where: whereClause,
                include: [
                    {
                        model: Aircraft,
                        as: 'aircraft',
                        include: [
                            {
                                model: Airline,
                                as: 'airline',
                                attributes: ['airline_id', 'airline_name', 'iata'],
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
                                ]
                            }
                        ]
                    },
                    {
                        model: User,
                        as: 'inserted_by',
                        attributes: ['user_id', 'first_name', 'last_name'],
                        include: [
                            {
                                model: ProfileImage,
                                as: 'profileImage',
                                attributes: ['img_url']
                            }
                        ]
                    }
                ],
                order: [['excel_data_id', sortOrder]],
                limit: Number(limit)
            });


            if (!excelDataList || excelDataList.length === 0) {
                return socket.emit('view-excel-data-error', {
                    message: 'No Excel data found.',
                });
            }

            socket.emit('view-excel-data-success', excelDataList);
        } catch (err) {
            console.error('Γ¥î Failed to fetch Excel data:', err);
            socket.emit('view-excel-data-error', {
                message: 'Failed to fetch Excel data.',
                error: err.message,
            });
        }
    });


    socket.on('view-excel-files', async ({
        role_id,
        page_name,
        sortOrder = "DESC",
        limit = 5,
        searchTerm = ""
    }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('view-excel-files-error', { message: error });
        }

        try {
            const whereClause = {};

            if (searchTerm) {
                whereClause[Op.or] = [
                    { file_name: { [Op.like]: `%${searchTerm}%` } },
                    { remarks: { [Op.like]: `%${searchTerm}%` } }
                ];
            }

            const excelFiles = await ExcelFile.findAll({
                where: whereClause,
                include: [
                    {
                        model: User,
                        as: 'inserted_by',
                        attributes: ['user_id', 'first_name', 'last_name'],
                        include: [
                            {
                                model: ProfileImage,
                                as: 'profileImage',
                                attributes: ['img_url']
                            }
                        ]
                    }
                ],
                order: [['createdAt', sortOrder]],
                limit: Number(limit)
            });

            if (!excelFiles || excelFiles.length === 0) {
                return socket.emit('view-excel-files-error', {
                    message: 'No uploaded Excel files found.'
                });
            }

            socket.emit('view-excel-files-success', excelFiles);
        } catch (err) {
            console.error('Γ¥î Failed to fetch Excel files:', err);
            socket.emit('view-excel-files-error', {
                message: 'Failed to fetch Excel file records.',
                error: err.message
            });
        }
    });


};
