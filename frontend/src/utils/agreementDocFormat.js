/**
 * Agreement / template body text: many DB rows and PDF extracts are plain text with newlines.
 * Some imports use markdown-style pipe tables (| col | col |) which must become HTML tables for display.
 */

export function stringLooksLikeHtml(s) {
  return typeof s === "string" && /<\/?[a-z][\s\S]*>/i.test(s);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isMarkdownTableRow(line) {
  const trimmed = String(line || "").trim();
  return trimmed.startsWith("|") && trimmed.indexOf("|", 1) !== -1;
}

/** PDF/import rows: `Col A | Col B | Col C` without leading/trailing pipes. */
function isPipeSeparatedTableRow(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed || !trimmed.includes("|")) return false;
  if (isMarkdownTableRow(trimmed)) return true;
  if (/^[\|\s:\-]+$/.test(trimmed) && trimmed.includes("-")) return true;
  const pipeCount = (trimmed.match(/\|/g) || []).length;
  if (pipeCount < 1) return false;
  const cells = trimmed.split("|").map((c) => c.trim());
  const nonEmpty = cells.filter(Boolean);
  return nonEmpty.length >= 2 && pipeCount >= 1;
}

function isTableRow(line) {
  return isMarkdownTableRow(line) || isPipeSeparatedTableRow(line);
}

function isMarkdownSeparatorRow(line) {
  if (!isTableRow(line)) return false;
  const cells = parseMarkdownTableRow(line);
  return (
    cells.length > 0 &&
    cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()))
  );
}

/** Merged template bodies sometimes use only `<br/>` between plain-text blocks. */
function isHtmlWithBreaksOnly(text) {
  const s = String(text || "");
  if (!/<br\s*\/?>/i.test(s)) return false;
  const withoutBreaks = s.replace(/<br\s*\/?>/gi, "");
  return !/<(?:table|p|h[1-6]|ul|ol|div|tr|td|th|span|strong|em)\b/i.test(
    withoutBreaks,
  );
}

function parseMarkdownTableRow(line) {
  let inner = String(line || "").trim();
  if (inner.startsWith("|")) inner = inner.slice(1);
  if (inner.endsWith("|")) inner = inner.slice(0, -1);
  return inner.split("|").map((cell) => cell.trim());
}

function markdownTableLinesToHtml(tableLines) {
  if (!tableLines?.length) return "";

  let headerCells = null;
  let bodyRows = [];
  let index = 0;

  if (tableLines.length > 1 && isMarkdownSeparatorRow(tableLines[1])) {
    headerCells = parseMarkdownTableRow(tableLines[0]);
    index = 2;
  }

  for (; index < tableLines.length; index += 1) {
    const line = tableLines[index];
    if (isMarkdownSeparatorRow(line)) continue;
    const row = parseMarkdownTableRow(line);
    if (row.some((cell) => cell !== "")) {
      bodyRows.push(row);
    }
  }

  if (!headerCells && bodyRows.length > 0) {
    headerCells = bodyRows[0];
    bodyRows = bodyRows.slice(1);
  }

  const columnCount = Math.max(
    headerCells?.length || 0,
    ...bodyRows.map((row) => row.length),
    0,
  );

  const normalizeRow = (row) => {
    const cells = [...row];
    while (cells.length < columnCount) cells.push("");
    return cells.slice(0, columnCount);
  };

  let html = '<table class="sgha-doc-table">';

  if (headerCells?.length) {
    html += "<thead><tr>";
    for (const cell of normalizeRow(headerCells)) {
      html += `<th>${escapeHtml(cell)}</th>`;
    }
    html += "</tr></thead>";
  }

  html += "<tbody>";
  for (const row of bodyRows) {
    html += "<tr>";
    for (const cell of normalizeRow(row)) {
      html += `<td>${escapeHtml(cell)}</td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table>";

  return html;
}

/**
 * Plain text → safe HTML: markdown pipe tables become <table>; other text uses paragraphs.
 * If input already looks like HTML, returns it unchanged.
 */
export function formatAgreementBodyForDisplay(text) {
  if (text == null || text === "") return "";
  let s = String(text);
  if (stringLooksLikeHtml(s)) {
    if (isHtmlWithBreaksOnly(s)) {
      s = s.replace(/<br\s*\/?>/gi, "\n");
    } else {
      return s;
    }
  }

  const lines = s.split(/\r?\n/);
  const segments = [];
  let textBuffer = [];

  const flushText = () => {
    if (!textBuffer.length) return;
    segments.push({
      type: "text",
      content: textBuffer.join("\n"),
    });
    textBuffer = [];
  };

  let index = 0;
  while (index < lines.length) {
    if (isTableRow(lines[index])) {
      flushText();
      const tableLines = [];
      while (index < lines.length && isTableRow(lines[index])) {
        tableLines.push(lines[index]);
        index += 1;
      }
      segments.push({ type: "table", content: tableLines });
    } else {
      textBuffer.push(lines[index]);
      index += 1;
    }
  }
  flushText();

  return segments
    .map((segment) => {
      if (segment.type === "table") {
        return markdownTableLinesToHtml(segment.content);
      }
      return plainTextToAgreementHtml(segment.content);
    })
    .join("");
}

/**
 * Plain text → safe HTML: blank line = new <p>, single newline = <br> inside the paragraph.
 * If input already looks like HTML, returns it unchanged.
 */
export function plainTextToAgreementHtml(text) {
  if (text == null || text === "") return "";
  const s = String(text);
  if (stringLooksLikeHtml(s)) return s;

  const blocks = s.split(/\r?\n\r?\n|\n{2,}/);
  const parts = blocks.map((block) => {
    const blockLines = block.split(/\r?\n/);
    const inner = blockLines
      .map((line) => {
        const trimmed = line.trim();
        if (/^\d+(\.\d+)+\.?\s+\S/.test(trimmed)) {
          const match = trimmed.match(/^(\d+(?:\.\d+)*\.?)\s+(.*)$/);
          if (match) {
            return `<strong>${escapeHtml(match[1])}</strong> ${escapeHtml(match[2])}`;
          }
        }
        return escapeHtml(line);
      })
      .join("<br>");
    if (!inner) return '<p style="margin: 0.25em 0;"><br></p>';
    return `<p style="margin: 0.25em 0;">${inner}</p>`;
  });
  return parts.join("");
}

/** For CustomEditor init: coerce plain template/agreement bodies to HTML. */
export function normalizeContentForEditorHtml(value) {
  if (value == null || value === "") return "";
  const s = String(value);
  if (stringLooksLikeHtml(s)) return s;
  return formatAgreementBodyForDisplay(s);
}
