const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/checkPermission');
const FhrRating = require('../NewModels/FhrRating');
const SghaTariffLine = require('../NewModels/SghaTariffLine');
const {
  listBillableFhrs,
  createDraftInvoice,
  approveInvoice,
  returnInvoiceToDraft,
  issueInvoice,
  voidInvoice,
  createCreditNote,
  unlockInvoice,
  updateInvoiceLine,
  deleteInvoiceLine,
  addInvoiceLine,
  addInvoiceLineFromTariff,
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

router.get(
  '/invoices/:page_name/:invoice_id/tariff-lines',
  authenticateToken,
  checkPermission('view'),
  async (req, res) => {
    try {
      const invoice = await getInvoice(req.params.invoice_id);
      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      const fhrIds = (invoice.fhrs || []).map((row) => row.fhr_id);

      const ratings = fhrIds.length
        ? await FhrRating.findAll({
            where: { fhr_id: fhrIds },
            attributes: ['fhr_id', 'tariff_id'],
          })
        : [];
      let tariffIds = [
        ...new Set(ratings.map((r) => r.tariff_id).filter(Boolean)),
      ];

      // Fallback: Active walk-up / SGHA tariff for this invoice airport when
      // linked FHRs were Needs-review (no tariff_id) or have no ratings yet.
      if (!tariffIds.length && invoice.airport_id) {
        const SghaTariff = require('../NewModels/SghaTariff');
        const fallback = await SghaTariff.findAll({
          where: {
            airport_id: invoice.airport_id,
            status: 'Active',
          },
          attributes: ['tariff_id', 'kind'],
          order: [
            ['kind', 'ASC'],
            ['tariff_id', 'DESC'],
          ],
        });
        tariffIds = fallback.map((t) => t.tariff_id);
      }

      if (!tariffIds.length) return res.json({ lines: [], tariff_ids: [] });

      const lines = await SghaTariffLine.findAll({
        where: { tariff_id: tariffIds },
        order: [
          ['line_type', 'ASC'],
          ['description', 'ASC'],
        ],
      });
      return res.json({ lines, tariff_ids: tariffIds });
    } catch (error) {
      console.error('Tariff lines for invoice failed:', error);
      return res.status(500).json({
        message: 'Failed to load tariff lines',
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
  '/invoices/:page_name/:invoice_id/approve',
  authenticateToken,
  checkPermission('edit'),
  async (req, res) => {
    try {
      const invoice = await approveInvoice(req.params.invoice_id, {
        approved_by: req.user?.user_id || req.user?.id || null,
      });
      return res.json({ invoice });
    } catch (error) {
      console.error('Approve invoice failed:', error);
      return res.status(400).json({
        message: error.message || 'Failed to approve invoice',
      });
    }
  }
);

router.post(
  '/invoices/:page_name/:invoice_id/return-to-draft',
  authenticateToken,
  checkPermission('edit'),
  async (req, res) => {
    try {
      const invoice = await returnInvoiceToDraft(req.params.invoice_id);
      return res.json({ invoice });
    } catch (error) {
      console.error('Return invoice to draft failed:', error);
      return res.status(400).json({
        message: error.message || 'Failed to return invoice to draft',
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

router.post(
  '/invoices/:page_name/:invoice_id/void',
  authenticateToken,
  checkPermission('delete'),
  async (req, res) => {
    try {
      const invoice = await voidInvoice(req.params.invoice_id, {
        voided_by: req.user?.user_id || req.user?.id || null,
      });
      return res.json({ invoice });
    } catch (error) {
      console.error('Void invoice failed:', error);
      return res.status(400).json({
        message: error.message || 'Failed to void invoice',
      });
    }
  }
);

router.post(
  '/invoices/:page_name/:invoice_id/credit-note',
  authenticateToken,
  checkPermission('add'),
  async (req, res) => {
    try {
      const invoice = await createCreditNote(req.params.invoice_id, {
        issued_by: req.user?.user_id || req.user?.id || null,
        mode: req.body?.mode,
        amount: req.body?.amount,
        line_ids: req.body?.line_ids,
      });
      return res.status(201).json({ invoice });
    } catch (error) {
      console.error('Credit note failed:', error);
      return res.status(400).json({
        message: error.message || 'Failed to create credit note',
      });
    }
  }
);

// Demoted emergency path — UI no longer exposes Unlock.
router.post(
  '/invoices/:page_name/:invoice_id/unlock',
  authenticateToken,
  checkPermission('delete'),
  async (req, res) => {
    try {
      const invoice = await unlockInvoice(req.params.invoice_id, {
        unlocked_by: req.user?.user_id || req.user?.id || null,
      });
      return res.json({ invoice });
    } catch (error) {
      console.error('Unlock invoice failed:', error);
      return res.status(400).json({
        message: error.message || 'Failed to unlock invoice',
      });
    }
  }
);

router.post(
  '/invoices/:page_name/:invoice_id/lines',
  authenticateToken,
  checkPermission('edit'),
  async (req, res) => {
    try {
      let invoice;
      if (req.body?.tariff_line_id) {
        invoice = await addInvoiceLineFromTariff(req.params.invoice_id, {
          tariff_line_id: req.body.tariff_line_id,
          fhr_id: req.body.fhr_id,
          qty: req.body.qty,
        });
      } else {
        invoice = await addInvoiceLine(req.params.invoice_id, req.body || {});
      }
      return res.status(201).json({ invoice });
    } catch (error) {
      console.error('Add invoice line failed:', error);
      return res.status(400).json({
        message: error.message || 'Failed to add line',
      });
    }
  }
);

const updateInvoiceLineHandler = async (req, res) => {
  try {
    const invoice = await updateInvoiceLine(
      req.params.invoice_id,
      req.params.line_id,
      req.body || {}
    );
    return res.json({ invoice });
  } catch (error) {
    console.error('Update invoice line failed:', error);
    return res.status(400).json({
      message: error.message || 'Failed to update line',
    });
  }
};

router.patch(
  '/invoices/:page_name/:invoice_id/lines/:line_id',
  authenticateToken,
  checkPermission('edit'),
  updateInvoiceLineHandler
);

// PUT alias — some clients / proxies are happier with PUT than PATCH
router.put(
  '/invoices/:page_name/:invoice_id/lines/:line_id',
  authenticateToken,
  checkPermission('edit'),
  updateInvoiceLineHandler
);

router.delete(
  '/invoices/:page_name/:invoice_id/lines/:line_id',
  authenticateToken,
  checkPermission('edit'),
  async (req, res) => {
    try {
      const invoice = await deleteInvoiceLine(
        req.params.invoice_id,
        req.params.line_id
      );
      return res.json({ invoice });
    } catch (error) {
      console.error('Delete invoice line failed:', error);
      return res.status(400).json({
        message: error.message || 'Failed to delete line',
      });
    }
  }
);

module.exports = router;
