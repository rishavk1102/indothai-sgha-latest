export const EMPLOYEE_ROUTES = {
  hub: "/dashboard/Dashcommon",
  inbox: "/dashboard/agreed_services_charges",
  templates: "/dashboard/templates",
  builder: "/dashboard/createSGHATemplate",
  pdfImport: "/dashboard/pdfUploads",
  sections: "/dashboard/sectiontemplatelist",
  mainAgreement: "/dashboard/view_agreement",
  addMainAgreement: "/dashboard/addagreement",
  clients: "/dashboard/Clients",
  invites: "/dashboard/client_link_list",
  headquarters: "/dashboard/headquarters",
  airports: "/dashboard/airports",
  airlines: "/dashboard/airlines",
  aircraftTypes: "/dashboard/aircraft-types",
  categories: "/dashboard/categories",
  aircraftCategory: "/dashboard/AircraftCategory",
  flightType: "/dashboard/flight_type",
  aircraftOptions: "/dashboard/CompanyAircraft",
  servicesPrice: "/dashboard/services_price",
  additionalCharges: "/dashboard/additional_charge",
  verify: "/dashboard/verifyemployee",
  directory: "/dashboard/employeelist",
  roles: "/dashboard/roles_permissions",
};

export const EMPLOYEE_HOME = EMPLOYEE_ROUTES.hub;

/** Must match `pages.name` in the database for socket/API permission checks. */
export const PAGE_PERMISSION_NAMES = {
  peopleVerify: "PEOPLE_VERIFY",
  peopleDirectory: "PEOPLE_DIRECTORY",
  peopleEdit: "PEOPLE_EDIT",
  peopleRoles: "PEOPLE_ROLES",
  networkHeadquarters: "NETWORK_HEADQUARTERS",
  networkAirports: "NETWORK_AIRPORTS",
  networkAirlines: "NETWORK_AIRLINES",
  networkAircraftTypes: "NETWORK_AIRCRAFT_TYPES",
  networkCategories: "NETWORK_CATEGORIES",
  networkAircraftCategories: "NETWORK_AIRCRAFT_CATEGORIES",
  networkFlightTypes: "NETWORK_FLIGHT_TYPES",
  networkAircraftOptions: "NETWORK_AIRCRAFT_OPTIONS",
  clientsManage: "CLIENTS_MANAGE",
  clientsInvite: "CLIENTS_INVITE",
  templatesMainAgreement: "TEMPLATES_MAIN_AGREEMENT",
  submissionsInbox: "SUBMISSIONS_INBOX",
  templatesSections: "TEMPLATES_SECTIONS",
  templatesBuilder: "TEMPLATES_BUILDER",
  templatesPdfImport: "TEMPLATES_PDF_IMPORT",
  pricingServices: "PRICING_SERVICES",
  pricingAdditional: "PRICING_ADDITIONAL",
};

export const CLIENT_ONLY_PATHS = [
  "/dashboard/home",
  "/dashboard/agreement",
  "/dashboard/reportsummary",
  "/dashboard/ClientDashboard",
  "/dashboard/client_dashboard",
  "/dashboard/sgha_list",
];

export const EMPLOYEE_HIDDEN_MENU_PATHS = [
  ...CLIENT_ONLY_PATHS,
  "/dashboard/all_users",
  "/dashboard/sgha_form",
  "/dashboard/createSGHATemplate",
  "/dashboard/pdfUploads",
  "/dashboard/view_sgha_template",
  "/dashboard/addagreement",
  "/dashboard/add_template",
  "/test",
];

const GROUPS = {
  agreements: {
    menu_group_id: "emp-agreements",
    name: "Agreements",
    icon_url: "FiInbox",
    order_index: 20,
  },
  templates: {
    menu_group_id: "emp-templates",
    name: "Templates",
    icon_url: "FiFileText",
    order_index: 30,
  },
  clients: {
    menu_group_id: "emp-clients",
    name: "Clients",
    icon_url: "FiUsers",
    order_index: 40,
  },
  network: {
    menu_group_id: "emp-network",
    name: "Network",
    icon_url: "FiGlobe",
    order_index: 50,
  },
  pricing: {
    menu_group_id: "emp-pricing",
    name: "Pricing",
    icon_url: "FiDollarSign",
    order_index: 60,
  },
  people: {
    menu_group_id: "emp-people",
    name: "People",
    icon_url: "FiUserCheck",
    order_index: 70,
  },
  more: {
    menu_group_id: "emp-more",
    name: "More",
    icon_url: "FiGrid",
    order_index: 90,
  },
};

