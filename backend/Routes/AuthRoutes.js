const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const sequelize = require("../config/database");
const User = require("../Models/User");
// const BankInformation = require('../Models/BankInformation');
const PersonalInformation = require("../Models/PersonalInformation");
// const EmergencyContact = require('../Models/EmergencyContact');
const ProfileImage = require("../Models/ProfileImage");
const RefreshToken = require("../Models/RefreshToken");
const UserDocuments = require("../Models/UserDocuments");
const Client_Registration = require("../Models/Client_Registration");
const ClientRefreshToken = require("../Models/ClientRefreshToken");
const combinedUpload = require("../middleware/uploadCombined"); // profile image
const s3Client = require("../config/spacesConfig");
const { PutObjectCommand } = require("@aws-sdk/client-s3"); // Import AWS SDK v3
const { authenticateToken } = require("../middleware/authMiddleware");
const nodemailer = require("nodemailer");
require("dotenv").config();
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
// Middleware to parse cookies
router.use(cookieParser());

// Generate JWT tokens with 12 hours expiration
const generateAccessToken = (user) => {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "10h" });
};

// Generate refresh token (longer expiration, e.g., 7 days)
const generateRefreshToken = (user) => {
  return jwt.sign(user, JWT_REFRESH_SECRET, { expiresIn: "1d" });
};

// Configure nodemailer with Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// POST /register - Register a new user
router.post("/register", combinedUpload, async (req, res) => {
  let transaction;

  try {
    transaction = await sequelize.transaction();

    const {
      first_name,
      last_name,
      email,
      password,

      phone,
      alternate_no,
      personal_email,
      Address1,
      Address2,
      City,
      State,
      Country,
      gender,

      pan_card_no,
      passport_no,
      aadhar_no,
      nationality,
      religion,
      marital_status,
      employment_of_spouse,
      no_of_children,
      date_of_birth,

      // bank_name,
      // bank_account_no,
      // account_holder_name,
      // ifsc_code,
      // branch_name,
      // upi_id,

      // emergency_name,
      // emergency_relation,
      // emergency_phone,
    } = req.body;

    const profileImageFile = req.files?.profile_image?.[0]; // Multer puts it in an array
    const documents = req.files?.documents || [];

    if (documents.length > 2) {
      return res
        .status(400)
        .json({ message: "A maximum of 2 documents is allowed" });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create(
      {
        first_name,
        last_name,
        email,
        password: hashedPassword,
        Role_id: 1,
        phone_no: phone,
        alternate_no: alternate_no,
        personal_email: personal_email,
      },
      { transaction }
    );

    const userId = newUser.user_id;

    // Upload profile image
    if (profileImageFile) {
      const profileKey = `profile_images/${userId}/${Date.now()}_${
        profileImageFile.originalname
      }`;
      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.SPACES_BUCKET,
          Key: profileKey,
          Body: profileImageFile.buffer,
          ACL: "public-read",
          ContentType: profileImageFile.mimetype,
        })
      );
      const imgUrl = `${process.env.SPACES_CDN_ENDPOINT}/${profileKey}`;
      await ProfileImage.create(
        { user_id: userId, img_url: imgUrl },
        { transaction }
      );
    }

    // Upload documents
    for (const doc of documents) {
      const docKey = `documents/user-verify-documents/${userId}/${Date.now()}_${
        doc.originalname
      }`;
      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.SPACES_BUCKET,
          Key: docKey,
          Body: doc.buffer,
          ACL: "public-read",
          ContentType: doc.mimetype,
        })
      );
      const cdnUrl = `${process.env.SPACES_CDN_ENDPOINT}/${docKey}`;
      await UserDocuments.create(
        { user_id: userId, document_url: cdnUrl },
        { transaction }
      );
    }

    await PersonalInformation.create(
      {
        user_id: userId,
        pan_card_no,
        passport_no,
        aadhar_no,
        nationality,
        religion,
        marital_status,
        employment_of_spouse,
        no_of_children,
        date_of_birth,
        Address1,
        Address2,
        City,
        State,
        gender,
        Country,
      },
      { transaction }
    );

    // await BankInformation.create({
    //   user_id: userId, bank_name, bank_account_no, account_holder_name,
    //   ifsc_code, branch_name, upi_id
    // }, { transaction });

    // await EmergencyContact.create({
    //   user_id: userId, Contact_name: emergency_name,
    //   Relation: emergency_relation, Phone_no: emergency_phone
    // }, { transaction });

    await transaction.commit();

    res.status(201).json({
      message: "User registered successfully",
      name: `${newUser.first_name} ${newUser.last_name}`,
    });

    // ✅ Background process
    (async () => {
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: email,
        subject: "Welcome to IndoThai!",
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
                                            style="word-break: break-word;">Welcome ${first_name} ${last_name}!</span></h1>
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
                                            An administrator will now review your registration details and verify your documents. Once approved, you will gain full access to the system according to the role assigned by the admin.
                                            We’ll notify you via email once your account is fully verified and ready to use.<br/>
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
        console.error("Error sending confirmation email:", emailError);
      }
    })();
  } catch (error) {
    // Rollback the transaction in case of error
    if (transaction) await transaction.rollback();
    console.error("Error creating user and associations:", error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    // Explicitly rollback if transaction is still open
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
  }
});

