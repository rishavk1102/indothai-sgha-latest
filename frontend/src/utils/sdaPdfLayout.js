import jsPDF from "jspdf";
import { SDA_COVER_COPY, SDA_PDF } from "./sdaPdfConfig";
import {
  normalizeClauseLines,
  parseClauseLines,
  prefixKeyMarker,
  splitClauseNumber,
} from "./sghaClauseParser";

const {
  page,
  margin,
  contentTop,
  logo,
  font,
  color,
  clauseNumberWidth,
  partyLabelWidth,
  lineWidth,
  cellPadX,
  cellPadY,
} = SDA_PDF;

const contentWidth = page.width - margin.left - margin.right;
const contentBottom = page.height - margin.bottom;
// Logo sits in the top-right corner, flush with the right margin.
const logoX = page.width - margin.right - logo.width;

function rgb(doc, c) {
  doc.setTextColor(c[0], c[1], c[2]);
}

function fill(doc, c) {
  doc.setFillColor(c[0], c[1], c[2]);
}

function lineHeight(size) {
  return size * font.lineFactor;
}

export function newSdaDocument() {
  return new jsPDF({
    orientation: page.orientation,
    unit: "mm",
    format: page.format,
  });
}

/** Move to a new page when `height` does not fit. Returns the y to draw at. */
export function ensureSpace(doc, y, height) {
  if (y + height > contentBottom) {
    doc.addPage();
    return contentTop;
  }
  return y;
}

function setFont(doc, style, size) {
  doc.setFont(font.family, style || "normal");
  doc.setFontSize(size || font.body);
}

/**
 * Word-wrap plain text. Emails become mailto links.
 * Returns the y after the last line.
 */
export function drawWrappedText(doc, text, x, y, options = {}) {
  const {
    fontSize = font.body,
    fontStyle = "normal",
    color: textColor = color.black,
    maxWidth = contentWidth,
    align = "left",
    bottom = contentBottom,
    top = contentTop,
  } = options;

  const source = String(text ?? "");
  if (!source) return y;

  setFont(doc, fontStyle, fontSize);
  rgb(doc, textColor);
  const lines = doc.splitTextToSize(source, maxWidth);
  const lh = lineHeight(fontSize);
  let currentY = y;

  lines.forEach((line) => {
    if (currentY + lh > bottom) {
      doc.addPage();
      currentY = top;
      setFont(doc, fontStyle, fontSize);
      rgb(doc, textColor);
    }
    drawLineWithEmails(doc, line, x, currentY, {
      fontSize,
      fontStyle,
      textColor,
      align,
      maxWidth,
    });
    currentY += lh;
  });

  return currentY;
}

function drawLineWithEmails(doc, line, x, y, opts) {
  const re = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const parts = [];
  let last = 0;
  let match;
  const src = String(line);
  while ((match = re.exec(src)) !== null) {
    if (match.index > last) parts.push({ text: src.slice(last, match.index), link: false });
    parts.push({ text: match[0], link: true });
    last = match.index + match[0].length;
  }
  if (last < src.length) parts.push({ text: src.slice(last), link: false });
  if (parts.length <= 1 && !(parts[0] && parts[0].link)) {
    doc.text(src, x, y, { align: opts.align });
    return;
  }

  setFont(doc, opts.fontStyle, opts.fontSize);
  let cursor = x;
  if (opts.align === "center") {
    const total = parts.reduce((sum, p) => sum + doc.getTextWidth(p.text), 0);
    cursor = x - total / 2;
  } else if (opts.align === "right") {
    const total = parts.reduce((sum, p) => sum + doc.getTextWidth(p.text), 0);
    cursor = x - total;
  }

  parts.forEach((part) => {
    if (!part.text) return;
    setFont(doc, opts.fontStyle, opts.fontSize);
    if (part.link) rgb(doc, color.link);
    else rgb(doc, opts.textColor);
    doc.text(part.text, cursor, y);
    const w = doc.getTextWidth(part.text);
    if (part.link) {
      doc.setDrawColor(color.link[0], color.link[1], color.link[2]);
      doc.setLineWidth(0.1);
      doc.line(cursor, y + 0.6, cursor + w, y + 0.6);
      doc.link(cursor, y - opts.fontSize * 0.3, w, opts.fontSize * 0.45, {
        url: `mailto:${part.text}`,
      });
    }
    cursor += w;
  });
  rgb(doc, opts.textColor);
}

function wrapRuns(doc, runs, maxWidth, fontSize) {
  const tokens = [];
  (runs || []).forEach((run) => {
    const source = String(run.text || "");
    if (run.nowrap) {
      if (source) tokens.push({ text: source, bold: !!run.bold });
      return;
    }
    source.split(/([ \t]+)/).forEach((piece) => {
      if (piece) tokens.push({ text: piece, bold: !!run.bold });
    });
  });

  const lines = [];
  let line = [];
  let width = 0;

  tokens.forEach((token) => {
    setFont(doc, token.bold ? "bold" : "normal", fontSize);
    const w = doc.getTextWidth(token.text);
    const isSpace = /^\s+$/.test(token.text);
    if (line.length && width + w > maxWidth) {
      lines.push(line);
      line = [];
      width = 0;
      if (isSpace) return;
    }
    line.push(token);
    width += w;
  });
  if (line.length) lines.push(line);
  return lines;
}

