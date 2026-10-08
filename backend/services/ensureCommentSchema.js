const sequelize = require('../config/database');

async function columnExists(table, column) {
  const [rows] = await sequelize.query(
    `SELECT COLUMN_NAME AS name
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = :table
       AND COLUMN_NAME = :column`,
    { replacements: { table, column } }
  );
  return rows.length > 0;
}

/**
 * sequelize.sync() creates missing tables but does not add columns to
 * SubmissionComments. session_id stays nullable so older rows remain valid
 * and are grouped as a legacy session by the API.
 */
async function ensureCommentSchema() {
  const table = 'SubmissionComments';
  const exists = await columnExists(table, 'session_id');
  if (exists) return;

  await sequelize.query(
    'ALTER TABLE `SubmissionComments` ADD COLUMN `session_id` INT NULL'
  );
  console.log('Added SubmissionComments.session_id');
}

module.exports = ensureCommentSchema;
