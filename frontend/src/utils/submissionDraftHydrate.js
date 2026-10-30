import { OTHER_AIRCRAFT_SELECT_VALUE } from "./clientWorkspace";

/** Tab an agreement belongs on in My Submissions. Each row maps to exactly one tab. */
export function getClientSubmissionTab(submission) {
  if (!submission) return "Pending";
  const clientStatus = submission.client_status || null;
  const status = submission.status || "Pending";
  if (clientStatus === "Approved") return "Approved";
  if (clientStatus === "Rejected") return "Rejected";
  if (status === "Completed") return "Approved";
  if (
    status === "Cancelled" ||
    status === "Suspended" ||
    status === "Expired"
  ) {
    return "Rejected";
  }
  if (status === "In Progress") return "In Progress";
  return "Pending";
}

/** Client may amend before employee picks up the submission. */
export function canClientEditSubmission(submission) {
  if (!submission) return false;
  return getClientSubmissionTab(submission) === "Pending";
}

/** Client sees aircraft prices only after IndoThai starts processing. */
export function shouldShowClientPrices(submission) {
  const tab = getClientSubmissionTab(submission);
  return tab === "In Progress" || tab === "Approved" || tab === "Rejected";
}

function isSubItemClauseKey(clauseKey) {
  return /^\d+\.\d+\.\d+\.[a-zA-Z0-9.]+$/.test(String(clauseKey));
}

function parentClauseKeyFromSubItem(subItemKey) {
  const parts = String(subItemKey).split(".");
  if (parts.length < 4) return null;
  return parts.slice(0, 3).join(".");
}

/** Inverse of Annex B nested checkbox payload → flat Annex A localStorage shape. */
export function nestedCheckboxSelectionsToAnnexAState(nested) {
  if (!nested || typeof nested !== "object") {
    return { serviceTypes: { comp: false, ramp: false, cargo: false } };
  }

  const flat = {};
  if (nested.serviceTypes && typeof nested.serviceTypes === "object") {
    flat.serviceTypes = { ...nested.serviceTypes };
  } else {
    flat.serviceTypes = { comp: false, ramp: false, cargo: false };
  }

  Object.keys(nested).forEach((topKey) => {
    if (topKey === "serviceTypes") return;
    const topVal = nested[topKey];
    if (!topVal || typeof topVal !== "object") return;

    Object.keys(topVal).forEach((sectionKey) => {
      const sectionData = topVal[sectionKey];
      if (!sectionData || typeof sectionData !== "object") return;

      if (!flat[sectionKey]) flat[sectionKey] = {};

      Object.keys(sectionData).forEach((clauseKey) => {
        if (sectionData[clauseKey] !== true) return;

        if (isSubItemClauseKey(clauseKey)) {
          const parentKey = parentClauseKeyFromSubItem(clauseKey);
          if (!parentKey) return;
          if (!flat[sectionKey][parentKey]) {
            flat[sectionKey][parentKey] = { checked: true, subItems: {} };
          } else if (typeof flat[sectionKey][parentKey] === "object") {
            flat[sectionKey][parentKey].checked = true;
            if (!flat[sectionKey][parentKey].subItems) {
              flat[sectionKey][parentKey].subItems = {};
            }
          }
          flat[sectionKey][parentKey].subItems[clauseKey] = { checked: true };
        } else {
          flat[sectionKey][clauseKey] = {
            ...(flat[sectionKey][clauseKey] || {}),
            checked: true,
          };
        }
      });
    });
  });

  return flat;
}