function drawRunLine(doc, runs, x, y, fontSize, textColor) {
  if (
    runs.length === 1 &&
    !runs[0].bold &&
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(runs[0].text || "")
  ) {
    drawLineWithEmails(doc, runs[0].text, x, y, {
      fontSize,
      fontStyle: "normal",
      textColor,
      align: "left",
      maxWidth: contentWidth,
    });
    return;
  }
  let cursor = x;
  runs.forEach((run) => {
    if (!run.text) return;
    setFont(doc, run.bold ? "bold" : "normal", fontSize);
    rgb(doc, textColor);
    doc.text(run.text, cursor, y);
    cursor += doc.getTextWidth(run.text);
  });
}

export function drawRichParagraph(doc, y, runs, options = {}) {
  const fontSize = options.fontSize || font.body;
  const maxWidth = options.maxWidth || contentWidth;
  const x = options.x != null ? options.x : margin.left;
  const lh = lineHeight(fontSize);
  const gap = options.gapAfter != null ? options.gapAfter : 2.2;
  const lines = wrapRuns(doc, runs, maxWidth, fontSize);
  let currentY = y;
  lines.forEach((line) => {
    currentY = ensureSpace(doc, currentY, lh);
    drawRunLine(doc, line, x, currentY, fontSize, options.color || color.black);
    currentY += lh;
  });
  return currentY + gap;
}

function strokeRect(doc, x, y, w, h) {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(lineWidth);
  doc.rect(x, y, w, h);
}

export function drawLabelValueTable(doc, y, rows, labelWidth = partyLabelWidth) {
  const fontSize = font.body;
  const lh = lineHeight(fontSize);
  const valueWidth = contentWidth - labelWidth;
  let currentY = y;

  rows.forEach((row) => {
    setFont(doc, "normal", fontSize);
    const labelLines = doc.splitTextToSize(String(row.label || ""), labelWidth - cellPadX * 2);
    const valueRuns = Array.isArray(row.value)
      ? row.value
      : [{ text: row.value == null || row.value === "" ? "—" : String(row.value), bold: !!row.bold }];
    const valueLines = wrapRuns(doc, valueRuns, valueWidth - cellPadX * 2, fontSize);
    const n = Math.max(labelLines.length, valueLines.length, 1);
    const h = n * lh + cellPadY * 2;
    currentY = ensureSpace(doc, currentY, h);

    strokeRect(doc, margin.left, currentY, labelWidth, h);
    strokeRect(doc, margin.left + labelWidth, currentY, valueWidth, h);

    setFont(doc, "normal", fontSize);
    rgb(doc, color.black);
    labelLines.forEach((line, i) => {
      doc.text(line, margin.left + cellPadX, currentY + cellPadY + lh * (i + 0.75));
    });
    valueLines.forEach((line, i) => {
      drawRunLine(
        doc,
        line,
        margin.left + labelWidth + cellPadX,
        currentY + cellPadY + lh * (i + 0.75),
        fontSize,
        color.black,
      );
    });
    currentY += h;
  });

  return currentY;
}
function clauseIndent(level) {
  return Math.max(0, level) * 6;
}

export function drawParagraphBanner(doc, y, text) {
  const fontSize = font.heading;
  const lh = lineHeight(fontSize);
  const padY = 1.6;
  setFont(doc, "bold", fontSize);
  const lines = doc.splitTextToSize(String(text || ""), contentWidth - cellPadX * 2);
  const h = lines.length * lh + padY * 2;
  let currentY = ensureSpace(doc, y + 1, h + 1);
  fill(doc, color.banner);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(lineWidth);
  doc.rect(margin.left, currentY, contentWidth, h, "FD");
  rgb(doc, color.black);
  lines.forEach((line, i) => {
    doc.text(line, margin.left + cellPadX, currentY + padY + lh * (i + 0.75));
  });
  return currentY + h + 6;
}

export function drawSectionHeading(doc, y, text) {
  const fontSize = font.heading;
  const lh = lineHeight(fontSize);
  setFont(doc, "bold", fontSize);
  const lines = doc.splitTextToSize(String(text || "").toUpperCase(), contentWidth - cellPadX * 2);
  const h = lines.length * lh + 2;
  const top = ensureSpace(doc, y + 2, h + 1);
  fill(doc, color.sectionRow);
  doc.rect(margin.left, top, contentWidth, h, "F");
  rgb(doc, color.titleRed);
  lines.forEach((line, i) => doc.text(line, margin.left + cellPadX, top + 1 + lh * (i + 0.75)));
  rgb(doc, color.black);
  return top + h + 1.4;
}

