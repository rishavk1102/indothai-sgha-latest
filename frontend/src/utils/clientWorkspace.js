export const CLIENT_ROUTES = {
  hub: "/dashboard/ClientDashboard",
  newSgha: "/dashboard/home",
  agreement: "/dashboard/agreement",
  submissions: "/dashboard/reportsummary",
  agreements: "/dashboard/sgha_list",
};

export const CLIENT_HOME = CLIENT_ROUTES.hub;

/** Must match `pages.name` in the database for socket/API permission checks. */
export const CLIENT_PAGE_PERMISSION_NAMES = {
  hub: "CLIENT_HOME",
  newSgha: "CLIENT_NEW_SGHA",
  agreement: "CLIENT_NEW_SGHA",
  submissions: "CLIENT_SUBMISSIONS",
  agreements: "CLIENT_AGREEMENTS",
};

const DRAFT_KEY = "sgha_client_draft";
const TEMPLATE_YEAR_KEY = "sgha_agreement_template_year";
const TEMPLATE_NAME_KEY = "sgha_agreement_template_name";
const ANNEX_A_KEY = "sgha_annex_a_states";

const CLIENT_MENU_CORE = [
  {
    key: "hub",
    path: CLIENT_ROUTES.hub,
    name: "Home",
    icon_url: "FiHome",
    match: ["clientdashboard", "client dashboard"],
  },
  {
    key: "newSgha",
    path: CLIENT_ROUTES.newSgha,
    name: "New SGHA",
    icon_url: "FiFilePlus",
    match: ["add new sgha", "new sgha"],
    pathExact: ["/dashboard/home"],
  },
  {
    key: "submissions",
    path: CLIENT_ROUTES.submissions,
    name: "My Submissions",
    icon_url: "FiInbox",
    match: ["reportsummary", "report summary", "my submissions"],
  },
];

const CLIENT_MENU_AGREEMENTS = {
  key: "agreements",
  path: CLIENT_ROUTES.agreements,
  name: "Agreements",
  icon_url: "FiFileText",
  match: ["sgha_list", "sgha agreement list", "agreement list", "agreements sent"],
};

function safeParse(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function normalizePath(path) {
  return String(path || "").trim().toLowerCase().replace(/\/+$/, "");
}

function pageMatchesItem(page, item) {
  const path = normalizePath(page.path);
  const name = String(page.name || "").toLowerCase();
  const canonical = normalizePath(item.path);

  if (path === canonical) return true;
  if (item.pathExact && item.pathExact.some((p) => path === normalizePath(p))) {
    return true;
  }
  return (item.match || []).some((token) => {
    const t = String(token).toLowerCase();
    return path.includes(t) || name.includes(t);
  });
}

export function loadClientDraft() {
  try {
    const draft = safeParse(sessionStorage.getItem(DRAFT_KEY));
    if (!draft || typeof draft !== "object") return null;
    return draft;
  } catch (e) {
    return null;
  }
}

export function saveClientDraft(partial) {
  try {
    const current = loadClientDraft() || {};
    const next = {
      ...current,
      ...partial,
      updatedAt: new Date().toISOString(),
    };
    if (
      Object.prototype.hasOwnProperty.call(partial, "editingSubmissionId") &&
      (partial.editingSubmissionId == null || partial.editingSubmissionId === "")
    ) {
      delete next.editingSubmissionId;
    }
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));

    if (next.templateYear != null && next.templateYear !== "") {
      sessionStorage.setItem(TEMPLATE_YEAR_KEY, String(next.templateYear));
    }
    if (next.templateName !== undefined) {
      sessionStorage.setItem(
        TEMPLATE_NAME_KEY,
        next.templateName != null ? String(next.templateName) : "",
      );
    }
    return next;
  } catch (e) {
    return null;
  }
}

export function getEditingSubmissionId(draft = loadClientDraft()) {
  const id = draft?.editingSubmissionId;
  if (id == null || id === "") return null;
  const n = parseInt(String(id), 10);
  return Number.isNaN(n) || n <= 0 ? null : n;
}

/** Restore wizard + Annex A local state when reopening a pending submission for edit. */
export function persistClientEditSession({
  selectedCities,
  formData,
  templateYear,
  templateName,
  annexAState,
  editingSubmissionId,
  agreementIndex = 0,
}) {
  saveClientDraft({
    selectedCities,
    formData,
    templateYear,
    templateName,
    agreementIndex,
    editingSubmissionId,
  });
  if (annexAState && typeof annexAState === "object") {
    localStorage.setItem(ANNEX_A_KEY, JSON.stringify(annexAState));
    window.dispatchEvent(new Event("annexAStatesUpdated"));
  }
}

