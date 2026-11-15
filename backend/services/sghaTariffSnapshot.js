const { Op } = require('sequelize');
const sequelize = require('../config/database');
const ClientAnnexASubmission = require('../NewModels/ClientAnnexASubmission');
const SubmissionVariables = require('../NewModels/SubmissionVariables');
const Client = require('../Models/Client');
const Airport = require('../Models/Airport');
const SghaTariff = require('../NewModels/SghaTariff');
const SghaTariffLine = require('../NewModels/SghaTariffLine');

function parseJsonMaybe(value) {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function toMoney(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

function resolveCurrency(formDetails) {
  const raw = String(formDetails?.rate || formDetails?.currency || 'INR')
    .trim()
    .toUpperCase();
  if (raw.includes('USD') || raw === '$') return 'USD';
  return 'INR';
}

function pickAircraftRate(row, currency) {
  if (currency === 'USD') return toMoney(row.Price_per_Limit_usd);
  return toMoney(row.Price_per_Limit_inr);
}

function pickChargeRate(row, currency) {
  if (currency === 'USD') return toMoney(row.rate_usd);
  return toMoney(row.rate_inr);
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.selected)) return value.selected;
  return [];
}

function toDateOnly(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

async function loadVariablesMap(submissionId, transaction) {
  const rows = await SubmissionVariables.findAll({
    where: { submission_id: submissionId },
    transaction,
  });
  const map = {};
  rows.forEach((row) => {
    map[row.variable_name] = parseJsonMaybe(row.variable_value) ?? row.variable_value;
  });
  return map;
}

async function resolveClientAndBusiness(submission, formDetails, transaction) {
  const airportId = formDetails?.airport_id
    ? Number(formDetails.airport_id)
    : null;

  let client = null;
  if (airportId) {
    client = await Client.findOne({
      where: {
        client_registration_id: submission.client_registration_id,
        airport_id: airportId,
      },
      transaction,
    });
  }
  if (!client) {
    client = await Client.findOne({
      where: { client_registration_id: submission.client_registration_id },
      transaction,
    });
  }

  let businessId = client?.business_id || null;
  if (!businessId && airportId) {
    const airport = await Airport.findByPk(airportId, { transaction });
    businessId = airport?.business_id || null;
  }

  return {
    client_id: client?.client_id || null,
    business_id: businessId,
    airport_id: airportId || client?.airport_id || null,
  };
}

function buildLinesFromVariables(variables, currency) {
  const lines = [];
  const aircraftOptions = asArray(variables.aircraft_options);
  aircraftOptions.forEach((row, index) => {
    const rate = pickAircraftRate(row || {}, currency);
    if (rate == null) return;
    const codeParts = [
      'AC',
      row.aircraft_id || row.selected_aircraft_id || index + 1,
      row.Aircraft_category_id || 'x',
    ];
    lines.push({
      service_code: codeParts.join('-').slice(0, 64),
      description:
        row.Aircraft_name ||
        row.Category_name ||
        row.custom_aircraft_text ||
        `Aircraft package ${index + 1}`,
      line_type: 'Base handling',
      aircraft_category_id: row.Aircraft_category_id || null,
      flight_type_id: null,
      unit: 'per limit',
      rate,
      levy_rate: null,
      tax_code: null,
      min_charge: null,
      included_qty: toMoney(row.Limit_per_incident),
      source_ref:
        row.aircraft_id != null
          ? `aircraft_options:${row.aircraft_id}`
          : `aircraft_options:${index}`,
      source_payload: row,
    });
  });

  const charges = asArray(variables.additional_charges);
  charges.forEach((row, index) => {
    const rate = pickChargeRate(row || {}, currency);
    if (rate == null) return;
    const id = row.Additional_charges_id || index + 1;
    lines.push({
      service_code: `ADD-${id}`.slice(0, 64),
      description:
        row.Service_name ||
        row.charge_name ||
        row.name ||
        `Additional charge ${index + 1}`,
      line_type: 'Additional',
      aircraft_category_id: null,
      flight_type_id: null,
      unit: row.unit_or_measure || null,
      rate,
      levy_rate: null,
      tax_code: row.Charge_type || null,
      min_charge: null,
      included_qty: null,
      source_ref: `additional_charges:${id}`,
      source_payload: row,
    });
  });

  return lines;
}

/**
 * Freeze negotiated submission prices into an immutable tariff.
 * Safe to call more than once for the same Completed submission:
 * returns the existing tariff if one already exists for that submission_id.
 */
async function snapshotTariffFromSubmission(submissionId, options = {}) {
  const submissionIdInt = Number(submissionId);
  if (!Number.isFinite(submissionIdInt) || submissionIdInt <= 0) {
    throw new Error('Invalid submission_id');
  }

  return sequelize.transaction(async (transaction) => {
    const existing = await SghaTariff.findOne({
      where: { submission_id: submissionIdInt },
      include: [{ model: SghaTariffLine, as: 'lines' }],
      transaction,
    });
    if (existing) {
      return { tariff: existing, created: false, reason: 'already_exists' };
    }

    const submission = await ClientAnnexASubmission.findByPk(submissionIdInt, {
      transaction,
    });
    if (!submission) {
      throw new Error('Submission not found');
    }
    if (submission.status !== 'Completed') {
      return { tariff: null, created: false, reason: 'not_completed' };
    }

    const formDetails = parseJsonMaybe(submission.form_details) || {};
    const currency = resolveCurrency(formDetails);
    const ids = await resolveClientAndBusiness(submission, formDetails, transaction);
    const variables = await loadVariablesMap(submissionIdInt, transaction);
    const lines = buildLinesFromVariables(variables, currency);

    if (!lines.length) {
      return { tariff: null, created: false, reason: 'no_priced_lines' };
    }

    const maxVersion =
      (await SghaTariff.max('version', {
        where: {
          client_registration_id: submission.client_registration_id,
          ...(ids.airport_id ? { airport_id: ids.airport_id } : {}),
        },
        transaction,
      })) || 0;

    const effectiveFrom =
      toDateOnly(options.effective_from ?? submission.effective_from);
    const effectiveTo =
      toDateOnly(options.effective_to ?? submission.effective_to);

    // Supersede earlier Active tariffs for same client+station from this effective date.
    const priorWhere = {
      status: 'Active',
      client_registration_id: submission.client_registration_id,
    };
    if (ids.airport_id) priorWhere.airport_id = ids.airport_id;

    const prior = await SghaTariff.findAll({ where: priorWhere, transaction });
    for (const row of prior) {
      await row.update(
        {
          status: 'Superseded',
          effective_to:
            effectiveFrom &&
            (!row.effective_to || row.effective_to >= effectiveFrom)
              ? effectiveFrom
              : row.effective_to,
        },
        { transaction }
      );
    }

    const tariff = await SghaTariff.create(
      {
        submission_id: submissionIdInt,
        client_id: ids.client_id,
        client_registration_id: submission.client_registration_id,
        business_id: ids.business_id,
        airport_id: ids.airport_id,
        version: maxVersion + 1,
        currency,
        effective_from: effectiveFrom,
        effective_to: effectiveTo,
        status: 'Active',
        approved_by: options.approved_by || null,
        approved_at: new Date(),
        final_pdf_ref: options.final_pdf_ref || null,
      },
      { transaction }
    );

    await SghaTariffLine.bulkCreate(
      lines.map((line) => ({ ...line, tariff_id: tariff.tariff_id })),
      { transaction }
    );

    const full = await SghaTariff.findByPk(tariff.tariff_id, {
      include: [{ model: SghaTariffLine, as: 'lines' }],
      transaction,
    });

    return { tariff: full, created: true, reason: 'created', lineCount: lines.length };
  });
}

async function findActiveTariff({
  clientId,
  airportId,
  clientRegistrationId,
  onDate,
}) {
  const day = toDateOnly(onDate) || toDateOnly(new Date());
  const dateWindow = {
    [Op.and]: [
      {
        [Op.or]: [
          { effective_from: null },
          { effective_from: { [Op.lte]: day } },
        ],
      },
      {
        [Op.or]: [
          { effective_to: null },
          { effective_to: { [Op.gte]: day } },
        ],
      },
    ],
  };

  const include = [{ model: SghaTariffLine, as: 'lines' }];

  // Prefer exact client + airport match.
  if (clientId) {
    const exact = await SghaTariff.findOne({
      where: {
        status: 'Active',
        client_id: clientId,
        ...(airportId ? { airport_id: airportId } : {}),
        ...dateWindow,
      },
      include,
      order: [['version', 'DESC']],
    });
    if (exact) return exact;
  }

  // Same airline registration at the station (covers multi client_id rows).
  if (clientRegistrationId) {
    const byReg = await SghaTariff.findOne({
      where: {
        status: 'Active',
        client_registration_id: clientRegistrationId,
        ...(airportId ? { airport_id: airportId } : {}),
        ...dateWindow,
      },
      include,
      order: [['version', 'DESC']],
    });
    if (byReg) return byReg;
  }

  return null;
}

module.exports = {
  snapshotTariffFromSubmission,
  findActiveTariff,
  buildLinesFromVariables,
  resolveCurrency,
};
