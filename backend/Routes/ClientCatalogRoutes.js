const express = require('express');
const Aircraft = require('../Models/Aircraft');
const AircraftCategory = require('../Models/AircraftCategory');
const Airline = require('../Models/Airlines');
const Category = require('../Models/Category');
const CompanyAircraft = require('../NewModels/CompanyAircraft');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * Read-only catalog for signed-in clients.
 * Admin screens load the same tables through permission-gated sockets
 * (view-aircrafts, view-categories). Those sockets stay employee-only.
 */
/** Same rows as employee /dashboard/CompanyAircraft (Aircraft options). */
router.get('/catalog/aircraft-options', authenticateToken, async (req, res) => {
  try {
    const airportId = req.query.airport_id != null && String(req.query.airport_id).trim() !== ''
      ? parseInt(String(req.query.airport_id), 10)
      : null;
    const query = {
      attributes: [
        'aircraft_id',
        'business_id',
        'airport_id',
        'Aircraft_name',
        'Aircraft_model',
        'Company_name',
        'MTOW',
        'Limit_per_incident',
        'Price_per_Limit_inr',
        'Price_per_Limit_usd',
        'Flight_type',
      ],
      order: [['Aircraft_name', 'ASC'], ['aircraft_id', 'ASC']],
      limit: 500,
    };
    if (Number.isFinite(airportId) && airportId > 0) {
      query.where = { airport_id: airportId };
    }
    const rows = await CompanyAircraft.findAll(query);
    return res.status(200).json({
      message: 'Aircraft options retrieved successfully',
      data: rows,
    });
  } catch (error) {
    console.error('Failed to retrieve aircraft options:', error);
    return res.status(500).json({
      message: 'Failed to retrieve aircraft options',
      error: error.message,
    });
  }
});

/** Same rows as employee /dashboard/AircraftCategory */
router.get('/catalog/aircraft-categories', authenticateToken, async (req, res) => {
  try {
    const categories = await AircraftCategory.findAll({
      attributes: ['Aircraft_category_id', 'Category_name'],
      order: [['Category_name', 'ASC']],
      limit: 500,
    });

    const data = categories.map((row) => {
      const c = row.toJSON();
      return {
        Aircraft_category_id: c.Aircraft_category_id,
        Category_name: c.Category_name,
      };
    });

    return res.status(200).json({
      message: 'Aircraft categories retrieved successfully',
      data,
    });
  } catch (error) {
    console.error('Failed to retrieve aircraft categories:', error);
    return res.status(500).json({
      message: 'Failed to retrieve aircraft categories',
      error: error.message,
    });
  }
});

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
