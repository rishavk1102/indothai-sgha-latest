const sequelize = require("../../config/database");
const { Op } = require("sequelize"); // ✅ Import Op
const Business = require("../../Models/Business");
const Airport = require("../../Models/Airport");
const Client = require("../../Models/Client");
const Airline = require("../../Models/Airlines");
const Aircraft = require("../../Models/Aircraft");
const AircraftCategory = require('../../Models/AircraftCategory');
const CompanyAircraft = require('../../NewModels/CompanyAircraft');
const checkSocketPermission = require("../../middleware/checkSocketPermission");


module.exports = (io, socket) => {
  socket.on('view-aircrafts', async ({
    role_id,
    page_name,
    sortOrder = "ASC",
    limit = 15,
    searchTerm = "",
    airline_id
  }) => {
    const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
    if (!allowed) {
      return socket.emit('view-aircrafts-error', { message: error });
    }

    try {
      const whereClause = {};
      if (searchTerm) {
        whereClause[Op.or] = [
          { type_name: { [Op.like]: `%${searchTerm}%` } },
          { currency: { [Op.like]: `%${searchTerm}%` } },
        ];
      }

      if (airline_id) {
        whereClause.airline_id = airline_id;
      }

      const aircrafts = await Aircraft.findAll({
        where: whereClause,
        include: [
          {
            model: Airline,
            as: 'airline',
            attributes: ['airline_id', 'airline_name', 'iata']
          },
          {
            model: AircraftCategory,
            as: 'category',
            attributes: ['Aircraft_category_id', 'Category_name']
          }
        ],
        order: [['aircraft_id', sortOrder]],
        limit: Number(limit)
      });

      if (!aircrafts || aircrafts.length === 0) {
        return socket.emit('view-aircrafts-error', {
          message: 'No aircrafts found.',
        });
      }

      socket.emit('view-aircrafts-success', aircrafts);
    } catch (err) {
      console.error('❌ Failed to fetch aircrafts:', err);
      socket.emit('view-aircrafts-error', {
        message: 'Failed to fetch aircrafts.',
        error: err.message,
      });
    }
  });


  socket.on('fetch-aircrafts', async ({ role_id, page_name, airline_id }) => {
    const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
    if (!allowed) {
      return socket.emit('fetch-aircrafts-error', { message: error });
    }

    try {
      const whereClause = {};
      if (airline_id) {
        whereClause.airline_id = airline_id;
      }

      const aircrafts = await Aircraft.findAll({
        where: whereClause,
        order: [['aircraft_id', 'ASC']], // ✅ 'ASC' should be in quotes
      });

      if (!aircrafts || aircrafts.length === 0) {
        return socket.emit('fetch-aircrafts-error', {
          message: 'No aircrafts found.',
        });
      }

      socket.emit('fetch-aircrafts-success', aircrafts);
    } catch (err) {
      console.error('❌ Failed to fetch aircrafts:', err);
      socket.emit('fetch-aircrafts-error', {
        message: 'Failed to fetch aircrafts.',
        error: err.message,
      });
    }
  });



  socket.on('view-company-aircrafts', async ({
    role_id,
    page_name,
    sortOrder = "ASC",
    limit = 15,
    searchTerm = "",
    business_id,
    airport_id
  }) => {
    // Check if user is a client - clients can view aircraft options without page permission
    const Role = require('../../Models/Role');
    let isClient = false;
    try {
      const role = await Role.findByPk(role_id);
      if (role && role.role_name === 'Client') {
        isClient = true;
      }
    } catch (err) {
      console.error('Error checking role:', err);
    }

    // Only check permission if not a client
    if (!isClient) {
      const { allowed, error } = await checkSocketPermission(role_id, 'view', page_name);
      if (!allowed) {
        return socket.emit('view-company-aircrafts-error', { message: error });
      }
    }

    try {
      const whereClause = {};

      // 🔍 Search by multiple fields
      if (searchTerm) {
        whereClause[Op.or] = [
          { Aircraft_name: { [Op.like]: `%${searchTerm}%` } },
          { Aircraft_model: { [Op.like]: `%${searchTerm}%` } },
          { Company_name: { [Op.like]: `%${searchTerm}%` } },
          { Flight_type: { [Op.like]: `%${searchTerm}%` } }
        ];
      }

      // 🔗 Filter by business
      if (business_id) {
        whereClause.business_id = business_id;
      }

      // 🔗 Filter by airport
      if (airport_id) {
        whereClause.airport_id = airport_id;
      }

      console.log('[Backend] Fetching company aircrafts with whereClause:', JSON.stringify(whereClause, null, 2));
      console.log('[Backend] Request params:', { role_id, page_name, sortOrder, limit, searchTerm, business_id, airport_id });

      const aircrafts = await CompanyAircraft.findAll({
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        include: [
          {
            model: Business,
            as: 'business',
            
          },
          {
            model: Airport,
            as: 'airport',
            
          }
        ],
        order: [['aircraft_id', sortOrder]],
        limit: Number(limit)
      });

      console.log('[Backend] Found aircrafts:', aircrafts?.length || 0);

      // Return empty array instead of error when no aircrafts found
      if (!aircrafts || aircrafts.length === 0) {
        console.log('[Backend] No aircrafts found, returning empty array');
        return socket.emit('view-company-aircrafts-success', []);
      }

      console.log('[Backend] Returning', aircrafts.length, 'aircrafts');
      socket.emit('view-company-aircrafts-success', aircrafts);
    } catch (err) {
      console.error('❌ Failed to fetch company aircrafts:', err);
      socket.emit('view-company-aircrafts-error', {
        message: 'Failed to fetch company aircrafts.',
        error: err.message
      });
    }
  });





};