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
const AdditionalCharges = require('../Models/Additional_charges');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/checkPermission');
const { getIO } = require('../sockets/socketHandler');
const { promoteDraftToPending, emitFhrStatusLists } = require('../services/promoteDraftToPending');

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

        let createdCount = 0;
        let skippedEmptyRange = 0;

        for (const data of excelDataList) {
            const { wef, wet, days, sta, std, arrival_flight_no, departure_flight_no, from_iata, to_iata, type_of_aircraft, remarks } = data;
            const { aircraft } = data;
            const { airline } = aircraft;
            const business = airline.business;
            const airport = airline.airport;
            const client = airline.client;

            const dateList = [];
            let rangeStart = new Date(wef);
            let rangeEnd = new Date(wet);
            // Excel columns sometimes swapped — allow generation when "to" is before "from"
            if (rangeEnd < rangeStart) {
                const tmp = rangeStart;
                rangeStart = rangeEnd;
                rangeEnd = tmp;
            }

            const normalizedDays = !days || String(days).toLowerCase() === 'daily'
                ? 'daily'
                : String(days).split(/[\/\,\s]+/).map(d => d.trim()).filter(Boolean);

            let currentDate = new Date(rangeStart);
            while (currentDate <= rangeEnd) {
                const dayCode = dayMap[currentDate.getDay()];
                if (normalizedDays === 'daily' || (Array.isArray(normalizedDays) && normalizedDays.includes(dayCode))) {
                    dateList.push(new Date(currentDate));
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }

            if (dateList.length === 0) {
                skippedEmptyRange += 1;
                continue;
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
                    Fhr_type: 'Schedule',
                    type: arrival_flight_no && departure_flight_no ? 'Both' : arrival_flight_no ? 'Arrival' : 'Departure',
                    remarks: remarks,
                    status: 'Draft'
                }, { transaction });
                createdCount += 1;

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
        res.json({
            message: `FHR generated successfully. Created ${createdCount} draft(s).`,
            createdCount,
            skippedEmptyRange
        });
    } catch (error) {
        console.error('Error generating FHR:', error);
        await transaction.rollback();
        res.status(500).json({ message: 'Failed to generate FHR.', error: error.message });
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
    const { fhr_id } = req.body;

    let transaction;

    try {
        if (!fhr_id) {
            return res.status(400).json({ message: 'fhr_id is required.' });
        }

        const fhr = await FHR.findByPk(fhr_id, {
            attributes: {
                exclude: ['category_id'],
            },
            include: [
                { model: ArrivalDetails, as: 'arrival_details' },
                { model: DepartureDetails, as: 'departure_details' },
            ],
        });
        if (!fhr) {
            return res.status(404).json({ message: 'FHR not found.' });
        }

        if (['Submitted', 'Completed', 'Cancelled'].includes(fhr.status)) {
            return res.status(400).json({ message: `Cannot create additional equipment while FHR is ${fhr.status}.` });
        }

        const {
            findActiveTariff,
            findActiveWalkupTariff,
        } = require('../services/sghaTariffSnapshot');
        const SghaTariffLine = require('../NewModels/SghaTariffLine');

        const toDateOnly = (value) => {
            if (!value) return null;
            const d = value instanceof Date ? value : new Date(value);
            if (Number.isNaN(d.getTime())) return null;
            return d.toISOString().slice(0, 10);
        };
        const arrival = fhr.arrival_details;
        const departure = fhr.departure_details;
        let ratingDate;
        if (fhr.type === 'Departure') {
            ratingDate =
                toDateOnly(departure?.atd) ||
                toDateOnly(departure?.std) ||
                toDateOnly(fhr.issue_date);
        } else {
            ratingDate =
                toDateOnly(arrival?.ata) ||
                toDateOnly(arrival?.sta) ||
                toDateOnly(fhr.issue_date);
        }

        const client = await Client.findByPk(fhr.client_id, {
            attributes: ['client_id', 'client_registration_id'],
        });
        const isWalkup = String(fhr.Fhr_type || '') === 'Non-Schedule';
        const tariff = isWalkup
            ? await findActiveWalkupTariff({
                  airportId: fhr.airport_id,
                  businessId: fhr.business_id,
                  onDate: ratingDate,
              })
            : await findActiveTariff({
                  clientId: fhr.client_id,
                  airportId: fhr.airport_id,
                  clientRegistrationId: client?.client_registration_id || null,
                  onDate: ratingDate,
              });

        if (!tariff) {
            return res.status(400).json({
                message: isWalkup
                    ? 'No Active walk-up tariff for this airport/date. Add a walk-up tariff first.'
                    : 'No Active SGHA tariff for this client/airport/date. Complete the SGHA tariff first.',
                created_count: 0,
            });
        }

        transaction = await sequelize.transaction();

        const tariffLines = await SghaTariffLine.findAll({
            where: {
                tariff_id: tariff.tariff_id,
                line_type: 'Additional',
            },
            order: [['tariff_line_id', 'ASC']],
            transaction,
        });

        if (!tariffLines.length) {
            await transaction.rollback();
            return res.status(400).json({
                message:
                    'Active tariff has no Additional lines. Add Additional services on the tariff, then create again.',
                created_count: 0,
            });
        }

        // Keep urgent ad-hoc rows; only replace tariff-catalog lines.
        await AdditionalEquipment.destroy({
            where: { fhr_id, is_adhoc: false },
            transaction,
        });

        await Promise.all(
            tariffLines.map((line) =>
                AdditionalEquipment.create(
                    {
                        fhr_id,
                        charges_id: null,
                        tariff_line_id: line.tariff_line_id,
                        is_adhoc: false,
                        unit_rate: null,
                        service_name: line.description || 'Additional service',
                        service_type: line.line_type || 'Additional',
                        unit: line.unit || null,
                        total_no_used: null,
                        time_slots: [{ start: null, end: null }],
                        total_time: null,
                    },
                    { transaction }
                )
            )
        );

        await AdditionalEquipmentCreation.upsert(
            {
                fhr_id,
                creation_status: true,
            },
            { transaction }
        );

        await transaction.commit();

        const io = getIO();
        io.emit('fhrUpdated', { fhr_id });

        res.status(201).json({
            message: 'Additional Equipment created from tariff lines.',
            created_count: tariffLines.length,
            tariff_id: tariff.tariff_id,
        });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Error creating additional equipment:', error);
        return res.status(500).json({
            message: 'Server error while creating additional equipment',
            error: error.message,
        });
    } finally {
        if (transaction && !transaction.finished) await transaction.rollback();
    }
});

