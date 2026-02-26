const sequelize = require("../../config/database");
const { Op } = require("sequelize"); // ✅ Import Op
const PersonalInformation = require('../../Models/PersonalInformation');
// const EmergencyContact = require('../../Models/EmergencyContact');
// const BankInformation = require('../../Models/BankInformation');
const User = require('../../Models/User');
const ProfileImage = require('../../Models/ProfileImage');
const Business = require('../../Models/Business');
const Airport = require('../../Models/Airport');
const checkSocketPermission = require("../../middleware/checkSocketPermission");

module.exports = (io, socket) => {

    socket.on('get-personal-information', async ({ user_id, role_id, page_name }) => {
        // Check permission first
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('get-personal-information-error', { message: error });
        }

        try {
            const data = await PersonalInformation.findOne({ where: { user_id } });

            if (!data) {
                return socket.emit('get-personal-information-error', {
                    message: 'Personal information not found for this user.',
                });
            }

            socket.emit('get-personal-information-success', data);
        } catch (err) {
            socket.emit('get-personal-information-error', {
                message: 'Failed to fetch personal information.',
                error: err.message,
            });
        }
    });

    // socket.on('get-emergency-contact', async ({ user_id, role_id, page_name }) => {
    //     const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
    //     if (!allowed) {
    //         return socket.emit('get-emergency-contact-error', { message: error });
    //     }

    //     try {
    //         const data = await EmergencyContact.findOne({ where: { user_id } });

    //         if (!data) {
    //             return socket.emit('get-emergency-contact-error', {
    //                 message: 'Emergency contact not found for this user.'
    //             });
    //         }

    //         socket.emit('get-emergency-contact-success', data);
    //     } catch (err) {
    //         socket.emit('get-emergency-contact-error', {
    //             message: 'Failed to fetch emergency contact.',
    //             error: err.message
    //         });
    //     }
    // });


    // socket.on('get-bank-information', async ({ user_id, role_id, page_name }) => {
    //     const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
    //     if (!allowed) {
    //         return socket.emit('get-bank-information-error', { message: error });
    //     }
    //     try {
    //         const data = await BankInformation.findOne({ where: { user_id } });

    //         if (!data) {
    //             return socket.emit('get-bank-information-error', {
    //                 message: 'Bank information not found for this user.'
    //             });
    //         }

    //         socket.emit('get-bank-information-success', data);
    //     } catch (err) {
    //         socket.emit('get-bank-information-error', {
    //             message: 'Failed to fetch bank information.',
    //             error: err.message
    //         });
    //     }
    // });


    socket.on('get-user-details', async ({ user_id, role_id, page_name }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);

        if (!allowed) {
            return socket.emit('get-user-details-error', {
                message: error || `Access denied for viewing ${page_name}`
            });
        }

        try {
            const user = await User.findOne({
                where: { user_id },
                attributes: { exclude: ['password'] }
            });

            if (!user) {
                return socket.emit('get-user-details-error', {
                    message: 'User not found'
                });
            }

            socket.emit('get-user-details-success', user);
        } catch (err) {
            console.error('Error fetching user:', err);
            socket.emit('get-user-details-error', {
                message: 'Server error',
                error: err.message
            });
        }
    });


    socket.on('get-user-details', async ({ user_id, role_id, page_name }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);

        if (!allowed) {
            return socket.emit('get-user-details-error', {
                message: error || `Access denied for viewing ${page_name}`
            });
        }

        try {
            const user = await User.findOne({
                where: { user_id },
                attributes: { exclude: ['password'] }
            });

            if (!user) {
                return socket.emit('get-user-details-error', {
                    message: 'User not found'
                });
            }

            socket.emit('get-user-details-success', user);
        } catch (err) {
            console.error('Error fetching user:', err);
            socket.emit('get-user-details-error', {
                message: 'Server error',
                error: err.message
            });
        }
    });



    socket.on('get-all-employees', async ({ role_id, page_name }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);

        if (!allowed) {
            return socket.emit('get-all-employees-error', {
                message: error || `Access denied for viewing ${page_name}`
            });
        }

        try {
            const users = await User.findAll({
                attributes: { exclude: ['password'] },
                where: {
                    Is_active: true,
                    // user_type: {
                    //     [Op.notIn]: ['Unverified', 'SuperAdmin']
                    // }
                },
                include: [
                    {
                        model: PersonalInformation,
                        as: 'personalInformation',
                        attributes: ['date_of_birth', 'City', 'State', 'gender']
                    },
                    {
                        model: ProfileImage,
                        as: 'profileImage',
                        attributes: ['img_url']
                    }
                ]
            });

            const usersByType = {};

            for (const user of users) {
                const fullName = `${user.first_name} ${user.last_name}`;
                const userData = {
                    user_id: user.user_id,
                    name: fullName,
                    email: user.email,
                    role: user.user_type,
                    is_active: user.Is_active,
                    joining_date: user.joining_date,
                    employee_data: user.personalInformation ? user.personalInformation.toJSON() : null,
                    profile_image: user.profileImage ? user.profileImage.img_url : null
                };

                const type = user.user_type;
                if (!usersByType[type]) {
                    usersByType[type] = [];
                }
                usersByType[type].push(userData);
            }

            for (const type in usersByType) {
                usersByType[type].sort((a, b) => a.name.localeCompare(b.name));
            }

            const customOrder = ['Admin', ...Object.keys(usersByType).filter(t => t !== 'Admin' && t !== 'Ex_employee').sort(), 'Ex_employee'];

            const sortedUsersByType = customOrder.reduce((obj, key) => {
                if (usersByType[key]) {
                    obj[key] = usersByType[key];
                }
                return obj;
            }, {});

            if (Object.keys(sortedUsersByType).length === 0) {
                return socket.emit('get-all-employees-error', { message: 'No users found.' });
            }

            socket.emit('get-all-employees-success', sortedUsersByType);
        } catch (err) {
            console.error('Error fetching employee data:', err);
            socket.emit('get-all-employees-error', {
                message: 'Internal server error.',
                error: err.message
            });
        }
    });

    socket.on('get-user-profile-images', async ({ user_id, role_id, page_name }) => {
        // Step 1: Check permission
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('get-user-profile-images-error', { message: error });
        }

        // Step 2: Fetch images
        try {
            const profileImages = await ProfileImage.findOne({
                where: { user_id },
            });

            if (profileImages.length === 0) {
                return socket.emit('get-user-profile-images-error', {
                    message: 'No profile images found for this user.',
                });
            }

            socket.emit('get-user-profile-images-success', profileImages);
        } catch (err) {
            socket.emit('get-user-profile-images-error', {
                message: 'Failed to fetch profile images.',
                error: err.message,
            });
        }
    });



    socket.on('get-user-businesses', async ({ user_id, role_id, page_name }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('get-user-businesses-error', { message: error });
        }

        try {
            const userBusinesses = await User.findByPk(user_id, {
                attributes: ['user_id'], // don't fetch user data
                include: {
                    model: Business,
                    as: 'businesses',
                    attributes: ['business_id', 'name'], // Fetch desired fields
                    through: { attributes: [] } // Hide join table data
                }
            });

            if (!userBusinesses || userBusinesses.length === 0) {
                return socket.emit('get-user-businesses-error', {
                    message: 'No associated businesses found for this user.',
                });
            }

            socket.emit('get-user-businesses-success', userBusinesses);
        } catch (err) {
            console.error('❌ Failed to fetch user businesses:', err);
            socket.emit('get-user-businesses-error', {
                message: 'Failed to fetch user businesses.',
                error: err.message,
            });
        }
    });


    socket.on('get-user-airports', async ({ user_id, role_id, page_name }) => {
        const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
        if (!allowed) {
            return socket.emit('get-user-airports-error', { message: error });
        }

        try {
            const userAirports = await User.findByPk(user_id, {
                attributes: ['user_id'], // don't fetch user data
                include: {
                    model: Airport,
                    as: 'airports',
                    attributes: ['airport_id', 'name', 'iata'],
                    through: { attributes: [] }
                }
            });

            if (!userAirports || userAirports.length === 0) {
                return socket.emit('get-user-airports-error', {
                    message: 'No associated airports found for this user.',
                });
            }

            socket.emit('get-user-airports-success', userAirports);
        } catch (err) {
            console.error('❌ Failed to fetch user airports:', err);
            socket.emit('get-user-airports-error', {
                message: 'Failed to fetch user airports.',
                error: err.message,
            });
        }
    });




};