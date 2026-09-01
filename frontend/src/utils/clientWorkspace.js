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
