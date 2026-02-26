const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');

const PersonalInformation = require('../Models/PersonalInformation');
const User = require('../Models/User');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/checkPermission');
const { getIO } = require('../sockets/socketHandler'); // adjust the path as needed

// Add Personal Information
router.post('/personal-information/:page_name', authenticateToken, checkPermission('add'), async (req, res) => {
  let transaction;
  const { user_id, ...data } = req.body;

  try {
    transaction = await sequelize.transaction();
    const existingRecord = await PersonalInformation.findOne({ where: { user_id }, transaction });

    if (existingRecord) {
      return res.status(400).json({ message: 'Personal information already exists for this user.' });
    }

    const result = await PersonalInformation.create({ user_id, ...data }, { transaction });
    await transaction.commit();

    const io = getIO();
    io.emit("personalInfoupdated"); // broadcast the new info


    return res.status(201).json(result);

  } catch (error) {
    if (transaction) await transaction.rollback();
    return res.status(500).json({ message: 'Failed to add personal information.', error: error.message });
  } finally {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
  }
});

// Update Personal Information
router.put('/personal-information-edit/:user_id/:page_name', authenticateToken, checkPermission('edit'), async (req, res) => {
  let transaction;
  const { user_id } = req.params;
  const {
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
    Country
  } = req.body;

  // === Payload Construction ===
  const updateData = {
    pan_card_no,
    passport_no,
    aadhar_no,
    nationality,
    religion,
    marital_status,
    employment_of_spouse,
    no_of_children,
    date_of_birth: new Date(date_of_birth),
    Address1,
    Address2,
    City,
    State,
    gender,
    Country,
    updated_at: new Date(),
  };
  try {
    transaction = await sequelize.transaction();
    const result = await PersonalInformation.update(updateData, { where: { user_id }, transaction });

    if (result[0] === 0) {
      return res.status(404).json({ message: 'Personal information not found for this user.' });
    }
    await transaction.commit();

    const io = getIO();
    io.emit("personalInfoupdated", { user_id, timestamp: new Date() });


    return res.status(200).json({ message: 'Personal information updated successfully.' });

  } catch (error) {
    if (transaction) await transaction.rollback();
    return res.status(500).json({ message: 'Failed to update personal information.', error: error.message });
  } finally {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
  }
});

// Delete Personal Information
router.delete('/personal-information/:user_id/:page_name', authenticateToken, checkPermission('delete'), async (req, res) => {
  const { user_id } = req.params;
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const result = await PersonalInformation.destroy({ where: { user_id }, transaction });

    if (result === 0) {
      return res.status(404).json({ message: 'Personal information not found for this user.' });
    }
    await transaction.commit();
    const io = getIO();
    io.emit("personalInfoupdated"); // broadcast the new info
    return res.status(200).json({ message: 'Personal information deleted successfully.' });

  } catch (error) {
    if (transaction) await transaction.rollback();
    return res.status(500).json({ message: 'Failed to delete personal information.', error: error.message });
  } finally {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
  }
});


//Update Employee Profile
router.put('/update-employee/:page_name', authenticateToken, checkPermission('edit'), async (req, res) => {
  const { user_id, first_name, last_name, email, phone_no, alternate_no, personal_email, employee_no, joining_date } = req.body;
  let transaction;
  if (!user_id) {
    return res.status(400).json({ message: 'user_id is required.' });
  }
  try {
    transaction = await sequelize.transaction();
    // Find the employee by employee_id
    const employee = await User.findOne({ where: { user_id }, transaction });

    if (!employee) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Employee not found.' });
    }

    // Create an object to hold the fields that need to be updated
    const updates = {};

    // Add fields to the updates object if they are provided in the request
    if (first_name) updates.first_name = first_name;
    if (last_name) updates.last_name = last_name;
    if (email) updates.email = email;
    if (phone_no) updates.phone_no = phone_no;
    if (alternate_no) updates.alternate_no = alternate_no;
    if (personal_email) updates.personal_email = personal_email;
    if (employee_no) updates.employee_no = employee_no;
    if (joining_date) updates.joining_date = joining_date;

    // If no fields to update, return an error
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No fields provided to update.' });
    }

    // Update the employee fields with the provided updates
    await User.update(updates, {
      where: { user_id }, transaction
    });

    await transaction.commit();

    const io = getIO();
    io.emit("user-profile-updated", { user_id, timestamp: new Date() }); // Broadcast the new info

    res.status(200).json({ message: 'Employee updated successfully.' });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Error updating employee:', error);
    res.status(500).json({ message: 'Internal server error.' });
  } finally {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
  }
});



module.exports = router;
