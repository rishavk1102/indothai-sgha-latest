const { Op } = require('sequelize');
const sequelize = require('../config/database');
const FHR = require('../Models/FHR');
const Client = require('../Models/Client');
const Airport = require('../Models/Airport');
const Business = require('../Models/Business');
const ArrivalDetails = require('../Models/Arrival_Details');
const DepartureDetails = require('../Models/Departure_Details');
const Aircraft = require('../Models/Aircraft');
const FhrRating = require('../NewModels/FhrRating');
const FhrChargeLine = require('../NewModels/FhrChargeLine');
const Invoice = require('../NewModels/Invoice');
const InvoiceLine = require('../NewModels/InvoiceLine');
const InvoiceFhr = require('../NewModels/InvoiceFhr');

function toMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function fyLabel(date) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const start = month >= 4 ? year : year - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

function snapshotParty(row, extra = {}) {
  if (!row) return extra;
  return {
    name: row.name || null,
    gstin: row.gstin || null,
    pan: row.pan || null,
    address1: row.address1 || null,
    address2: row.address2 || null,
    city: row.city || null,
    state: row.state || null,
    pincode: row.pincode || null,
    country: row.country || null,
    ...extra,
  };
}

const invoiceInclude = [
  {
    model: InvoiceLine,
    as: 'lines',
    separate: true,
    order: [['invoice_line_id', 'ASC']],
  },
  {
    model: InvoiceFhr,
    as: 'fhrs',
    separate: true,
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
];

async function liveInvoiceFhrIds(transaction) {
  const links = await InvoiceFhr.findAll({
    include: [
      {
        model: Invoice,
        as: 'invoice',
        attributes: ['invoice_id', 'status'],
        where: {
          status: { [Op.in]: ['Draft', 'Under review', 'Issued'] },
        },
        required: true,
      },
    ],
    transaction,
  });
  return new Set(links.map((row) => row.fhr_id));
}

async function nextInvoiceNo(businessId, transaction) {
  const fy = fyLabel(new Date());
  const prefix = `ITH-${businessId || 0}-${fy}-`;
  const latest = await Invoice.findOne({
    where: { invoice_no: { [Op.like]: `${prefix}%` } },
    order: [['invoice_id', 'DESC']],
    transaction,
  });
  let seq = 1;
  if (latest?.invoice_no) {
    const n = Number(String(latest.invoice_no).split('-').pop());
    if (Number.isFinite(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

async function listBillableFhrs() {
  const taken = await liveInvoiceFhrIds();
  const ratings = await FhrRating.findAll({
    where: { status: 'Rated' },
    include: [
      {
        model: FhrChargeLine,
        as: 'lines',
        separate: true,
        order: [['charge_line_id', 'ASC']],
      },
    ],
  });
  const fhrIds = ratings
    .map((r) => r.fhr_id)
    .filter((id) => !taken.has(id));
  if (!fhrIds.length) return [];

  const fhrs = await FHR.findAll({
    attributes: { exclude: ['category_id'] },
    where: { fhr_id: { [Op.in]: fhrIds }, status: 'Completed' },
    include: [
      { model: Client, as: 'client', attributes: ['client_id', 'name'] },
      {
        model: Airport,
        as: 'airport',
        attributes: ['airport_id', 'name', 'iata'],
      },
      { model: Business, as: 'business', attributes: ['business_id', 'name'] },
      { model: Aircraft, as: 'aircraft', attributes: ['aircraft_id', 'type_name'] },
      { model: ArrivalDetails, as: 'arrival_details' },
      { model: DepartureDetails, as: 'departure_details' },
    ],
    order: [['fhr_id', 'DESC']],
  });

  const ratingByFhr = new Map(ratings.map((r) => [r.fhr_id, r]));
  return fhrs.map((fhr) => {
    const rating = ratingByFhr.get(fhr.fhr_id);
    const lines = rating?.lines || [];
    const total = lines.reduce((sum, line) => sum + toMoney(line.amount), 0);
    return {
      fhr_id: fhr.fhr_id,
      type: fhr.type,
      Fhr_type: fhr.Fhr_type,
      client_id: fhr.client_id,
      business_id: fhr.business_id,
      airport_id: fhr.airport_id,
      client: fhr.client,
      airport: fhr.airport,
      business: fhr.business,
      aircraft: fhr.aircraft,
      rating_date: rating?.rating_date || null,
      currency: rating?.currency || 'INR',
      tariff_id: rating?.tariff_id || null,
      line_count: lines.length,
      total,
      lines,
    };
  });
}

async function createDraftInvoice(fhrIds, options = {}) {
  const ids = [...new Set((fhrIds || []).map(Number).filter((n) => n > 0))];
  if (!ids.length) throw new Error('Select at least one FHR');

  return sequelize.transaction(async (transaction) => {
    const taken = await liveInvoiceFhrIds(transaction);
    const overlap = ids.filter((id) => taken.has(id));
    if (overlap.length) {
      throw new Error(`Already on a live invoice: ${overlap.join(', ')}`);
    }

    const fhrs = await FHR.findAll({
      attributes: { exclude: ['category_id'] },
      where: { fhr_id: { [Op.in]: ids }, status: 'Completed' },
      include: [
        { model: Client, as: 'client' },
        { model: Airport, as: 'airport' },
        { model: Business, as: 'business' },
      ],
      transaction,
    });
    if (fhrs.length !== ids.length) {
      throw new Error('Every FHR must exist and be Completed');
    }

    const clientId = fhrs[0].client_id;
    const airportId = fhrs[0].airport_id;
    const businessId = fhrs[0].business_id;
    const mixed = fhrs.find(
      (row) =>
        row.client_id !== clientId ||
        row.airport_id !== airportId ||
        row.business_id !== businessId
    );
    if (mixed) {
      throw new Error('All FHRs on one invoice must share client, airport and business');
    }

    const ratings = await FhrRating.findAll({
      where: { fhr_id: { [Op.in]: ids }, status: 'Rated' },
      include: [{ model: FhrChargeLine, as: 'lines' }],
      transaction,
    });
    if (ratings.length !== ids.length) {
      throw new Error('Every FHR must be Rated before invoicing');
    }

    const currencies = new Set(ratings.map((r) => r.currency || 'INR'));
    if (currencies.size > 1) {
      throw new Error('Cannot mix currencies on one invoice');
    }
    const currency = [...currencies][0] || 'INR';

    const dates = ratings
      .map((r) => r.rating_date)
      .filter(Boolean)
      .sort();
    const invoiceNo = await nextInvoiceNo(businessId, transaction);

    const invoice = await Invoice.create(
      {
        invoice_no: invoiceNo,
        client_id: clientId,
        business_id: businessId,
        airport_id: airportId,
        period_from: dates[0] || null,
        period_to: dates[dates.length - 1] || null,
        currency,
        subtotal: 0,
        tax_total: 0,
        grand_total: 0,
        status: 'Draft',
        bill_to: snapshotParty(fhrs[0].client),
        bill_from: snapshotParty(fhrs[0].business, {
          iata: fhrs[0].airport?.iata || null,
          airport: fhrs[0].airport?.name || null,
        }),
      },
      { transaction }
    );

    await InvoiceFhr.bulkCreate(
      ids.map((fhr_id) => ({ invoice_id: invoice.invoice_id, fhr_id })),
      { transaction }
    );

    const draftLines = [];
    for (const rating of ratings) {
      for (const line of rating.lines || []) {
        draftLines.push({
          invoice_id: invoice.invoice_id,
          fhr_id: rating.fhr_id,
          charge_line_id: line.charge_line_id,
          description: line.description,
          line_type: line.line_type,
          qty: toMoney(line.qty),
          unit: line.unit,
          unit_rate: toMoney(line.unit_rate),
          levy: line.levy != null ? toMoney(line.levy) : null,
          tax: line.tax != null ? toMoney(line.tax) : null,
          amount: toMoney(line.amount),
        });
      }
    }
    if (draftLines.length) {
      await InvoiceLine.bulkCreate(draftLines, { transaction });
    }

    const subtotal = draftLines.reduce((sum, line) => sum + toMoney(line.amount), 0);
    const taxTotal = draftLines.reduce((sum, line) => sum + toMoney(line.tax), 0);
    await invoice.update(
      {
        subtotal,
        tax_total: taxTotal,
        grand_total: toMoney(subtotal + taxTotal),
      },
      { transaction }
    );

    return Invoice.findByPk(invoice.invoice_id, {
      include: invoiceInclude,
      transaction,
    });
  });
}

async function approveInvoice(invoiceId, options = {}) {
  const id = Number(invoiceId);
  return sequelize.transaction(async (transaction) => {
    const invoice = await Invoice.findByPk(id, {
      include: invoiceInclude,
      transaction,
    });
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status === 'Under review') {
      return invoice;
    }
    if (invoice.status !== 'Draft') {
      throw new Error('Only a Draft invoice can be approved for review');
    }
    if (!invoice.lines?.length) {
      throw new Error('Invoice has no lines');
    }

    await invoice.update(
      {
        status: 'Under review',
        approved_by: options.approved_by || null,
        approved_at: new Date(),
      },
      { transaction }
    );

    return Invoice.findByPk(id, { include: invoiceInclude, transaction });
  });
}

/** Send Under review back to Draft for line edits. */
async function returnInvoiceToDraft(invoiceId) {
  const id = Number(invoiceId);
  return sequelize.transaction(async (transaction) => {
    const invoice = await Invoice.findByPk(id, {
      include: invoiceInclude,
      transaction,
    });
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status !== 'Under review') {
      throw new Error('Only an Under review invoice can return to Draft');
    }
    await invoice.update(
      {
        status: 'Draft',
        approved_by: null,
        approved_at: null,
      },
      { transaction }
    );
    return Invoice.findByPk(id, { include: invoiceInclude, transaction });
  });
}

async function issueInvoice(invoiceId, options = {}) {
  const id = Number(invoiceId);
  return sequelize.transaction(async (transaction) => {
    const invoice = await Invoice.findByPk(id, {
      include: invoiceInclude,
      transaction,
    });
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status === 'Issued') {
      return invoice;
    }
    if (invoice.status !== 'Under review') {
      throw new Error('Approve the draft first (Under review), then Issue');
    }
    if (!invoice.lines?.length) {
      throw new Error('Invoice has no lines');
    }

    await invoice.update(
      {
        status: 'Issued',
        issued_by: options.issued_by || null,
        issued_at: new Date(),
        unlocked_by: null,
        unlocked_at: null,
      },
      { transaction }
    );

    return Invoice.findByPk(id, { include: invoiceInclude, transaction });
  });
}

async function voidInvoice(invoiceId, options = {}) {
  const id = Number(invoiceId);
  return sequelize.transaction(async (transaction) => {
    const invoice = await Invoice.findByPk(id, {
      include: invoiceInclude,
      transaction,
    });
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status === 'Voided') {
      return invoice;
    }
    if (invoice.status !== 'Issued') {
      throw new Error('Only an Issued invoice can be voided');
    }
    await invoice.update(
      {
        status: 'Voided',
        unlocked_by: options.voided_by || null,
        unlocked_at: new Date(),
      },
      { transaction }
    );
    return Invoice.findByPk(id, { include: invoiceInclude, transaction });
  });
}

/**
 * Issued invoices are immutable. Corrections use a credit note (negated lines).
 * Does not free FHRs — void the original if you need a replacement invoice.
 */
async function createCreditNote(invoiceId, options = {}) {
  const id = Number(invoiceId);
  return sequelize.transaction(async (transaction) => {
    const source = await Invoice.findByPk(id, {
      include: invoiceInclude,
      transaction,
    });
    if (!source) throw new Error('Invoice not found');
    if (source.status !== 'Issued') {
      throw new Error('Only an Issued invoice can receive a credit note');
    }
    if (!source.lines?.length) {
      throw new Error('Source invoice has no lines');
    }

    const creditNo = await nextInvoiceNo(source.business_id, transaction);
    const credit = await Invoice.create(
      {
        invoice_no: `CN-${creditNo}`,
        client_id: source.client_id,
        business_id: source.business_id,
        airport_id: source.airport_id,
        period_from: source.period_from,
        period_to: source.period_to,
        currency: source.currency,
        subtotal: toMoney(-Number(source.subtotal || 0)),
        tax_total: toMoney(-Number(source.tax_total || 0)),
        grand_total: toMoney(-Number(source.grand_total || 0)),
        status: 'Credit note',
        bill_to: source.bill_to,
        bill_from: source.bill_from,
        credits_invoice_id: source.invoice_id,
        issued_by: options.issued_by || null,
        issued_at: new Date(),
        approved_by: options.issued_by || null,
        approved_at: new Date(),
      },
      { transaction }
    );

    const creditLines = (source.lines || []).map((line) => ({
      invoice_id: credit.invoice_id,
      fhr_id: line.fhr_id,
      charge_line_id: line.charge_line_id,
      description: `Credit: ${line.description}`,
      line_type: line.line_type,
      qty: toMoney(line.qty),
      unit: line.unit,
      unit_rate: toMoney(-Number(line.unit_rate || 0)),
      levy: line.levy != null ? toMoney(-Number(line.levy)) : null,
      tax: line.tax != null ? toMoney(-Number(line.tax)) : null,
      amount: toMoney(-Number(line.amount || 0)),
    }));
    if (creditLines.length) {
      await InvoiceLine.bulkCreate(creditLines, { transaction });
    }

    return Invoice.findByPk(credit.invoice_id, {
      include: invoiceInclude,
      transaction,
    });
  });
}

async function requireDraftInvoice(invoiceId, transaction) {
  const invoice = await Invoice.findByPk(Number(invoiceId), {
    include: invoiceInclude,
    transaction,
  });
  if (!invoice) throw new Error('Invoice not found');
  if (invoice.status !== 'Draft') {
    throw new Error('Only a Draft invoice can be edited');
  }
  return invoice;
}

async function recalcInvoiceTotals(invoice, transaction) {
  const lines = await InvoiceLine.findAll({
    where: { invoice_id: invoice.invoice_id },
    transaction,
  });
  const subtotal = lines.reduce((sum, line) => sum + toMoney(line.amount), 0);
  const taxTotal = lines.reduce((sum, line) => sum + toMoney(line.tax), 0);
  await invoice.update(
    {
      subtotal,
      tax_total: taxTotal,
      grand_total: toMoney(subtotal + taxTotal),
    },
    { transaction }
  );
  return Invoice.findByPk(invoice.invoice_id, {
    include: invoiceInclude,
    transaction,
  });
}

async function updateInvoiceLine(invoiceId, lineId, patch = {}) {
  return sequelize.transaction(async (transaction) => {
    const invoice = await requireDraftInvoice(invoiceId, transaction);
    const line = await InvoiceLine.findOne({
      where: {
        invoice_line_id: Number(lineId),
        invoice_id: invoice.invoice_id,
      },
      transaction,
    });
    if (!line) throw new Error('Invoice line not found');

    const qty =
      patch.qty != null ? toMoney(patch.qty) : toMoney(line.qty);
    const unitRate =
      patch.unit_rate != null
        ? toMoney(patch.unit_rate)
        : toMoney(line.unit_rate);
    const amount =
      patch.amount != null ? toMoney(patch.amount) : toMoney(qty * unitRate);

    await line.update(
      {
        description:
          patch.description != null ? String(patch.description) : line.description,
        line_type:
          patch.line_type != null ? patch.line_type : line.line_type,
        qty,
        unit: patch.unit != null ? patch.unit : line.unit,
        unit_rate: unitRate,
        levy: patch.levy != null ? toMoney(patch.levy) : line.levy,
        tax: patch.tax != null ? toMoney(patch.tax) : line.tax,
        amount,
      },
      { transaction }
    );

    return recalcInvoiceTotals(invoice, transaction);
  });
}

async function deleteInvoiceLine(invoiceId, lineId) {
  return sequelize.transaction(async (transaction) => {
    const invoice = await requireDraftInvoice(invoiceId, transaction);
    const deleted = await InvoiceLine.destroy({
      where: {
        invoice_line_id: Number(lineId),
        invoice_id: invoice.invoice_id,
      },
      transaction,
    });
    if (!deleted) throw new Error('Invoice line not found');
    return recalcInvoiceTotals(invoice, transaction);
  });
}

async function addInvoiceLine(invoiceId, payload = {}) {
  return sequelize.transaction(async (transaction) => {
    const invoice = await requireDraftInvoice(invoiceId, transaction);
    const qty = toMoney(payload.qty != null ? payload.qty : 1);
    const unitRate = toMoney(payload.unit_rate != null ? payload.unit_rate : 0);
    const amount =
      payload.amount != null ? toMoney(payload.amount) : toMoney(qty * unitRate);
    if (!payload.description) throw new Error('description is required');

    await InvoiceLine.create(
      {
        invoice_id: invoice.invoice_id,
        fhr_id: payload.fhr_id != null ? Number(payload.fhr_id) : null,
        charge_line_id:
          payload.charge_line_id != null
            ? Number(payload.charge_line_id)
            : null,
        description: String(payload.description),
        line_type: payload.line_type || 'Additional',
        qty,
        unit: payload.unit || null,
        unit_rate: unitRate,
        levy: payload.levy != null ? toMoney(payload.levy) : null,
        tax: payload.tax != null ? toMoney(payload.tax) : null,
        amount,
      },
      { transaction }
    );

    return recalcInvoiceTotals(invoice, transaction);
  });
}

/**
 * Add a priced line from the invoice's linked FHR tariff (no invented rates).
 */
async function addInvoiceLineFromTariff(invoiceId, { tariff_line_id, fhr_id, qty }) {
  const SghaTariffLine = require('../NewModels/SghaTariffLine');
  return sequelize.transaction(async (transaction) => {
    const invoice = await requireDraftInvoice(invoiceId, transaction);
    const tariffLine = await SghaTariffLine.findByPk(Number(tariff_line_id), {
      transaction,
    });
    if (!tariffLine) throw new Error('Tariff line not found');

    let linkedFhrId = fhr_id != null ? Number(fhr_id) : null;
    if (!linkedFhrId && invoice.fhrs?.length === 1) {
      linkedFhrId = invoice.fhrs[0].fhr_id;
    }

    const q = toMoney(qty != null ? qty : 1);
    const unitRate = toMoney(tariffLine.rate);
    await InvoiceLine.create(
      {
        invoice_id: invoice.invoice_id,
        fhr_id: linkedFhrId,
        charge_line_id: null,
        description: tariffLine.description,
        line_type: tariffLine.line_type || 'Additional',
        qty: q,
        unit: tariffLine.unit || null,
        unit_rate: unitRate,
        levy: null,
        tax: null,
        amount: toMoney(q * unitRate),
      },
      { transaction }
    );

    return recalcInvoiceTotals(invoice, transaction);
  });
}

/**
 * Demoted: Issued invoices stay immutable. Prefer createCreditNote or voidInvoice.
 * Kept only for emergency elevated use; frontend no longer exposes it.
 */
async function unlockInvoice() {
  throw new Error(
    'Unlock is disabled. Create a credit note, or void the Issued invoice and raise a replacement draft.'
  );
}

async function getInvoice(invoiceId) {
  const invoice = await Invoice.findByPk(Number(invoiceId), {
    include: invoiceInclude,
  });
  return invoice;
}

async function listInvoices({ status } = {}) {
  const where = {};
  if (status) where.status = status;
  return Invoice.findAll({
    where,
    include: invoiceInclude,
    order: [['created_at', 'DESC']],
  });
}

module.exports = {
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
};