/**
 * Urgent ad-hoc service not listed on the Active SGHA / walk-up tariff.
 * Body: { fhr_id, service_name, unit?, total_no_used?, remarks? }
 */
router.post('/add-adhoc-equipment/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
    const {
        fhr_id,
        service_name,
        unit,
        unit_rate,
        total_no_used,
        remarks,
    } = req.body || {};

    let transaction;
    try {
        if (!fhr_id) {
            return res.status(400).json({ message: 'fhr_id is required.' });
        }
        const name = String(service_name || '').trim();
        if (!name) {
            return res.status(400).json({ message: 'service_name is required.' });
        }
        const parsedRate = Number(unit_rate);
        const rate =
            unit_rate != null && unit_rate !== '' && Number.isFinite(parsedRate) && parsedRate >= 0
                ? parsedRate
                : null;
        const qty =
            total_no_used != null && total_no_used !== ''
                ? Number(total_no_used)
                : 1;
        const slotCount = Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1;

        const fhr = await FHR.findByPk(fhr_id, { attributes: ['fhr_id', 'status'] });
        if (!fhr) {
            return res.status(404).json({ message: 'FHR not found.' });
        }
        if (['Submitted', 'Completed', 'Cancelled'].includes(fhr.status)) {
            return res.status(400).json({
                message: `Cannot add ad-hoc equipment while FHR is ${fhr.status}.`,
            });
        }

        transaction = await sequelize.transaction();
        const created = await AdditionalEquipment.create(
            {
                fhr_id,
                charges_id: null,
                tariff_line_id: null,
                is_adhoc: true,
                unit_rate: rate,
                service_name: name,
                service_type: 'Ad-hoc',
                unit: unit ? String(unit).trim() : null,
                total_no_used: Number.isFinite(qty) ? qty : null,
                time_slots: Array.from({ length: slotCount }, () => ({
                    start: null,
                    end: null,
                })),
                total_time: null,
                remarks: remarks ? String(remarks).trim() : null,
            },
            { transaction }
        );

        await AdditionalEquipmentCreation.upsert(
            { fhr_id, creation_status: true },
            { transaction }
        );

        const { airport_id } = await promoteDraftToPending(fhr_id, transaction);

        await transaction.commit();

        emitFhrStatusLists(fhr_id, airport_id);

        return res.status(201).json({
            message: 'Ad-hoc service added.',
            equipment: created,
        });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Error adding ad-hoc equipment:', error);
        return res.status(500).json({
            message: 'Server error while adding ad-hoc equipment',
            error: error.message,
        });
    } finally {
        if (transaction && !transaction.finished) await transaction.rollback();
    }
});

