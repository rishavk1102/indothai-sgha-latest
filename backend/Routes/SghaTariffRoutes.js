const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/checkPermission');
const SghaTariff = require('../NewModels/SghaTariff');
const SghaTariffLine = require('../NewModels/SghaTariffLine');
const Client = require('../Models/Client');
const Airport = require('../Models/Airport');
const Business = require('../Models/Business');
const {
  snapshotTariffFromSubmission,
  upsertWalkupTariff,
} = require('../services/sghaTariffSnapshot');

router.get(
  '/tariffs/:page_name',
  authenticateToken,
  checkPermission('view'),
  async (req, res) => {
    try {
      const { status, client_id, airport_id, kind } = req.query;
      const where = {};
      if (status) where.status = status;
      if (client_id) where.client_id = Number(client_id);
      if (airport_id) where.airport_id = Number(airport_id);
      if (kind) where.kind = kind;

      const tariffs = await SghaTariff.findAll({
        where,
        include: [
          {
            model: SghaTariffLine,
            as: 'lines',
            separate: true,
            order: [['tariff_line_id', 'ASC']],
          },
          {
            model: Client,
            as: 'client',
            attributes: ['client_id', 'name'],
            required: false,
          },
          {
            model: Airport,
            as: 'airport',
            attributes: ['airport_id', 'name', 'iata'],
            required: false,
          },
          {
            model: Business,
            as: 'business',
            attributes: ['business_id', 'name'],
            required: false,
          },
        ],
        order: [['created_at', 'DESC']],
      });

      return res.json({ tariffs });
    } catch (error) {
      console.error('Failed to list tariffs:', error);
      return res.status(500).json({
        message: 'Failed to list tariffs',
        error: error.message,
      });
    }
  }
);

router.get(
  '/tariffs/:page_name/:tariff_id',
  authenticateToken,
  checkPermission('view'),
  async (req, res) => {
    try {
      const tariff = await SghaTariff.findByPk(Number(req.params.tariff_id), {
        include: [
          {
            model: SghaTariffLine,
            as: 'lines',
            separate: true,
            order: [['tariff_line_id', 'ASC']],
          },
          {
            model: Client,
            as: 'client',
            attributes: ['client_id', 'name'],
            required: false,
          },
          {
            model: Airport,
            as: 'airport',
            attributes: ['airport_id', 'name', 'iata'],
            required: false,
          },
          {
            model: Business,
            as: 'business',
            attributes: ['business_id', 'name'],
            required: false,
          },
        ],
      });
      if (!tariff) {
        return res.status(404).json({ message: 'Tariff not found' });
      }
      return res.json({ tariff });
    } catch (error) {
      console.error('Failed to get tariff:', error);
      return res.status(500).json({
        message: 'Failed to get tariff',
        error: error.message,
      });
    }
  }
);

router.post(
  '/tariffs/:page_name/snapshot/:submission_id',
  authenticateToken,
  checkPermission('add'),
  async (req, res) => {
    try {
      const result = await snapshotTariffFromSubmission(
        req.params.submission_id,
        { approved_by: req.user?.user_id || req.user?.id || null }
      );
      return res.json(result);
    } catch (error) {
      console.error('Failed to snapshot tariff:', error);
      return res.status(500).json({
        message: 'Failed to snapshot tariff',
        error: error.message,
      });
    }
  }
);

router.post(
  '/tariffs/:page_name/walkup',
  authenticateToken,
  checkPermission('add'),
  async (req, res) => {
    try {
      const result = await upsertWalkupTariff({
        airportId: req.body?.airport_id,
        businessId: req.body?.business_id,
        currency: req.body?.currency || 'INR',
        approved_by: req.user?.user_id || req.user?.id || null,
      });
      return res.status(201).json(result);
    } catch (error) {
      console.error('Failed to upsert walk-up tariff:', error);
      return res.status(400).json({
        message: error.message || 'Failed to create walk-up tariff',
      });
    }
  }
);

module.exports = router;
