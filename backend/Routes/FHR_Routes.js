const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const ExcelData = require('../Models/Excel_data');
const FHR = require('../Models/FHR');
const FHR_Listing = require('../Models/FHR_Listing');
const Aircraft = require('../Models/Aircraft');
const Airline = require('../Models/Airlines');
const Business = require('../Models/Business');
const Airport = require('../Models/Airport');
const Client = require('../Models/Client');
const BasicDetails = require('../Models/Basic_Details');
const ArrivalDetails = require('../Models/Arrival_Details');
const DepartureDetails = require('../Models/Departure_Details');
const ManPowerDetails = require('../Models/Man_Power_Details');
const CargoDetails = require('../Models/Cargo_Details');
const AircraftCharges = require('../Models/Aircraft_Charges');
const AdditionalEquipment = require('../Models/Additional_Equipment'); // make sure it's imported
const AdditionalEquipmentCreation = require('../Models/Additional_equipment_creation');
const ChargeType = require('../Models/ChargeType');
const Category = require('../Models/Category');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/checkPermission');
const { getIO } = require('../sockets/socketHandler');

function buildDateTime(date, timeStr) {
    if (!timeStr || !/^\d{2}:\d{2}(:\d{2})?$/.test(timeStr)) return null;
    const [hh, mm, ss = '00'] = timeStr.split(':');
    const yyyy = date.getFullYear();
    const mmStr = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    // Format: 'YYYY-MM-DDTHH:mm:ss'
    const isoString = `${yyyy}-${mmStr}-${dd}T${hh}:${mm}:${ss}`;
    return new Date(isoString);
}

router.post('/generate-fhr/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const excelDataList = await ExcelData.findAll({
            where: { fhr_creation_status: false },
            include: [
                {
                    model: Aircraft,
                    as: 'aircraft',
                    include: [
                        {
                            model: Airline,
                            as: 'airline',
                            include: [
                                { model: Business, as: 'business' },
                                { model: Airport, as: 'airport' },
                                { model: Client, as: 'client' }
                            ]
                        }
                    ]
                }
            ]
        });


        const dayMap = {
            0: '7', // Sunday
            1: '1',
            2: '2',
            3: '3',
            4: '4',
            5: '5',
            6: '6'
        };

        for (const data of excelDataList) {
            const { wef, wet, days, sta, std, arrival_flight_no, departure_flight_no, from_iata, to_iata, type_of_aircraft, remarks } = data;
            const { aircraft } = data;
            const { airline } = aircraft;
            const business = airline.business;
            const airport = airline.airport;
            const client = airline.client;

            const dateList = [];
            let currentDate = new Date(wef);
            const endDate = new Date(wet);

            const normalizedDays = days.toLowerCase() === 'daily'
                ? 'daily'
                : days.split(/[\/\,\s]+/).map(d => d.trim());

            while (currentDate <= endDate) {
                const dayCode = dayMap[currentDate.getDay()];
                if (normalizedDays === 'daily' || (Array.isArray(normalizedDays) && normalizedDays.includes(dayCode))) {
                    dateList.push(new Date(currentDate));
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }

            for (const date of dateList) {
                const staDateTime = buildDateTime(date, sta);
                const stdDateTime = buildDateTime(date, std);

                const fhr = await FHR.create({
                    business_id: business.business_id,
                    client_id: client.client_id,
                    airport_id: airport.airport_id,
                    airline_id: airline.airline_id,
                    aircraft_id: aircraft.aircraft_id,
                    excel_data_id: data.excel_data_id,
                    type: arrival_flight_no && departure_flight_no ? 'Both' : arrival_flight_no ? 'Arrival' : 'Departure',
                    remarks: remarks,
                    status: 'Draft'
                }, { transaction });

                await BasicDetails.create({
                    fhr_id: fhr.fhr_id,
                    ice_no: null,
                    epcg_no: null,
                    country_of_origin_of_service: null,
                    place_of_delivery_of_service: null,
                    status: 'Draft'
                }, { transaction });

                if (arrival_flight_no) {
                    await FHR_Listing.create({
                        airport_id: airport.airport_id,
                        fhr_id: fhr.fhr_id,
                        excel_data_id: data.excel_data_id,
                        airline_name: airline.airline_name,
                        aircraft_type: aircraft.type_name,
                        client_name: client.name,
                        type: 'Arrival',
                        flight_no: arrival_flight_no,
                        station:
                            (from_iata && String(from_iata).trim().toUpperCase()) ||
                            airport.iata ||
                            'XXX',
                        st: sta,
                        date_of_flight: date
                    }, { transaction });
                }
                await ArrivalDetails.create({
                    fhr_id: fhr.fhr_id,
                    flight_no: arrival_flight_no,
                    flight_weight: null,
                    flight_region: null,
                    flight_type: type_of_aircraft,
                    operator: null,
                    bay_no: null,
                    gate_no: null,
                    airport: airport.name,
                    sta: staDateTime,
                    ata: null,
                    sta_ata_diff: null,
                    crew_count: null,
                    pax_members: null,
                    loading_start: null,
                    loading_over: null,
                    status: 'Draft'
                }, { transaction });


                if (departure_flight_no) {
                    await FHR_Listing.create({
                        airport_id: airport.airport_id,
                        fhr_id: fhr.fhr_id,
                        excel_data_id: data.excel_data_id,
                        airline_name: airline.airline_name,
                        aircraft_type: aircraft.type_name,
                        client_name: client.name,
                        type: 'Departure',
                        flight_no: departure_flight_no,
                        station:
                            (to_iata && String(to_iata).trim().toUpperCase()) ||
                            airport.iata ||
                            'XXX',
                        st: std,
                        date_of_flight: date
                    }, { transaction });
                }
                await DepartureDetails.create({
                    fhr_id: fhr.fhr_id,
                    flight_no: departure_flight_no,
                    flight_weight: null,
                    flight_region: null,
                    flight_type: type_of_aircraft,
                    operator: null,
                    bay_no: null,
                    gate_no: null,
                    airport: airport.name,
                    std: stdDateTime,
                    atd: null,
                    std_atd_diff: null,
                    crew_count: null,
                    pax_members: null,
                    loading_start: null,
                    loading_over: null,
                    status: 'Draft'
                }, { transaction });


                await ManPowerDetails.create({
                    fhr_id: fhr.fhr_id,
                    arrival_wheel_chair: null,
                    departure_wheel_chair: null,
                    total_wheel_chair: null,
                    maas: null,
                    status: 'Draft'
                }, { transaction });

                await CargoDetails.create({
                    fhr_id: fhr.fhr_id,
                    no_of_trips: null,
                    start_time: null,
                    end_time: null,
                    total_time: null,
                    status: 'Draft'
                }, { transaction });
            }

            await data.update({ fhr_creation_status: true }, { transaction });
        }

        await transaction.commit();
        res.json({ message: 'Γ£à FHR and listings generated successfully.' });
    } catch (error) {
        console.error('Γ¥î Error generating FHR:', error);
        await transaction.rollback();
        res.status(500).json({ message: 'Γ¥î Failed to generate FHR.', error: error.message });
    }
    finally {
        if (transaction && !transaction.finished) await transaction.rollback();
    }
});





