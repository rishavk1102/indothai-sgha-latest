const sequelize = require('../config/database');
const FHR = require('../Models/FHR');
const Aircraft = require('../Models/Aircraft');
const Client = require('../Models/Client');
const ArrivalDetails = require('../Models/Arrival_Details');
const DepartureDetails = require('../Models/Departure_Details');
const AdditionalEquipment = require('../Models/Additional_Equipment');
const FhrRating = require('../NewModels/FhrRating');
const FhrChargeLine = require('../NewModels/FhrChargeLine');
const { findActiveTariff } = require('./sghaTariffSnapshot');

function toDateOnly(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function toMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function parseQty(equipment) {
  if (equipment?.total_no_used != null && equipment.total_no_used !== '') {
    const n = Number(equipment.total_no_used);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const totalTime = String(equipment?.total_time || '').trim();
  if (!totalTime) return 1;
  // "2:30" hours:minutes or plain number
  if (totalTime.includes(':')) {
    const [h, m] = totalTime.split(':').map(Number);
    if (Number.isFinite(h) && Number.isFinite(m)) {
      return Math.round((h + m / 60) * 100) / 100;
    }
  }
  const n = Number(totalTime);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function resolveRatingDate(fhr, arrival, departure) {
  if (fhr.type === 'Departure') {
    return (
      toDateOnly(departure?.atd) ||
      toDateOnly(departure?.std) ||
      toDateOnly(fhr.issue_date)
    );
  }
  // Arrival or Both → arrival date (locked rule a)
  return (
    toDateOnly(arrival?.ata) ||
    toDateOnly(arrival?.sta) ||
    toDateOnly(fhr.issue_date)
  );
}

function pickBaseLine(lines, aircraft) {
  const base = (lines || []).filter((l) => l.line_type === 'Base handling');
  if (!base.length) return null;

  const categoryId = aircraft?.Aircraft_category_id;
  const aircraftId = aircraft?.aircraft_id;
  const typeName = String(aircraft?.type_name || '')
    .trim()
    .toLowerCase();

  const byAircraft = base.find((l) => {
    const payload = l.source_payload || {};
    return (
      Number(payload.aircraft_id) === Number(aircraftId) ||
      Number(payload.selected_aircraft_id) === Number(aircraftId)
    );
  });
  if (byAircraft) return byAircraft;

  if (categoryId != null) {
    const byCategory = base.find(
      (l) => Number(l.aircraft_category_id) === Number(categoryId)
    );
    if (byCategory) return byCategory;
  }

  if (typeName) {
    const byName = base.find((l) => {
      const payload = l.source_payload || {};
      const desc = String(l.description || '')
        .trim()
        .toLowerCase();
      const payloadName = String(
        payload.Aircraft_name || payload.aircraft_name || ''
      )
        .trim()
        .toLowerCase();
      return desc === typeName || payloadName === typeName;
    });
    if (byName) return byName;
  }

  // Single base package → use it; multiple with no match → fail closed
  if (base.length === 1) return base[0];
  return null;
}

function pickAdditionalLine(lines, equipment) {
  const add = (lines || []).filter((l) => l.line_type === 'Additional');
  if (!add.length) return null;

  const name = String(equipment.service_name || '')
    .trim()
    .toLowerCase();
  const chargesId = equipment.charges_id;

  const byRef = add.find((l) => {
    const ref = String(l.source_ref || '');
    const payload = l.source_payload || {};
    if (chargesId != null && ref.includes(String(chargesId))) return true;
    if (
      payload.Additional_charges_id != null &&
      Number(payload.Additional_charges_id) === Number(chargesId)
    ) {
      return true;
    }
    return false;
  });
  if (byRef) return byRef;

  if (name) {
    const byName = add.find(
      (l) => String(l.description || '').trim().toLowerCase() === name
    );
    if (byName) return byName;
  }
  return null;
}

function lineAmount(unitRate, qty, levyRate) {
  const base = toMoney(unitRate) * toMoney(qty);
  const levy =
    levyRate != null && levyRate !== ''
      ? toMoney((base * Number(levyRate)) / 100)
      : 0;
  return {
    levy: levy || null,
    amount: toMoney(base + levy),
  };
}

/**
 * Rate a Completed FHR against the Active in-force SGHA tariff.
 * Idempotent: returns existing rating if one already exists for fhr_id.
 * Never invents prices — unmatched required base → Needs review.
 */
async function rateFhrFromTariff(fhrId, options = {}) {
  const fhrIdInt = Number(fhrId);
  if (!Number.isFinite(fhrIdInt) || fhrIdInt <= 0) {
    throw new Error('Invalid fhr_id');
  }

  return sequelize.transaction(async (transaction) => {
    const existing = await FhrRating.findOne({
      where: { fhr_id: fhrIdInt },
      include: [{ model: FhrChargeLine, as: 'lines' }],
      transaction,
    });
    if (existing && !options.force) {
      return { rating: existing, created: false, reason: 'already_exists' };
    }
    if (existing && options.force) {
      await FhrChargeLine.destroy({
        where: { rating_id: existing.rating_id },
        transaction,
      });
      await existing.destroy({ transaction });
    }

    // Live FHR table has no category_id; association still registers it on the model.
    const fhr = await FHR.findByPk(fhrIdInt, {
      attributes: {
        exclude: ['category_id'],
      },
      include: [
        { model: Aircraft, as: 'aircraft' },
        { model: ArrivalDetails, as: 'arrival_details' },
        { model: DepartureDetails, as: 'departure_details' },
        { model: AdditionalEquipment, as: 'additional_equipments' },
      ],
      transaction,
    });
    if (!fhr) throw new Error('FHR not found');
    if (fhr.status !== 'Completed' && !options.allowNonCompleted) {
      return {
        rating: null,
        created: false,
        reason: 'not_completed',
      };
    }

    const ratingDate =
      toDateOnly(options.ratingDate) ||
      resolveRatingDate(fhr, fhr.arrival_details, fhr.departure_details);

    const client = await Client.findByPk(fhr.client_id, {
      attributes: ['client_id', 'client_registration_id'],
      transaction,
    });

    const tariff = await findActiveTariff({
      clientId: fhr.client_id,
      airportId: fhr.airport_id,
      clientRegistrationId: client?.client_registration_id || null,
      onDate: ratingDate,
    });

    if (!tariff) {
      const rating = await FhrRating.create(
        {
          fhr_id: fhrIdInt,
          tariff_id: null,
          rating_date: ratingDate,
          status: 'Needs review',
          reason: 'No Active in-force tariff for client/airport/date',
          currency: null,
          rated_by: options.rated_by || null,
          rated_at: new Date(),
        },
        { transaction }
      );
      return {
        rating,
        created: true,
        reason: 'no_tariff',
        lineCount: 0,
      };
    }

    const tariffLines = tariff.lines || [];
    const chargeLines = [];
    const baseLine = pickBaseLine(tariffLines, fhr.aircraft);
    if (!baseLine) {
      const rating = await FhrRating.create(
        {
          fhr_id: fhrIdInt,
          tariff_id: tariff.tariff_id,
          rating_date: ratingDate,
          status: 'Needs review',
          reason: 'No matching Base handling tariff line for this aircraft',
          currency: tariff.currency,
          rated_by: options.rated_by || null,
          rated_at: new Date(),
        },
        { transaction }
      );
      return {
        rating,
        created: true,
        reason: 'no_base_line',
        lineCount: 0,
      };
    }

    const baseMoney = lineAmount(baseLine.rate, 1, baseLine.levy_rate);
    chargeLines.push({
      fhr_id: fhrIdInt,
      tariff_id: tariff.tariff_id,
      tariff_line_id: baseLine.tariff_line_id,
      description: baseLine.description,
      line_type: 'Base handling',
      qty: 1,
      unit: baseLine.unit || 'per flight',
      unit_rate: toMoney(baseLine.rate),
      levy: baseMoney.levy,
      tax: null,
      amount: baseMoney.amount,
      source: 'Tariff',
    });

    const unmatchedExtra = [];
    const equipment = Array.isArray(fhr.additional_equipments)
      ? fhr.additional_equipments
      : [];
    for (const eq of equipment) {
      const addLine = pickAdditionalLine(tariffLines, eq);
      if (!addLine) {
        unmatchedExtra.push(eq.service_name || `charges_id=${eq.charges_id}`);
        continue;
      }
      const qty = parseQty(eq);
      const money = lineAmount(addLine.rate, qty, addLine.levy_rate);
      chargeLines.push({
        fhr_id: fhrIdInt,
        tariff_id: tariff.tariff_id,
        tariff_line_id: addLine.tariff_line_id,
        description: addLine.description,
        line_type: 'Additional',
        qty,
        unit: addLine.unit || eq.unit || null,
        unit_rate: toMoney(addLine.rate),
        levy: money.levy,
        tax: null,
        amount: money.amount,
        source: 'Tariff',
      });
    }

    // Extra equipment without a tariff match → Needs review (do not invent rates).
    // shortcut: base-only FHRs still rate; unmatched extras block the whole rating until mapped.
    if (unmatchedExtra.length) {
      const rating = await FhrRating.create(
        {
          fhr_id: fhrIdInt,
          tariff_id: tariff.tariff_id,
          rating_date: ratingDate,
          status: 'Needs review',
          reason: `Unmatched additional equipment: ${unmatchedExtra.join(', ')}`,
          currency: tariff.currency,
          rated_by: options.rated_by || null,
          rated_at: new Date(),
        },
        { transaction }
      );
      return {
        rating,
        created: true,
        reason: 'unmatched_additional',
        lineCount: 0,
        unmatchedExtra,
      };
    }

    const rating = await FhrRating.create(
      {
        fhr_id: fhrIdInt,
        tariff_id: tariff.tariff_id,
        rating_date: ratingDate,
        status: 'Rated',
        reason: null,
        currency: tariff.currency,
        rated_by: options.rated_by || null,
        rated_at: new Date(),
      },
      { transaction }
    );

    await FhrChargeLine.bulkCreate(
      chargeLines.map((line) => ({ ...line, rating_id: rating.rating_id })),
      { transaction }
    );

    const full = await FhrRating.findByPk(rating.rating_id, {
      include: [{ model: FhrChargeLine, as: 'lines' }],
      transaction,
    });

    return {
      rating: full,
      created: true,
      reason: 'rated',
      lineCount: chargeLines.length,
    };
  });
}

async function getFhrRating(fhrId) {
  return FhrRating.findOne({
    where: { fhr_id: Number(fhrId) },
    include: [
      {
        model: FhrChargeLine,
        as: 'lines',
        separate: true,
        order: [['charge_line_id', 'ASC']],
      },
    ],
  });
}

module.exports = {
  rateFhrFromTariff,
  getFhrRating,
  resolveRatingDate,
  pickBaseLine,
};
