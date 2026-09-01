// utils/checkSocketPermission.js
const Permission = require('../Models/Permission');
const Page = require('../Models/Page');

/** Legacy UI names → current `pages.name` values (DB preset renames). */
const PAGE_NAME_ALIASES = {
  Verification: 'PEOPLE_VERIFY',
  EmployeeList: 'PEOPLE_DIRECTORY',
  EmployeeEdit: 'PEOPLE_EDIT',
  'Roles & Permissions': 'PEOPLE_ROLES',
  Headquarters: 'NETWORK_HEADQUARTERS',
  Airports: 'NETWORK_AIRPORTS',
  Airlines: 'NETWORK_AIRLINES',
  AircraftTypes: 'NETWORK_AIRCRAFT_TYPES',
  Categories: 'NETWORK_CATEGORIES',
  AircraftCategory: 'NETWORK_AIRCRAFT_CATEGORIES',
  FlightType: 'NETWORK_FLIGHT_TYPES',
  'Aircraft Options': 'NETWORK_AIRCRAFT_OPTIONS',
  Clients: 'CLIENTS_MANAGE',
  'Client Registratiion Link': 'CLIENTS_INVITE',
  'Main Agreement Template': 'TEMPLATES_MAIN_AGREEMENT',
  'Section Template': 'TEMPLATES_SECTIONS',
  'Services Price': 'PRICING_SERVICES',
  'Additional Charges': 'PRICING_ADDITIONAL',
  'Add New SGHA': 'CLIENT_NEW_SGHA',
  'SGHA Agreement list': 'CLIENT_AGREEMENTS',
  'Report Summary': 'CLIENT_SUBMISSIONS',
  'Client Dashboard': 'CLIENT_HOME',
  CLIENT_HUB: 'CLIENT_HOME',
};

async function findPageByName(pageName) {
  const direct = await Page.findOne({ where: { name: pageName } });
  if (direct) return direct;

  const alias = PAGE_NAME_ALIASES[pageName];
  if (alias) {
    return Page.findOne({ where: { name: alias } });
  }

  return null;
}

const checkSocketPermission = async (role_id, action, pageName) => {
  try {
    if (!role_id) {
      return { allowed: false, error: 'Missing role_id in request data' };
    }

    const page = await findPageByName(pageName);
    if (!page) {
      return { allowed: false, error: `Page "${pageName}" not found` };
    }

    const permission = await Permission.findOne({
      where: {
        role_id,
        page_id: page.page_id
      }
    });

    if (!permission || !permission[`can_${action}`]) {
      return { allowed: false, error: `Permission denied for action: ${action}` };
    }

    return { allowed: true };
  } catch (err) {
    return { allowed: false, error: err.message };
  }
};

module.exports = checkSocketPermission;
