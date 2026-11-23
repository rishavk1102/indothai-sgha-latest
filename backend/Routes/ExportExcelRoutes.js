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


function cellText(cell) {
    if (!cell || cell.value == null || cell.value === '') return '';
    const v = cell.value;
    if (typeof v === 'object') {
        if (v instanceof Date) return v.toISOString();
        if (v.text != null) return String(v.text);
        if (v.result != null) return String(v.result);
        if (v.richText) return v.richText.map((p) => p.text || '').join('');
    }
    return String(v).trim();
}

function parseExcelTime(cell) {
    if (!cell || cell.value == null || cell.value === '') return null;

    if (cell.value instanceof Date) {
        const date = cell.value;
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }

    if (typeof cell.value === 'number') {
        const totalSeconds = Math.round((cell.value % 1) * 86400);
        const h = String(Math.floor(totalSeconds / 3600) % 24).padStart(2, '0');
        const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const s = String(totalSeconds % 60).padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    const text = cellText(cell);
    const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (match) {
        return `${match[1].padStart(2, '0')}:${match[2]}:${match[3] || '00'}`;
    }
    return null;
}

function parseExcelDate(value) {
    if (value == null || value === '') return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10);
    }
    if (typeof value === 'number') {
        // Excel serial date
        const utc = new Date(Math.round((value - 25569) * 86400 * 1000));
        if (!Number.isNaN(utc.getTime())) return utc.toISOString().slice(0, 10);
    }
    const text = String(value).trim();
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const dmy = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmy) {
        return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    }
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    return null;
}

function findAircraftHeaderRow(worksheet) {
    let found = null;
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (found != null) return;
        const first = cellText(row.getCell(1)).toUpperCase();
        if (first === 'AIRCRAFT ID') found = rowNumber;
    });
    return found;
}