router.post("/user-login", async (req, res) => {
  const { email, password, loginType } = req.body;

  if (!email || !password || !loginType) {
    return res
      .status(400)
      .json({ message: "Email, password, and loginType are required." });
  }

  try {
    let userPayload;
    let accessToken, refreshToken;
    let userId,
      roleId,
      role,
      username,
      imgUrl = null;

    if (loginType === "User") {
      const user = await User.findOne({
        where: { email },
        include: [
          {
            model: ProfileImage,
            as: "profileImage",
            attributes: ["img_url"],
          },
        ],
      });

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ message: "Invalid email or password." });
      }

      userPayload = {
        id: user.user_id,
        Role_id: user.Role_id,
      };

      userId = user.user_id;
      roleId = user.Role_id;
      role = user.user_type;
      username = `${user.first_name} ${user.last_name}`;
      imgUrl = user.profileImage ? user.profileImage.img_url : null;
    } else if (loginType === "Client") {
      const client = await Client_Registration.findOne({ where: { email } });

      if (!client || !(await bcrypt.compare(password, client.password))) {
        return res.status(400).json({ message: "Invalid email or password." });
      }

      userPayload = {
        id: client.client_registration_id,
        Role_id: client.Role_id,
      };

      userId = client.client_registration_id;
      roleId = client.Role_id;
      role = client.user_type;
      username = client.name;
      imgUrl = null;
    } else {
      return res
        .status(400)
        .json({ message: 'Invalid loginType. Use "User" or "Client".' });
    }

    // Generate tokens
    accessToken = generateAccessToken(userPayload);
    refreshToken = generateRefreshToken(userPayload);

    // Save refresh token to appropriate table
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1); // 1 day expiry

    if (loginType === "User") {
      await RefreshToken.create({
        user_id: userId, // `user_id` in your old schema should be renamed for consistency
        token: refreshToken,
        created_at: new Date(),
        expires_at: expiresAt,
      });
    } else if (loginType === "Client") {
      await ClientRefreshToken.create({
        client_registration_id: userId,
        token: refreshToken,
        created_at: new Date(),
        expires_at: expiresAt,
      });
    }

    // Set tokens in HTTP-only cookies
    // Use secure: true only in production (HTTPS), use secure: false for localhost (HTTP)
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction, // Only use secure cookies in production (HTTPS)
      sameSite: isProduction ? "None" : "Lax", // Lax for localhost, None for production
    };

    res.cookie("accessToken", accessToken, cookieOptions);

    res.cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.status(200).json({
      message: "Login successful",
      username,
      userId,
      roleId,
      role,
      imgUrl,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// GET /status - Check login status for User or Client
router.get("/status", authenticateToken, async (req, res) => {
  const { user_type } = req.query; // optional, only matters if it's "Client"

  try {
    let responseData;

    if (user_type === "Client") {
      const ClientRegistration = require("../Models/Client_Registration");

      const client = await ClientRegistration.findOne({
        where: { client_registration_id: req.user.id },
      });

      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      responseData = {
        isAuthenticated: true,
        username: client.name,
        role: client.user_type,
        roleId: client.Role_id,
        userId: client.client_registration_id,
        imgUrl: null,
      };
    } else {
      // Default: treat as User
      const user = await User.findOne({
        where: { user_id: req.user.id },
        include: [
          {
            model: ProfileImage,
            as: "profileImage",
            attributes: ["img_url"],
          },
        ],
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      responseData = {
        isAuthenticated: true,
        username: `${user.first_name} ${user.last_name}`,
        role: user.user_type,
        roleId: user.Role_id,
        userId: user.user_id,
        imgUrl: user.profileImage ? user.profileImage.img_url : null,
      };
    }

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error checking status:", error);
    res
      .status(500)
      .json({ message: "Error checking status", error: error.message });
  }
});

// POST /refresh-token - Generate a new access token
router.post("/refresh-token", async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  const { user_type } = req.query; // or req.body, based on your frontend

  if (!refreshToken) {
    return res.status(400).json({ message: "Refresh token is required." });
  }

  jwt.verify(refreshToken, JWT_REFRESH_SECRET, async (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid refresh token." });
    }

    try {
      let tokenRecord;

      if (user_type === "Client") {
        tokenRecord = await ClientRefreshToken.findOne({
          where: { token: refreshToken, client_registration_id: user.id },
        });
      } else {
        // Default to normal user
        tokenRecord = await RefreshToken.findOne({
          where: { token: refreshToken, user_id: user.id }, // or `user_id` if that's the column
        });
      }

      if (!tokenRecord || new Date() > tokenRecord.expires_at) {
        return res
          .status(403)
          .json({ message: "Refresh token expired or invalid." });
      }

      const newAccessToken = generateAccessToken({
        id: user.id,
        Role_id: user.Role_id,
      });

      res.cookie("accessToken", newAccessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
      });
      res.status(200).json({ message: "Access token refreshed" });
    } catch (error) {
      console.error("Error during refresh:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
});

// Logout route to clear refresh token
router.post("/Logout", async (req, res) => {
  const { userId, user_type } = req.body;
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken || !userId || !user_type) {
    return res
      .status(400)
      .json({ message: "Refresh token, userId, and user_type are required." });
  }

  try {
    if (user_type === "Client") {
      const tokenRecord = await ClientRefreshToken.findOne({
        where: {
          token: refreshToken,
          client_registration_id: userId,
        },
      });

      if (tokenRecord) {
        await tokenRecord.destroy();
      }
    } else {
      const tokenRecord = await RefreshToken.findOne({
        where: {
          token: refreshToken,
          user_id: userId, // or `user_id` if that's your field
        },
      });

      if (tokenRecord) {
        await tokenRecord.destroy();
      }
    }

    // Clear cookies
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    res.status(200).json({ message: "Logged out successfully." });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// GET /check-session - Verify if refresh token is still valid
router.get("/check-session", async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  const { user_type } = req.query; // 'User' or 'Client'

  if (!refreshToken) {
    return res
      .status(401)
      .json({ valid: false, message: "No refresh token provided." });
  }

  try {
    // Verify JWT
    jwt.verify(refreshToken, JWT_REFRESH_SECRET, async (err, decoded) => {
      if (err) {
        return res
          .status(401)
          .json({ valid: false, message: "Invalid or expired refresh token." });
      }

      let tokenRecord;

      if (user_type === "Client") {
        tokenRecord = await ClientRefreshToken.findOne({
          where: { token: refreshToken, client_registration_id: decoded.id },
        });
      } else {
        tokenRecord = await RefreshToken.findOne({
          where: { token: refreshToken, user_id: decoded.id },
        });
      }

      if (!tokenRecord || new Date() > tokenRecord.expires_at) {
        return res
          .status(401)
          .json({ valid: false, message: "Refresh token expired." });
      }

      return res.status(200).json({ valid: true });
    });
  } catch (error) {
    console.error("Error checking session:", error);
    res.status(500).json({ valid: false, message: "Internal server error" });
  }
});

module.exports = router;