export function formDetailsToWizardDraft(formDetails, agreementYear) {
  const fd = formDetails && typeof formDetails === "object" ? formDetails : {};
  const airportId = fd.airport_id ?? "submission-airport";

  const selectedCities = [
    {
      airport_id: airportId,
      name: fd.airport_name || fd.airport_city || "Airport",
      city: fd.airport_city || fd.airport_name || "",
      iata: fd.airport_iata || "",
      country: fd.airport_country || fd.country || "",
    },
  ];

  const ingredient = fd.ramp ? "Ramp" : fd.comp ? "Comp" : "";
  const showServicesFor = !!(fd.schedule || fd.nonschedule);
  const showCompanyDetail = showServicesFor || !!ingredient || !!fd.cargo;

  const airportData = {
    schedule: !!fd.schedule,
    nonschedule: !!fd.nonschedule,
    ingredient,
    isCargoChecked: !!fd.cargo,
    showServicesFor,
    showCompanyDetail,
    applicable_for: fd.applicable_for || "",
    company_name: fd.company_name || "",
    email: fd.email || "",
    phone_number: fd.phone_number || "",
    address_line_1: fd.address_line_1 || "",
    address_line_2: fd.address_line_2 || "",
    city: fd.city || "",
    post_code: fd.post_code || "",
    state: fd.state || "",
    country: fd.country || "",
    pan_card_no: fd.pan_card_no || "",
    gstn: fd.gstn || "",
    contact_person: fd.contact_person || "",
    rate: fd.rate || "",
    template_year:
      fd.template_year != null ? String(fd.template_year) : String(agreementYear || ""),
    template_name: fd.template_name ?? null,
    value: fd.other_details || "",
  };

  if (Array.isArray(fd.selected_aircraft_ids) && fd.selected_aircraft_ids.length) {
    airportData.selected_aircraft_ids = fd.selected_aircraft_ids.map(String);
    airportData.selected_aircraft_id = airportData.selected_aircraft_ids[0];
    airportData.selected_aircrafts = Array.isArray(fd.selected_aircrafts)
      ? fd.selected_aircrafts
      : [];
    airportData.selected_aircraft = airportData.selected_aircrafts[0] || null;
    airportData.custom_aircraft_text = fd.custom_aircraft_text || "";
  } else if (fd.aircraft_is_other || fd.selected_aircraft_id === OTHER_AIRCRAFT_SELECT_VALUE) {
    airportData.selected_aircraft_id = OTHER_AIRCRAFT_SELECT_VALUE;
    airportData.selected_aircraft_ids = [OTHER_AIRCRAFT_SELECT_VALUE];
    airportData.custom_aircraft_text =
      fd.custom_aircraft_text || fd.aircraft_name || "";
    airportData.selected_aircraft = null;
    airportData.selected_aircrafts = [];
  } else if (fd.selected_aircraft_id != null && fd.selected_aircraft_id !== "") {
    airportData.selected_aircraft_id = fd.selected_aircraft_id;
    airportData.selected_aircraft_ids = [String(fd.selected_aircraft_id)];
    airportData.selected_aircraft = {
      Aircraft_category_id:
        fd.aircraft_category_id ?? fd.selected_aircraft_id,
      Category_name: fd.aircraft_category_name || fd.aircraft_name,
      aircraft_id: fd.selected_aircraft_id,
      Company_name: fd.aircraft_company_name,
      Aircraft_name: fd.aircraft_name,
      Aircraft_model: fd.aircraft_model,
      Flight_type: fd.aircraft_flight_type,
      MTOW: fd.aircraft_mtow,
      Limit_per_incident: fd.aircraft_limit_per_incident,
    };
    airportData.selected_aircrafts = [airportData.selected_aircraft];
    airportData.custom_aircraft_text = "";
  }

  const templateYear =
    parseInt(String(fd.template_year || agreementYear || ""), 10) ||
    agreementYear ||
    2025;
  const templateName =
    fd.template_name != null && String(fd.template_name).trim() !== ""
      ? String(fd.template_name).trim()
      : null;

  return {
    selectedCities,
    formData: { [airportId]: airportData },
    templateYear,
    templateName,
    annexAState: null,
  };
}

export function mergeAircraftVariableIntoDraft(draft, variables) {
  if (!draft?.formData || !variables?.aircraft_options) return draft;
  const airportId = draft.selectedCities?.[0]?.airport_id;
  if (airportId == null) return draft;

  let aircraftVar = variables.aircraft_options;
  if (typeof aircraftVar === "string") {
    try {
      aircraftVar = JSON.parse(aircraftVar);
    } catch {
      return draft;
    }
  }
  if (!aircraftVar || typeof aircraftVar !== "object") return draft;

  const list = Array.isArray(aircraftVar) ? aircraftVar : [aircraftVar];
  const row = { ...draft.formData[airportId] };
  row.selected_aircraft_ids = list
    .map((item) => String(item.selected_aircraft_id ?? item.Aircraft_category_id ?? item.aircraft_id ?? ""))
    .filter(Boolean);
  row.selected_aircraft_id = row.selected_aircraft_ids[0] || "";
  row.selected_aircrafts = list;
  row.selected_aircraft = list.find((item) => !item.is_other) || null;
  const other = list.find((item) => item.is_other);
  row.custom_aircraft_text = other
    ? other.custom_aircraft_text || other.Aircraft_name || ""
    : "";

  return {
    ...draft,
    formData: { ...draft.formData, [airportId]: row },
  };
}

export function buildDraftFromSubmissionRecord(submission) {
  const checkbox =
    submission.checkbox_selections && typeof submission.checkbox_selections === "object"
      ? submission.checkbox_selections
      : {};
  const wizard = formDetailsToWizardDraft(
    submission.form_details,
    submission.agreement_year,
  );
  wizard.annexAState = nestedCheckboxSelectionsToAnnexAState(checkbox);
  return wizard;
}