export function clearClientDraft({ clearAnnexA = false } = {}) {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
    sessionStorage.removeItem(TEMPLATE_YEAR_KEY);
    sessionStorage.removeItem(TEMPLATE_NAME_KEY);
    if (clearAnnexA) {
      localStorage.removeItem(ANNEX_A_KEY);
      window.dispatchEvent(new Event("annexAStatesUpdated"));
    }
  } catch (e) {
    // ignore storage errors
  }
}

export function hasClientDraft(draft = loadClientDraft()) {
  return Array.isArray(draft?.selectedCities) && draft.selectedCities.length > 0;
}

export function isClientWizardComplete(draft = loadClientDraft()) {
  if (!hasClientDraft(draft)) return false;
  const airport = draft.selectedCities[0];
  const data = draft.formData?.[airport.airport_id] || {};
  if (!String(data.applicable_for || "").trim()) return false;
  const aircraftCount = Number(draft.aircraftOptionsCount) || 0;
  if (
    !hasValidHomeAircraftSelection(
      draft.formData,
      draft.selectedCities,
      aircraftCount,
    )
  ) {
    return false;
  }
  if (!data.showCompanyDetail) return true;
  return !!(
    String(data.company_name || "").trim() &&
    String(data.email || "").trim() &&
    String(data.phone_number || "").trim() &&
    String(data.address_line_1 || "").trim() &&
    String(data.city || "").trim() &&
    String(data.post_code || "").trim() &&
    String(data.state || "").trim() &&
    String(data.country || "").trim() &&
    String(data.pan_card_no || "").trim() &&
    String(data.gstn || "").trim() &&
    String(data.contact_person || "").trim() &&
    String(data.rate || "").trim() &&
    data.template_year != null &&
    String(data.template_year).trim() !== ""
  );
}

export function getDraftContinuePath(draft = loadClientDraft()) {
  if (!hasClientDraft(draft)) return CLIENT_ROUTES.newSgha;
  if (isClientWizardComplete(draft)) {
    return CLIENT_ROUTES.agreement;
  }
  return CLIENT_ROUTES.newSgha;
}

export function getSelectedAirport(selectedCities) {
  if (!Array.isArray(selectedCities) || selectedCities.length === 0) return null;
  return selectedCities[0];
}

export function getSelectedAirportCity(selectedCities) {
  const airport = getSelectedAirport(selectedCities);
  return airport?.city || airport?.name || "";
}

export function getSelectedAirportLabel(selectedCities) {
  const airport = getSelectedAirport(selectedCities);
  if (!airport) return "";
  const city = airport.city || airport.name || "Selected airport";
  return airport.iata ? `${city} (${airport.iata})` : city;
}

export function getSelectedAirportOffice(selectedCities, formData = {}) {
  const airport = getSelectedAirport(selectedCities);
  const data = airport ? formData?.[airport.airport_id] || {} : {};
  const city = airport?.city || data.city || "";
  const country = airport?.country || data.country || "IN";
  if (city) return `${city}, ${country}`;
  return "";
}

export function buildFormDetailsAirportFields(selectedCities, formData = {}) {
  const airport = getSelectedAirport(selectedCities);
  if (!airport) return {};
  const data = formData?.[airport.airport_id] || {};
  return {
    airport_id: airport.airport_id || null,
    airport_name: airport.name || null,
    airport_city: airport.city || data.city || null,
    airport_iata: airport.iata || null,
    airport_country: airport.country || data.country || null,
  };
}

export const OTHER_AIRCRAFT_SELECT_VALUE = "__other__";

/** Label for aircraft category dropdown rows. */
export function formatAircraftCategoryOptionLabel(category) {
  if (!category || typeof category !== "object") return "Category";
  const name =
    category.Category_name ??
    category.category_name ??
    category.name ??
    "";
  return String(name).trim() || "Category";
}

/** Aircraft options (CompanyAircraft) dropdown / PDF label. */
export function formatCompanyAircraftOptionLabel(aircraft) {
  if (!aircraft || typeof aircraft !== "object") return "Aircraft";
  const label = [
    aircraft.Aircraft_name,
    aircraft.Aircraft_model,
    aircraft.Flight_type,
    aircraft.Company_name,
  ]
    .filter(Boolean)
    .join(" · ");
  return label || aircraft.Category_name || "Aircraft";
}

