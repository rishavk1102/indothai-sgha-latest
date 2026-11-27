const DATA_HEADERS = [
  'AIRCRAFT ID',
  'ARRIVAL FLT NO',
  'OUTGOING FLT NO',
  'TYPE OF A/C',
  'FROM',
  'TO',
  'DAYS',
  'STA',
  'STD',
  'WEF',
];

function cellText(cell) {
  if (!cell || cell.value == null || cell.value === '') return '';
  const v = cell.value;
  if (typeof v === 'object') {
    if (v instanceof Date) return v.toISOString();
    if (v.text != null) return String(v.text);
    if (v.result != null) return String(v.result);
    if (v.richText) return v.richText.map((p) => p.text || '').join('');
  }
  return String(v).trim();
}

function findAircraftHeaderRow(worksheet) {
  let found = null;
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (found != null) return;
    const first = cellText(row.getCell(1)).toUpperCase();
    if (first === 'AIRCRAFT ID') found = rowNumber;
  });
  return found;
}

function catalogAircraftIds(worksheet) {
  const dataHeader = findAircraftHeaderRow(worksheet);
  const end = dataHeader || worksheet.rowCount + 1;
  const ids = [];
  for (let i = 1; i < end; i += 1) {
    const row = worksheet.getRow(i);
    const first = cellText(row.getCell(1)).toUpperCase();
    if (first === 'AIRPORT ID' || first.startsWith('NOTE')) continue;
    const raw = cellText(row.getCell(6));
    const n = Number(raw);
    if (Number.isInteger(n) && n > 0) ids.push(n);
  }
  return ids;
}

function collectFlightRows(worksheet) {
  const headerRowIndex = findAircraftHeaderRow(worksheet);
  if (!headerRowIndex) {
    return { headerRowIndex: null, headerValid: false, rows: [] };
  }
  const headerRow = worksheet.getRow(headerRowIndex);
  const headerValid = DATA_HEADERS.every(
    (header, i) => cellText(headerRow.getCell(i + 1)).toUpperCase() === header
  );
  const rows = [];
  if (!headerValid) {
    return { headerRowIndex, headerValid: false, rows };
  }
  for (let i = headerRowIndex + 1; i <= worksheet.rowCount; i += 1) {
    const row = worksheet.getRow(i);
    if (!row || !row.hasValues) continue;
    const aircraft_id = cellText(row.getCell(1));
    const arrival = cellText(row.getCell(2));
    const departure = cellText(row.getCell(3));
    if (!aircraft_id && !arrival && !departure) continue;
    rows.push({
      rowNumber: i,
      aircraft_id,
      sheet: worksheet.name,
    });
  }
  return { headerRowIndex, headerValid: true, rows };
}

/**
 * Block Excel rows whose Aircraft ID is missing, unknown, or owned by a
 * different handling company than the one selected on the import screen.
 */
function collectExcelImportIssues(workbook, options = {}) {
  const expectedBusinessId = Number(options.expectedBusinessId);
  const selectedBusinessName = options.selectedBusinessName || 'the selected handling company';
  const aircraftById = options.aircraftById instanceof Map ? options.aircraftById : new Map();
  const issues = [];

  for (const worksheet of workbook.worksheets) {
    const { headerValid, rows } = collectFlightRows(worksheet);
    if (!headerValid) {
      if (rows.length) {
        issues.push(
          `Sheet "${worksheet.name}" has flight rows but the header does not match the template. Download a fresh Excel file for ${selectedBusinessName}.`
        );
      }
      continue;
    }

    const catalogIds = new Set(catalogAircraftIds(worksheet));
    for (const row of rows) {
      const idNum = Number(row.aircraft_id);
      if (!Number.isInteger(idNum) || idNum <= 0) {
        issues.push(
          `Sheet "${worksheet.name}" row ${row.rowNumber}: Aircraft ID must be a number from the list at the top of the sheet, not "${row.aircraft_id}".`
        );
        continue;
      }
      if (catalogIds.size && !catalogIds.has(idNum)) {
        issues.push(
          `Aircraft ID ${idNum} is not in the allowed list at the top of "${worksheet.name}". Download the template for ${selectedBusinessName} and use only those Aircraft IDs.`
        );
        continue;
      }
      const aircraft = aircraftById.get(idNum);
      if (!aircraft) {
        issues.push(
          `Aircraft ID ${idNum} (sheet "${worksheet.name}" row ${row.rowNumber}) does not exist. Review the ID against the list at the top of the sheet.`
        );
        continue;
      }
      if (Number(aircraft.business_id) !== expectedBusinessId) {
        const ownerName = aircraft.business_name || 'another handling company';
        issues.push(
          `Aircraft ID ${idNum} (${aircraft.type_name || 'unknown type'}) belongs to ${ownerName}, not ${selectedBusinessName}.`
        );
      }
    }
  }

  return [...new Set(issues)];
}

module.exports = {
  DATA_HEADERS,
  cellText,
  findAircraftHeaderRow,
  catalogAircraftIds,
  collectFlightRows,
  collectExcelImportIssues,
};
