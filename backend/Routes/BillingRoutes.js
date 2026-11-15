const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/checkPermission');
const {
  listBillableFhrs,
  createDraftInvoice,
  issueInvoice,
  getInvoice,
  listInvoices,
} = require('../services/invoiceService');

router.get(
  '/queue/:page_name',
  authenticateToken,
  checkPermission('view'),
  async (req, res) => {
    try {
      const fhrs = await listBillableFhrs();
      return res.json({ fhrs });
    } catch (error) {
      console.error('Billing queue failed:', error);
      return res.status(500).json({
        message: 'Failed to load billing queue',
        error: error.message,
      });
    }
  }
);

router.get(
  '/invoices/:page_name',
  authenticateToken,
  checkPermission('view'),
  async (req, res) => {
    try {
      const invoices = await listInvoices({ status: req.query.status });
      return res.json({ invoices });
    } catch (error) {
      console.error('Invoice list failed:', error);
      return res.status(500).json({
        message: 'Failed to list invoices',
        error: error.message,
      });
    }
  }
);

router.get(
  '/invoices/:page_name/:invoice_id',
  authenticateToken,
  checkPermission('view'),
  async (req, res) => {
    try {
      const invoice = await getInvoice(req.params.invoice_id);
      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      return res.json({ invoice });
    } catch (error) {
      console.error('Invoice get failed:', error);
      return res.status(500).json({
        message: 'Failed to load invoice',
        error: error.message,
      });
    }
  }
);

router.post(
  '/invoices/:page_name',
  authenticateToken,
  checkPermission('add'),
  async (req, res) => {
    try {
      const invoice = await createDraftInvoice(req.body?.fhr_ids || []);
      return res.status(201).json({ invoice });
    } catch (error) {
      console.error('Create invoice failed:', error);
      return res.status(400).json({
        message: error.message || 'Failed to create invoice',
      });
    }
  }
);

router.post(
  '/invoices/:page_name/:invoice_id/issue',
  authenticateToken,
  checkPermission('edit'),
  async (req, res) => {
    try {
      const invoice = await issueInvoice(req.params.invoice_id, {
        issued_by: req.user?.user_id || req.user?.id || null,
      });
      return res.json({ invoice });
    } catch (error) {
      console.error('Issue invoice failed:', error);
      return res.status(400).json({
        message: error.message || 'Failed to issue invoice',
      });
    }
  }
);

module.exports = router;
