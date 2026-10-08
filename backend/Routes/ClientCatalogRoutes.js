const express = require('express');
const Aircraft = require('../Models/Aircraft');
const AircraftCategory = require('../Models/AircraftCategory');
const Airline = require('../Models/Airlines');
const Category = require('../Models/Category');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * Read-only catalog for signed-in clients.
 * Admin screens load the same tables through permission-gated sockets
 * (view-aircrafts, view-categories). Those sockets stay employee-only.
 */
router.get('/catalog/aircraft-types', authenticateToken, async (req, res) => {
  try {
    const aircrafts = await Aircraft.findAll({
      include: [
        {
          model: Airline,
          as: 'airline',
          attributes: ['airline_id', 'airline_name', 'iata'],
        },
        {
          model: AircraftCategory,
          as: 'category',
          attributes: ['Aircraft_category_id', 'Category_name'],
        },
      ],
      order: [['type_name', 'ASC']],
      limit: 300,
    });

    const data = aircrafts.map((row) => {
      const aircraft = row.toJSON();
      return {
        aircraft_id: aircraft.aircraft_id,
        type_name: aircraft.type_name,
        currency: aircraft.currency,
        AAI_levy: aircraft.AAI_levy,
        airline_name: aircraft.airline?.airline_name || null,
        airline_iata: aircraft.airline?.iata || null,
        category_name: aircraft.category?.Category_name || null,
      };
    });

    return res.status(200).json({
      message: 'Aircraft types retrieved successfully',
      data,
    });
  } catch (error) {
    console.error('Failed to retrieve aircraft types:', error);
    return res.status(500).json({
      message: 'Failed to retrieve aircraft types',
      error: error.message,
    });
  }
});

router.get('/catalog/services', authenticateToken, async (req, res) => {
  try {
    const categories = await Category.findAll({
      attributes: ['category_id', 'name', 'description'],
      order: [['name', 'ASC']],
    });

    return res.status(200).json({
      message: 'Services retrieved successfully',
      data: categories,
    });
  } catch (error) {
    console.error('Failed to retrieve services:', error);
    return res.status(500).json({
      message: 'Failed to retrieve services',
      error: error.message,
    });
  }
});

module.exports = router;