/** New SGHA picker: Aircraft options catalog. */
export function formatCatalogAircraftOptionLabel(item) {
  if (!item || typeof item !== "object") return "Aircraft";
  if (item.aircraft_id != null || item.Aircraft_name || item.Aircraft_model) {
    return formatCompanyAircraftOptionLabel(item);
  }
  return formatAircraftCategoryOptionLabel(item);
}

export function aircraftOptionRowId(aircraft, index = 0) {
  if (!aircraft || typeof aircraft !== "object") return `aircraft-${index}`;
  if (aircraft.aircraft_id != null) return String(aircraft.aircraft_id);
  if (aircraft.selected_aircraft_id != null) {
    return String(aircraft.selected_aircraft_id);
  }
  if (aircraft.Aircraft_category_id != null) {
    return String(aircraft.Aircraft_category_id);
  }
  return `aircraft-${index}`;
}

/** @deprecated Use aircraftOptionRowId. */
export function aircraftCategoryRowId(item, index = 0) {
  return aircraftOptionRowId(item, index);
}

export function getSelectedAircraftIds(data = {}) {
  if (Array.isArray(data.selected_aircraft_ids) && data.selected_aircraft_ids.length) {
    return data.selected_aircraft_ids.map((id) => String(id));
  }
  if (data.selected_aircraft_id != null && String(data.selected_aircraft_id) !== "") {
    return [String(data.selected_aircraft_id)];
  }
  return [];
}

export function isOtherAircraftSelection(data) {
  return getSelectedAircraftIds(data).includes(OTHER_AIRCRAFT_SELECT_VALUE);
}

/** Snapshot from New SGHA picker (Aircraft options row or custom Other). */
export function buildAircraftOptionsVariable(aircraft) {
  if (!aircraft || typeof aircraft !== "object") return null;
  const id =
    aircraft.aircraft_id ??
    aircraft.selected_aircraft_id ??
    aircraft.Aircraft_category_id ??
    aircraft.aircraft_category_id ??
    null;
  const customText = String(
    aircraft.custom_aircraft_text ||
      aircraft.Aircraft_name ||
      aircraft.Category_name ||
      "",
  ).trim();
  if (
    aircraft.is_other ||
    id === OTHER_AIRCRAFT_SELECT_VALUE ||
    (id == null && customText)
  ) {
    if (!customText) return null;
    return {
      selected_aircraft_id: OTHER_AIRCRAFT_SELECT_VALUE,
      is_other: true,
      custom_aircraft_text: customText,
      aircraft_id: null,
      Aircraft_category_id: null,
      Category_name: customText,
      Company_name: null,
      Aircraft_name: customText,
      Aircraft_model: null,
      Flight_type: null,
      MTOW: null,
      Limit_per_incident: null,
      Price_per_Limit_inr: null,
      Price_per_Limit_usd: null,
    };
  }
  if (id == null || id === "") return null;
  const name = aircraft.Aircraft_name ?? aircraft.Category_name ?? null;
  return {
    selected_aircraft_id: id,
    is_other: false,
    aircraft_id: aircraft.aircraft_id ?? id,
    Aircraft_category_id: aircraft.Aircraft_category_id ?? null,
    Category_name: aircraft.Category_name ?? name,
    Company_name: aircraft.Company_name ?? null,
    Aircraft_name: name,
    Aircraft_model: aircraft.Aircraft_model ?? null,
    Flight_type: aircraft.Flight_type ?? null,
    MTOW: aircraft.MTOW ?? null,
    Limit_per_incident: aircraft.Limit_per_incident ?? null,
    Price_per_Limit_inr: aircraft.Price_per_Limit_inr ?? null,
    Price_per_Limit_usd: aircraft.Price_per_Limit_usd ?? null,
  };
}

export function getHomeAircraftSelections(formData = {}, selectedCities = []) {
  const airport = getSelectedAirport(selectedCities);
  if (!airport) return [];
  const data = formData?.[airport.airport_id] || {};
  const ids = getSelectedAircraftIds(data);
  if (!ids.length) return [];

  const snapshots = Array.isArray(data.selected_aircrafts)
    ? data.selected_aircrafts
    : data.selected_aircraft
      ? [data.selected_aircraft]
      : [];

  return ids
    .map((id) => {
      if (id === OTHER_AIRCRAFT_SELECT_VALUE) {
        return buildAircraftOptionsVariable({
          selected_aircraft_id: OTHER_AIRCRAFT_SELECT_VALUE,
          is_other: true,
          custom_aircraft_text: data.custom_aircraft_text,
          Aircraft_name: data.custom_aircraft_text,
        });
      }
      const snap = snapshots.find(
        (s) =>
          String(
            s?.selected_aircraft_id ?? s?.aircraft_id ?? s?.Aircraft_category_id,
          ) === String(id),
      );
      if (snap) return buildAircraftOptionsVariable(snap);
      return buildAircraftOptionsVariable({
        aircraft_id: id,
        selected_aircraft_id: id,
        Aircraft_name: data.aircraft_name,
        Aircraft_model: data.aircraft_model,
        Company_name: data.aircraft_company_name,
        Flight_type: data.aircraft_flight_type,
        MTOW: data.aircraft_mtow,
        Limit_per_incident: data.aircraft_limit_per_incident,
      });
    })
    .filter(Boolean);
}

