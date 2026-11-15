// Seed a few demo Non-Schedule FHRs for UI testing.
// Uses existing masters (Business/Airport/Client/Airline/Aircraft).
// Run: node seed_fhr_demo_data.js

require('dotenv').config();
const sequelize = require('./config/database');
const FHR = require('./Models/FHR');
const FHR_Listing = require('./Models/FHR_Listing');
const BasicDetails = require('./Models/Basic_Details');
const ArrivalDetails = require('./Models/Arrival_Details');
const DepartureDetails = require('./Models/Departure_Details');
const ManPowerDetails = require('./Models/Man_Power_Details');
const CargoDetails = require('./Models/Cargo_Details');
const Business = require('./Models/Business');
const Airport = require('./Models/Airport');
const Client = require('./Models/Client');
const Airline = require('./Models/Airlines');
const Aircraft = require('./Models/Aircraft');

function daysFromNow(offset) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}

async function seedOne({
  business,
  airport,
  client,
  airline,
  aircraft,
  status,
  dateOffset,
  arrivalFlightNo,
  departureFlightNo,
  fromIata,
  toIata,
  remarks,
}) {
  const flightDate = daysFromNow(dateOffset);
  const hasArrival = Boolean(arrivalFlightNo);
  const hasDeparture = Boolean(departureFlightNo);
  const type = hasArrival && hasDeparture ? 'Both' : hasArrival ? 'Arrival' : 'Departure';

  // Detail tables only allow Draft/Pending/Submitted/Cancelled (not Completed).
  const detailStatus = status === 'Completed' ? 'Submitted' : status;

  const fhr = await FHR.create({
    business_id: business.business_id,
    client_id: client.client_id,
    airport_id: airport.airport_id,
    airline_id: airline.airline_id,
    aircraft_id: aircraft.aircraft_id,
    type,
    Fhr_type: 'Non-Schedule',
    remarks,
    status,
    issue_date: new Date(),
  });

  await BasicDetails.create({
    fhr_id: fhr.fhr_id,
    ice_no: null,
    epcg_no: null,
    country_of_origin_of_service: 'India',
    place_of_delivery_of_service: airport.name,
    status: detailStatus,
  });

  if (hasArrival) {
    await FHR_Listing.create({
      airport_id: airport.airport_id,
      fhr_id: fhr.fhr_id,
      airline_name: airline.airline_name,
      aircraft_type: aircraft.type_name,
      client_name: client.name,
      type: 'Arrival',
      Fhr_type: 'Non-Schedule',
      flight_no: arrivalFlightNo,
      station: fromIata || airport.iata || 'XXX',
      st: '10:30:00',
      date_of_flight: flightDate,
      status,
    });
    await ArrivalDetails.create({
      fhr_id: fhr.fhr_id,
      flight_no: arrivalFlightNo,
      flight_type: aircraft.type_name,
      airport: airport.name,
      status: detailStatus,
    });
  }

  if (hasDeparture) {
    await FHR_Listing.create({
      airport_id: airport.airport_id,
      fhr_id: fhr.fhr_id,
      airline_name: airline.airline_name,
      aircraft_type: aircraft.type_name,
      client_name: client.name,
      type: 'Departure',
      Fhr_type: 'Non-Schedule',
      flight_no: departureFlightNo,
      station: toIata || 'DEL',
      st: '14:45:00',
      date_of_flight: flightDate,
      status,
    });
    await DepartureDetails.create({
      fhr_id: fhr.fhr_id,
      flight_no: departureFlightNo,
      flight_type: aircraft.type_name,
      airport: airport.name,
      status: detailStatus,
    });
  }

  await ManPowerDetails.create({ fhr_id: fhr.fhr_id, status: detailStatus });
  await CargoDetails.create({ fhr_id: fhr.fhr_id, status: detailStatus });

  return fhr.fhr_id;
}

async function main() {
  await sequelize.authenticate();

  const business = await Business.findByPk(1);
  const airport = await Airport.findByPk(1);
  const client = await Client.findByPk(1);
  const airline = await Airline.findByPk(1);
  const aircraft = await Aircraft.findByPk(2);

  if (!business || !airport || !client || !airline || !aircraft) {
    throw new Error('Missing required masters (need Business 1, Airport 1, Client 1, Airline 1, Aircraft 2)');
  }

  // Clean previous/partial demo rows so re-runs are safe.
  const demoFlights = ['DEMO101', 'DEMO202', 'DEMO303', 'DEMO404A', 'DEMO404D'];
  const oldListings = await FHR_Listing.findAll({
    where: { flight_no: demoFlights },
    attributes: ['fhr_id'],
  });
  const oldIds = [...new Set(oldListings.map((r) => r.fhr_id))];
  // Also remove orphan FHRs from a failed earlier run (no listings / demo remarks).
  const orphanDemos = await FHR.findAll({
    where: { remarks: ['Demo draft arrival FHR', 'Demo pending departure FHR', 'Demo submitted arrival FHR', 'Demo completed both arrival + departure'] },
    attributes: ['fhr_id'],
  });
  orphanDemos.forEach((r) => oldIds.push(r.fhr_id));
  const uniqueOldIds = [...new Set(oldIds)];
  if (uniqueOldIds.length) {
    await FHR.destroy({ where: { fhr_id: uniqueOldIds } });
    console.log('Removed previous demo FHR ids:', uniqueOldIds.join(', '));
  }

  const created = [];
  created.push(
    await seedOne({
      business,
      airport,
      client,
      airline,
      aircraft,
      status: 'Draft',
      dateOffset: 0,
      arrivalFlightNo: 'DEMO101',
      departureFlightNo: null,
      fromIata: 'KUL',
      toIata: null,
      remarks: 'Demo draft arrival FHR',
    })
  );
  created.push(
    await seedOne({
      business,
      airport,
      client,
      airline,
      aircraft,
      status: 'Pending',
      dateOffset: 1,
      arrivalFlightNo: null,
      departureFlightNo: 'DEMO202',
      fromIata: null,
      toIata: 'SIN',
      remarks: 'Demo pending departure FHR',
    })
  );
  created.push(
    await seedOne({
      business,
      airport,
      client,
      airline,
      aircraft,
      status: 'Submitted',
      dateOffset: -1,
      arrivalFlightNo: 'DEMO303',
      departureFlightNo: null,
      fromIata: 'CGK',
      toIata: null,
      remarks: 'Demo submitted arrival FHR',
    })
  );
  created.push(
    await seedOne({
      business,
      airport,
      client,
      airline,
      aircraft,
      status: 'Completed',
      dateOffset: -2,
      arrivalFlightNo: 'DEMO404A',
      departureFlightNo: 'DEMO404D',
      fromIata: 'KUL',
      toIata: 'DEL',
      remarks: 'Demo completed both arrival + departure',
    })
  );

  console.log('Seeded FHR ids:', created.join(', '));
  console.log('Station:', airport.name, `(${airport.iata})`);
  console.log('Client:', client.name);
  console.log('Airline/Aircraft:', airline.airline_name, '/', aircraft.type_name);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
