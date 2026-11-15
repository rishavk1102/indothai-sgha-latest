const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  listClientFhrs,
  getClientFhr,
  listClientTariffs,
  getClientTariff,
  listClientInvoices,
  getClientInvoice,
} = require('../services/clientPortal');

function resolveClientRegistrationId(req) {
  // Client JWT uses `id` = client_registration_id (see AuthRoutes login).
  const fromJwt =
    req.user?.id ||
    req.user?.client_registration_id ||
    req.user?.user_id ||
    null;
  const fromQuery = req.query.client_registration_id
    ? Number(req.query.client_registration_id)
    : null;
  const jwtId = fromJwt != null ? Number(fromJwt) : null;
  if (jwtId && fromQuery && jwtId !== fromQuery) {
    return { error: 'client_registration_id does not match session' };
  }
  const id = jwtId || fromQuery;
  if (!id || !Number.isFinite(id) || id <= 0) {
    return { error: 'client_registration_id required' };
  }
  return { id };
}

router.get('/portal/fhrs', authenticateToken, async (req, res) => {
  try {
    const resolved = resolveClientRegistrationId(req);
    if (resolved.error) {
      return res.status(400).json({ message: resolved.error });
    }
    const fhrs = await listClientFhrs(resolved.id);
    return res.json({ fhrs });
  } catch (error) {
    console.error('Client portal FHRs failed:', error);
    return res.status(500).json({
      message: 'Failed to load FHRs',
      error: error.message,
    });
  }
});

router.get('/portal/fhrs/:fhr_id', authenticateToken, async (req, res) => {
  try {
    const resolved = resolveClientRegistrationId(req);
    if (resolved.error) {
      return res.status(400).json({ message: resolved.error });
    }
    const fhr = await getClientFhr(resolved.id, req.params.fhr_id);
    if (!fhr) {
      return res.status(404).json({ message: 'FHR not found' });
    }
    return res.json({ fhr });
  } catch (error) {
    console.error('Client portal FHR detail failed:', error);
    return res.status(500).json({
      message: 'Failed to load FHR',
      error: error.message,
    });
  }
});

router.get('/portal/tariffs', authenticateToken, async (req, res) => {
  try {
    const resolved = resolveClientRegistrationId(req);
    if (resolved.error) {
      return res.status(400).json({ message: resolved.error });
    }
    const tariffs = await listClientTariffs(resolved.id);
    return res.json({ tariffs });
  } catch (error) {
    console.error('Client portal tariffs failed:', error);
    return res.status(500).json({
      message: 'Failed to load tariffs',
      error: error.message,
    });
  }
});

router.get('/portal/tariffs/:tariff_id', authenticateToken, async (req, res) => {
  try {
    const resolved = resolveClientRegistrationId(req);
    if (resolved.error) {
      return res.status(400).json({ message: resolved.error });
    }
    const tariff = await getClientTariff(resolved.id, req.params.tariff_id);
    if (!tariff) {
      return res.status(404).json({ message: 'Tariff not found' });
    }
    return res.json({ tariff });
  } catch (error) {
    console.error('Client portal tariff detail failed:', error);
    return res.status(500).json({
      message: 'Failed to load tariff',
      error: error.message,
    });
  }
});

router.get('/portal/invoices', authenticateToken, async (req, res) => {
  try {
    const resolved = resolveClientRegistrationId(req);
    if (resolved.error) {
      return res.status(400).json({ message: resolved.error });
    }
    const invoices = await listClientInvoices(resolved.id);
    return res.json({ invoices });
  } catch (error) {
    console.error('Client portal invoices failed:', error);
    return res.status(500).json({
      message: 'Failed to load invoices',
      error: error.message,
    });
  }
});

router.get(
  '/portal/invoices/:invoice_id',
  authenticateToken,
  async (req, res) => {
    try {
      const resolved = resolveClientRegistrationId(req);
      if (resolved.error) {
        return res.status(400).json({ message: resolved.error });
      }
      const invoice = await getClientInvoice(
        resolved.id,
        req.params.invoice_id
      );
      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      return res.json({ invoice });
    } catch (error) {
      console.error('Client portal invoice detail failed:', error);
      return res.status(500).json({
        message: 'Failed to load invoice',
        error: error.message,
      });
    }
  }
);

module.exports = router;
