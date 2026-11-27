import React from "react";

/** Red asterisk used on FHR required field labels. */
export function RequiredMark() {
  return (
    <sup className="text-danger" style={{ fontSize: "14px" }}>
      *
    </sup>
  );
}

export function isBlank(value) {
  if (value == null) return true;
  if (value instanceof Date) return Number.isNaN(value.getTime());
  if (typeof value === "number") return !Number.isFinite(value);
  return String(value).trim() === "";
}

export function hasValidDate(value) {
  if (!value) return false;
  const d = value instanceof Date ? value : new Date(value);
  return !Number.isNaN(d.getTime());
}

/**
 * @param {Array<{key: string, label: string, ok: boolean}>} checks
 * @param {string} [action]
 * @returns {{ ok: true, missing: string[], fieldErrors: Record<string, boolean> } | { ok: false, missing: string[], message: string, fieldErrors: Record<string, boolean> }}
 */
export function collectRequiredErrors(checks, action = "saving") {
  const missing = [];
  const fieldErrors = {};
  for (const check of checks) {
    if (!check.ok) {
      missing.push(check.label);
      fieldErrors[check.key] = true;
    }
  }
  if (!missing.length) return { ok: true, missing: [], fieldErrors: {} };
  return {
    ok: false,
    missing,
    fieldErrors,
    message: `Please fill in all required fields before ${action}: ${missing.join(", ")}.`,
  };
}

export function arrivalRequiredChecks(data = {}) {
  return [
    { key: "flight_no", label: "Flight No.", ok: !isBlank(data.flight_no) },
    { key: "operator", label: "Operator", ok: !isBlank(data.operator) },
    { key: "bay_no", label: "Bay No.", ok: !isBlank(data.bay_no) },
    { key: "gate_no", label: "Gate No.", ok: !isBlank(data.gate_no) },
    { key: "ata", label: "ATA", ok: hasValidDate(data.ata) },
    {
      key: "sta_ata_diff",
      label: "STA ATA Diff",
      ok: data.sta_ata_diff != null && String(data.sta_ata_diff).trim() !== "",
    },
  ];
}

export function departureRequiredChecks(data = {}) {
  return [
    { key: "flight_no", label: "Flight No.", ok: !isBlank(data.flight_no) },
    { key: "operator", label: "Operator", ok: !isBlank(data.operator) },
    { key: "bay_no", label: "Bay No.", ok: !isBlank(data.bay_no) },
    { key: "gate_no", label: "Gate No.", ok: !isBlank(data.gate_no) },
    { key: "atd", label: "ATD", ok: hasValidDate(data.atd) },
    {
      key: "std_atd_diff",
      label: "STD ATD Diff",
      ok: data.std_atd_diff != null && String(data.std_atd_diff).trim() !== "",
    },
  ];
}

export function equipmentRowNeedsUsageValidation(item) {
  if (item?.is_adhoc) return true;
  const qty = Number(item?.total_no_used);
  if (Number.isFinite(qty) && qty > 0) return true;
  const slots = Array.isArray(item?.time_slots) ? item.time_slots : [];
  return slots.some((slot) => slot?.start || slot?.end);
}

export function equipmentRequiredChecks(equipmentList = []) {
  const checks = [];
  (equipmentList || []).forEach((item, index) => {
    if (!equipmentRowNeedsUsageValidation(item)) return;
    const name = item.service_name || `Equipment #${index + 1}`;
    const qty = Number(item.total_no_used);
    const slots = Array.isArray(item.time_slots) ? item.time_slots : [];
    const primary = slots[0] || {};
    checks.push({
      key: `${index}_total_no_used`,
      label: `${name} — Total Used`,
      ok: Number.isFinite(qty) && qty > 0,
    });
    checks.push({
      key: `${index}_start`,
      label: `${name} — Start Time`,
      ok: hasValidDate(primary.start),
    });
    checks.push({
      key: `${index}_end`,
      label: `${name} — End Time`,
      ok: hasValidDate(primary.end),
    });
    if (item.is_adhoc) {
      checks.push({
        key: `${index}_service_name`,
        label: `${name} — Service name`,
        ok: !isBlank(item.service_name),
      });
    }
  });
  return checks;
}

export function needsArrivalSection(fhrType) {
  return fhrType !== "Departure";
}

export function needsDepartureSection(fhrType) {
  return fhrType !== "Arrival";
}

/** Required fields are enforced on Submit / Complete only, not Draft or Pending saves. */
export function shouldEnforceRequired(action) {
  return action === "submitting" || action === "completing";
}
