const ROMAN_MARKER = /^\((?:i{1,3}|iv|vi{0,3}|ix|xi{0,3}|x)\)(?:\s|$)/i;
const LETTER_MARKER = /^\([a-z]\)(?:\s|$)/i;
const NUMBER_MARKER = /^(?:[1-9]|[1-9]\d)\.\s+\S/;
function lineKind(text) {
  const t = String(text || "").trim();
  if (ROMAN_MARKER.test(t)) return "roman";
  if (LETTER_MARKER.test(t)) return "letter";
  if (NUMBER_MARKER.test(t) && !/^\d+\.\d+/.test(t)) return "number";
  return "plain";
}

export function normalizeClauseLines(lines) {
  const items = (lines || [])
    .map((l) => (typeof l === "string" ? l : String(l?.text || "")).trim())
    .filter(Boolean)
    .map((text) => ({ text, kind: lineKind(text) }));
  if (!items.length) return [];

  const has = (k) => items.some((i) => i.kind === k);
  const hasLetter = has("letter");
  const hasRoman = has("roman");
  const hasNumber = has("number");
  const leadIn = items[0].kind === "plain" && (hasLetter || hasRoman || hasNumber);

  const letterLevel = leadIn ? 1 : 0;
  const romanLevel = hasLetter ? letterLevel + 1 : leadIn ? 1 : 0;
  const numberLevel = hasRoman
    ? romanLevel + 1
    : hasLetter
      ? letterLevel + 1
      : leadIn
        ? 1
        : 0;

  let prev = 0;
  let prevKind = null;
  let afterTail = false;
  return items.map(({ text, kind }, i) => {
    let indent = prev;
    if (kind === "letter") {
      indent = letterLevel;
      afterTail = false;
    } else if (kind === "roman") {
      indent = romanLevel;
      afterTail = false;
    } else if (kind === "number") {
      indent = numberLevel + (afterTail && !hasRoman && !leadIn ? 1 : 0);
    } else if (i === 0) {
      indent = 0;
    } else if (prevKind === "letter" || prevKind === "roman") {
      indent = prevKind === "letter" ? letterLevel : romanLevel;
      afterTail = true;
    }
    prev = indent;
    prevKind = kind;
    return { indent, text };
  });
}