router.post('/upload-excel/:page_name', authenticateToken, checkPermission('add'), upload.single('file'), async (req, res) => {
    const { remarks, inserted_by_user_id, wet } = req.body;
    const io = getIO();

    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    const wetDate = parseExcelDate(wet);
    if (!wetDate) {
        return res.status(400).json({ message: 'Invalid With Effect To (WET) date.' });
    }

    let updateCount = 0;
    let skippedEmpty = 0;
    let skippedIdentical = 0;
    let transaction;

    try {
        io.emit('excel-progress', {
            user_id: inserted_by_user_id,
            step: 'Upload started. Parsing Excel...',
        });

        let fileUrl = null;
        try {
            const key = `excel-files/${inserted_by_user_id}/${Date.now()}_${req.file.originalname}`;
            const uploadParams = {
                Bucket: process.env.SPACES_BUCKET,
                Key: key,
                Body: req.file.buffer,
                ACL: 'public-read',
                ContentType: req.file.mimetype,
            };
            await s3Client.send(new PutObjectCommand(uploadParams));
            fileUrl = `${process.env.SPACES_CDN_ENDPOINT}/${uploadParams.Key}`;
        } catch (s3Err) {
            console.warn('Excel file Spaces upload skipped:', s3Err.message);
            fileUrl = `local://${req.file.originalname}`;
        }

        await ExcelFile.create({
            file_name: req.file.originalname,
            file_url: fileUrl,
            inserted_by_user_id,
            remarks,
        });

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);

        const rowsToInsert = [];
        const expectedHeaders = [
            'AIRCRAFT ID',
            'ARRIVAL FLT NO',
            'OUTGOING FLT NO',
            'TYPE OF A/C',
            'FROM',
            'TO',
            'DAYS',
            'STA',
            'STD',
            'WEF',
        ];

        for (const worksheet of workbook.worksheets) {
            io.emit('excel-progress', {
                user_id: inserted_by_user_id,
                step: `Processing sheet: ${worksheet.name}`,
            });

            const headerRowIndex = findAircraftHeaderRow(worksheet);
            if (!headerRowIndex) {
                io.emit('excel-progress', {
                    user_id: inserted_by_user_id,
                    step: `Skipping "${worksheet.name}" (no AIRCRAFT ID header)`,
                });
                continue;
            }

            const headerRow = worksheet.getRow(headerRowIndex);
            const isHeaderValid = expectedHeaders.every(
                (header, i) =>
                    cellText(headerRow.getCell(i + 1)).toUpperCase() === header
            );

            if (!isHeaderValid) {
                io.emit('excel-progress', {
                    user_id: inserted_by_user_id,
                    step: `Skipping "${worksheet.name}" (invalid headers)`,
                });
                continue;
            }

            for (let i = headerRowIndex + 1; i <= worksheet.rowCount; i++) {
                const row = worksheet.getRow(i);
                if (!row || !row.hasValues) continue;

                const aircraft_id = cellText(row.getCell(1));
                const arrival_flight_no = cellText(row.getCell(2));
                const departure_flight_no = cellText(row.getCell(3));
                const type_of_aircraft = cellText(row.getCell(4));
                const from_iata = cellText(row.getCell(5)).toUpperCase();
                const to_iata = cellText(row.getCell(6)).toUpperCase();
                const days = cellText(row.getCell(7)).toLowerCase();
                const sta = parseExcelTime(row.getCell(8));
                const std = parseExcelTime(row.getCell(9));
                const wef = parseExcelDate(row.getCell(10).value);

                if (!aircraft_id && !arrival_flight_no && !departure_flight_no) {
                    skippedEmpty += 1;
                    continue;
                }
                if (!aircraft_id || !days || !wef) {
                    io.emit('excel-progress', {
                        user_id: inserted_by_user_id,
                        step: `Skipped row ${i} on "${worksheet.name}" (need Aircraft ID, DAYS, and WEF)`,
                    });
                    skippedEmpty += 1;
                    continue;
                }

                const existing = await ExcelData.findOne({
                    where: {
                        aircraft_id: Number(aircraft_id),
                        arrival_flight_no,
                        departure_flight_no,
                        type_of_aircraft,
                        from_iata,
                        to_iata,
                        [Op.or]: [
                            {
                                wef: { [Op.lte]: wef },
                                wet: { [Op.gte]: wef },
                            },
                            {
                                wef: { [Op.lte]: wetDate },
                                wet: { [Op.gte]: wetDate },
                            },
                        ],
                    },
                });

                if (!existing) {
                    rowsToInsert.push({
                        aircraft_id: Number(aircraft_id),
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
                        remarks,
                    });
                } else {
                    const fieldsToCompare = { sta, std, days };
                    const hasChanges = Object.entries(fieldsToCompare).some(
                        ([key, value]) => existing[key]?.toString() !== value?.toString()
                    );

                    if (hasChanges) {
                        const today = new Date().toISOString().slice(0, 10);
                        await existing.update({
                            sta,
                            std,
                            days,
                            wef: today,
                            fhr_creation_status: false,
                            inserted_by_user_id,
                        });
                        updateCount += 1;
                        io.emit('excel-progress', {
                            user_id: inserted_by_user_id,
                            step: `Updated Aircraft ID ${aircraft_id} on "${worksheet.name}"`,
                        });
                    } else {
                        skippedIdentical += 1;
                        io.emit('excel-progress', {
                            user_id: inserted_by_user_id,
                            step: `Skipped identical Aircraft ID ${aircraft_id} on "${worksheet.name}"`,
                        });
                    }
                }
            }
        }

        if (rowsToInsert.length === 0 && updateCount === 0) {
            const tip =
                skippedEmpty > 0
                    ? ' Check that each data row has Aircraft ID, DAYS, and WEF filled.'
                    : skippedIdentical > 0
                      ? ' All rows matched existing imports.'
                      : ' No valid schedule rows found.';
            io.emit('excel-error', {
                user_id: inserted_by_user_id,
                message: `No new or updated records.${tip}`,
            });
            return res.status(400).json({
                message: `No new or updated records.${tip}`,
            });
        }

        transaction = await sequelize.transaction();
        if (rowsToInsert.length) {
            await ExcelData.bulkCreate(rowsToInsert, { transaction });
        }
        await transaction.commit();

        io.emit('excel-complete', {
            user_id: inserted_by_user_id,
            message: `Uploaded ${rowsToInsert.length} new and updated ${updateCount} existing records.`,
        });
        io.emit('FHR-import-complete');

        return res.json({
            message: 'Excel data uploaded successfully.',
            insertedCount: rowsToInsert.length,
            updatedCount: updateCount,
        });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Excel upload error:', error);
        io.emit('excel-error', {
            user_id: inserted_by_user_id,
            message: `Failed to upload Excel data: ${error.message}`,
            error: error.message,
        });
        return res.status(500).json({
            message: 'Failed to upload Excel data',
            error: error.message,
        });
    } finally {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});

module.exports = router;
