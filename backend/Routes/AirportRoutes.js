const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const { Op } = require("sequelize"); // ✅ Import Op
const Airport = require('../Models/Airport');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/checkPermission');
const { getIO } = require('../sockets/socketHandler');
const multer = require('multer');
const s3Client = require('../config/spacesConfig');
const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3'); // Import AWS SDK v3

// Multer setup for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Add Airport
router.post('/add_airport/:page_name', authenticateToken, checkPermission('add'), upload.single('icon'), async (req, res) => {
    const {
        business_id,
        name,
        iata,
        icao,
        address1,
        address2,
        city,
        state,
        pincode,
        country,
    } = req.body;

    let transaction;

    try {
        transaction = await sequelize.transaction();
        let iconUrl = null;

        // ✅ If file uploaded, push to Spaces
        if (req.file) {
            const filename = req.file.originalname;
            const buffer = req.file.buffer;
            const contentType = req.file.mimetype;

            // keep airports folder
            const key = `airports/${Date.now()}_${filename}`;

            await s3Client.send(
                new PutObjectCommand({
                    Bucket: process.env.SPACES_BUCKET,
                    Key: key,
                    Body: buffer,
                    ContentType: contentType,
                    ACL: 'public-read'
                })
            );

            // ✅ Use CDN endpoint for fast delivery
            iconUrl = `${process.env.SPACES_CDN_ENDPOINT}/${key}`;
        }
        const newAirport = await Airport.create({
            business_id,
            name,
            iata,
            icao,
            address1,
            address2,
            city,
            state,
            pincode,
            country,
            icon: iconUrl // save uploaded file url
        }, { transaction });

        await transaction.commit();

        const io = getIO();
        io.emit('airports-updated'); // Broadcast update to clients
        io.emit('businesses-updated'); // broadcast update

        return res.status(201).json({
            message: 'Airport added successfully',
            airport: newAirport
        });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('❌ Failed to add airport:', error);

        return res.status(500).json({
            message: 'Failed to add airport',
            error: error.message
        });
    } finally {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});


// // Edit Airport
// router.put('/edit_airport/:airport_id/:page_name', authenticateToken, checkPermission('edit'), async (req, res) => {
//     const { airport_id } = req.params;
//     const {
//         business_id,
//         name,
//         iata,
//         icao,
//         address1,
//         address2,
//         city,
//         state,
//         pincode,
//         country
//     } = req.body;

//     let transaction;

//     try {
//         transaction = await sequelize.transaction();

//         const airport = await Airport.findByPk(airport_id, { transaction });

//         if (!airport) {
//             return res.status(404).json({ message: 'Airport not found' });
//         }

//         await airport.update({
//             business_id,
//             name,
//             iata,
//             icao,
//             address1,
//             address2,
//             city,
//             state,
//             pincode,
//             country
//         }, { transaction });

//         await transaction.commit();

//         const io = getIO();
//         io.emit('airports-updated'); // Notify clients
//         io.emit('businesses-updated'); // broadcast update

//         return res.status(200).json({
//             message: 'Airport updated successfully',
//             airport
//         });
//     } catch (error) {
//         if (transaction) await transaction.rollback();
//         console.error('❌ Failed to edit airport:', error);

//         return res.status(500).json({
//             message: 'Failed to edit airport',
//             error: error.message
//         });
//     } finally {
//         if (transaction && !transaction.finished) {
//             await transaction.rollback();
//         }
//     }
// });


// Edit Airport with file upload & old file delete
router.put(
    '/edit_airport/:airport_id/:page_name',
    authenticateToken,
    checkPermission('edit'),
    upload.single('icon'), // ✅ accept optional file
    async (req, res) => {
        const { airport_id } = req.params;
        const {
            business_id,
            name,
            iata,
            icao,
            address1,
            address2,
            city,
            state,
            pincode,
            country
        } = req.body;

        let transaction;

        try {
            transaction = await sequelize.transaction();

            const airport = await Airport.findByPk(airport_id, { transaction });

            if (!airport) {
                return res.status(404).json({ message: 'Airport not found' });
            }

            let iconUrl = airport.icon; // keep existing by default

            // ✅ If a new file is uploaded
            if (req.file) {
                const filename = req.file.originalname;
                const buffer = req.file.buffer;
                const contentType = req.file.mimetype;
                const key = `airports/${Date.now()}_${filename}`;

                // Upload new file
                await s3Client.send(
                    new PutObjectCommand({
                        Bucket: process.env.SPACES_BUCKET,
                        Key: key,
                        Body: buffer,
                        ContentType: contentType,
                        ACL: 'public-read'
                    })
                );

                // Build new cdn_url
                iconUrl = `${process.env.SPACES_CDN_ENDPOINT}/${key}`;

                // ✅ Delete old file from Spaces if it exists
                if (airport.icon) {
                    try {
                        const oldKey = airport.icon.replace(
                            `${process.env.SPACES_CDN_ENDPOINT}/`,
                            ''
                        );

                        await s3Client.send(
                            new DeleteObjectCommand({
                                Bucket: process.env.SPACES_BUCKET,
                                Key: oldKey
                            })
                        );
                    } catch (err) {
                        console.warn('⚠️ Failed to delete old icon:', err.message);
                    }
                }
            }

            // Update airport details
            await airport.update(
                {
                    business_id,
                    name,
                    iata,
                    icao,
                    address1,
                    address2,
                    city,
                    state,
                    pincode,
                    country,
                    icon: iconUrl
                },
                { transaction }
            );

            await transaction.commit();

            const io = getIO();
            io.emit('airports-updated');
            io.emit('businesses-updated');

            return res.status(200).json({
                message: 'Airport updated successfully',
                airport
            });
        } catch (error) {
            if (transaction) await transaction.rollback();
            console.error('❌ Failed to edit airport:', error);

            return res.status(500).json({
                message: 'Failed to edit airport',
                error: error.message
            });
        } finally {
            if (transaction && !transaction.finished) {
                await transaction.rollback();
            }
        }
    }
);



// // Delete Airport
// router.delete('/delete_airport/:airport_id/:page_name', authenticateToken, checkPermission('delete'), async (req, res) => {
//     const { airport_id } = req.params;

//     let transaction;

//     try {
//         transaction = await sequelize.transaction();

//         const airport = await Airport.findByPk(airport_id, { transaction });

//         if (!airport) {
//             return res.status(404).json({ message: 'Airport not found' });
//         }

//         await airport.destroy({ transaction });

//         await transaction.commit();

//         const io = getIO();
//         io.emit('airports-updated'); // Notify clients about deletion
//         io.emit('businesses-updated'); // broadcast update
//         return res.status(200).json({ message: 'Airport deleted successfully' });
//     } catch (error) {
//         if (transaction) await transaction.rollback();
//         console.error('❌ Failed to delete airport:', error);

//         return res.status(500).json({
//             message: 'Failed to delete airport',
//             error: error.message
//         });
//     } finally {
//         if (transaction && !transaction.finished) {
//             await transaction.rollback();
//         }
//     }
// });


// Delete Airport
router.delete(
    '/delete_airport/:airport_id/:page_name',
    authenticateToken,
    checkPermission('delete'),
    async (req, res) => {
        const { airport_id } = req.params;

        let transaction;

        try {
            transaction = await sequelize.transaction();

            const airport = await Airport.findByPk(airport_id, { transaction });

            if (!airport) {
                return res.status(404).json({ message: 'Airport not found' });
            }

            // ✅ Delete icon from Spaces if exists
            if (airport.icon) {
                try {
                    const oldKey = airport.icon.replace(
                        `${process.env.SPACES_CDN_ENDPOINT}/`,
                        ''
                    );

                    await s3Client.send(
                        new DeleteObjectCommand({
                            Bucket: process.env.SPACES_BUCKET,
                            Key: oldKey
                        })
                    );
                } catch (err) {
                    console.warn('⚠️ Failed to delete airport icon from Spaces:', err.message);
                }
            }

            // Delete from DB
            await airport.destroy({ transaction });

            await transaction.commit();

            const io = getIO();
            io.emit('airports-updated'); // Notify clients
            io.emit('businesses-updated'); // Broadcast update

            return res.status(200).json({ message: 'Airport deleted successfully' });
        } catch (error) {
            if (transaction) await transaction.rollback();
            console.error('❌ Failed to delete airport:', error);

            return res.status(500).json({
                message: 'Failed to delete airport',
                error: error.message
            });
        } finally {
            if (transaction && !transaction.finished) {
                await transaction.rollback();
            }
        }
    }
);




// Duplicate Airport
router.post('/duplicate_airport/:airport_id/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
    const { airport_id } = req.params;

    let transaction;
    try {
        transaction = await sequelize.transaction();

        const originalAirport = await Airport.findByPk(airport_id, { transaction });

        if (!originalAirport) {
            return res.status(404).json({ message: 'Original airport not found' });
        }

        const duplicatedAirport = await Airport.create({
            business_id: originalAirport.business_id,
            name: `${originalAirport.name} (Copy)`,
            iata: originalAirport.iata,
            icao: originalAirport.icao,
            address1: originalAirport.address1,
            address2: originalAirport.address2,
            city: originalAirport.city,
            state: originalAirport.state,
            pincode: originalAirport.pincode,
            country: originalAirport.country,
            icon: originalAirport.icon
        }, { transaction });

        await transaction.commit();

        const io = getIO();
        io.emit('airports-updated');
        io.emit('businesses-updated');

        return res.status(201).json({
            message: 'Airport duplicated successfully',
            airport: duplicatedAirport
        });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('❌ Failed to duplicate airport:', error);

        return res.status(500).json({
            message: 'Failed to duplicate airport',
            error: error.message
        });
    } finally {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});









module.exports = router;
