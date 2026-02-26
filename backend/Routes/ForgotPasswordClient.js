const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const ClientRegistration = require('../Models/Client_Registration');
const ResetPasswordTokenClient = require('../Models/ResetPasswordTokenClient'); // Import PasswordResetToken model
const crypto = require('crypto');
const { Op } = require('sequelize'); // Import Op from sequelize

// Configure nodemailer with Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await ClientRegistration.findOne({
      where: { email: email }, // Find user by email
    });

    if (!user) {
      return res.status(400).send('User not found');
    }

    // Check for an existing, non-expired token
    const existingToken = await ResetPasswordTokenClient.findOne({
      where: {
        client_registration_id: user.client_registration_id,
        expires_at: {
          [Op.gt]: new Date(), // Token must be still valid
        },
      },
    });

    let token;
    if (existingToken) {
      token = existingToken.token; // Reuse existing token
    } else {
      // Generate a new token
      token = crypto.randomBytes(32).toString('hex');

      // Calculate token expiration (e.g., 1 hour from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      // Save the new token in the database
      await ResetPasswordTokenClient.create({
        client_registration_id: user.client_registration_id,
        token: token,
        expires_at: expiresAt,
      }); // Save within transaction
    }

    // Create reset URL with the token
    const resetUrl = `https://indothai-sgha-8paro.ondigitalocean.app/Client_resetpassword/${token}`;

    const mailOptions = {
      to: user.email,
      from: 'No-Reply',
      subject: 'Password Reset',
      text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
        Please click on the following link, or paste this into your browser to complete the process:\n\n
        ${resetUrl}\n\n
        If you did not request this, please ignore this email and your password will remain unchanged.\n`,

 html: `
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">

<head>
	<title></title>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0"><!--[if mso]>
<xml><w:WordDocument xmlns:w="urn:schemas-microsoft-com:office:word"><w:DontUseAdvancedTypographyReadingMail/></w:WordDocument>
<o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml>
<![endif]--><!--[if !mso]><!-->
	<link href="https://fonts.googleapis.com/css?family=Cabin" rel="stylesheet" type="text/css"><!--<![endif]-->
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

		@media (max-width:670px) {

			.desktop_hide table.icons-inner,
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
		}
	</style><!--[if mso ]><style>sup, sub { font-size: 100% !important; } sup { mso-text-raise:10% } sub { mso-text-raise:-10% }</style> <![endif]-->
</head>

<body class="body" style="background-color: #f3e6f8; margin: 0; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
	<table class="nl-container" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #000000;">
		<tbody>
			<tr>
				<td>
					<table class="row row-1" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f3e6f8;">
						<tbody>
							<tr>
								<td>
									<table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 650px; margin: 0 auto; padding-bottom:25px;padding-top:25px" width="650">
										<tbody>
											<tr>
												<td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top;">
													<!-- <table class="image_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="padding-bottom:15px;padding-top:15px;width:100%;padding-right:0px;padding-left:0px;">
																<div class="alignment" align="center">
																	<div style="max-width: 130px;"><img src="https://www.indothai.in/assets/img/logo.png" style="display: block; height: auto; border: 0; width: 100%;" width="130" alt="your logo" title="your logo" height="auto"></div>
																</div>
															</td>
														</tr>
													</table> -->
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
					<table class="row row-2" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f3e6f8;">
						<tbody>
							<tr>
								<td>
									<table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; background-image: url('https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/ResetPassword_BG_2.png'); background-position: center top; background-repeat: no-repeat; color: #000000; width: 650px; margin: 0 auto;" width="650">
										<tbody>
											<tr>
												<td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-top: 45px; vertical-align: top;">
													<table class="divider_block block-1" width="100%" border="0" cellpadding="20" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad">
																<div class="alignment" align="center">
																	<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
																		<tr>
																			<td class="divider_inner" style="font-size: 1px; line-height: 1px; border-top: 0px solid #BBBBBB;"><span style="word-break: break-word;">&#8202;</span></td>
																		</tr>
																	</table>
																</div>
															</td>
														</tr>
													</table>
													<table class="image_block block-2" width="100%" border="0" cellpadding="20" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad">
																<div class="alignment" align="center">
																	<div class="fullWidth" style="max-width: 357.5px;"><img src="https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/fw_bg.png" style="display: block; height: auto; border: 0; width: 100%;" width="357.5" alt="Forgot your password?" title="Forgot your password?" height="auto"></div>
																</div>
															</td>
														</tr>
													</table>
													<table class="heading_block block-3" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="padding-top:35px;text-align:center;width:100%;">
																<h1 style="margin: 0; color: #8E4493; direction: ltr; font-family: 'Cabin', Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 28px; font-weight: 400; letter-spacing: normal; line-height: 1.2; text-align: center; margin-top: 0; margin-bottom: 0; mso-line-height-alt: 34px;"><strong>Forgot your password?</strong></h1>
															</td>
														</tr>
													</table>
													<table class="paragraph_block block-4" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad" style="padding-left:45px;padding-right:45px;padding-top:10px;">
																<div style="color:#393d47;font-family:'Cabin',Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:18px;line-height:1.5;text-align:center;mso-line-height-alt:27px;">
																	<p style="margin: 0; word-break: break-word;"><span style="word-break: break-word; color: #858585;">We received a request to reset your password.</span></p>
																	<p style="margin: 0; word-break: break-word;"><span style="word-break: break-word; color: #858585;">If you didn't make this request, simply ignore this email.</span></p>
																</div>
															</td>
														</tr>
													</table>
													<table class="divider_block block-5" width="100%" border="0" cellpadding="20" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad">
																<div class="alignment" align="center">
																	<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="80%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
																		<tr>
																			<td class="divider_inner" style="font-size: 1px; line-height: 1px; border-top: 1px solid #e2cfe3;"><span style="word-break: break-word;">&#8202;</span></td>
																		</tr>
																	</table>
																</div>
															</td>
														</tr>
													</table>
													<table class="paragraph_block block-6" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad" style="padding-bottom:10px;padding-left:45px;padding-right:45px;padding-top:10px;">
																<div style="color:#393d47;font-family:'Cabin',Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:13px;line-height:1.5;text-align:center;mso-line-height-alt:20px;">
																	<p style="margin: 0; word-break: break-word;"><span style="word-break: break-word; color: #8E4493;">If you did make this request just click the button below:</span></p>
																</div>
															</td>
														</tr>
													</table>
													<table class="button_block block-7" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad">
																<div class="alignment" align="center"><a href="${resetUrl}" target="_blank" style="color:#ffffff;text-decoration:none;"><!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"  href="${resetUrl}"  style="height:52px;width:219px;v-text-anchor:middle;" arcsize="0%" fillcolor="#8E4493">
<v:stroke dashstyle="Solid" weight="1px" color="#8E4493"/>
<w:anchorlock/>
<v:textbox inset="0px,0px,0px,0px">
<center dir="false" style="color:#ffffff;font-family:Arial, sans-serif;font-size:14px">
<![endif]--><span class="button" style="background-color: #8E4493; mso-shading: transparent; border-bottom: 1px solid transparent; border-left: 1px solid transparent; border-radius: 0px; border-right: 1px solid transparent; border-top: 1px solid transparent; color: #ffffff; display: inline-block; font-family: 'Cabin', Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 14px; font-weight: 400; mso-border-alt: none; padding-bottom: 10px; padding-top: 10px; padding-left: 40px; padding-right: 40px; text-align: center; width: auto; word-break: keep-all; letter-spacing: normal;"><span style="word-break: break-word;"><span style="word-break: break-word; line-height: 28px;" data-mce-style>RESET MY PASSWORD</span></span></span><!--[if mso]></center></v:textbox></v:roundrect><![endif]--></a></div>
															</td>
														</tr>
													</table>
													<table class="paragraph_block block-8" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad" style="padding-bottom:15px;padding-left:10px;padding-right:10px;padding-top:10px;">
																<div style="color:#393d47;font-family:'Cabin',Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:10px;line-height:1.2;text-align:center;mso-line-height-alt:12px;">
																	<p style="margin: 0; word-break: break-word;"><span style="word-break: break-word; color: #858585;"><span style="word-break: break-word;">If you didn't request to change your brand password, </span><span style="word-break: break-word;">you don't have to do anything. So that's easy.</span></span></p>
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
					<table class="row row-3" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f3e6f8;">
						<tbody>
							<tr>
								<td>
									<table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 650px; margin: 0 auto;" width="650">
										<tbody>
											<tr>
												<td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 10px; padding-top: 5px; vertical-align: top;">
													<table class="divider_block block-1" width="100%" border="0" cellpadding="5" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad">
																<div class="alignment" align="center">
																	<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
																		<tr>
																			<td class="divider_inner" style="font-size: 1px; line-height: 1px; border-top: 0px solid #BBBBBB;"><span style="word-break: break-word;">&#8202;</span></td>
																		</tr>
																	</table>
																</div>
															</td>
														</tr>
													</table>
													<table class="paragraph_block block-2" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad">
																<div style="color:#8E4493;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;font-size:11px;line-height:1.2;text-align:center;mso-line-height-alt:13px;">
																	<p style="margin: 0; word-break: break-word;"><span style="word-break: break-word; color: #8a3b8f;">Room No : S2, Silver Arcade , 5, J.B.S Halden Avenue, </span></p>
																	<p style="margin: 0; word-break: break-word;"><span style="word-break: break-word; color: #8a3b8f;">kolkata - 700105, West Bengal, INDIA.</span></p>
																</div>
															</td>
														</tr>
													</table>
													<table class="paragraph_block block-3" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad">
																<div style="color:#8E4493;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;font-size:12px;line-height:1.2;text-align:center;mso-line-height-alt:14px;">
																	<p style="margin: 0; word-break: break-word;">&nbsp;</p>
																</div>
															</td>
														</tr>
													</table>
													<table class="paragraph_block block-4" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad">
																<div style="color:#8E4493;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;font-size:11px;line-height:1.2;text-align:center;mso-line-height-alt:13px;">
																	<p style="margin: 0; word-break: break-word;"><span style="word-break: break-word;"><span style="word-break: break-word; color: #8a3b8f;">Email : info@indothai.in </span></p>
																</div>
															</td>
														</tr>
													</table>
													<table class="paragraph_block block-5" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad">
																<div style="color:#8E4493;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;font-size:12px;line-height:1.2;text-align:center;mso-line-height-alt:14px;">
																	<p style="margin: 0; word-break: break-word;">&nbsp;</p>
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

    await transporter.sendMail(mailOptions);


    res.send('Password reset link sent to email');
  } catch (error) {
    console.error('Error: ', error);
    res.status(500).send('Server error');
  }
});

// Endpoint to reset password
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  try {
    // Find the token in the database and ensure it's still valid
    const resetToken = await ResetPasswordTokenClient.findOne({
      where: {
        token: token,
        expires_at: {
          [Op.gt]: new Date(), // Check that the token is not expired
        },
      }
    });

    if (!resetToken) {
      return res.status(400).send('Invalid or expired token');
    }

    // Find the user associated with the token
    const user = await ClientRegistration.findOne({
      where: { client_registration_id: resetToken.client_registration_id }
    });

    if (!user) {
      return res.status(400).send('User not found');
    }

    // Hash the new password and update the user record
    user.password = await bcrypt.hash(password, 10);
    await user.save(); // Pass the transaction object

    // Delete the token after successful password reset
    await resetToken.destroy(); // Pass the transaction object


    res.send('Password has been reset successfully');
  } catch (error) {

    console.error('Error: ', error); // Log error details
    res.status(500).send('Server error');
  }
});

module.exports = router;