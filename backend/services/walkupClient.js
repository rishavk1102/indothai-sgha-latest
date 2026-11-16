const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const Client = require('../Models/Client');
const ClientRegistration = require('../Models/Client_Registration');

function slugEmail(name, airportId) {
  const slug = String(name || 'walkup')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'walkup';
  return `walkup+${slug}-${airportId}-${Date.now()}@indothai.local`;
}

/**
 * Resolve an existing client or create a walk-up registration + station client.
 * Prefer client_id when provided; otherwise match name@airport then create.
 */
async function resolveOrCreateWalkupClient(
  { client_id, client_name, business_id, airport_id },
  transaction
) {
  if (client_id) {
    const existing = await Client.findByPk(Number(client_id), { transaction });
    if (!existing) throw new Error('Client not found');
    return { client: existing, created: false };
  }

  const name = String(client_name || '').trim();
  if (!name) throw new Error('client_id or client_name is required');
  if (!business_id || !airport_id) {
    throw new Error('business_id and airport_id are required to create a client');
  }

  const matched = await Client.findOne({
    where: {
      airport_id: Number(airport_id),
      business_id: Number(business_id),
      name: { [Op.like]: name },
    },
    transaction,
  });
  if (matched) return { client: matched, created: false };

  const email = slugEmail(name, airport_id);
  const password = await bcrypt.hash(`walkup-${Date.now()}`, 10);
  const registration = await ClientRegistration.create(
    {
      name,
      email,
      password,
      phone: '0000000000',
      address1: 'Walk-up / non-schedule',
      city: 'TBD',
      pincode: '000000',
      state: 'TBD',
      country: 'India',
      other_details: 'Auto-created from Non-Schedule FHR',
    },
    { transaction }
  );

  const client = await Client.create(
    {
      client_registration_id: registration.client_registration_id,
      business_id: Number(business_id),
      airport_id: Number(airport_id),
      name,
      email,
      phone: '0000000000',
      address1: 'Walk-up / non-schedule',
      city: 'TBD',
      pincode: '000000',
      state: 'TBD',
      country: 'India',
      other_details: 'Auto-created from Non-Schedule FHR',
      is_active: true,
    },
    { transaction }
  );

  return { client, created: true, registration };
}

module.exports = {
  resolveOrCreateWalkupClient,
};
