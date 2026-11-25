function isBlank(value) {
  if (value == null) return true;
  if (value instanceof Date) return Number.isNaN(value.getTime());
  if (typeof value === 'number') return !Number.isFinite(value);
  return String(value).trim() === '';
}

function hasValidDate(value) {
  if (!value) return false;
  const d = value instanceof Date ? value : new Date(value);
  return !Number.isNaN(d.getTime());
}

function normalizeTimeSlots(slots) {
  let value = slots;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      value = null;
    }
  }
  if (!Array.isArray(value) || value.length === 0) {
    return [{ start: null, end: null }];
  }
  return value.map((slot) => ({
    start: slot?.start ?? null,
    end: slot?.end ?? null,
  }));
}

function equipmentNeedsValidation(item) {
  if (item?.is_adhoc) return true;
  const qty = Number(item?.total_no_used);
  if (Number.isFinite(qty) && qty > 0) return true;
  return normalizeTimeSlots(item?.time_slots).some((slot) => slot.start || slot.end);
}

function arrivalMissing(row) {
  if (!row) return ['Arrival details are missing'];
  const missing = [];
  if (isBlank(row.flight_no)) missing.push('Arrival — Flight No.');
  if (isBlank(row.operator)) missing.push('Arrival — Operator');
  if (isBlank(row.bay_no)) missing.push('Arrival — Bay No.');
  if (isBlank(row.gate_no)) missing.push('Arrival — Gate No.');
  if (!hasValidDate(row.ata)) missing.push('Arrival — ATA');
  if (isBlank(row.sta_ata_diff)) missing.push('Arrival — STA ATA Diff');
  return missing;
}

function departureMissing(row) {
  if (!row) return ['Departure details are missing'];
  const missing = [];
  if (isBlank(row.flight_no)) missing.push('Departure — Flight No.');
  if (isBlank(row.operator)) missing.push('Departure — Operator');
  if (isBlank(row.bay_no)) missing.push('Departure — Bay No.');
  if (isBlank(row.gate_no)) missing.push('Departure — Gate No.');
  if (!hasValidDate(row.atd)) missing.push('Departure — ATD');
  if (isBlank(row.std_atd_diff)) missing.push('Departure — STD ATD Diff');
  return missing;
}

function equipmentMissing(list = []) {
  const missing = [];
  list.forEach((item, index) => {
    if (!equipmentNeedsValidation(item)) return;
    const name = item.service_name || `Equipment #${index + 1}`;
    const qty = Number(item.total_no_used);
    const slots = normalizeTimeSlots(item.time_slots);
    const primary = slots[0] || {};
    if (!Number.isFinite(qty) || qty <= 0) missing.push(`${name} — Total Used`);
    if (!hasValidDate(primary.start)) missing.push(`${name} — Start Time`);
    if (!hasValidDate(primary.end)) missing.push(`${name} — End Time`);
    if (item.is_adhoc) {
      if (isBlank(item.service_name)) missing.push(`${name} — Service name`);
      if (item.unit_rate == null || item.unit_rate === '' || Number(item.unit_rate) < 0) {
        missing.push(`${name} — Unit rate`);
      }
    }
  });
  return missing;
}

/**
 * Hard gate for Submit (and Complete as a safety net).
 * Draft / Pending may stay incomplete.
 */
function validateFhrRequiredFields(fhr, equipmentList = []) {
  const missing = [];
  const type = fhr?.type || 'Both';
  if (type !== 'Departure') missing.push(...arrivalMissing(fhr?.arrival_details));
  if (type !== 'Arrival') missing.push(...departureMissing(fhr?.departure_details));
  missing.push(...equipmentMissing(equipmentList));
  return missing;
}

module.exports = {
  validateFhrRequiredFields,
};