/** @deprecated Use getHomeAircraftSelections; still returns the list (array). */
export function getHomeAircraftSelection(formData = {}, selectedCities = []) {
  const list = getHomeAircraftSelections(formData, selectedCities);
  return list.length ? list : null;
}

export function hasValidAircraftForAirport(
  formData = {},
  airportId,
  aircraftOptionsCount = 0,
) {
  if (airportId == null) return false;
  const data = formData?.[airportId] || {};
  const ids = getSelectedAircraftIds(data);
  if (!ids.length) return false;
  if (ids.includes(OTHER_AIRCRAFT_SELECT_VALUE)) {
    const customOk = !!String(data.custom_aircraft_text || "").trim();
    if (!customOk && ids.length === 1) return false;
    if (!customOk) return ids.some((id) => id !== OTHER_AIRCRAFT_SELECT_VALUE);
  }
  return true;
}

export function hasValidHomeAircraftSelection(
  formData = {},
  selectedCities = [],
  aircraftOptionsCount = 0,
) {
  const airport = getSelectedAirport(selectedCities);
  if (!airport) return true;
  return hasValidAircraftForAirport(
    formData,
    airport.airport_id,
    aircraftOptionsCount,
  );
}

export function buildFormDetailsAircraftFields(formData = {}, selectedCities = []) {
  const list = getHomeAircraftSelections(formData, selectedCities);
  if (!list.length) return {};
  const first = list[0];
  const other = list.find((s) => s.is_other);
  return {
    selected_aircraft_ids: list.map((s) => s.selected_aircraft_id),
    selected_aircrafts: list,
    selected_aircraft_id: first.selected_aircraft_id,
    aircraft_is_other: !!other,
    custom_aircraft_text: other?.custom_aircraft_text ?? null,
    aircraft_category_id: first.Aircraft_category_id ?? null,
    aircraft_category_name: list
      .map((s) => s.Category_name || s.Aircraft_name)
      .filter(Boolean)
      .join(", "),
    aircraft_company_name: first.Company_name,
    aircraft_name: first.Aircraft_name,
    aircraft_model: first.Aircraft_model,
    aircraft_flight_type: first.Flight_type,
    aircraft_mtow: first.MTOW,
    aircraft_limit_per_incident: first.Limit_per_incident,
    aircraft_price_inr: first.Price_per_Limit_inr,
    aircraft_price_usd: first.Price_per_Limit_usd,
  };
}

export function getPrincipalOfficeLabel(clientDetails, submission) {
  if (clientDetails) {
    const parts = [clientDetails.city, clientDetails.state, clientDetails.country].filter(
      Boolean,
    );
    if (parts.length) return parts.join(", ");
  }
  const fd = submission?.form_details;
  if (fd && typeof fd === "object") {
    if (fd.airport_city) {
      return [fd.airport_city, fd.airport_country || "IN"].filter(Boolean).join(", ");
    }
    const parts = [fd.city, fd.state, fd.country].filter(Boolean);
    if (parts.length) return parts.join(", ");
  }
  return "";
}

export function buildClientMenu(fetchedPages = []) {
  const pages = Array.isArray(fetchedPages) ? fetchedPages : [];

  const resolveItem = (item, index) => {
    const match = pages.find((page) => pageMatchesItem(page, item));
    return {
      page_id: match?.page_id || `client-menu-${item.key}`,
      name: item.name,
      path: item.path,
      icon_url: match?.icon_url || item.icon_url,
      order_index: index,
      menu_group: null,
      show_in_menu: true,
    };
  };

  const menu = CLIENT_MENU_CORE.map((item, index) => resolveItem(item, index));

  const agreementsMatch = pages.find((page) =>
    pageMatchesItem(page, CLIENT_MENU_AGREEMENTS),
  );
  if (agreementsMatch) {
    menu.push(resolveItem(CLIENT_MENU_AGREEMENTS, menu.length));
  }

  return menu.filter((page, index, list) => {
    return list.findIndex((p) => p.path === page.path) === index;
  });
}
