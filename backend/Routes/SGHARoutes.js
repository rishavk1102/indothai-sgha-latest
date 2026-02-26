const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const SGHAgreementTemplate = require('../Models_sgha/SGH_Agreement_Template');
const Client = require('../Models/Client');
const Business = require('../Models/Business');
const {
    authenticateToken
} = require('../middleware/authMiddleware');
const nodemailer = require('nodemailer');
require('dotenv').config();
const {
    checkPermission
} = require('../middleware/checkPermission');
const {
    getIO
} = require('../sockets/socketHandler'); // adjust the path as needed


// Configure nodemailer with Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
});


// Route: Send SGHA to client and update status
router.post('/send-sgha/:SGHA_template_id/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
    const {
        SGHA_template_id
    } = req.params;

    try {
        // 1. Find the SGHA template
        const template = await SGHAgreementTemplate.findOne({
            where: {
                SGHA_template_id: SGHA_template_id
            },
            include: [{
                    model: Client,
                    as: 'client',
                    attributes: ['client_id','client_registration_id',  'name', 'email'],
                },
                {
                    model: Business,
                    as: 'business',
                    attributes: ['business_id', 'name']
                },
            ]
        });

        if (!template) {
            return res.status(404).json({
                message: 'Template not found'
            });
        }

        if (!template.client) {
            return res.status(400).json({
                message: 'Client not associated with this template'
            });
        }

        // 2. Update status to 'Sent'
        template.status = 'Sent';
        await template.save();

        const io = getIO();
        io.emit("sgh-agreement-templates-updated", {
            template_id: template.SGHA_template_id,
            message: 'SGHA sent to client',
        });
        io.emit("sgh-agreement-client-update", {
            client_id: template.client.client_registration_id,
        });

        res.status(201).json({
            message: 'SGHA marked as Sent and email sent to client.'
        });

        // ✅ Background process
        (async () => {

            // 3. Send email to client
            const mailOptions = {
                from: process.env.GMAIL_USER,
                to: template.client.email,
                subject: 'SGHA Received',
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
                                            style="word-break: break-word;">Hi, ${template.client.name}!</span></h1>
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
                                          <p style="margin: 0;">You have a New SGHA Document waiting in your registered portal sent by <b>${template.business.name}!!</b> tailored based on your requirements and the services provided by us.<br/><br />
                                            <strong>What happens next?</strong><br>
                                           Login into your Client portal using the registered email address and password to view the document and complete the process of service selection.<br/><br />
                                            Please review it at your earliest convenience.<br/><br />
                                            Best regards,<br/>
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
                console.log(`📧 Confirmation email sent to ${template.client.email}`);
            } catch (emailError) {
                console.error('Error sending confirmation email:', emailError);
            }
        })();

    } catch (error) {
        console.error('Error sending SGHA:', error);
        res.status(500).json({
            message: 'Internal server error'
        });
    }
});



module.exports = router;