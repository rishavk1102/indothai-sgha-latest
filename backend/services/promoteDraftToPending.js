const FHR = require('../Models/FHR');
const FHR_Listing = require('../Models/FHR_Listing');
const { getIO } = require('../sockets/socketHandler');

/**
 * First real edit of a Draft FHR moves it to Pending so work-in-progress
 * is visible on the Pending list instead of looking untouched.
 */
async function promoteDraftToPending(fhrId, transaction) {
  const id = Number(fhrId);
  if (!Number.isInteger(id) || id <= 0) {
    return { promoted: false, airport_id: null };
  }

  const fhr = await FHR.findByPk(id, {
    attributes: ['fhr_id', 'status', 'airport_id'],
    transaction,
  });
  if (!fhr) return { promoted: false, airport_id: null };
  if (fhr.status !== 'Draft') {
    return { promoted: false, airport_id: fhr.airport_id };
  }

  await fhr.update({ status: 'Pending' }, { transaction });
  await FHR_Listing.update(
    { status: 'Pending' },
    { where: { fhr_id: id, status: 'Draft' }, transaction }
  );

  return { promoted: true, airport_id: fhr.airport_id };
}

function emitFhrStatusLists(fhrId, airportId) {
  const io = getIO();
  io.emit('fhrUpdated', { fhr_id: Number(fhrId) });
  if (airportId) io.emit('fhrlistUpdated', { airport_id: airportId });
}

module.exports = { promoteDraftToPending, emitFhrStatusLists };