/** "2.2.4 (a)(b)(1)(2)(4)" -> { number: "2.2.4", markers: ["(a)","(b)","(1)","(2)","(4)"] } */
export function splitClauseNumber(raw) {
  const s = String(raw || "").replace(/\s+/g, " ").trim();
  const m = s.match(/^(\d+(?:\.\d+)+)(?=[\s(]|$)\s*(.*)$/);
  if (!m) return { number: s, markers: [] };
  return { number: m[1], markers: m[2].match(/\([a-z0-9]+\)/gi) || [] };
}

/** If the key carried a letter marker and the text lacks one, put it in front of the text. */
export function prefixKeyMarker(lines, markers) {
  const first = (markers || [])[0];
  if (!first || !lines || !lines.length) return lines;
  if (!/^\([a-z]+\)$/i.test(first)) return lines;
  if (lineKind(lines[0].text) !== "plain") return lines;
  lines[0] = { ...lines[0], text: `${first} ${lines[0].text}` };
  return lines;
}
export function clauseIndentLevel(line) {
  const text = String(line || "").trim();
  if (ROMAN_MARKER.test(text)) return 2;
  if (NUMBER_MARKER.test(text) && !/^\d+\.\d+/.test(text)) return 1;
  return 0;
}

const CROSS_REF_WORD = /(?:articles?|sections?|paragraphs?|sub-articles?|annex(?:es)?|chapters?|clauses?|items?)$/i;

export function parseClauseLines(text) {
  let src = String(text ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n")
    .trim();
  if (!src) return [];

  src = src.replace(/[ \t]+(?=\((?:i{1,3}|iv|vi{0,3}|ix|xi{0,3}|x)\)(?:\s|$))/gi, "\n");
  // Keep "6.2.2 (a) (12) description" together. Split only when (a) starts a new item.
  src = src.replace(/[ \t]+(?=\([a-z]\)(?:\s|$))/gi, (match, offset, whole) => {
    const before = whole.slice(0, offset).trim();
    if (/\d+(?:\.\d+)+\s*(?:\([a-z0-9]+\)\s*)*$/i.test(before)) return match;
    if (before.includes("|")) return match;
    return "\n";
  });
  // "Article 3." and "Section 1." are references, not new list items.
  src = src.replace(/[ \t]+(?=(?:[1-9]|[1-9]\d)\.\s+(?!\d))/g, (match, offset, whole) => {
    const before = whole.slice(0, offset).trimEnd();
    const word = (before.match(/[A-Za-z][A-Za-z.-]*$/) || [""])[0];
    if (CROSS_REF_WORD.test(word)) return match;
    if (before.includes("|")) return match;
    return "\n";
  });

  return normalizeClauseLines(src.split("\n"));
}

function looksLikeClauseNumber(value) {
  const s = String(value || "").trim();
  if (!s || s.length > 120) return false;
  return /^\d+\.\d+/.test(s);
}

function isSeparatorCells(row) {
  const cells = (row || []).map((cell) => String(cell || "").trim()).filter(Boolean);
  return cells.length > 0 && cells.every((cell) => /^:?-{2,}:?$/.test(cell));
}

function isHeaderRow(row) {
  const first = String((row && row[0]) || "").trim().toLowerCase();
  if (!first || looksLikeClauseNumber(first)) return false;
  return /^(section|clause|item|no\.?|s\.?\s*no\.?|#|ref|reference)$/.test(first);
}

function filledCount(row) {
  return (row || []).filter((cell) => String(cell || "").trim()).length;
}

function isPipeLine(line) {
  const trimmed = String(line || "").trim();
  return trimmed.startsWith("|") && trimmed.indexOf("|", 1) !== -1;
}

function parsePipeRow(line) {
  let inner = String(line || "").trim();
  if (inner.startsWith("|")) inner = inner.slice(1);
  if (inner.endsWith("|")) inner = inner.slice(0, -1);
  return inner.split("|").map((cell) => cell.trim());
}

function pipeCells(text) {
  const raw = String(text || "").trim();
  if (!raw.includes("|")) return null;
  const cells = parsePipeRow(raw);
  if (cells.filter(Boolean).length < 2) return null;
  return cells;
}

function paragraphPipeCells(block) {
  if (!block || block.type !== "paragraph" || !block.lines) return null;
  return pipeCells((block.lines || []).map((line) => line.text).join(" "));
}

/** Join consecutive "| cell | cell |" lines into one data table. */
export function coalescePipeTables(blocks) {
  const list = Array.isArray(blocks) ? blocks : [];
  const out = [];
  let index = 0;
  while (index < list.length) {
    const cells = paragraphPipeCells(list[index]);
    if (!cells) {
      out.push(list[index]);
      index += 1;
      continue;
    }
    const rows = [cells];
    let next = index + 1;
    while (next < list.length) {
      const more = paragraphPipeCells(list[next]);
      if (!more || Math.abs(more.length - cells.length) > 1) break;
      rows.push(more);
      next += 1;
    }
    if (rows.length >= 2) {
      out.push({ type: "table", headers: rows[0], rows: rows.slice(1) });
    } else {
      out.push(list[index]);
    }
    index = next;
  }
  return out;
}

function rowsToBlocks(rows) {
  const cleaned = (rows || []).filter(
    (row) => row && row.some((cell) => String(cell || "").trim()),
  );
  if (!cleaned.length) return [];

  // A real data table (e.g. "Ref | Service | Unit | Rate"): keep it as a table.
  const headerRow = cleaned[0];
  if (
    cleaned.length > 1 &&
    headerRow.length >= 3 &&
    filledCount(headerRow) >= 3 &&
    !looksLikeClauseNumber(headerRow[0])
  ) {
    const data = cleaned.slice(1).filter((row) => !isSeparatorCells(row));
    return data.length
      ? [
          {
            type: "table",
            dataTable: true,
            headers: headerRow.map((c) => String(c || "").trim()),
            rows: data,
          },
        ]
      : [];
  }

  const body = cleaned.filter((row) => !isSeparatorCells(row) && !isHeaderRow(row));
  const clauseRows = body.filter((row) => looksLikeClauseNumber(row[0]));
  if (clauseRows.length > 0 && clauseRows.length >= Math.ceil(body.length / 2)) {
    const blocks = [];
    body.forEach((row) => {
      const number = String(row[0] || "").trim();
      const text = row
        .slice(1)
        .map((cell) => String(cell || "").trim())
        .filter(Boolean)
        .join("\n");
      if (!number && !text) return;
      const previous = blocks[blocks.length - 1];
      if (!number && previous && previous.type === "clause") {
        previous.lines.push(...parseClauseLines(text));
        return;
      }
      blocks.push({
        type: "clause",
        number,
        lines: parseClauseLines(text),
      });
    });
    return blocks;
  }

  if (cleaned[0] && cleaned[0].length > 1 && !looksLikeClauseNumber(cleaned[0][0])) {
    const headers = cleaned[0].map((cell) => String(cell || "").trim());
    const data = cleaned.slice(1).filter((row) => !isSeparatorCells(row));
    if (!data.length) return [];
    return [{ type: "table", headers, rows: data }];
  }

  return body
    .map((row) => row.filter(Boolean).join(" ").trim())
    .filter(Boolean)
    .map((text) => ({ type: "paragraph", lines: parseClauseLines(text) }));
}

function parsePlainAgreement(text) {
  const lines = String(text || "")
    .replace(/\u00a0/g, " ")
    .split(/\r?\n/);
  const blocks = [];
  let paragraph = [];

  const flushParagraph = () => {
    const joined = paragraph.join("\n").trim();
    paragraph = [];
    if (!joined) return;
    const rawLines = joined.split(/\n/).map((line) => line.trim()).filter(Boolean);
    let prose = [];
    let pipes = [];
    const emitProse = () => {
      if (!prose.length) return;
      blocks.push({ type: "paragraph", lines: parseClauseLines(prose.join("\n")) });
      prose = [];
    };
    const emitPipes = () => {
      if (pipes.length >= 2) {
        blocks.push({ type: "table", headers: pipes[0], rows: pipes.slice(1) });
      } else if (pipes.length === 1) {
        prose.push(pipes[0].join(" | "));
      }
      pipes = [];
    };
    rawLines.forEach((line) => {
      const cells = pipeCells(line);
      if (cells) {
        emitProse();
        pipes.push(cells);
        return;
      }
      emitPipes();
      prose.push(line);
    });
    emitPipes();
    emitProse();
  };

  let index = 0;
  while (index < lines.length) {
    if (isPipeLine(lines[index])) {
      flushParagraph();
      const tableLines = [];
      while (index < lines.length && isPipeLine(lines[index])) {
        tableLines.push(lines[index]);
        index += 1;
      }
      blocks.push(...rowsToBlocks(tableLines.map(parsePipeRow)));
      continue;
    }
    if (!String(lines[index] || "").trim()) {
      flushParagraph();
      index += 1;
      continue;
    }
    paragraph.push(lines[index]);
    index += 1;
  }
  flushParagraph();
  return blocks;
}

function elementText(el) {
  const html = el && el.innerHTML != null ? String(el.innerHTML) : "";
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/tr>/gi, "\n");
  const holder = document.createElement("div");
  holder.innerHTML = withBreaks;
  return (holder.textContent || "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ------------------------------------------------------------------ */
/* List numbering                                                      */
/* ------------------------------------------------------------------ */

/**
 * Carries list numbering across several lists inside the same article, so a
 * plain <ol> in Article 14 is drawn 14.1, 14.2, ... and a second <ol> in the
 * same article carries on from where the first stopped.
 * Pass the article number as `prefix`, or "" for no article numbering.
 */
export function createNumberingContext(prefix = "") {
  return { prefix: String(prefix || ""), next: 0 };
}

const LITERAL_ITEM_NO = /^(\d{1,2})\.\s+/;
const ALREADY_NUMBERED = /^(?:\d+(?:\.\d+)+\.?\s|\d{1,2}\.\s|\([a-z]{1,4}\)\s)/i;

function listToBlocks(list, ctx, depth = 0) {
  const ordered = String(list.tagName || "").toLowerCase() === "ol";
  const type = list.getAttribute("type") || "";
  const letters = type === "a" || type === "A";
  // Top-level plain-decimal <ol> inside an article => 14.1, 14.2, ...
  const articleNumbered =
    ordered && depth === 0 && !!ctx.prefix && (!type || type === "1");
  const start = parseInt(list.getAttribute("start"), 10);

  let counter = Number.isFinite(start) ? start - 1 : articleNumbered ? ctx.next : 0;
  const blocks = [];

  Array.from(list.children || []).forEach((li) => {
    if (!li || String(li.tagName || "").toLowerCase() !== "li") return;

    const value = parseInt(li.getAttribute("value"), 10);
    counter = Number.isFinite(value) ? value : counter + 1;

    const nested = Array.from(li.children).filter((c) => /^(ol|ul)$/i.test(c.tagName || ""));
    const clone = li.cloneNode(true);
    clone.querySelectorAll("ol, ul").forEach((n) => n.remove());
    const text = elementText(clone);

    let block = null;
    const clauseMatch = text.match(/^(\d+(?:\.\d+)+)\s+([\s\S]*)$/);
    if (clauseMatch) {
      block = {
        type: "clause",
        number: clauseMatch[1],
        lines: parseClauseLines(clauseMatch[2]),
      };
      if (articleNumbered && clauseMatch[1].startsWith(`${ctx.prefix}.`)) {
        const tail = parseInt(clauseMatch[1].split(".").pop(), 10);
        if (Number.isFinite(tail)) counter = tail;
      }
    } else {
      const lines = parseClauseLines(text);
      if (lines.length) {
        const literal = lines[0].text.match(LITERAL_ITEM_NO);
        if (articleNumbered && (literal || !ALREADY_NUMBERED.test(lines[0].text))) {
          if (literal) {
            counter = parseInt(literal[1], 10);
            lines[0] = { ...lines[0], text: lines[0].text.replace(LITERAL_ITEM_NO, "") };
          }
          block = { type: "clause", number: `${ctx.prefix}.${counter}`, lines };
        } else {
          if (ordered && !ALREADY_NUMBERED.test(lines[0].text)) {
            const marker = letters ? `(${String.fromCharCode(96 + counter)})` : `${counter}.`;
            lines[0] = { indent: 2, text: `${marker} ${lines[0].text}` };
          }
          block = { type: "paragraph", lines };
        }
      }
    }

    if (block) blocks.push(block);
    nested.forEach((node) => {
      const sub = listToBlocks(node, ctx, depth + 1);
      if (block && block.type === "clause") {
        sub.forEach((b) => b.lines && block.lines.push(...b.lines));
      } else {
        blocks.push(...sub);
      }
    });
  });

  if (articleNumbered) ctx.next = counter;
  return blocks;
}

function walkHtml(node, blocks, ctx) {
  Array.from(node.childNodes || []).forEach((child) => {
    if (child.nodeType === 3) {
      if (String(child.textContent || "").trim()) {
        blocks.push(...parsePlainAgreement(child.textContent));
      }
      return;
    }
    if (child.nodeType !== 1) return;
    const tag = String(child.tagName || "").toLowerCase();
    if (tag === "table") {
      const rows = Array.from(child.querySelectorAll("tr")).map((tr) =>
        Array.from(tr.children || [])
          .filter((cell) => /^(td|th)$/i.test(cell.tagName || ""))
          .map((cell) => elementText(cell)),
      );
      blocks.push(...rowsToBlocks(rows));
      return;
    }
    if (tag === "ul" || tag === "ol") {
      blocks.push(...listToBlocks(child, ctx));
      return;
    }
    if (child.querySelector && child.querySelector("table, ul, ol")) {
      walkHtml(child, blocks, ctx);
      return;
    }
    const text = elementText(child);
    if (text) blocks.push(...parsePlainAgreement(text));
  });
}

/**
 * @param {string} input   HTML, markdown pipe text or plain text
 * @param {{ numbering?: ReturnType<typeof createNumberingContext> }} [options]
 *   Pass the same numbering context for every call that belongs to one article.
 */
export function parseAgreementDocument(input, { numbering } = {}) {
  if (input == null || input === "") return [];
  const raw = String(input);
  if (typeof document !== "undefined" && /<[a-z][\s\S]*>/i.test(raw)) {
    const ctx = numbering || createNumberingContext("");
    const root = document.createElement("div");
    root.innerHTML = raw;
    const blocks = [];
    walkHtml(root, blocks, ctx);
    if (blocks.length) return coalescePipeTables(blocks);
  }
  const plain = raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<tr[^>]*>/gi, "\n| ")
    .replace(/<\/t[dh]>/gi, " | ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&");
  return coalescePipeTables(parsePlainAgreement(plain));
}

/**
 * Opt-in heuristic. When paragraphs in one article all start with the same
 * "13.1" (typed by hand in the template), count them up: 13.1, 13.2, 13.3...
 * The real fix is correcting the template text; this only hides the symptom.
 */
const LEAD_NUM = /^(\d+)\.(\d+)(\s)/;
export function renumberRepeatedParagraphs(blocks) {
  let last = null;
  return (blocks || []).map((block) => {
    const first = block && block.type === "paragraph" && block.lines?.[0]?.text;
    const m = first && first.match(LEAD_NUM);
    if (!m) {
      last = null;
      return block;
    }
    const art = m[1];
    const orig = parseInt(m[2], 10);
    const sub = last && last.art === art && orig <= last.sub ? last.sub + 1 : orig;
    last = { art, sub };
    if (sub === orig) return block;
    const lines = block.lines.slice();
    lines[0] = {
      ...lines[0],
      text: lines[0].text.replace(LEAD_NUM, (_, a, b, ws) => `${art}.${sub}${ws}`),
    };
    return { ...block, lines };
  });
}

export function selectHandlingCompany(businesses, submission = {}) {
  const list = Array.isArray(businesses) ? businesses.filter(Boolean) : [];
  if (!list.length) return null;

  const fd =
    submission.form_details && typeof submission.form_details === "object"
      ? submission.form_details
      : {};
  const airportId = fd.airport_id != null ? String(fd.airport_id) : "";
  const city = String(fd.airport_city || submission.city || "").trim().toLowerCase();
  const iata = String(fd.airport_iata || "").trim().toLowerCase();
  const location = String(fd.location || submission.location || "").trim().toLowerCase();

  const airportsOf = (business) =>
    Array.isArray(business.airports) ? business.airports : [];

  const matched = list.find((business) =>
    airportsOf(business).some((airport) => {
      if (!airport) return false;
      if (airportId && String(airport.airport_id) === airportId) return true;
      if (iata && String(airport.iata || "").trim().toLowerCase() === iata) return true;
      const airportCity = String(airport.city || "").trim().toLowerCase();
      if (city && airportCity && airportCity === city) return true;
      if (location && airportCity && location.includes(airportCity)) return true;
      return false;
    }),
  );
  if (matched) return matched;

  const indoThai = list.filter((business) => /indothai/i.test(business.name || ""));
  if (indoThai.length === 1) return indoThai[0];
  if (list.length === 1) return list[0];
  return null;
}

export function formatOfficeAddress(record, keys) {
  if (!record) return "";
  return keys
    .map((key) => (record[key] == null ? "" : String(record[key]).trim()))
    .filter(Boolean)
    .join(", ");
}