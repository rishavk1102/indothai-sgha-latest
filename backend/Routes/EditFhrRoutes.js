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
const FHR_Edit_Sessions = require('../Models/FHR_Edit_Sessions');
const FHR_Edit_Fields = require('../Models/FHR_Edit_Fields');
const AdditionalEquipment = require('../Models/Additional_Equipment');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/checkPermission');
const { getIO } = require('../sockets/socketHandler');


router.put('/update-fhr-status/:page_name/:fhr_id', authenticateToken, checkPermission('edit'), async (req, res) => {
    const { fhr_id } = req.params;
    const { newStatus, cancellation_reason,
        issue_date,
        declaration1,
        declaration2,
        submitted_by,
        remarks
    } = req.body;

    if (!['Draft', 'Pending', 'Submitted', 'Cancelled', 'Completed'].includes(newStatus)) {
        return res.status(400).json({ message: 'Invalid status provided' });
    }

    let transaction;

    try {
        transaction = await sequelize.transaction();

        const fhr = await FHR.findByPk(fhr_id, {
            attributes: { exclude: ['category_id'] },
            include: [
                { model: BasicDetails, as: 'basic_details' },
                { model: ArrivalDetails, as: 'arrival_details' },
                { model: DepartureDetails, as: 'departure_details' },
                { model: ManPowerDetails, as: 'man_power_details' },
                { model: CargoDetails, as: 'cargo_details' },
                { model: FHR_Listing, as: 'fhr_listings' } // Γ£à Include listings
            ],
            transaction
        });

        if (!fhr) {
            await transaction.rollback();
            return res.status(404).json({ message: 'FHR not found' });
        }

        const updateAllStatuses = async (status) => {
            const updates = [];
            if (fhr.basic_details) updates.push(fhr.basic_details.update({ status }, { transaction }));
            if (fhr.arrival_details) updates.push(fhr.arrival_details.update({ status }, { transaction }));
            if (fhr.departure_details) updates.push(fhr.departure_details.update({ status }, { transaction }));
            if (fhr.man_power_details) updates.push(fhr.man_power_details.update({ status }, { transaction }));
            if (fhr.cargo_details) updates.push(fhr.cargo_details.update({ status }, { transaction }));
            // Γ£à Update all FHR_Listing rows
            if (Array.isArray(fhr.fhr_listings)) {
                fhr.fhr_listings.forEach(listing => {
                    updates.push(listing.update({ status }, { transaction }));
                });
            }
            await Promise.all(updates);
        };

        if (newStatus === 'Draft' || newStatus === 'Pending') {
            await updateAllStatuses(newStatus);
            await fhr.update({ status: newStatus }, { transaction });
        }

        else if (newStatus === 'Submitted') {
            // Saving the FHR submits every section with it — no need to flip each
            // section dropdown to Submitted first.
            const fhrUpdateFields = {
                status: 'Submitted',
                issue_date: issue_date || new Date(), // default to now if not passed
                declaration1: declaration1 || null,
                declaration2: declaration2 || null,
                submitted_by: submitted_by || req.user.id,
                remarks: remarks || null
            };

            await fhr.update(fhrUpdateFields, { transaction });
            await updateAllStatuses('Submitted');
        }

        else if (newStatus === 'Cancelled') {
            if (!cancellation_reason) {
                await transaction.rollback();
                return res.status(400).json({ message: 'Cancellation reason is required' });
            }

            await updateAllStatuses('Cancelled');
            await fhr.update({ status: 'Cancelled', cancellation_reason }, { transaction });
        }

        else if (newStatus === 'Completed') {
            if (fhr.status !== 'Submitted' && fhr.status !== 'Completed') {
                await transaction.rollback();
                return res.status(400).json({
                    message: 'FHR must be Submitted before it can be Completed',
                });
            }
            await fhr.update({ status: 'Completed' }, { transaction });
            if (Array.isArray(fhr.fhr_listings)) {
                await Promise.all(
                    fhr.fhr_listings.map((listing) =>
                        listing.update({ status: 'Completed' }, { transaction })
                    )
                );
            }
        }

        await transaction.commit();

        let ratingResult = null;
        if (newStatus === 'Completed') {
            try {
                const { rateFhrFromTariff } = require('../services/fhrRating');
                ratingResult = await rateFhrFromTariff(fhr_id, {
                    rated_by: req.user?.user_id || req.user?.id || null,
                });
                console.log(
                    `📦 FHR ${fhr_id} rating:`,
                    ratingResult?.reason,
                    ratingResult?.rating?.status || ''
                );
            } catch (ratingError) {
                console.error(
                    `⚠️ FHR ${fhr_id} completed but rating failed:`,
                    ratingError.message
                );
                ratingResult = {
                    created: false,
                    reason: 'rating_error',
                    error: ratingError.message,
                };
            }
        }

        // Optionally broadcast to sockets here
        const io = getIO();
        io.emit('fhrUpdated', { fhr_id });
        io.emit('fhrlistUpdated', { airport_id: fhr.airport_id, });



        res.json({
            message: 'FHR status updated successfully',
            rating: ratingResult
                ? {
                    created: ratingResult.created,
                    reason: ratingResult.reason,
                    status: ratingResult.rating?.status || null,
                    rating_id: ratingResult.rating?.rating_id || null,
                    detail: ratingResult.rating?.reason || null,
                    line_count:
                        ratingResult.lineCount ||
                        ratingResult.rating?.lines?.length ||
                        0,
                    error: ratingResult.error || null,
                }
                : null,
        });

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('FHR status update error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
    finally {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});



router.get(
    '/fhr-rating/:page_name/:fhr_id',
    authenticateToken,
    checkPermission('view'),
    async (req, res) => {
        try {
            const { getFhrRating, rateFhrFromTariff } = require('../services/fhrRating');
            let rating = await getFhrRating(req.params.fhr_id);
            if (!rating) {
                const fhr = await FHR.findByPk(req.params.fhr_id, {
                    attributes: { exclude: ['category_id'] },
                });
                if (fhr?.status === 'Completed') {
                    const result = await rateFhrFromTariff(req.params.fhr_id, {
                        rated_by: req.user?.user_id || req.user?.id || null,
                    });
                    rating = result.rating;
                }
            }
            if (!rating) {
                return res.status(404).json({ message: 'No rating for this FHR yet' });
            }

            let invoice = null;
            try {
                const { Op } = require('sequelize');
                const InvoiceFhr = require('../NewModels/InvoiceFhr');
                const Invoice = require('../NewModels/Invoice');
                const link = await InvoiceFhr.findOne({
                    where: { fhr_id: req.params.fhr_id },
                    include: [
                        {
                            model: Invoice,
                            as: 'invoice',
                            attributes: [
                                'invoice_id',
                                'invoice_no',
                                'status',
                                'grand_total',
                                'currency',
                            ],
                            where: {
                                status: {
                                    [Op.in]: ['Draft', 'Under review', 'Issued'],
                                },
                            },
                            required: true,
                        },
                    ],
                });
                invoice = link?.invoice || null;
            } catch (linkErr) {
                console.warn('FHR invoice link lookup skipped:', linkErr.message);
            }

            return res.json({ rating, invoice });
        } catch (err) {
            console.error('FHR rating fetch error:', err);
            return res.status(500).json({
                message: 'Failed to load FHR rating',
                error: err.message,
            });
        }
    }
);

router.post(
    '/rate-fhr/:page_name/:fhr_id',
    authenticateToken,
    checkPermission('edit'),
    async (req, res) => {
        try {
            const fhr = await FHR.findByPk(req.params.fhr_id, {
                attributes: { exclude: ['category_id'] },
            });
            if (!fhr) {
                return res.status(404).json({ message: 'FHR not found' });
            }
            if (fhr.status !== 'Completed') {
                return res.status(400).json({
                    message: 'Only Completed FHRs can be rated',
                });
            }
            const { rateFhrFromTariff } = require('../services/fhrRating');
            const result = await rateFhrFromTariff(req.params.fhr_id, {
                rated_by: req.user?.user_id || req.user?.id || null,
                force: Boolean(req.body?.force),
            });
            return res.json(result);
        } catch (err) {
            console.error('FHR rate error:', err);
            return res.status(500).json({
                message: 'Failed to rate FHR',
                error: err.message,
            });
        }
    }
);

router.post(
    '/fhr-rating/:page_name/:fhr_id/adhoc',
    authenticateToken,
    checkPermission('edit'),
    async (req, res) => {
        try {
            const { addAdHocChargeFromTariff } = require('../services/fhrRating');
            const result = await addAdHocChargeFromTariff(req.params.fhr_id, {
                tariff_line_id: req.body?.tariff_line_id,
                qty: req.body?.qty,
                override_by: req.user?.user_id || req.user?.id || null,
            });
            return res.status(201).json(result);
        } catch (err) {
            console.error('FHR ad-hoc charge error:', err);
            return res.status(400).json({
                message: err.message || 'Failed to add ad-hoc charge',
            });
        }
    }
);

router.post('/start-edit-session/:page_name/:fhr_id', authenticateToken, checkPermission('edit'), async (req, res) => {
    const { fhr_id } = req.params;
    const { section, action = 'start' } = req.body; // ≡ƒöü Added action: 'start' | 'end'
    const user_id = req.user.id;

    const validSections = ['Basic_Details', 'Arrival_Details', 'Departure_Details', 'Man_Power_Details', 'Cargo_Details', 'Additional_Equipment'];
    if (!validSections.includes(section)) {
        return res.status(400).json({ message: 'Invalid section' });
    }

    let transaction;
    try {
        transaction = await sequelize.transaction();

        if (action === 'start') {
            // ≡ƒöÆ End any previous session before starting
            await FHR_Edit_Sessions.update(
                { is_active: false },
                {
                    where: { fhr_id, user_id, section, is_active: true },
                    transaction
                }
            );

            // ≡ƒåò Create new session
            const newSession = await FHR_Edit_Sessions.create({
                fhr_id,
                user_id,
                section,
                started_at: new Date(),
                last_active_at: new Date(),
                is_active: true
            }, { transaction });

            await transaction.commit();

            const io = getIO();
            io.emit('fhrUpdated', { fhr_id });

            return res.json({ message: 'Edit session started', session: newSession });
        }

        else if (action === 'end') {
            // Γ£à End current session
            const activeSession = await FHR_Edit_Sessions.findOne({
                where: { fhr_id, user_id, section, is_active: true },
                transaction
            });

            if (!activeSession) {
                await transaction.rollback();
                return res.status(404).json({ message: 'No active session found to end.' });
            }

            await activeSession.update({
                is_active: false,
                last_active_at: new Date()
            }, { transaction });

            await transaction.commit();

            const io = getIO();
            io.emit('fhrUpdated', { fhr_id });

            return res.json({ message: 'Edit session ended' });
        }

        else {
            await transaction.rollback();
            return res.status(400).json({ message: 'Invalid action. Use "start" or "end".' });
        }

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Session start/end error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
    finally {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});





router.put('/update-basic-details/:page_name/:fhr_id', authenticateToken, checkPermission('edit'), async (req, res) => {
    const { fhr_id } = req.params;
    const { ice_no, epcg_no, country_of_origin_of_service, place_of_delivery_of_service,
        status // Γ£à Accept status optionally
    } = req.body;
    const user_id = req.user.id;


    let transaction;

    try {
        transaction = await sequelize.transaction();

        const basicDetails = await BasicDetails.findOne({ where: { fhr_id }, transaction });
        if (!basicDetails) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Basic details not found for this FHR.' });
        }

        // Fetch or create active edit session
        let session = await FHR_Edit_Sessions.findOne({
            where: { fhr_id, user_id, section: 'Basic_Details', is_active: true },
            transaction
        });

        if (!session) {
            session = await FHR_Edit_Sessions.create({
                fhr_id,
                user_id,
                section: 'Basic_Details',
                started_at: new Date(),
                last_active_at: new Date(),
                is_active: false
            }, { transaction });
        }

        const fieldsToUpdate = {
            ice_no,
            epcg_no,
            country_of_origin_of_service,
            place_of_delivery_of_service
        };
        // Γ£à Handle status only if it's "Submitted" or "Pending"
        if (status && ['Submitted', 'Pending'].includes(status)) {
            fieldsToUpdate.status = status;
        }
        const updates = {};

        for (const [field, newValue] of Object.entries(fieldsToUpdate)) {
            const oldValue = basicDetails[field] || '';
            if (oldValue !== newValue) {
                await FHR_Edit_Fields.create({
                    session_id: session.session_id,
                    fhr_id,
                    user_id,
                    section: 'Basic_Details',
                    field_name: field,
                    old_value: oldValue,
                    current_value: newValue,
                    updated_at: new Date()
                }, { transaction });

                updates[field] = newValue;
            }
        }

        if (Object.keys(updates).length > 0) {
            await basicDetails.update(updates, { transaction });
        }

        // Γ¥ù End the session after update
        await session.update({
            last_active_at: new Date()
        }, { transaction });

        await transaction.commit();

        const io = getIO();
        io.emit('fhrUpdated', { fhr_id });

        res.json({ message: 'Basic details updated successfully.' });

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Update basic details error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
    finally {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});



function formatFieldValue(value) {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object' && value !== null) return JSON.stringify(value);
    return value?.toString() || '';
}


router.put('/update-arrival-details/:page_name/:fhr_id', authenticateToken, checkPermission('edit'), async (req, res) => {
    const { fhr_id } = req.params;
    const {
        flight_no, flight_weight, flight_region, flight_type, operator, bay_no, gate_no,
        airport, sta, ata, sta_ata_diff, crew_count, pax_members,
        loading_start, loading_over, status
    } = req.body;

    const user_id = req.user.id;
    let transaction;

    try {
        transaction = await sequelize.transaction();

        const arrivalDetails = await ArrivalDetails.findOne({ where: { fhr_id }, transaction });
        if (!arrivalDetails) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Arrival details not found for this FHR.' });
        }

        // Fetch or create active edit session
        let session = await FHR_Edit_Sessions.findOne({
            where: { fhr_id, user_id, section: 'Arrival_Details', is_active: true },
            transaction
        });

        if (!session) {
            session = await FHR_Edit_Sessions.create({
                fhr_id,
                user_id,
                section: 'Arrival_Details',
                started_at: new Date(),
                last_active_at: new Date(),
                is_active: false
            }, { transaction });
        }

        const fieldsToUpdate = {
            flight_no, flight_weight, flight_region, flight_type, operator, bay_no, gate_no,
            airport, sta, ata, sta_ata_diff, crew_count, pax_members,
            loading_start, loading_over
        };

        if (status && ['Submitted', 'Pending'].includes(status)) {
            fieldsToUpdate.status = status;
        }

        const updates = {};
        for (const [field, newValue] of Object.entries(fieldsToUpdate)) {
            const oldValue = arrivalDetails[field] || '';
            const isDifferent = newValue !== undefined && oldValue != newValue;
            if (isDifferent) {
                await FHR_Edit_Fields.create({
                    session_id: session.session_id,
                    fhr_id,
                    user_id,
                    section: 'Arrival_Details',
                    field_name: field,
                    old_value: formatFieldValue(oldValue),
                    current_value: formatFieldValue(newValue),
                    updated_at: new Date()
                }, { transaction });
                updates[field] = newValue;
            }
        }

        if (Object.keys(updates).length > 0) {
            await arrivalDetails.update(updates, { transaction });
        }

        await session.update({
            last_active_at: new Date()
        }, { transaction });

        await transaction.commit();

        const io = getIO();
        io.emit('fhrUpdated', { fhr_id });

        res.json({ message: 'Arrival details updated successfully.' });
    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Update arrival details error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    } finally {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});



router.put('/update-departure-details/:page_name/:fhr_id', authenticateToken, checkPermission('edit'), async (req, res) => {
    const { fhr_id } = req.params;
    const {
        flight_no,
        flight_weight,
        flight_region,
        flight_type,
        operator,
        bay_no,
        gate_no,
        airport,
        std,
        atd,
        std_atd_diff,
        crew_count,
        pax_members,
        loading_start,
        loading_over,
        status
    } = req.body;

    const user_id = req.user.id;

    let transaction;

    try {
        transaction = await sequelize.transaction();

        const departureDetails = await DepartureDetails.findOne({ where: { fhr_id }, transaction });
        if (!departureDetails) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Departure details not found for this FHR.' });
        }

        // Fetch or create active edit session
        let session = await FHR_Edit_Sessions.findOne({
            where: { fhr_id, user_id, section: 'Departure_Details', is_active: true },
            transaction
        });

        if (!session) {
            session = await FHR_Edit_Sessions.create({
                fhr_id,
                user_id,
                section: 'Departure_Details',
                started_at: new Date(),
                last_active_at: new Date(),
                is_active: false
            }, { transaction });
        }

        const fieldsToUpdate = {
            flight_no,
            flight_weight,
            flight_region,
            flight_type,
            operator,
            bay_no,
            gate_no,
            airport,
            std,
            atd,
            std_atd_diff,
            crew_count,
            pax_members,
            loading_start,
            loading_over
        };

        // Γ£à Handle status only if it's "Submitted" or "Pending"
        if (status && ['Submitted', 'Pending'].includes(status)) {
            fieldsToUpdate.status = status;
        }

        const updates = {};

        for (const [field, newValue] of Object.entries(fieldsToUpdate)) {
            const oldValue = departureDetails[field] || null;
            const changed = (oldValue instanceof Date && newValue instanceof Date)
                ? oldValue.getTime() !== newValue.getTime()
                : oldValue !== newValue;

            if (changed) {
                await FHR_Edit_Fields.create({
                    session_id: session.session_id,
                    fhr_id,
                    user_id,
                    section: 'Departure_Details',
                    field_name: field,
                    old_value: formatFieldValue(oldValue),
                    current_value: formatFieldValue(newValue),
                    updated_at: new Date()
                }, { transaction });

                updates[field] = newValue;
            }
        }

        if (Object.keys(updates).length > 0) {
            await departureDetails.update(updates, { transaction });
        }

        // Update session last active time
        await session.update({ last_active_at: new Date() }, { transaction });

        await transaction.commit();

        const io = getIO();
        io.emit('fhrUpdated', { fhr_id });

        res.json({ message: 'Departure details updated successfully.' });
    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Update departure details error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    } finally {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});



router.put('/update-cargo-details/:page_name/:fhr_id', authenticateToken, checkPermission('edit'), async (req, res) => {
    const { fhr_id } = req.params;
    const { no_of_trips, start_time, end_time, total_time, status } = req.body;
    const user_id = req.user.id;

    let transaction;

    try {
        transaction = await sequelize.transaction();

        const cargoDetails = await CargoDetails.findOne({ where: { fhr_id }, transaction });
        if (!cargoDetails) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Cargo details not found for this FHR.' });
        }

        // Fetch or create edit session
        let session = await FHR_Edit_Sessions.findOne({
            where: { fhr_id, user_id, section: 'Cargo_Details', is_active: true },
            transaction,
        });

        if (!session) {
            session = await FHR_Edit_Sessions.create({
                fhr_id,
                user_id,
                section: 'Cargo_Details',
                started_at: new Date(),
                last_active_at: new Date(),
                is_active: false,
            }, { transaction });
        }

        const fieldsToUpdate = {
            no_of_trips,
            start_time,
            end_time,
            total_time,
        };

        // Γ£à Add status only if valid
        if (status && ['Submitted', 'Pending'].includes(status)) {
            fieldsToUpdate.status = status;
        }

        const updates = {};

        for (const [field, newValue] of Object.entries(fieldsToUpdate)) {
            const oldValue = cargoDetails[field] || null;

            const changed = (oldValue instanceof Date && newValue instanceof Date)
                ? oldValue.getTime() !== newValue.getTime()
                : oldValue !== newValue;

            if (changed) {
                await FHR_Edit_Fields.create({
                    session_id: session.session_id,
                    fhr_id,
                    user_id,
                    section: 'Cargo_Details',
                    field_name: field,
                    old_value: formatFieldValue(oldValue),
                    current_value: formatFieldValue(newValue),
                    updated_at: new Date(),
                }, { transaction });

                updates[field] = newValue;
            }
        }

        if (Object.keys(updates).length > 0) {
            await cargoDetails.update(updates, { transaction });
        }

        await session.update({ last_active_at: new Date() }, { transaction });

        await transaction.commit();

        const io = getIO();
        io.emit('fhrUpdated', { fhr_id });

        res.json({ message: 'Cargo details updated successfully.' });

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Update cargo details error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    } finally {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});


router.put('/update-manpower-details/:page_name/:fhr_id', authenticateToken, checkPermission('edit'), async (req, res) => {
    const { fhr_id } = req.params;
    const {
        arrival_wheel_chair,
        departure_wheel_chair,
        total_wheel_chair,
        maas,
        status
    } = req.body;
    const user_id = req.user.id;

    let transaction;

    try {
        transaction = await sequelize.transaction();

        const manpowerDetails = await ManPowerDetails.findOne({ where: { fhr_id }, transaction });
        if (!manpowerDetails) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Man Power details not found for this FHR.' });
        }

        // Fetch or create active session
        let session = await FHR_Edit_Sessions.findOne({
            where: { fhr_id, user_id, section: 'Man_Power_Details', is_active: true },
            transaction,
        });

        if (!session) {
            session = await FHR_Edit_Sessions.create({
                fhr_id,
                user_id,
                section: 'Man_Power_Details',
                started_at: new Date(),
                last_active_at: new Date(),
                is_active: false
            }, { transaction });
        }

        const fieldsToUpdate = {
            arrival_wheel_chair,
            departure_wheel_chair,
            total_wheel_chair,
            maas
        };

        // Γ£à Update status only if valid
        if (status && ['Submitted', 'Pending'].includes(status)) {
            fieldsToUpdate.status = status;
        }

        const updates = {};

        for (const [field, newValue] of Object.entries(fieldsToUpdate)) {
            const oldValue = manpowerDetails[field] || null;

            if (oldValue !== newValue) {
                await FHR_Edit_Fields.create({
                    session_id: session.session_id,
                    fhr_id,
                    user_id,
                    section: 'Man_Power_Details',
                    field_name: field,
                    old_value: formatFieldValue(oldValue),
                    current_value: formatFieldValue(newValue),
                    updated_at: new Date(),
                }, { transaction });

                updates[field] = newValue;
            }
        }

        if (Object.keys(updates).length > 0) {
            await manpowerDetails.update(updates, { transaction });
        }

        await session.update({ last_active_at: new Date() }, { transaction });

        await transaction.commit();

        const io = getIO();
        io.emit('fhrUpdated', { fhr_id });

        res.json({ message: 'Man Power details updated successfully.' });

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Update Man Power details error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    } finally {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});





router.put('/update-additional-equipment/:page_name/:fhr_id', authenticateToken, checkPermission('edit'), async (req, res) => {
    const { fhr_id } = req.params;
    const user_id = req.user.id;
    const { equipment_list = [] } = req.body;

    let transaction;

    try {
        transaction = await sequelize.transaction();

        const existingEquipments = await AdditionalEquipment.findAll({ where: { fhr_id }, transaction });

        // Session creation for auditing
        let session = await FHR_Edit_Sessions.findOne({
            where: { fhr_id, user_id, section: 'Additional_Equipment', is_active: true },
            transaction,
        });

        if (!session) {
            session = await FHR_Edit_Sessions.create({
                fhr_id,
                user_id,
                section: 'Additional_Equipment',
                started_at: new Date(),
                last_active_at: new Date(),
                is_active: false
            }, { transaction });
        }

        for (const newItem of equipment_list) {
            const equipment_id = newItem.additional_equipment_id;
            if (!equipment_id) continue;

            const existingItem = existingEquipments.find(e => e.additional_equipment_id === equipment_id);
            if (!existingItem) continue;

            const fieldsToUpdate = ['total_no_used', 'time_slots', 'total_time', 'remarks'];
            const updates = {};

            for (const field of fieldsToUpdate) {
                const oldValue = existingItem[field];
                const newValue = newItem[field];

                const formattedOld = formatFieldValue(oldValue);
                const formattedNew = formatFieldValue(newValue);

                if (formattedOld !== formattedNew) {
                    updates[field] = newValue;

                    await FHR_Edit_Fields.create({
                        session_id: session.session_id,
                        fhr_id,
                        user_id,
                        section: 'Additional_Equipment',
                        field_name: field,
                        old_value: formattedOld,
                        current_value: formattedNew,
                        updated_at: new Date(),
                    }, { transaction });
                }
            }

            if (Object.keys(updates).length > 0) {
                await existingItem.update(updates, { transaction });
            }
        }

        await session.update({ last_active_at: new Date() }, { transaction });

        await transaction.commit();

        const io = getIO();
        io.emit('fhrUpdated', { fhr_id });

        res.json({ message: 'Additional Equipment updated successfully.' });

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Update Additional Equipment error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    } finally {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});








module.exports = router;