router.post('/generate-single-fhr/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
        let transaction;

    try {
        transaction = await sequelize.transaction();
        const {
            business_id,
            client_id,
            client_name,
            airport_id,
            airline_id,
            aircraft_id,
            arrival_flight_no,
            departure_flight_no,
            from_iata,
            to_iata,
            sta,
            std,
            remarks,
            date_of_flight
        } = req.body;

        const { resolveOrCreateWalkupClient } = require('../services/walkupClient');
        const { client } = await resolveOrCreateWalkupClient(
          {
            client_id,
            client_name,
            business_id,
            airport_id,
          },
          transaction
        );

        // Fetch related data for names
        const [airline, aircraft, airport] = await Promise.all([
            Airline.findByPk(airline_id, { transaction }),
            Aircraft.findByPk(aircraft_id, { transaction }),
            Airport.findByPk(airport_id, { transaction })
        ]);

        if (!airline || !aircraft || !client || !airport) {
            throw new Error("Invalid airline, aircraft, client, or airport ID.");
        }
        const client_id_resolved = client.client_id;
        if (!arrival_flight_no && !departure_flight_no) {
            throw new Error("Provide an arrival and/or departure flight number.");
        }

        const flightDate = new Date(date_of_flight);
        const staDateTime = buildDateTime(flightDate, sta);
        const stdDateTime = buildDateTime(flightDate, std);
        const arrivalStation =
            (from_iata && String(from_iata).trim().toUpperCase()) ||
            airport.iata ||
            'XXX';
        const departureStation =
            (to_iata && String(to_iata).trim().toUpperCase()) ||
            airport.iata ||
            'XXX';

        const fhrType = arrival_flight_no && departure_flight_no
            ? 'Both'
            : arrival_flight_no
                ? 'Arrival'
                : 'Departure';

        const fhr = await FHR.create({
            business_id,
            client_id: client_id_resolved,
            airport_id,
            airline_id,
            aircraft_id,
            type: fhrType,
            remarks,
            Fhr_type: 'Non-Schedule',
            status: 'Draft'
        }, { transaction });

        await BasicDetails.create({
            fhr_id: fhr.fhr_id,
            ice_no: null,
            epcg_no: null,
            country_of_origin_of_service: null,
            place_of_delivery_of_service: null,
            status: 'Draft'
        }, { transaction });

        if (arrival_flight_no) {
            await FHR_Listing.create({
                airport_id,
                fhr_id: fhr.fhr_id,
                airline_name: airline.airline_name,
                aircraft_type: aircraft.type_name,
                client_name: client.name,
                type: 'Arrival',
                flight_no: arrival_flight_no,
                station: arrivalStation,
                st: sta,
                date_of_flight: flightDate,
                Fhr_type: 'Non-Schedule',
                status: 'Draft'
            }, { transaction });

            await ArrivalDetails.create({
                fhr_id: fhr.fhr_id,
                flight_no: arrival_flight_no,
                flight_weight: null,
                flight_region: null,
                flight_type: aircraft.type_name,
                operator: null,
                bay_no: null,
                gate_no: null,
                airport: airport.name,
                sta: staDateTime,
                ata: null,
                sta_ata_diff: null,
                crew_count: null,
                pax_members: null,
                loading_start: null,
                loading_over: null,
                status: 'Draft'
            }, { transaction });
        }

        if (departure_flight_no) {
            await FHR_Listing.create({
                airport_id,
                fhr_id: fhr.fhr_id,
                airline_name: airline.airline_name,
                aircraft_type: aircraft.type_name,
                client_name: client.name,
                type: 'Departure',
                flight_no: departure_flight_no,
                station: departureStation,
                st: std,
                date_of_flight: flightDate,
                Fhr_type: 'Non-Schedule',
                status: 'Draft'
            }, { transaction });

            await DepartureDetails.create({
                fhr_id: fhr.fhr_id,
                flight_no: departure_flight_no,
                flight_weight: null,
                flight_region: null,
                flight_type: aircraft.type_name,
                operator: null,
                bay_no: null,
                gate_no: null,
                airport: airport.name,
                std: stdDateTime,
                atd: null,
                std_atd_diff: null,
                crew_count: null,
                pax_members: null,
                loading_start: null,
                loading_over: null,
                status: 'Draft'
            }, { transaction });
        }

        await ManPowerDetails.create({
            fhr_id: fhr.fhr_id,
            arrival_wheel_chair: null,
            departure_wheel_chair: null,
            total_wheel_chair: null,
            maas: null,
            status: 'Draft'
        }, { transaction });

        await CargoDetails.create({
            fhr_id: fhr.fhr_id,
            no_of_trips: null,
            start_time: null,
            end_time: null,
            total_time: null,
            status: 'Draft'
        }, { transaction });

        await transaction.commit();
        res.json({
          message: 'Single FHR (Non-Schedule) created successfully.',
          fhr_id: fhr.fhr_id,
          fhr,
        });
    } catch (error) {
        console.error('Error creating single FHR:', error);
        if (transaction && !transaction.finished) {
          await transaction.rollback();
        }
        res.status(500).json({ message: 'Failed to create single FHR.', error: error.message });
    }
});