export function drawSubsectionRow(doc, y, number, title) {
  return drawShadedRow(doc, y, number, title, color.sectionRow, true);
}

function wrapClauseNumber(doc, number, width) {
  let source = String(number || "").replace(/\s+/g, " ").trim();
  if (!source) return [];
  setFont(doc, "normal", font.body);
  if (doc.getTextWidth(source) <= width) return [source];
  source = source.replace(/^(\d+(?:\.\d+)+)(?=\()/, "$1 ");
  const tokens = source.split(" ");
  const lines = [];
  let line = "";
  tokens.forEach((token) => {
    const next = line ? `${line} ${token}` : token;
    if (doc.getTextWidth(next) <= width) {
      line = next;
      return;
    }
    if (line) lines.push(line);
    if (doc.getTextWidth(token) <= width) {
      line = token;
      return;
    }
    let rest = token;
    line = "";
    while (rest) {
      let take = rest.length;
      while (take > 1 && doc.getTextWidth(rest.slice(0, take)) > width) take -= 1;
      lines.push(rest.slice(0, take));
      rest = rest.slice(take);
    }
  });
  if (line) lines.push(line);
  return lines;
}

function drawShadedRow(doc, y, number, title, fillColor, titleBold) {
  const fontSize = font.body;
  const lh = lineHeight(fontSize);
  const textX = margin.left + clauseGutter;
  const textWidth = contentWidth - clauseGutter;
  setFont(doc, titleBold ? "bold" : "normal", fontSize);
  const titleLines = doc.splitTextToSize(String(title || ""), textWidth - 1);
  const numLines = doc.splitTextToSize(String(number || ""), clauseNumberWidth - 1);
  const n = Math.max(titleLines.length, numLines.length, 1);
  const h = n * lh + 1.6;
  const currentY = ensureSpace(doc, y + 1.2, h);

  fill(doc, fillColor);
  doc.rect(margin.left, currentY, contentWidth, h, "F");

  setFont(doc, "bold", fontSize);
  rgb(doc, color.black);
  numLines.forEach((line, i) => {
    doc.text(line, margin.left + 1, currentY + 0.8 + lh * (i + 0.75));
  });
  setFont(doc, titleBold ? "bold" : "normal", fontSize);
  titleLines.forEach((line, i) => {
    doc.text(line, textX, currentY + 0.8 + lh * (i + 0.75));
  });
  return currentY + h + 1.4;
}

/**
 * Two-column clause row. The whole row moves to the next page when it fits
 * there, so the number is not left behind. Rows taller than one page continue
 * with the same number.
 */

function markerPrefix(text) {
  const match = String(text || "").match(/^(\((?:[a-z]+|[ivx]+)\)|\d+\.)\s+/i);
  return match ? match[0] : "";
}

function expandClauseLines(doc, text, textWidth, fontSize) {
  const source = Array.isArray(text)
  ? normalizeClauseLines(text)
  : parseClauseLines(text);
  const visual = [];
  const rows = source.length ? source : [{ indent: 0, text: "" }];
  rows.forEach((line) => {
    const indent = clauseIndent(line.indent);
    const avail = Math.max(20, textWidth - indent);
    setFont(doc, "normal", fontSize);
    const prefix = markerPrefix(line.text);
    if (!prefix) {
      const wrapped = doc.splitTextToSize(line.text || "", avail);
      (wrapped.length ? wrapped : [""]).forEach((part) => {
        visual.push({ text: part, indent });
      });
      return;
    }
    const hang = doc.getTextWidth(prefix);
    const rest = String(line.text).slice(prefix.length);
    const wrapped = doc.splitTextToSize(rest || "", Math.max(16, avail - hang));
    (wrapped.length ? wrapped : [""]).forEach((part, i) => {
      visual.push({
        text: i === 0 ? prefix + part : part,
        indent: indent + (i === 0 ? 0 : hang),
      });
    });
  });
  return visual;
}

/**
 * Borderless clause. The number sits in the left column; wrapped lines and
 * (a) / 1. / (i) items hang under the text, not under the number.
 */
const clauseGutter = 20;

export function drawClauseRow(doc, y, number, text) {
  const fontSize = font.body;
  const lh = lineHeight(fontSize);
  setFont(doc, "normal", fontSize);
  const { number: numberText, markers } = splitClauseNumber(number);
  const textWidth = Math.max(24, contentWidth - clauseGutter);
  const parsed = Array.isArray(text) ? normalizeClauseLines(text) : parseClauseLines(text);
  const all = expandClauseLines(doc, prefixKeyMarker(parsed, markers), textWidth, fontSize).filter(
    (line) => line.text,
  );
  if (!all.length && !numberText) return y;

  const numLines = numberText
    ? wrapClauseNumber(doc, numberText, Math.max(8, clauseGutter - 1.2))
    : [];
  const lines = all.length ? all : [{ text: "", indent: 0 }];
  const count = Math.max(numLines.length, lines.length, 1);
  const blockH = count * lh + 0.4;
  let currentY = y;
  if (currentY + Math.min(blockH, lh * 3) > contentBottom && blockH < contentBottom - contentTop) {
    doc.addPage();
    currentY = contentTop;
  }

  setFont(doc, "normal", fontSize);
  rgb(doc, color.black);
  for (let i = 0; i < count; i += 1) {
    currentY = ensureSpace(doc, currentY, lh);
    const baseline = currentY + lh * 0.75;
    if (numLines[i]) doc.text(numLines[i], margin.left, baseline);
    if (lines[i]) {
      drawLineWithEmails(
        doc,
        lines[i].text,
        margin.left + clauseGutter + lines[i].indent,
        baseline,
        {
          fontSize,
          fontStyle: "normal",
          textColor: color.black,
          align: "left",
          maxWidth: textWidth,
        },
      );
    }
    currentY += lh;
  }
  return currentY + 0.35;
}

/** Body lines. Marker lines use the same text column as a clause. */
export function drawBodyLines(doc, y, lines) {
  const fontSize = font.body;
  const lh = lineHeight(fontSize);
  const visual = expandClauseLines(doc, lines, contentWidth - clauseGutter, fontSize).filter(
    (line) => line.text,
  );
  if (!visual.length) return y;
  const alignWithClause = visual.some((line) => line.indent > 0);
  const origin = alignWithClause ? clauseGutter : 0;
  let currentY = y;
  visual.forEach((line) => {
    currentY = ensureSpace(doc, currentY, lh);
    setFont(doc, "normal", fontSize);
    rgb(doc, color.black);
    doc.text(line.text, margin.left + origin + line.indent, currentY + lh * 0.75);
    currentY += lh;
  });
  return currentY + 0.8;
}

/* ------------------------------------------------------------------ */
/* Signature block ("Signed on date", "For & on behalf of", ...)      */
/* ------------------------------------------------------------------ */

const SIG_START = /^(?:for\s*&\s*on\s+behalf\s+of|signed\s+on)/i;
const SIG_MARK = /^\[?\s*signature\s*\]?/i;
const SIG_PLACE = /^At\s+[A-Z]/;

function signatureKind(text) {
  const t = String(text || "").trim();
  if (!t) return null;
  if (SIG_START.test(t)) return "start";
  if (SIG_MARK.test(t)) return "mark";
  if (SIG_PLACE.test(t) && t.length < 60) return "place";
  return null;
}

/**
 * Draws signature-area lines with generous spacing:
 * - a clear gap before each "Signed on / For & on behalf of" group
 * - blank room under "[Signature]" so there is space to sign
 * - slightly looser line spacing for names, titles and places
 */
function drawSignatureLines(doc, y, lines, state) {
  const fontSize = font.body;
  const lh = lineHeight(fontSize);
  let currentY = y;

  (lines || []).forEach((line) => {
    const text = String(line.text || "").trim();
    if (!text) return;
    const kind = signatureKind(text);

    if (kind === "start") {
      // Keep the whole group together on one page.
      currentY += state.started ? 8 : 10;
      currentY = ensureSpace(doc, currentY, 42);
      state.started = true;
    } else {
      currentY = ensureSpace(doc, currentY, lh + 2);
    }

    setFont(doc, "normal", fontSize);
    rgb(doc, color.black);
    doc.text(text, margin.left + (line.indent ? clauseIndent(line.indent) : 0), currentY + lh * 0.75);
    currentY += lh;

    if (kind === "mark") currentY += 10;
    else currentY += 1.6;
  });

  return currentY + 0.8;
}

const ARTICLE_HEADING = /^ARTICLE\s+(\d+)\s*[:.\-–—]\s+(.+)$/i;

function articleHeadingOf(block) {
  if (!block || block.type === "clause" || block.type === "table") return null;
  const lines = block.lines || [];
  if (!lines.length || lines.length > 2) return null;
  const text = lines
    .map((line) => String(line.text || "").trim())
    .filter(Boolean)
    .join(" ");
  const match = text.match(ARTICLE_HEADING);
  if (!match || text.length > 140) return null;
  return { number: match[1], title: match[2].trim() };
}

function clauseBlockKey(block) {
  if (!block || block.type !== "clause") return "";
  const text = (block.lines || [])
    .map((line) => String(line.text || "").replace(/\s+/g, " ").trim())
    .join("\n");
  return `${block.number || ""}::${text}`;
}

/**
 * The same article heading later in the text (Article 4, then Article 4 again)
 * is folded back under the first heading. Identical clauses are kept once.
 * A different title with the same number stays as its own heading.
 */
export function collapseRepeatedArticleBlocks(blocks) {
  const list = Array.isArray(blocks) ? blocks : [];
  const headings = [];
  list.forEach((block, index) => {
    const heading = articleHeadingOf(block);
    if (heading) headings.push({ index, ...heading });
  });
  if (headings.length < 2) return list;

  const groups = new Map();
  const order = [];
  headings.forEach((heading, index) => {
    const end = index + 1 < headings.length ? headings[index + 1].index : list.length;
    const content = list.slice(heading.index + 1, end);
    const key = `${heading.number}|${heading.title.toLowerCase()}`;
    if (!groups.has(key)) {
      groups.set(key, {
        heading: list[heading.index],
        content: [],
        seen: new Set(),
      });
      order.push(key);
    }
    const group = groups.get(key);
    content.forEach((block) => {
      const clauseKey = clauseBlockKey(block);
      if (clauseKey) {
        if (group.seen.has(clauseKey)) return;
        group.seen.add(clauseKey);
      }
      group.content.push(block);
    });
  });

  const result = list.slice(0, headings[0].index);
  order
    .slice()
    .sort((a, b) => {
      const an = parseInt(a, 10);
      const bn = parseInt(b, 10);
      if (an !== bn) return an - bn;
      return a.localeCompare(b);
    })
    .forEach((key) => {
      const group = groups.get(key);
      result.push(group.heading);
      result.push(...group.content);
    });
  return result;
}

/** Relative column widths from the longest line in each column (drawDataTable scales them). */
function autoColWidths(headers, rows) {
  const longest = (value) =>
    Math.max(0, ...String(value ?? "").split("\n").map((part) => part.length));
  return (headers || []).map((header, i) =>
    Math.min(
      60,
      Math.max(
        8,
        longest(header),
        ...(rows || []).map((row) => longest(Array.isArray(row) ? row[i] : "")),
      ),
    ),
  );
}

export function drawAgreementBlocks(doc, y, blocks) {
  let currentY = y;
  const sigState = { started: false };
  (blocks || []).forEach((block) => {
    if (!block) return;
    if (block.type === "clause") {
      currentY = drawClauseRow(doc, currentY, block.number || "", block.lines || "");
      return;
    }
    if (block.type === "table") {
      const headers = (block.headers || []).map((cell) => String(cell || "").trim());
      const rows = Array.isArray(block.rows) ? block.rows : [];
      const clauseRows = rows.filter((row) =>
        /^\d+\.\d+/.test(String((row && row[0]) || "").trim()),
      );
      const isDataTable =
        block.dataTable ||
        (headers.length > 1 && clauseRows.length < Math.ceil(Math.max(rows.length, 1) / 2));
      if (isDataTable) {
        currentY = drawDataTable(doc, currentY, headers, rows, autoColWidths(headers, rows));
        return;
      }
      (rows.length ? rows : []).forEach((row) => {
        const cells = (Array.isArray(row) ? row : []).map((cell) => String(cell || "").trim());
        const number = cells[0] || "";
        const text = cells.slice(1).filter(Boolean).join("\n");
        if (/^\d+\.\d+/.test(number)) {
          currentY = drawClauseRow(doc, currentY, number, text);
        } else if (number || text) {
          currentY = drawBodyLines(doc, currentY, parseClauseLines(`${number} ${text}`.trim()));
        }
      });
      return;
    }
    if (block.lines && block.lines.length) {
      const hasSignatureLine = block.lines.some((l) => signatureKind(l.text));
      const startsHere = block.lines.some((l) => signatureKind(l.text) === "start");
      if (sigState.started || startsHere || hasSignatureLine) {
        // Only treat "At ..." / "[Signature]" lines as signature content once a
        // "Signed on / For & on behalf of" line has been seen, or the block itself starts one.
        if (sigState.started || startsHere) {
          currentY = drawSignatureLines(doc, currentY, block.lines, sigState);
          return;
        }
      }
      currentY = drawBodyLines(doc, currentY, block.lines);
    }
  });
  return currentY;
}

export function drawDataTable(doc, y, headers, rows, colWidths, opts = {}) {
  const fontSize = opts.fontSize || font.table;
  const lh = lineHeight(fontSize);
  const widths = scaleWidths(colWidths, contentWidth);
  const headerFill = opts.headerFill || color.sectionRow;
  const body = Array.isArray(rows) ? rows : [];

  const wrapCell = (value, width, style) => {
    setFont(doc, style, fontSize);
    const raw = value == null || value === "" ? "" : String(value);
    const lines = doc.splitTextToSize(raw, Math.max(4, width - cellPadX * 2));
    return lines.length ? lines : [""];
  };

  const paintSlice = (wrapped, from, count, top, isHeader, fillColor) => {
    const h = count * lh + cellPadY * 2;
    if (fillColor) {
      fill(doc, fillColor);
      doc.rect(margin.left, top, contentWidth, h, "F");
    }
    let x = margin.left;
    wrapped.forEach((lines, i) => {
      const w = widths[i];
      strokeRect(doc, x, top, w, h);
      setFont(doc, isHeader ? "bold" : "normal", fontSize);
      rgb(doc, color.black);
      lines.slice(from, from + count).forEach((line, li) => {
        doc.text(line, x + cellPadX, top + cellPadY + lh * (li + 0.75));
      });
      x += w;
    });
    return top + h;
  };

  const headerWrapped = headers.map((h, i) => wrapCell(h, widths[i], "bold"));
  const headerLines = Math.max(...headerWrapped.map((l) => l.length), 1);
  const headerH = headerLines * lh + cellPadY * 2;

  const paintHeader = (top) => paintSlice(headerWrapped, 0, headerLines, top, true, headerFill);

  let currentY = y;
  if (currentY + headerH + lh > contentBottom) {
    doc.addPage();
    currentY = contentTop;
  }
  currentY = paintHeader(currentY);

  const dataRows = body.length
    ? body
    : [headers.map(() => "—")];

  dataRows.forEach((row) => {
    const cells = Array.isArray(row)
      ? row
      : headers.map((_, i) => row[headers[i]] ?? "—");
    const wrapped = cells.map((cell, i) => wrapCell(cell, widths[i] || 20, "normal"));
    const total = Math.max(...wrapped.map((l) => l.length), 1);
    let drawn = 0;
    while (drawn < total) {
      const room = contentBottom - currentY;
      let fit = total - drawn;
      const needed = fit * lh + cellPadY * 2;
      if (needed > room) {
        const capacity = Math.floor((room - cellPadY * 2) / lh);
        if (capacity < 1 || (fit <= capacity && needed > room)) {
          doc.addPage();
          currentY = paintHeader(contentTop);
          continue;
        }
        fit = Math.max(1, Math.min(fit, capacity));
      }
      currentY = paintSlice(wrapped, drawn, fit, currentY, false, null);
      drawn += fit;
    }
  });

  return currentY + 3;
}

function scaleWidths(colWidths, total) {
  const raw = (colWidths && colWidths.length ? colWidths : [total]).map((n) => Number(n) || 0);
  const sum = raw.reduce((a, b) => a + b, 0) || total;
  const scaled = raw.map((n) => (n / sum) * total);
  const drift = total - scaled.reduce((a, b) => a + b, 0);
  scaled[scaled.length - 1] += drift;
  return scaled;
}

function filled(value) {
  if (value == null) return "";
  return String(value).trim();
}

function joinAddress(record, keys) {
  if (!record) return "";
  return keys
    .map((key) => filled(record[key]))
    .filter(Boolean)
    .join(", ");
}

/** City and country only, matching the Main Agreement "principal office" lines. */
function principalOffice(record) {
  if (!record) return "";
  const city = filled(record.city);
  const country = filled(record.country);
  if (city && country) return `${city}, ${country}`;
  if (city) return city;
  return "";
}

function formatSdaDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function resolveCoverModel(submission = {}, clientDetails = null, handlingCompany = null) {
  const fd =
    submission.form_details && typeof submission.form_details === "object"
      ? submission.form_details
      : {};

  const carrierName =
    filled(clientDetails?.name) ||
    filled(submission.client_name) ||
    filled(fd.company_name);

  const carrierOffice =
    principalOffice(clientDetails) ||
    principalOffice(fd) ||
    joinAddress(clientDetails, [
      "address1",
      "address2",
      "city",
      "state",
      "pincode",
      "country",
    ]) ||
    joinAddress(fd, [
      "address_line_1",
      "address_line_2",
      "city",
      "state",
      "post_code",
      "country",
    ]);

  const handlingName = filled(handlingCompany?.name);
  const airportCity = filled(fd.airport_city);
  const airportCountry = filled(fd.airport_country) || (airportCity ? "IN" : "");
  const handlingOffice =
    (airportCity ? [airportCity, airportCountry].filter(Boolean).join(", ") : "") ||
    principalOffice(handlingCompany) ||
    joinAddress(handlingCompany, [
      "address1",
      "address2",
      "city",
      "state",
      "pincode",
      "country",
    ]);

  const location =
    [fd.airport_name, fd.airport_city, fd.airport_iata].filter(Boolean).join(", ") ||
    fd.location ||
    fd.locations ||
    submission.location ||
    "";

  const effective = formatSdaDate(submission.effective_from || fd.effective_from);
  const validFrom = formatSdaDate(fd.valid_from || fd.validFrom || submission.valid_from);
  const replaces = fd.replaces || fd.replaced_agreement || submission.replaces || "";

  const extras = [];
  const push = (label, value, link) => {
    if (value == null || String(value).trim() === "") return;
    extras.push({ label, value: String(value).trim(), link: !!link });
  };
  push("Contact name", submission.contact_name || fd.contact_person);
  push("Contact email", submission.contact_email || fd.email, true);
  push("Contact phone", submission.contact_phone || fd.phone_number);
  push("Service type", submission.service_type);
  push("Agreement year", submission.agreement_year);
  push("Status", submission.status);
  push("Effective to", formatSdaDate(submission.effective_to));
  push("GSTN", fd.gstn);
  push("Rate", fd.rate);

  return {
    carrierName,
    carrierOffice,
    handlingName,
    handlingOffice,
    location,
    effective,
    validFrom,
    replaces,
    extras,
  };
}

export function drawCover(doc, y, model) {
  let currentY = Math.max(y, contentTop);

  setFont(doc, "bold", font.title);
  rgb(doc, color.titleRed);
  currentY = ensureSpace(doc, currentY, 12);
  doc.text(SDA_COVER_COPY.title, margin.left, currentY);
  currentY += 8;

  setFont(doc, "normal", font.subtitle);
  rgb(doc, color.subtitle);
  doc.text(SDA_COVER_COPY.subtitle, margin.left, currentY);
  currentY += 2.2;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.line(margin.left, currentY, margin.left + 70, currentY);
  currentY += 8;

  setFont(doc, "bold", font.heading);
  rgb(doc, color.black);
  doc.text(SDA_COVER_COPY.annexHeading, margin.left, currentY);
  currentY += 4;

  const carrierRows = [
    model.carrierName
      ? { label: "between:", value: [{ text: model.carrierName, bold: true }] }
      : null,
    model.carrierOffice
      ? { label: "having its principal office at:", value: model.carrierOffice }
      : null,
  ].filter(Boolean);
  if (carrierRows.length) {
    currentY = drawLabelValueTable(doc, currentY, carrierRows);
    currentY += 3;
  }
  currentY = drawRichParagraph(doc, currentY, [
    { text: "hereinafter referred to as the \u201c" },
    { text: "Carrier", bold: true },
    { text: "\u201d" },
  ], { gapAfter: 2 });

  const handlingRows = [
    model.handlingName
      ? { label: "and:", value: [{ text: model.handlingName, bold: true }] }
      : null,
    model.handlingOffice
      ? { label: "having its principal office at:", value: model.handlingOffice }
      : null,
  ].filter(Boolean);
  if (handlingRows.length) {
    currentY = drawLabelValueTable(doc, currentY, handlingRows);
    currentY += 3;
  }
  currentY = drawRichParagraph(doc, currentY, [
    { text: "hereinafter referred to as the \u201c" },
    { text: "Handling Company", bold: true },
    { text: "\u201d" },
  ], { gapAfter: 1.5 });
  currentY = drawRichParagraph(
    doc,
    currentY,
    [
      { text: "The " },
      { text: "Carrier", bold: true },
      { text: " and/or the " },
      { text: "Handling Company", bold: true },
      { text: " shall hereinafter individually be referred to as the \u201c" },
      { text: "Party", bold: true },
      { text: "\u201d and collectively as the \u201c" },
      { text: "Parties", bold: true },
      { text: "\u201d." },
    ],
    { gapAfter: 3 },
  );

  const termRows = [
    model.effective
      ? {
          label: "Effective from:",
          value: [
            { text: model.effective },
            { text: " (\u201cEffective Date\u201d)", bold: true, nowrap: true },
          ],
        }
      : null,
    model.location
      ? {
          label: "This Annex B is for the location(s):",
          value: [
            { text: model.location },
            { text: " (\u201cLocation(s)\u201d)", bold: true, nowrap: true },
          ],
        }
      : null,
    model.validFrom ? { label: "valid from:", value: model.validFrom } : null,
    model.replaces ? { label: "and replaces:", value: model.replaces } : null,
  ].filter(Boolean);
  if (termRows.length) {
    currentY = drawLabelValueTable(doc, currentY, termRows);
    currentY += 3;
  }

  if (model.extras && model.extras.length) {
    currentY = drawParagraphBanner(doc, currentY, "SUBMISSION DETAILS");
    currentY = drawLabelValueTable(
      doc,
      currentY,
      model.extras.map((row) => ({
        label: row.label,
        value: row.link ? [{ text: row.value }] : row.value,
      })),
    );
    currentY += 4;
  }

  setFont(doc, "bold", font.heading);
  rgb(doc, color.black);
  currentY = ensureSpace(doc, currentY, 8);
  doc.text("PREAMBLE:", margin.left, currentY);
  currentY += 5;

  currentY = drawRichParagraph(doc, currentY, [
    { text: "This Annex B1.0 (Location(s), Agreed Services, Facilities and Charges) (\u201c" },
    { text: "Annex B", bold: true },
    { text: "\u201d) to the SGHA of January 2023 (\u201c" },
    { text: "Main Agreement", bold: true },
    { text: "\u201d) is prepared in accordance with the simplified procedure whereby the Carrier and the Handling Company agree that the terms of the Main Agreement and Annex A of the Main Agreement (\u201c" },
    { text: "Annex A", bold: true },
    { text: "\u201d) as published by the International Air Transport Association (IATA) shall apply as if such terms were repeated here in full." },
  ]);
  currentY = drawRichParagraph(doc, currentY, [
    {
      text: "By signing this Annex B, the Parties confirm that they are familiar with the afore-mentioned Main Agreement and Annex A. The provisions contained in the Main Agreement shall apply so far as they are not inconsistent with the provisions contained in this Annex B. For the avoidance of doubt, in the event of any inconsistency, the provisions contained in this Annex B shall prevail over the Main Agreement and the Annex A.",
    },
  ]);
  currentY = drawRichParagraph(doc, currentY, [
    { text: "All references to \u201c" },
    { text: "this Agreement", bold: true },
    { text: "\u201d shall mean the Main Agreement, the relevant sections of Annex A and this Annex B. The Main Agreement, Annex A and this Annex B shall constitute the entire agreement between the Parties relating to the subject matter hereof, and supersede any previous agreements or understandings or proposals, oral or written." },
  ]);

  currentY += 1;
  if (currentY + 4 <= contentBottom) {
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
    doc.line(margin.left, currentY, margin.left + contentWidth, currentY);
    return currentY + 6;
  }
  return currentY + 2;
}

export function applyLetterhead(doc, logoDataUrl) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i);
    if (logoDataUrl) {
      try {
        // Logo is placed at the top-right corner of every page.
        doc.addImage(logoDataUrl, "PNG", logoX, logo.y, logo.width, logo.height);
      } catch (error) {
        // Logo is optional at paint time; body content still stands.
      }
    }
    setFont(doc, "normal", font.footer);
    rgb(doc, color.footer);
    doc.text(String(i), page.width - margin.right, page.height - margin.footer, {
      align: "right",
    });
  }
}

