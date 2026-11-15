const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const { Op } = require('sequelize');
const Business = require('../Models/Business');
const Airport = require('../Models/Airport');
const Client = require('../Models/Client');
const Airline = require('../Models/Airlines');
const Aircraft = require('../Models/Aircraft');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/checkPermission');
const { getIO } = require('../sockets/socketHandler');
const ExcelJS = require('exceljs');
const JSZip = require('jszip');
const multer = require('multer');
const ExcelData = require('../Models/Excel_data');
const ExcelFile = require('../Models/ExcelFile');
const s3Client = require('../config/spacesConfig');
const { PutObjectCommand } = require('@aws-sdk/client-s3');

const upload = multer({ storage: multer.memoryStorage() }); // memoryStorage for buffer access

router.get('/download-excel/:page_name/:businessId/:user_id', authenticateToken, checkPermission('view'), async (req, res) => {
    const { businessId, user_id } = req.params;
    const io = getIO();

    try {
        io.emit('excel-progress', { user_id, step: 'Fetching business data...' });

        const business = await Business.findByPk(businessId, {
            include: [{
                model: Airport,
                as: 'airports',
                include: [{
                    model: Client,
                    as: 'clients',
                    include: [{
                        model: Airline,
                        as: 'airlines',
                        include: [
                            { model: Aircraft, as: 'aircrafts' },
                            { model: Airport, as: 'airport' }
                        ]
                    }]
                }]
            }]
        });

        if (!business) {
            io.emit('excel-error', { user_id, message: 'Business not found' });
            return res.status(404).json({ message: 'Business not found' });
        }

        io.emit('excel-progress', { user_id, step: 'Generating Excel file...' });

        const workbook = new ExcelJS.Workbook();

        for (const airport of business.airports) {
            for (const client of airport.clients) {
                for (const airline of client.airlines) {
                    const worksheetName = `${client.name} - ${airline.airline_name}`.slice(0, 31);
                    const worksheet = workbook.addWorksheet(worksheetName);

                    worksheet.addRow([
                        'Airport ID', 'Airport Name', 'Airline ID', 'Airline Name',
                        'Available Aircrafts', 'Aircraft ID', '', '', '', '', '', '', '', '', '', '', '', '', '', 'IndoThaiOriginalExportedFile'
                    ]).font = { bold: true };

                    airline.aircrafts.forEach((aircraft, i) => {
                        worksheet.addRow([
                            i === 0 ? airline.airport?.airport_id || '' : '',
                            i === 0 ? `${airline.airport?.name || ''} (${airline.airport?.iata || ''})` : '',
                            i === 0 ? airline.airline_id : '',
                            i === 0 ? `${airline.airline_name} (${airline.iata})` : '',
                            aircraft.type_name,
                            aircraft.aircraft_id
                        ]);
                    });

                    worksheet.addRow(['']);

                    const notes = [
                        'Note : Utilize exclusively the aircraft names or IDs provided above that are currently accessible.',
                        'Note : Avoid making any edits or modifications to values within the table headers and above.',
                        'Note : Please refrain from modifying or altering any values within the table headers.',
                        'Note : Aircraft ID column is a required field.',
                        'Note : Strictly adhere to the specified formats for the columns DAYS, STA, STD, and WEF.'
                    ];
                    const colors = ['FFFF9E', 'FFFF9E', 'FFFF9E', 'F72525', '8BF578'];

                    notes.forEach((note, i) => {
                        const row = worksheet.addRow([note]);
                        worksheet.mergeCells(`A${row.number}:K${row.number}`);
                        row.getCell(1).fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: colors[i] }
                        };
                        row.getCell(1).alignment = { wrapText: true };
                        if (i === 3) {
                            row.getCell(1).font = { color: { argb: 'FFFFFF' } };
                        }
                    });

                    worksheet.addRow([
                        'AIRCRAFT ID', 'ARRIVAL FLT NO', 'OUTGOING FLT NO',
                        'TYPE OF A/C', 'FROM', 'TO', 'DAYS', 'STA', 'STD', 'WEF'
                    ]).font = { bold: true };

                    worksheet.views = [{ state: 'frozen', ySplit: worksheet.lastRow.number }];
                    worksheet.columns.forEach(col => { col.width = 22; });

                    io.emit('excel-progress', { user_id, step: `Processed worksheet: ${worksheetName}` });
                }
            }
        }

        io.emit('excel-progress', { user_id, step: 'Writing Excel to buffer...' });
        const buffer = await workbook.xlsx.writeBuffer();

        io.emit('excel-progress', { user_id, step: 'Compressing Excel into zip...' });
        const zip = new JSZip();
        const safeBusinessName = business.name.replace(/[\\/:*?"<>|]/g, '_'); // sanitize file name
        zip.file(`${safeBusinessName}_export.xlsx`, buffer);
        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=${safeBusinessName}_export.zip`);
        res.end(zipBuffer);

        io.emit('excel-complete', { user_id, message: 'Excel export completed successfully.' });

    } catch (error) {
        console.error('Γ¥î Excel generation error:', error);
        io.emit('excel-error', { user_id, message: 'Excel generation failed.', error: error.message });
        return res.status(500).json({ error: 'Failed to generate Excel' });
    }
});


function parseExcelTime(cell) {
    if (!cell) return null;

    switch (cell.type) {
        case 0: // Null
            return null;

        case 4: // Date
            const date = cell.value;
            if (date instanceof Date) {
                const hours = String(date.getUTCHours()).padStart(2, '0');
                const minutes = String(date.getUTCMinutes()).padStart(2, '0');
                const seconds = String(date.getUTCSeconds()).padStart(2, '0');
                return `${hours}:${minutes}:${seconds}`;
            }
            return null;

        case 2: // Number (Excel fractional time)
            const totalSeconds = Math.round(cell.value * 86400);
            const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
            const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
            const s = String(totalSeconds % 60).padStart(2, '0');
            return `${h}:${m}:${s}`;

        case 1: // String (fallback if someone manually typed time)
            const match = cell.value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
            if (match) {
                const h = match[1].padStart(2, '0');
                const m = match[2];
                const s = match[3] || '00';
                return `${h}:${m}:${s}`;
            }
            return null;

        default:
            return null;
    }
}



router.post('/upload-excel/:page_name', authenticateToken, checkPermission('add'), upload.single('file'), async (req, res) => {
    const { remarks, inserted_by_user_id, wet } = req.body;
    const io = getIO();

    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    const wetDate = new Date(wet); // Γ£à FIXED HERE
    let updateCount = 0;
    let transaction;

    try {
        io.emit('excel-progress', { user_id: inserted_by_user_id, step: '≡ƒôñ Upload started. Parsing Excel...' });
        // Upload file to Spaces first
        const key = `excel-files/${inserted_by_user_id}/${Date.now()}_${req.file.originalname}`;
        const uploadParams = {
            Bucket: process.env.SPACES_BUCKET,
            Key: key,
            Body: req.file.buffer,
            ACL: 'public-read',
            ContentType: req.file.mimetype,
        };

        await s3Client.send(new PutObjectCommand(uploadParams));
        const fileUrl = `${process.env.SPACES_CDN_ENDPOINT}/${uploadParams.Key}`;

        // Store file record in DB
        await ExcelFile.create({
            file_name: req.file.originalname,
            file_url: fileUrl,
            inserted_by_user_id,
            remarks
        });

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);

        const rowsToInsert = [];

        for (const worksheet of workbook.worksheets) {
            io.emit('excel-progress', {
                user_id: inserted_by_user_id,
                step: `≡ƒôä Processing sheet: ${worksheet.name}`
            });

            const headerRowIndex = worksheet.actualRowCount - worksheet._rows.slice().reverse().findIndex(row =>
                row.values.includes('AIRCRAFT ID')
            );

            const headerRow = worksheet.getRow(headerRowIndex);
            const expectedHeaders = [
                'AIRCRAFT ID', 'ARRIVAL FLT NO', 'OUTGOING FLT NO',
                'TYPE OF A/C', 'FROM', 'TO', 'DAYS', 'STA', 'STD', 'WEF'
            ];

            const isHeaderValid = expectedHeaders.every((header, i) =>
                (headerRow.getCell(i + 1).value || '').toString().toUpperCase().trim() === header
            );

            if (!isHeaderValid) {
                io.emit('excel-progress', {
                    user_id: inserted_by_user_id,
                    step: `ΓÜá∩╕Å Skipping "${worksheet.name}" (invalid headers)`
                });
                continue;
            }

            for (let i = headerRowIndex + 1; i <= worksheet.rowCount; i++) {
                const row = worksheet.getRow(i);

                const aircraft_id = String(row.getCell(1).value || '').trim();
                const arrival_flight_no = String(row.getCell(2).value || '').trim();
                const departure_flight_no = String(row.getCell(3).value || '').trim();
                const type_of_aircraft = String(row.getCell(4).value || '').trim();
                const from_iata = String(row.getCell(5).value || '').trim();
                const to_iata = String(row.getCell(6).value || '').trim();
                const days = String(row.getCell(7).value || '').trim();

                const staRaw = row.getCell(8).value;
                const stdRaw = row.getCell(9).value;
                const wefRaw = row.getCell(10).value;

                const sta = parseExcelTime(row.getCell(8));
                const std = parseExcelTime(row.getCell(9));

                const wef = wefRaw ? new Date(wefRaw) : null;

                if (!aircraft_id || !days || !wef) continue;

                const existing = await ExcelData.findOne({
                    where: {
                        aircraft_id,
                        arrival_flight_no,
                        departure_flight_no,
                        type_of_aircraft,
                        from_iata,
                        to_iata,
                        [Op.or]: [
                            {
                                wef: { [Op.lte]: wef },
                                wet: { [Op.gte]: wef }
                            },
                            {
                                wef: { [Op.lte]: wetDate },
                                wet: { [Op.gte]: wetDate }
                            }
                        ]
                    }
                });

                if (!existing) {
                    rowsToInsert.push({
                        aircraft_id,
                        arrival_flight_no,
                        departure_flight_no,
                        type_of_aircraft,
                        from_iata,
                        to_iata,
                        days,
                        sta,
                        std,
                        wef,
                        wet: wetDate,
                        fhr_creation_status: false,
                        inserted_by_user_id,
                        remarks
                    });
                } else {
                    // Check if any value has changed
                    const fieldsToCompare = {
                        sta, std, days
                    };

                    const hasChanges = Object.entries(fieldsToCompare).some(([key, value]) => {
                        return existing[key]?.toString() !== value?.toString();
                    });

                    if (hasChanges) {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0); // Remove time part for consistency

                        await existing.update({
                            sta,
                            std,
                            days,
                            wef: today, // Γ£à Set wef to today when updating
                            fhr_creation_status: false, // Γ£à Reset FHR status to false
                            inserted_by_user_id
                        });
                        updateCount++;
                        io.emit('excel-progress', {
                            user_id: inserted_by_user_id,
                            step: `ΓÖ╗∩╕Å Updated record for Aircraft ID: ${aircraft_id} in "${worksheet.name}" (WEF set to today)`
                        });
                    } else {
                        io.emit('excel-progress', {
                            user_id: inserted_by_user_id,
                            step: `ΓÜá∩╕Å Skipped identical record (Aircraft ID: ${aircraft_id}) on "${worksheet.name}"`
                        });
                    }
                }
            }
        }


        // Final condition check
        if (rowsToInsert.length === 0 && updateCount === 0) {
            io.emit('excel-error', {
                user_id: inserted_by_user_id,
                message: 'Γ¥î No new or updated records found (all identical).'
            });
            return res.status(400).json({ message: 'No new or updated records found (all identical).' });
        }

        transaction = await sequelize.transaction();

        await ExcelData.bulkCreate(rowsToInsert, { transaction });

        await transaction.commit();

        io.emit('excel-complete', {
            user_id: inserted_by_user_id,
            message: `Γ£à Uploaded ${rowsToInsert.length} new and updated ${updateCount} existing records.`
        });


        io.emit('FHR-import-complete');

        return res.json({
            message: 'Excel data uploaded successfully.',
            insertedCount: rowsToInsert.length
        });

    } catch (error) {
        if (transaction) await transaction.rollback();

        console.error('Γ¥î Excel upload error:', error);
        io.emit('excel-error', {
            user_id: inserted_by_user_id,
            message: 'Γ¥î Failed to upload Excel data.',
            error: error.message
        });

        return res.status(500).json({ message: 'Failed to upload Excel data', error: error.message });
    } finally {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});


module.exports = router;
