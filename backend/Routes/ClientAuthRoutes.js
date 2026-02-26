const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const sequelize = require('../config/database');
const { Op } = require('sequelize');
const Client_Registration = require('../Models/Client_Registration');
const Client_Airport = require('../Models/Client_Airports');
const Client_Business = require('../Models/Client_Businesses');
const Client = require('../Models/Client');
const Airport = require('../Models/Airport');
const ClientRegistrationLink = require('../Models/Client_Registration_link');
const nodemailer = require('nodemailer');
const { checkPermission } = require('../middleware/checkPermission');
const { authenticateToken } = require('../middleware/authMiddleware');
require('dotenv').config();
const router = express.Router();

// Configure nodemailer with Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
});



// Use AES-256-CBC algorithm and generate a key and IV
const algorithm = 'aes-256-cbc';
const key = crypto.scryptSync(process.env.SECRET_KEY, 'salt', 32); // Generate a 32-byte key
const ivLength = 16; // AES block size
const generateIV = () => crypto.randomBytes(ivLength); // Generate a random IV

// Generate a random token
const generateToken = () => {
    return crypto.randomBytes(16).toString('hex');
};

// Encrypt Function
const encryptToken = (token) => {
    const iv = generateIV(); // Generate a new IV for each encryption
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`; // Store IV and encrypted token together
};

// Decrypt Function
const decryptToken = (encryptedToken) => {
    const [ivHex, encrypted] = encryptedToken.split(':'); // Extract IV and encrypted token
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};



// POST /api/client/register
router.post('/register-client/:encryptedToken', async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        const { encryptedToken } = req.params;
        const {
            name,
            email,
            password,
            operator,
            contact_person,
            phone,
            pan,
            gstin,
            address1,
            address2,
            city,
            pincode,
            state,
            country,
            other_details,
            Role_id,
            airport_ids // array of airport_id
        } = req.body;

        // Decrypt the token
        const token = decryptToken(encryptedToken);

        // Validate the token in the database
        const link = await ClientRegistrationLink.findOne({ where: { token } });
        if (!link || link.link_status !== 'Active') {
            return res.status(400).json({ message: 'Invalid or inactive registration link.' });
        }


        const hashedPassword = await bcrypt.hash(password, 10);

        if (!Array.isArray(airport_ids) || airport_ids.length === 0) {
            return res.status(400).json({ message: 'At least one airport is required.' });
        }

        // 1. Create ClientRegistration
        const clientReg = await Client_Registration.create({
            name,
            email,
            password: hashedPassword,
            operator,
            contact_person,
            phone,
            pan,
            gstin,
            address1,
            address2,
            city,
            pincode,
            state,
            country,
            other_details,
            Role_id
        }, { transaction });

        const businessIdSet = new Set();

        // 2. Loop through each airport_id
        const airports = await Airport.findAll({
            where: {
                airport_id: { [Op.in]: airport_ids }
            }
        });

        for (const airport of airports) {
            const airport_id = airport.airport_id;
            const business_id = airport.business_id;

            if (!business_id) continue;

            // Create ClientAirport
            await Client_Airport.create({
                client_registration_id: clientReg.client_registration_id,
                airport_id
            }, { transaction });

            // Create Client
            await Client.create({
                client_registration_id: clientReg.client_registration_id,
                business_id,
                airport_id,
                name,
                email,
                operator,
                contact_person,
                phone,
                pan,
                gstin,
                address1,
                address2,
                city,
                pincode,
                state,
                country,
                other_details
            }, { transaction });

            businessIdSet.add(business_id);
        }

        // 3. Create ClientBusiness for unique business IDs
        for (const business_id of businessIdSet) {
            await Client_Business.create({
                client_registration_id: clientReg.client_registration_id,
                business_id
            }, { transaction });
        }

        // Update the link's status
        await link.update({
            registration: true,
            link_status: 'Inactive',
        }, { transaction });

        
        await transaction.commit();
        res.status(201).json({
            message: 'Client registration successful',
        });

        // ✅ Background process
        (async () => {

            const mailOptions = {
                from: process.env.GMAIL_USER,
                to: email,
                subject: 'Welcome to IndoThai!',
                html: `
          <html lang="en" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml">
        <head>
          <title></title>
          <meta content="text/html; charset=utf-8" http-equiv="Content-Type" />
          <meta content="width=device-width, initial-scale=1.0" name="viewport" />
          
          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 0;
            }

            a[x-apple-data-detectors] {
              color: inherit !important;
              text-decoration: inherit !important;
            }

            #MessageViewBody a {
              color: inherit;
              text-decoration: none;
            }

            p {
              line-height: inherit
            }

            .desktop_hide,
            .desktop_hide table {
              mso-hide: all;
              display: none;
              max-height: 0px;
              overflow: hidden;
            }

            .image_block img+div {
              display: none;
            }

            sup,
            sub {
              font-size: 75%;
              line-height: 0;
            }

            .menu_block.desktop_hide .menu-links span {
              mso-hide: all;
            }

            @media (max-width:700px) {
              .desktop_hide table.icons-outer {
                display: inline-table !important;
              }

              .desktop_hide table.icons-inner,
              .row-3 .column-1 .block-3.button_block .alignment .button,
              .social_block.desktop_hide .social-table {
                display: inline-block !important;
              }

              .icons-inner {
                text-align: center;
              }

              .icons-inner td {
                margin: 0 auto;
              }

              .image_block div.fullWidth {
                max-width: 100% !important;
              }

              .mobile_hide {
                display: none;
              }

              .row-content {
                width: 100% !important;
              }

              .stack .column {
                width: 100%;
                display: block;
              }

              .mobile_hide {
                min-height: 0;
                max-height: 0;
                max-width: 0;
                overflow: hidden;
                font-size: 0px;
              }

              .desktop_hide,
              .desktop_hide table {
                display: table !important;
                max-height: none !important;
              }

              .row-1 .column-1 .block-1.paragraph_block td.pad>div {
                text-align: center !important;
                font-size: 18px !important;
              }

              .row-3 .column-1 .block-1.heading_block h1,
              .row-3 .column-1 .block-3.button_block .alignment {
                text-align: left !important;
              }

              .row-3 .column-1 .block-1.heading_block h1 {
                font-size: 20px !important;
              }

              .row-3 .column-1 .block-2.paragraph_block td.pad>div {
                text-align: left !important;
                font-size: 14px !important;
              }

              .row-3 .column-1 .block-4.paragraph_block td.pad>div {
                text-align: justify !important;
                font-size: 10px !important;
              }

              .row-3 .column-1 .block-3.button_block span {
                font-size: 14px !important;
                line-height: 28px !important;
              }

              .row-4 .column-1 .block-1.icons_block td.pad {
                text-align: center !important;
                padding: 10px 24px !important;
              }

              .row-6 .column-1 .block-1.paragraph_block td.pad {
                padding: 0 0 16px !important;
              }

              .row-4 .column-2 .block-1.paragraph_block td.pad>div {
                text-align: left !important;
                font-size: 16px !important;
              }

              .row-6 .column-1 .block-2.menu_block .alignment {
                text-align: center !important;
              }

              .row-6 .column-1 .block-2.menu_block td.pad {
                padding: 8px !important;
              }

              .row-6 .column-1 .block-2.menu_block .menu-links a,
              .row-6 .column-1 .block-2.menu_block .menu-links span {
                font-size: 14px !important;
              }

              .row-3 .column-1 {
                padding: 0 24px 48px !important;
              }

              .row-4 .column-1 {
                padding: 16px 16px 8px !important;
              }

              .row-4 .column-2 {
                padding: 0 24px 16px !important;
              }

              .row-6 .column-1 {
                padding: 32px 16px 48px !important;
              }
            }
          </style>
        </head>

        <body class="body"
          style="background-color: #f8f6ff; margin: 0; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
          <table border="0" cellpadding="0" cellspacing="0" class="nl-container" role="presentation"
            style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f8f6ff; background-image: none; background-position: top left; background-size: auto; background-repeat: no-repeat;"
            width="100%">
            <tbody>
              <tr>
                <td>
                  <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-1"
                    role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
                    <tbody>
                      <tr>
                        <td>
                          <table align="center" border="0" cellpadding="0" cellspacing="0"
                            class="row-content stack" role="presentation"
                            style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #e3d4ea; color: #000000; width: 680px; margin: 0 auto;"
                            width="680">
                            <tbody>
                              <tr>
                                <td class="column column-1"
                                  style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 0px; padding-left: 48px; padding-right: 48px; padding-top: 20px; vertical-align: top;"
                                  width="100%">
                                  <table border="0" cellpadding="0" cellspacing="0"
                                    class="paragraph_block block-1" role="presentation"
                                    style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;"
                                    width="100%">
                                    <tr>
                                      <td class="pad">
                                        <div align="center" class="alignment">
                                          <div class="fullWidth" style="max-width: 180px;">
                                            <img alt="An open email illustration"
                                              height="auto"
                                              src="https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/logo.png"
                                              style="display: block; height: auto; border: 0; width: 100%;"
                                              title="An open email illustration"
                                              width="180"
                                            />
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-2"
                    role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
                    <tbody>
                      <tr>
                        <td>
                          <table align="center" border="0" cellpadding="0" cellspacing="0"
                            class="row-content stack" role="presentation"
                            style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #e3d4ea; border-radius: 0; color: #000000; width: 680px; margin: 0 auto;"
                            width="680">
                            <tbody>
                              <tr>
                                <td class="column column-1"
                                  style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top;"
                                  width="100%">
                                  <table border="0" cellpadding="0" cellspacing="0"
                                    class="image_block block-1" role="presentation"
                                    style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;"
                                    width="100%">
                                    <tr>
                                      <td class="pad"
                                        style="width:100%;padding-right:0px;padding-left:0px;">
                                        <div align="center" class="alignment">
                                          <div class="fullWidth" style="max-width: 640px;">
                                            <img alt="An open email illustration"
                                              height="auto"
                                              src="https://blackboxstorage.blr1.cdn.digitaloceanspaces.com/assetImages/Email-Illustration%20(1).png"
                                              style="display: block; height: auto; border: 0; width: 100%;"
                                              title="An open email illustration"
                                              width="640"
                                            />
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-3"
                    role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
                    <tbody>
                      <tr>
                        <td>
                          <table align="center" border="0" cellpadding="0" cellspacing="0"
                            class="row-content stack" role="presentation"
                            style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; border-radius: 0; color: #000000; width: 680px; margin: 0 auto;"
                            width="680">
                            <tbody>
                              <tr>
                                <td class="column column-1"
                                  style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 48px; padding-left: 48px; padding-right: 48px; vertical-align: top;"
                                  width="100%">
                                  <table border="0" cellpadding="0" cellspacing="0"
                                    class="heading_block block-1" role="presentation"
                                    style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;"
                                    width="100%">
                                    <tr>
                                      <td class="pad"
                                        style="padding-top:12px;text-align:center;width:100%;">
                                        <h1
                                          style="margin: 0; color: #292929; direction: ltr; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 32px; font-weight: 700; letter-spacing: normal; line-height: 1.2; text-align: left; margin-top: 0; margin-bottom: 0; mso-line-height-alt: 38px;">
                                          <span class="tinyMce-placeholder"
                                            style="word-break: break-word;">Welcome ${name}!</span></h1>
                                      </td>
                                    </tr>
                                  </table>
                                  <table border="0" cellpadding="0" cellspacing="0"
                                    class="paragraph_block block-2" role="presentation"
                                    style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;"
                                    width="100%">
                                    <tr>
                                      <td class="pad"
                                        style="padding-bottom:10px;padding-top:10px;">
                                        <div
                                          style="color:#101112;direction:ltr;font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;font-size:14px;font-weight:400;letter-spacing:0px;line-height:22px;text-align:left;mso-line-height-alt:19px;">
                                          <p style="margin: 0;">Thank you for registering with us. We’re excited to have you on board and appreciate the time you took to complete the registration process. <br /><br />Your registered email is: <strong>${email}</strong>,
                                            Our team has received all your submitted information and documents. Everything looks good so far!<br/><br />
                                            <strong>What happens next?</strong><br>
                                           In the mean time if you want to edit the details of your account, please use the login button below to login and use the profile section to edit your details.<br/><br />
                                        </div>
                                      </td>
                                    </tr>
                                  </table>
                                  <table border="0" cellpadding="0" cellspacing="0"
                                    class="button_block block-3" role="presentation"
                                    style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;"
                                    width="100%">
                                    <tr>
                                      <td class="pad" style="padding-top:24px;text-align:center;">
                                        <div align="left" class="alignment">
                                          <a
                                            href="#"
                                            style="color:#ffffff;text-decoration:none;"
                                            target="_blank">
                                            <span class="button" style="background-color: #f97316; border-bottom: 0px solid transparent; border-left: 0px solid transparent; border-radius: 8px; border-right: 0px solid transparent; border-top: 0px solid transparent; color: #ffffff; display: inline-block; font-family: Helvetica Neue, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; mso-border-alt: none; padding-bottom: 8px; padding-top: 8px; padding-left: 16px; padding-right: 16px; text-align: center; width: auto; word-break: keep-all; letter-spacing: normal;"><span
                                                style="word-break: break-word; line-height: 32px;">
                                                Login</span></span>
                                          </a>
                                        </div>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-6"
                    role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
                    <tbody>
                      <tr>
                        <td>
                          <table align="center" border="0" cellpadding="0" cellspacing="0"
                            class="row-content stack" role="presentation"
                            style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #dfdfdf; border-radius: 0; color: #000000; width: 680px; margin: 0 auto;"
                            width="680">
                            <tbody>
                              <tr>
                                <td class="column column-1"
                                  style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 15px; padding-top: 15px; vertical-align: top;"
                                  width="100%">
                                  <table border="0" cellpadding="0" cellspacing="0"
                                    class="paragraph_block block-5" role="presentation"
                                    style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;"
                                    width="100%">
                                    <tr>
                                      <td class="pad" style="padding-top:0">
                                        <div
                                          style="color:#636363;direction:ltr;font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;font-size:12px;font-weight:400;letter-spacing:0px;line-height:1.2;text-align:center;mso-line-height-alt:14px;">
                                          <p style="margin: 0;">193/1, 2nd Floor, MG Road, Kolkata 700007, WB, India</p>
                                        </div>
                                      </td>
                                    </tr>
                                  </table>
                                  <table border="0" cellpadding="0" cellspacing="0"
                                    class="paragraph_block block-6" role="presentation"
                                    style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;"
                                    width="100%">
                                    <tr>
                                      <td class="pad" style="padding-top:8px;">
                                        <div
                                          style="color:#636363;direction:ltr;font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;font-size:12px;font-weight:400;letter-spacing:0px;line-height:1.2;text-align:center;mso-line-height-alt:14px;">
                                          <p style="margin: 0;">Phone : +918777263464  &nbsp; | &nbsp; Email : info@indothai.in</p>
                                        </div>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table><!-- End -->
        </body>

        </html>
    `,
            };

            try {
                await transporter.sendMail(mailOptions);
                console.log(`📧 Confirmation email sent to ${email}`);
            } catch (emailError) {
                console.error('Error sending confirmation email:', emailError);
            }
        })();



    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Error during client registration:', error);
        res.status(500).json({ message: 'Client registration failed', error: error.message });

    } finally {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});






router.post('/generate-link/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction(); // Begin transaction

        const { client_name } = req.body; // ✅ Get client_name from request body
        const token = generateToken();
        const encryptedToken = encryptToken(token);
        const linkUrl = `https://indothai-sgha-8paro.ondigitalocean.app/Client_signup/${encryptedToken}`;

        await ClientRegistrationLink.create(
            {
                link_url: linkUrl,
                Client_name: client_name, // ✅ Save client_name
                token: token,
                registration: false,
                link_status: 'Active',
            },
            { transaction } // Pass the transaction object
        );

        // Commit transaction after successful creation
        await transaction.commit();

        res.status(201).json({
            message: 'Registration link generated successfully.',
            link: linkUrl,
            client_name: client_name, // ✅ Include in response if useful
        });
    } catch (error) {
        // Rollback the transaction in case of error
        if (transaction) await transaction.rollback();

        console.error('Error during client registration:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        // Explicitly rollback if transaction is still open
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});