export function subsectionLabel(sectionKey, fullLabel) {
  if (!fullLabel) return "";
  const key = String(sectionKey || "");
  const label = String(fullLabel);
  const at = label.lastIndexOf(key);
  if (at >= 0) return label.slice(at + key.length).replace(/^[\s\-–—:]+/, "").trim();
  return label;
}

/** Sample documents used to compare the letterhead against the reference. */
export function buildSampleSdaPdf(logoDataUrl, variant = "full") {
  const doc = newSdaDocument();
  const sparse = variant === "sparse";
  const model = {
    carrierName: "",
    carrierOffice: "",
    handlingName: "",
    handlingOffice: "",
    location: "",
    effective: "",
    validFrom: "",
    replaces: "",
    extras: [],
  };
  void sparse;

  let y = drawCover(doc, contentTop, model);
  y = drawParagraphBanner(doc, y, "PARAGRAPH 1:  HANDLING SERVICES AND CHARGES");
  y = drawClauseRow(
    doc,
    y,
    "1.1",
    "For a single ground handling service consisting of the arrival and the subsequent departure at agreed timings of the same aircraft of the Carrier at the Location(s), the Handling Company shall provide the following services (\u201cServices\u201d) in accordance with the Agreement.",
  );
  y = drawSectionHeading(doc, y, "SECTION 1. MANAGEMENT FUNCTIONS");
  y = drawSubsectionRow(doc, y, "1.1", "REPRESENTATION");
  const clauses = sparse
    ? [["1.1.2", "Liaise with local authorities."]]
    : Array.from({ length: 28 }, (_, i) => [
        `1.1.${i + 2}`,
        i === 3
          ? "Maintain the Carrier's manuals, circulars, and other operational documents connected with the performance of the services. Notify the Carrier at ops@example.com when a document is missing, and keep a local copy for one hundred and eighty days."
          : `Sample agreed service clause ${i + 2} describing the handling activity selected for this annex.`,
      ]);
  clauses.forEach(([num, text]) => {
    y = drawClauseRow(doc, y, num, text);
  });

  y = drawSectionHeading(doc, y, "SECTION 2. PASSENGER SERVICES");
  y = drawSubsectionRow(doc, y, "2.1", "GENERAL");
  y = drawClauseRow(doc, y, "2.1.3", [
    { indent: 0, text: "(a) Provide" },
    { indent: 1, text: "1. unaccompanied minors (UMs)" },
    { indent: 1, text: "2. persons with reduced mobility" },
    { indent: 1, text: "3. VIPs" },
  ]);

  y = drawParagraphBanner(doc, y, "PARAGRAPH 4:  LIMIT OF LIABILITY");
  const liabilityRows = sparse
    ? []
    : Array.from({ length: 12 }, (_, i) => [
        "Wide body",
        i % 2 === 0 ? "International" : "Domestic",
        `${200 + i * 10}`,
        `USD ${1000000 + i * 250000}`,
      ]);
  y = drawDataTable(
    doc,
    y,
    ["Aircraft type", "Region", "MTOW", "Limit per incident"],
    liabilityRows,
    [50, 40, 30, 64],
  );

  applyLetterhead(doc, logoDataUrl);
  return doc;
}