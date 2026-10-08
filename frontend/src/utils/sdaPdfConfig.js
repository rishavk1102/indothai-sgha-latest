/**
 * Visual constants for the SGHA Annex B1.0 (SDA) PDF.
 * Page size and margins match the Word section setup (A4).
 * Colours follow the printed reference: red titles, grey banners, black body.
 * jsPDF has no Arial; Helvetica is the metric fallback.
 */

export const SDA_PDF = {
  page: {
    format: "a4",
    orientation: "portrait",
    width: 210,
    height: 297,
  },
  margin: {
    left: 12.7,
    right: 12.7,
    top: 18,
    bottom: 16,
    header: 8,
    footer: 10,
  },
  /** Body starts just below the IndoThai mark. */
  contentTop: 30,
  logo: {
    width: 28,
    height: 16.9,
    y: 8,
  },
  font: {
    family: "helvetica",
    title: 22,
    subtitle: 10,
    heading: 11,
    body: 10,
    table: 9,
    footer: 9,
    lineFactor: 0.38,
  },
  color: {
    black: [0, 0, 0],
    secondary: [51, 51, 51],
    subtitle: [64, 64, 64],
    titleRed: [192, 0, 0],
    footer: [128, 128, 128],
    link: [5, 99, 193],
    white: [255, 255, 255],
    banner: [191, 191, 191], // #BFBFBF paragraph banners
    sectionRow: [217, 217, 217], // #D9D9D9
    headerAlt: [166, 166, 166], // #A6A6A6
    rowAlt: [242, 242, 242], // #F2F2F2
    rowMuted: [208, 206, 206], // #D0CECE
  },
  clauseNumberWidth: 22,
  partyLabelWidth: 68,
  lineWidth: 0.15,
  cellPadX: 1.2,
  cellPadY: 0.7,
};

export const SDA_COVER_COPY = {
  title: "Standard Ground Handling Agreement",
  subtitle: "SIMPLIFIED PROCEDURE",
  annexHeading: "ANNEX B1.0 - LOCATION(S), AGREED SERVICES AND CHARGES",
};
