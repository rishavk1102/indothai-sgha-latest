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
        where: { status: { [Op.in]: ['Draft', 'Issued'] } },
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
    if (invoice.status !== 'Draft') {
      throw new Error('Only a Draft invoice can be issued');
    }
    if (!invoice.lines?.length) {
      throw new Error('Invoice has no lines');
    }

    await invoice.update(
      {
        status: 'Issued',
        issued_by: options.issued_by || null,
        issued_at: new Date(),
      },
      { transaction }
    );

    return Invoice.findByPk(id, { include: invoiceInclude, transaction });
  });
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
  issueInvoice,
  getInvoice,
  listInvoices,
};
