const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const { authenticateToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadProfileing'); // Multer middleware
const s3Client = require('../config/spacesConfig');
const ProfileImage = require('../Models/ProfileImage');
const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3'); // Import AWS SDK v3
const { checkPermission } = require('../middleware/checkPermission');
const { getIO } = require('../sockets/socketHandler'); // adjust the path as needed
/// Upload or update profile image with transaction
router.post('/upload/:userId/:page_name', upload.single('profileImage'), authenticateToken, checkPermission('edit'), async (req, res) => {
    const { userId } = req.params;
    let transaction;
    // Ensure the file exists
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    try {
        transaction = await sequelize.transaction();
        // Fetch the current profile image for the user
        const currentProfileImage = await ProfileImage.findOne({ where: { user_id: userId }, transaction });

        // If a current image exists, delete it from DigitalOcean Spaces
        if (currentProfileImage) {
            const fileKey = currentProfileImage.img_url.split('/').slice(-2).join('/'); // Extract the file key
            const deleteParams = {
                Bucket: process.env.SPACES_BUCKET,
                Key: `profile-images/profile/${fileKey}`,
            };
            const deleteCommand = new DeleteObjectCommand(deleteParams);
            await s3Client.send(deleteCommand);
        }

        // Configure upload parameters for DigitalOcean
        const uploadParams = {
            Bucket: process.env.SPACES_BUCKET, // Bucket name from environment variable
            Key: `profile-images/profile/${userId}/${Date.now()}_${req.file.originalname}`, // Save under 'profile' folder
            Body: req.file.buffer,
            ACL: 'public-read', // Publicly accessible
            ContentType: req.file.mimetype,
        };

        // Upload the new image to DigitalOcean Space using AWS SDK v3 command
        const putCommand = new PutObjectCommand(uploadParams);
        await s3Client.send(putCommand);

        // Create CDN URL for the uploaded image
        const cdnUrl = `${process.env.SPACES_CDN_ENDPOINT}/${uploadParams.Key}`;

        // If a current image exists, update the URL; otherwise, create a new entry
        let updatedImage;
        if (currentProfileImage) {
            // Update the image URL in the database within the transaction
            updatedImage = await currentProfileImage.update({
                img_url: cdnUrl,
            }, { transaction });
        } else {
            // Store the new image URL in the database if there's no existing image
            updatedImage = await ProfileImage.create({
                user_id: userId,
                img_url: cdnUrl,
            }, { transaction });
        }

        await transaction.commit();
        const io = getIO();
        io.emit("profile-image-updated", { user_id: userId, timestamp: new Date() }); // Broadcast the new info
        res.status(200).json({
            message: 'Image uploaded and updated successfully',
            data: updatedImage,
        });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Error uploading or updating image:', error);
        res.status(500).json({ error: 'Error uploading or updating image' });
    } finally {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});





// Delete a profile image by profile_img_id with transaction
router.delete('/deleteuserimg/:profile_img_id', authenticateToken, async (req, res) => {
    const { profile_img_id } = req.params;
    let transaction;
    try {
        transaction = await sequelize.transaction();
        // Find the profile image in the database
        const profileImage = await ProfileImage.findOne({
            where: { profile_img_id }, transaction
        });
        // If the image is not found, no need to commit the transaction
        if (!profileImage) {
            return res.status(404).json({ message: 'Image not found' });
        }
        // Extract file key from img_url and ensure the URL has the expected structure
        const imgUrlParts = profileImage.img_url.split('/');
        if (imgUrlParts.length < 2) {
            throw new Error('Invalid image URL format');
        }
        const fileKey = imgUrlParts.slice(-2).join('/');
        // Delete the image from DigitalOcean Space
        const deleteParams = {
            Bucket: process.env.SPACES_BUCKET,
            Key: `profile-images/profile/${fileKey}`, // Delete from 'profile' folder
        };
        const deleteCommand = new DeleteObjectCommand(deleteParams);
        await s3Client.send(deleteCommand);

        // Delete the image entry from the database within the transaction
        await ProfileImage.destroy({
            where: { profile_img_id }, transaction
        });
        await transaction.commit();
        res.status(200).json({ message: 'Image deleted successfully' });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Error deleting image:', error);
        res.status(500).json({ error: 'Error deleting image', details: error.message });
    } finally {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});


module.exports = router;