router.get('/all-links/:page_name', authenticateToken, checkPermission('view'), async (req, res) => {
    try {
        // Fetch links sorted by the desired criteria
        const links = await ClientRegistrationLink.findAll({
            attributes: { exclude: ['token'] }, // Exclude the `token` field
            order: [
                [sequelize.literal(`CASE 
            WHEN registration = false AND link_status = 'Active' THEN 1 
            WHEN registration = true AND link_status = 'Inactive' THEN 2 
            WHEN registration = false AND link_status = 'Inactive' THEN 3 
            ELSE 4 END`), 'ASC'],
                ['updatedAt', 'DESC'], // Latest updated links within the same group
            ],
        });

        // Fetch counts for the different categories
        const totalLinks = await ClientRegistrationLink.count();
        const totalRegistrationTrue = await ClientRegistrationLink.count({ where: { registration: true } });
        const totalActiveRegistrationFalse = await ClientRegistrationLink.count({
            where: { registration: false, link_status: 'Active' },
        });
        const totalInactive = await ClientRegistrationLink.count({ where: { registration: false, link_status: 'Inactive' } });

        res.status(200).json({
            message: 'Links fetched successfully.',
            counts: {
                totalLinks,
                totalRegistrationTrue,
                totalActiveRegistrationFalse,
                totalInactive,
            },
            links,
        });
    } catch (error) {
        console.error('Error fetching registration links:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});





router.post('/validate-link', async (req, res) => {
    const { encryptedToken } = req.body;

    if (!encryptedToken) {
        return res.status(200).json({
            message: 'Token is required',
            isActive: false,
        });
    }

    try {
        // Decrypt the token
        const token = decryptToken(encryptedToken);

        // Fetch the link details from the database
        const linkDetails = await ClientRegistrationLink.findOne({
            where: { token },
        });

        // Check if the token exists in the database
        if (!linkDetails) {
            return res.status(200).json({
                message: 'Invalid or expired link',
                isActive: false,
            });
        }

        // Check if the link is inactive or already used
        if (linkDetails.registration) {
            return res.status(200).json({
                message: 'The link is already used (inactive).',
                isActive: false,
            });
        }
        if (linkDetails.link_status === 'Inactive') {
            return res.status(200).json({
                message: 'The link is inactive.',
                isActive: false,
            });
        }

        // If the link is valid and active, allow registration
        return res.status(200).json({
            message: 'The link is active and ready for registration.',
            isActive: true,
        });
    } catch (error) {
        console.error('Error during link validation:', error);
        return res.status(500).json({
            message: 'Internal server error',
            isActive: false,
        });
    }
});






module.exports = router;