router.delete(
    '/adhoc-equipment/:page_name/:additional_equipment_id',
    authenticateToken,
    checkPermission('delete'),
    async (req, res) => {
        const { additional_equipment_id } = req.params;
        let transaction;
        try {
            const row = await AdditionalEquipment.findByPk(additional_equipment_id);
            if (!row) {
                return res.status(404).json({ message: 'Equipment row not found.' });
            }
            if (!row.is_adhoc) {
                return res.status(400).json({
                    message: 'Only ad-hoc services can be deleted this way. Use Reset for tariff lines.',
                });
            }

            const fhr = await FHR.findByPk(row.fhr_id, { attributes: ['fhr_id', 'status'] });
            if (fhr && ['Submitted', 'Completed', 'Cancelled'].includes(fhr.status)) {
                return res.status(400).json({
                    message: `Cannot delete ad-hoc equipment while FHR is ${fhr.status}.`,
                });
            }

            transaction = await sequelize.transaction();
            const fhrId = row.fhr_id;
            await row.destroy({ transaction });
            const left = await AdditionalEquipment.count({
                where: { fhr_id: fhrId },
                transaction,
            });
            if (!left) {
                await AdditionalEquipmentCreation.upsert(
                    { fhr_id: fhrId, creation_status: false },
                    { transaction }
                );
            }
            await transaction.commit();

            const io = getIO();
            io.emit('fhrUpdated', { fhr_id: fhrId });
            return res.json({ message: 'Ad-hoc service removed.' });
        } catch (error) {
            if (transaction) await transaction.rollback();
            console.error('Error deleting ad-hoc equipment:', error);
            return res.status(500).json({
                message: 'Server error while deleting ad-hoc equipment',
                error: error.message,
            });
        } finally {
            if (transaction && !transaction.finished) await transaction.rollback();
        }
    }
);

// Allow retry when creation was marked done but no equipment rows exist
router.post('/reset-additional-equipment/:page_name', authenticateToken, checkPermission('edit'), async (req, res) => {
    const { fhr_id } = req.body;
    if (!fhr_id) {
        return res.status(400).json({ message: 'fhr_id is required.' });
    }

    let transaction;
    try {
        const fhr = await FHR.findByPk(fhr_id, { attributes: ['fhr_id', 'status'] });
        if (!fhr) {
            return res.status(404).json({ message: 'FHR not found.' });
        }
        if (['Submitted', 'Completed', 'Cancelled'].includes(fhr.status)) {
            return res.status(400).json({ message: `Cannot reset additional equipment while FHR is ${fhr.status}.` });
        }

        transaction = await sequelize.transaction();
        // Reset tariff catalog only; keep urgent ad-hoc services.
        await AdditionalEquipment.destroy({
            where: { fhr_id, is_adhoc: false },
            transaction,
        });
        const adhocLeft = await AdditionalEquipment.count({
            where: { fhr_id, is_adhoc: true },
            transaction,
        });
        await AdditionalEquipmentCreation.upsert({
            fhr_id,
            creation_status: adhocLeft > 0,
        }, { transaction });
        await transaction.commit();

        const io = getIO();
        io.emit('fhrUpdated', { fhr_id });

        res.json({
            message: adhocLeft
                ? 'Tariff equipment reset. Ad-hoc services were kept.'
                : 'Additional equipment reset. Create from tariff or add an ad-hoc service.',
        });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Error resetting additional equipment:', error);
        return res.status(500).json({
            message: 'Server error while resetting additional equipment',
            error: error.message
        });
    } finally {
        if (transaction && !transaction.finished) await transaction.rollback();
    }
});





router.get(
    '/adhoc-catalog/:page_name/:fhr_id',
    authenticateToken,
    checkPermission('view'),
    async (req, res) => {
        try {
            const { fhr_id } = req.params;
            const fhr = await FHR.findByPk(fhr_id, {
                attributes: ['fhr_id', 'business_id', 'airport_id'],
            });
            if (!fhr) {
                return res.status(404).json({ message: 'FHR not found.' });
            }

            const shortUnit = (unit) => {
                const raw = String(unit || '').trim();
                if (!raw) return 'Each';
                if (raw.length <= 24) return raw;
                const lower = raw.toLowerCase();
                if (lower.includes('hour') || lower.includes('hrs')) return 'Hour';
                if (lower.includes('trip')) return 'Trip';
                if (lower.includes('min')) return 'Mins';
                if (lower.includes('each') || lower.includes('unit')) return 'Each';
                return 'Each';
            };
            const seen = new Set();
            const options = [];
            const push = (name, unit) => {
                const n = String(name || '').trim();
                if (!n) return;
                const key = n.toLowerCase();
                if (seen.has(key)) return;
                seen.add(key);
                options.push({ service_name: n, unit: shortUnit(unit) });
            };

            try {
                const rows = await AdditionalCharges.findAll({
                    where: {
                        Business_id: fhr.business_id,
                        Airport_id: fhr.airport_id,
                    },
                    attributes: ['Desc_of_service', 'unit_or_measure'],
                    order: [['Desc_of_service', 'ASC']],
                });
                rows.forEach((row) =>
                    push(row.Desc_of_service, row.unit_or_measure)
                );
            } catch (catalogErr) {
                console.warn('Ad-hoc catalog additional charges skipped:', catalogErr.message);
            }

            const types = await ChargeType.findAll({
                attributes: ['name'],
                order: [['name', 'ASC']],
            });
            types.forEach((type) => push(type.name, 'Each'));

            [
                'GPU',
                'Air starter unit',
                'Pushback',
                'Cabin cleaning',
                'De-icing',
                'Other',
            ].forEach((name) => push(name, 'Each'));

            return res.json({ options });
        } catch (error) {
            console.error('Ad-hoc catalog error:', error);
            return res.status(500).json({
                message: error.message || 'Failed to load ad-hoc services.',
            });
        }
    }
);

module.exports = router;