const CATALOG = [
  {
    key: "hub",
    path: EMPLOYEE_ROUTES.hub,
    name: "Home",
    icon_url: "FiHome",
    group: null,
    always: true,
    match: ["dashcommon", "admin dashboard", "dashboard"],
    pathExact: ["/dashboard/Dashcommon", "/dashboard"],
  },
  {
    key: "inbox",
    path: EMPLOYEE_ROUTES.inbox,
    name: "Submission inbox",
    icon_url: "FiInbox",
    group: "agreements",
    always: true,
    match: ["agreed_services", "agreed services", "submission"],
  },
  {
    key: "templates",
    path: EMPLOYEE_ROUTES.templates,
    name: "Templates",
    icon_url: "FiFileText",
    group: "templates",
    always: true,
    match: ["templates"],
    pathExact: ["/dashboard/templates"],
  },
  {
    key: "sections",
    path: EMPLOYEE_ROUTES.sections,
    name: "Section library",
    icon_url: "FiLayers",
    group: "templates",
    match: ["sectiontemplatelist", "section template"],
  },
  {
    key: "mainAgreement",
    path: EMPLOYEE_ROUTES.mainAgreement,
    name: "Main Agreement",
    icon_url: "FiFileText",
    group: "templates",
    match: ["view_agreement", "main agreement", "employment letter", "letter template"],
  },
  {
    key: "clients",
    path: EMPLOYEE_ROUTES.clients,
    name: "Clients",
    icon_url: "FiUsers",
    group: "clients",
    match: ["clients"],
    pathExact: ["/dashboard/clients", "/dashboard/Clients"],
  },
  {
    key: "invites",
    path: EMPLOYEE_ROUTES.invites,
    name: "Invite links",
    icon_url: "FiLink",
    group: "clients",
    match: ["client_link", "registration link", "invite"],
  },
  {
    key: "headquarters",
    path: EMPLOYEE_ROUTES.headquarters,
    name: "Headquarters",
    icon_url: "FiHome",
    group: "network",
    match: ["headquarters", "handling compan"],
  },
  {
    key: "airports",
    path: EMPLOYEE_ROUTES.airports,
    name: "Airports",
    icon_url: "FiMapPin",
    group: "network",
    match: ["airports"],
  },
  {
    key: "airlines",
    path: EMPLOYEE_ROUTES.airlines,
    name: "Airlines",
    icon_url: "MdFlight",
    group: "network",
    match: ["airlines"],
  },
  {
    key: "categories",
    path: EMPLOYEE_ROUTES.categories,
    name: "Categories",
    icon_url: "FiGrid",
    group: "network",
    match: ["categories"],
    pathExact: ["/dashboard/categories"],
  },
  {
    key: "aircraftCategory",
    path: EMPLOYEE_ROUTES.aircraftCategory,
    name: "Aircraft categories",
    icon_url: "MdFlight",
    group: "network",
    match: ["aircraftcategory", "aircraft category"],
  },
  {
    key: "flightType",
    path: EMPLOYEE_ROUTES.flightType,
    name: "Flight types",
    icon_url: "MdFlight",
    group: "network",
    match: ["flight_type", "flight type"],
  },
  {
    key: "aircraftOptions",
    path: EMPLOYEE_ROUTES.aircraftOptions,
    name: "Aircraft options",
    icon_url: "MdFlight",
    group: "network",
    match: ["companyaircraft", "aircraft options"],
  },
  {
    key: "servicesPrice",
    path: EMPLOYEE_ROUTES.servicesPrice,
    name: "Services price",
    icon_url: "FiDollarSign",
    group: "pricing",
    match: ["services_price", "services price"],
  },
  {
    key: "additionalCharges",
    path: EMPLOYEE_ROUTES.additionalCharges,
    name: "Additional charges",
    icon_url: "FiDollarSign",
    group: "pricing",
    match: ["additional_charge", "additional charges"],
  },
  {
    key: "verify",
    path: EMPLOYEE_ROUTES.verify,
    name: "Verify employees",
    icon_url: "FiUserCheck",
    group: "people",
    match: ["verifyemployee", "verification"],
  },
  {
    key: "directory",
    path: EMPLOYEE_ROUTES.directory,
    name: "Directory",
    icon_url: "FiUsers",
    group: "people",
    match: ["employeelist", "employee list"],
  },
  {
    key: "roles",
    path: EMPLOYEE_ROUTES.roles,
    name: "Roles and permissions",
    icon_url: "FiLock",
    group: "people",
    match: ["roles_permissions", "roles"],
  },
];

function normalizePath(path) {
  return String(path || "")
    .trim()
    .toLowerCase()
    .replace(/\/+$/, "");
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

function isHiddenFromMenu(page) {
  const path = normalizePath(page.path);
  return EMPLOYEE_HIDDEN_MENU_PATHS.some((hidden) => path === normalizePath(hidden));
}

function isClientWizardPage(page) {
  const path = normalizePath(page.path);
  const name = String(page.name || "").toLowerCase();
  if (CLIENT_ONLY_PATHS.some((p) => path === normalizePath(p))) return true;
  return (
    name.includes("add new sgha") ||
    name === "agreement" ||
    name.includes("report summary") ||
    name.includes("client dashboard")
  );
}

export function buildEmployeeMenu(fetchedPages = []) {
  const pages = Array.isArray(fetchedPages) ? fetchedPages : [];
  const usedIds = new Set();

  const resolveItem = (item, index) => {
    const match = pages.find((page) => pageMatchesItem(page, item));
    if (match?.page_id) usedIds.add(match.page_id);
    if (!match && !item.always) return null;

    return {
      page_id: match?.page_id || `emp-menu-${item.key}`,
      name: item.name,
      path: item.path,
      icon_url: match?.icon_url || item.icon_url,
      order_index: index,
      menu_group: item.group ? GROUPS[item.group] : null,
      show_in_menu: true,
    };
  };

  const menu = CATALOG.map((item, index) => resolveItem(item, index)).filter(Boolean);

  pages.forEach((page, index) => {
    if (!page || usedIds.has(page.page_id)) return;
    if (isHiddenFromMenu(page) || isClientWizardPage(page)) return;
    if (normalizePath(page.path).includes("/dashboard/aircraft-types")) return;

    menu.push({
      page_id: page.page_id || `emp-leftover-${index}`,
      name: page.name,
      path: page.path,
      icon_url: page.icon_url || "FiGrid",
      order_index: 800 + index,
      menu_group: GROUPS.more,
      show_in_menu: true,
    });
  });

  return menu.filter((page, index, list) => {
    return list.findIndex((p) => normalizePath(p.path) === normalizePath(page.path)) === index;
  });
}

export function isEmployeeRole(role) {
  return Boolean(role) && role !== "Client";
}
