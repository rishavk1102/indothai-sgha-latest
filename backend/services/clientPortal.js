const { Op } = require('sequelize');
const Client = require('../Models/Client');
const Airport = require('../Models/Airport');
const Business = require('../Models/Business');
const Aircraft = require('../Models/Aircraft');
const Airline = require('../Models/Airlines');
const FHR = require('../Models/FHR');
const ArrivalDetails = require('../Models/Arrival_Details');
const DepartureDetails = require('../Models/Departure_Details');
const SghaTariff = require('../NewModels/SghaTariff');
const SghaTariffLine = require('../NewModels/SghaTariffLine');
const Invoice = require('../NewModels/Invoice');
const InvoiceLine = require('../NewModels/InvoiceLine');
const InvoiceFhr = require('../NewModels/InvoiceFhr');
const FhrRating = require('../NewModels/FhrRating');
const FhrChargeLine = require('../NewModels/FhrChargeLine');

async function clientIdsForRegistration(clientRegistrationId) {
  const regId = Number(clientRegistrationId);
  if (!Number.isFinite(regId) || regId <= 0) return [];
  const rows = await Client.findAll({
    where: { client_registration_id: regId },
    attributes: ['client_id', 'airport_id', 'business_id', 'name'],
  });
  return rows;
}

async function assertOwnsFhr(clientRegistrationId, fhrId) {
  const clients = await clientIdsForRegistration(clientRegistrationId);
  const ids = clients.map((c) => c.client_id);
  if (!ids.length) return null;
  return FHR.findOne({
    attributes: { exclude: ['category_id'] },
    where: { fhr_id: Number(fhrId), client_id: { [Op.in]: ids } },
  });
}

async function listClientFhrs(clientRegistrationId) {
  const clients = await clientIdsForRegistration(clientRegistrationId);
  const ids = clients.map((c) => c.client_id);
  if (!ids.length) return [];

  const fhrs = await FHR.findAll({
    attributes: { exclude: ['category_id'] },
    where: { client_id: { [Op.in]: ids } },
    include: [
      { model: Client, as: 'client', attributes: ['client_id', 'name'] },
      {
        model: Airport,
        as: 'airport',
        attributes: ['airport_id', 'name', 'iata'],
      },
      { model: Business, as: 'business', attributes: ['business_id', 'name'] },
      { model: Aircraft, as: 'aircraft', attributes: ['aircraft_id', 'type_name'] },
      {
        model: Airline,
        as: 'airline',
        attributes: ['airline_id', 'airline_name', 'iata'],
      },
      { model: ArrivalDetails, as: 'arrival_details' },
      { model: DepartureDetails, as: 'departure_details' },
    ],
    order: [['fhr_id', 'DESC']],
  });

  const ratings = await FhrRating.findAll({
    where: { fhr_id: { [Op.in]: fhrs.map((f) => f.fhr_id) } },
    include: [
      {
        model: FhrChargeLine,
        as: 'lines',
        separate: true,
        order: [['charge_line_id', 'ASC']],
      },
    ],
  });
  const ratingByFhr = new Map(ratings.map((r) => [r.fhr_id, r]));

  return fhrs.map((fhr) => {
    const rating = ratingByFhr.get(fhr.fhr_id) || null;
    return {
      ...fhr.toJSON(),
      rating: rating
        ? {
            status: rating.status,
            rating_date: rating.rating_date,
            currency: rating.currency,
            tariff_id: rating.tariff_id,
            reason: rating.reason,
            lines: rating.lines || [],
          }
        : null,
    };
  });
}

async function getClientFhr(clientRegistrationId, fhrId) {
  const owned = await assertOwnsFhr(clientRegistrationId, fhrId);
  if (!owned) return null;

  const fhr = await FHR.findByPk(Number(fhrId), {
    attributes: { exclude: ['category_id'] },
    include: [
      { model: Client, as: 'client' },
      { model: Airport, as: 'airport' },
      { model: Business, as: 'business' },
      { model: Aircraft, as: 'aircraft' },
      { model: Airline, as: 'airline' },
      { model: ArrivalDetails, as: 'arrival_details' },
      { model: DepartureDetails, as: 'departure_details' },
    ],
  });
  if (!fhr) return null;

  const rating = await FhrRating.findOne({
    where: { fhr_id: fhr.fhr_id },
    include: [
      {
        model: FhrChargeLine,
        as: 'lines',
        separate: true,
        order: [['charge_line_id', 'ASC']],
      },
    ],
  });

  return {
    ...fhr.toJSON(),
    rating: rating || null,
  };
}

async function listClientTariffs(clientRegistrationId) {
  const regId = Number(clientRegistrationId);
  if (!Number.isFinite(regId) || regId <= 0) return [];

  return SghaTariff.findAll({
    where: {
      client_registration_id: regId,
      status: { [Op.in]: ['Active', 'Superseded', 'Expired'] },
    },
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
    order: [
      ['status', 'ASC'],
      ['version', 'DESC'],
    ],
  });
}

async function getClientTariff(clientRegistrationId, tariffId) {
  const regId = Number(clientRegistrationId);
  const tariff = await SghaTariff.findOne({
    where: {
      tariff_id: Number(tariffId),
      client_registration_id: regId,
    },
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
  return tariff;
}

async function listClientInvoices(clientRegistrationId) {
  const clients = await clientIdsForRegistration(clientRegistrationId);
  const ids = clients.map((c) => c.client_id);
  if (!ids.length) return [];

  // Clients only ever see Issued invoices.
  return Invoice.findAll({
    where: {
      client_id: { [Op.in]: ids },
      status: 'Issued',
    },
    include: [
      {
        model: InvoiceLine,
        as: 'lines',
        separate: true,
        order: [['invoice_line_id', 'ASC']],
      },
      { model: InvoiceFhr, as: 'fhrs', separate: true },
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
    order: [['issued_at', 'DESC'], ['invoice_id', 'DESC']],
  });
}

async function getClientInvoice(clientRegistrationId, invoiceId) {
  const clients = await clientIdsForRegistration(clientRegistrationId);
  const ids = clients.map((c) => c.client_id);
  if (!ids.length) return null;

  return Invoice.findOne({
    where: {
      invoice_id: Number(invoiceId),
      client_id: { [Op.in]: ids },
      status: 'Issued',
    },
    include: [
      {
        model: InvoiceLine,
        as: 'lines',
        separate: true,
        order: [['invoice_line_id', 'ASC']],
      },
      { model: InvoiceFhr, as: 'fhrs', separate: true },
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
}

module.exports = {
  clientIdsForRegistration,
  listClientFhrs,
  getClientFhr,
  listClientTariffs,
  getClientTariff,
  listClientInvoices,
  getClientInvoice,
};