router.post('/create-additional-equipment/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
    const { aircraft_id, fhr_id, category_id } = req.body;

    let transaction;

    try {
        transaction = await sequelize.transaction();

        // ≡ƒöì Step 1: Construct WHERE clause
        const whereClause = { aircraft_id };
        if (category_id) {
            whereClause.category_id = category_id;
        }

        // ≡ƒôÑ Step 2: Fetch filtered aircraft charges
        const charges = await AircraftCharges.findAll({
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
                }
            ],
            order: [['charges_id', 'ASC']],
            transaction
        });

        // ΓÜÖ∩╕Å Step 3: Insert into Additional_Equipment
        const equipmentPromises = charges.map(charge => {
            return AdditionalEquipment.create({
                fhr_id,
                charges_id: charge.charges_id,
                service_name: charge.service,
                service_type: charge.chargeType?.name || null,
                unit: charge.unit,
                total_no_used: null,
                time_slots: [],
                total_time: null
            }, { transaction });
        });

        await Promise.all(equipmentPromises);

        // Γ£à Step 4: Update creation status
        await AdditionalEquipmentCreation.upsert({
            fhr_id,
            creation_status: true
        }, { transaction });

        await transaction.commit();

        res.status(201).json({
            message: 'Additional Equipment created successfully.',
            created_count: charges.length
        });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Γ¥î Error creating additional equipment:', error);
        return res.status(500).json({
            message: 'Server error while creating additional equipment',
            error: error.message
        });
    } finally {
        if (transaction && !transaction.finished) await transaction.rollback();
    }
});





module.exports = router;
