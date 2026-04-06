#!/usr/bin/env node
/**
 * Diagnose why PDF-extracted or saved template text looks like one paragraph.
 *
 * Checks:
 * - Newline density (PDF extraction often yields 0–1 newlines in a long string)
 * - Whether reflow heuristics would split the text (must match PdfUploads.js)
 * - Rough HTML output: <p> count after format step (simplified counter)
 *
 * Usage (from backend folder):
 *   node scripts/diagnose-pdf-template-text.js --file path/to/extracted.txt
 *   node scripts/diagnose-pdf-template-text.js --year 2027 --type "Annex A"
 *   node scripts/diagnose-pdf-template-text.js --year 2027 --type "Annex A" --template-name "My PDF Template"
 *
 * If --file is omitted and DB args given, loads Template row and scans each editor field value.
 *
 * Sync note: reflowPdfExtractedText must stay aligned with
 * frontend/src/pages/Admin/PdfUploads.js
 */

const fs = require("fs");
const path = require("path");

// --- Copy of reflowPdfExtractedText from PdfUploads.js (keep in sync) ---
function reflowPdfExtractedText(text) {
  if (typeof text !== "string") return text;
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const trimmed = normalized.trim();
  if (!trimmed) return normalized;

  const nonEmptyLines = trimmed
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (nonEmptyLines.length >= 4) return normalized;
  if (trimmed.length < 100) return normalized;

  let s = trimmed.replace(/[ \t]+/g, " ").trim();

  s = s.replace(
    /\s+((?:ARTICLE|SECTION|PARAGRAPH)\s+\d+[.\s:])/gi,
    "\n\n$1",
  );
  s = s.replace(/\s+(ANNEX\s+[AB]\b)/gi, "\n\n$1");
  s = s.replace(
    /\s+(\d{1,2}\.\d{1,2}(?![.\d]))\s+(?=[A-Za-z(])/g,
    "\n$1 ",
  );
  s = s.replace(/\s+(\([a-z]\))\s+/gi, "\n$1 ");
  s = s.replace(/\s+(\(\d{1,2}\))\s+/g, "\n$1 ");
  s = s.replace(/\s+([•·▪])\s+/g, "\n$1 ");
  s = s.replace(/\.\s{2,}(?=[A-Z(0-9])/g, ".\n\n");

  return s.trim();
}

function textStats(s) {
  if (typeof s !== "string") return null;
  const len = s.length;
  const nl = (s.match(/\n/g) || []).length;
  const nonEmptyLines = s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean).length;
  const doubleSpaceAfterPeriod = (s.match(/\.\s{2,}/g) || []).length;
  const articleHits = (s.match(/\b(ARTICLE|SECTION|PARAGRAPH)\s+\d+/gi) || [])
    .length;
  const annexHits = (s.match(/\bANNEX\s+[AB]\b/gi) || []).length;
  const subsecHits = (s.match(/\d{1,2}\.\d{1,2}(?![.\d])\s+[A-Za-z(]/g) || [])
    .length;
  const parenLetterHits = (s.match(/\([a-z]\)/gi) || []).length;
  const bulletHits = (s.match(/[•·▪]/g) || []).length;
  return {
    len,
    nl,
    nonEmptyLines,
    doubleSpaceAfterPeriod,
    articleHits,
    annexHits,
    subsecHits,
    parenLetterHits,
    bulletHits,
  };
}

/** Rough count of <p ...> tags formatContentWithBulletLists would emit (approximation). */
function approximateParagraphTagsAfterReflow(text) {
  if (!text || typeof text !== "string") return 0;
  const reflowed = reflowPdfExtractedText(text);
  const lines = reflowed.split(/\r?\n/).map((l) => l.trim());
  let paras = 0;
  for (const line of lines) {
    if (!line) continue;
    if (/^•\s*/.test(line)) continue;
    if (/^\d+\.\s+/.test(line)) continue;
    paras += 1;
  }
  return paras;
}

function printStats(title, raw) {
  console.log("\n" + "=".repeat(72));
  console.log(title);
  console.log("=".repeat(72));

  if (raw == null) {
    console.log("(null/undefined)");
    return;
  }
  if (typeof raw !== "string") {
    console.log("Type:", typeof raw, "(expected string for text diagnostics)");
    return;
  }

  const before = textStats(raw);
  const reflowed = reflowPdfExtractedText(raw);
  const after = textStats(reflowed);
  const unchanged = raw === reflowed;

  console.log("Length (chars):", before.len);
  console.log("Newline count:", before.nl);
  console.log("Non-empty lines:", before.nonEmptyLines);
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(raw);
  console.log(
    "Has HTML tags (client uses innerHTML if no <ol>/<ul>):",
    looksLikeHtml,
  );
  if (!looksLikeHtml && before.nonEmptyLines > 4) {
    console.log(
      "  Tip: plain text with many newlines must not be set via innerHTML alone — use pre-line or <br> (see Sgha_annexA parseEditorContent fallback).",
    );
  }
  console.log(
    "Likely cause of 'one block':",
    before.nonEmptyLines <= 2 && before.len > 200
      ? "VERY FEW line breaks — typical of PDF text extraction joining lines with spaces."
      : before.nonEmptyLines <= 2
        ? "Short text; may be fine."
        : !looksLikeHtml
          ? "Plain text with line breaks — if UI still shows one block, rendering used innerHTML without pre-line (fixed in Sgha_annexA)."
          : "Multiple lines / HTML; if one block, check list parsing or CSS.",
  );
  console.log("\nPattern counts (helps reflow):");
  console.log(
    "  ARTICLE/SECTION/PARAGRAPH + number:",
    before.articleHits,
  );
  console.log("  ANNEX A/B:", before.annexHits);
  console.log("  Subsection like 1.1 before word:", before.subsecHits);
  console.log("  (a) (b) style:", before.parenLetterHits);
  console.log("  Bullet chars •·▪:", before.bulletHits);
  console.log("  Period + 2+ spaces (paragraph hint):", before.doubleSpaceAfterPeriod);

  console.log("\nreflowPdfExtractedText:");
  console.log("  Skipped (already structured)?", before.nonEmptyLines >= 4);
  console.log("  Output unchanged vs input?", unchanged);
  if (!unchanged) {
    console.log("  After reflow — non-empty lines:", after.nonEmptyLines);
    console.log(
      "  After reflow — newlines:",
      after.nl,
    );
  }
  console.log(
    "  Approx. logical lines for <p> (non-list):",
    approximateParagraphTagsAfterReflow(raw),
  );

  const previewLen = 420;
  console.log("\n--- Preview (first " + previewLen + " chars, raw) ---");
  console.log(JSON.stringify(raw.slice(0, previewLen)) + (raw.length > previewLen ? "…" : ""));
  if (!unchanged) {
    console.log("\n--- Preview (first " + previewLen + " chars, after reflow) ---");
    console.log(
      JSON.stringify(reflowed.slice(0, previewLen)) +
        (reflowed.length > previewLen ? "…" : ""),
    );
  }
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const out = { file: null, year: null, type: null, templateName: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file" && argv[i + 1]) out.file = argv[++i];
    else if (a === "--year" && argv[i + 1]) out.year = parseInt(argv[++i], 10);
    else if (a === "--type" && argv[i + 1]) out.type = argv[++i];
    else if (a === "--template-name" && argv[i + 1]) out.templateName = argv[++i];
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

async function runDb(year, type, templateName) {
  require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
  const sequelize = require("../config/database");
  const Template = require("../NewModels/Template");

  const where = {
    year: parseInt(year, 10),
    type,
    template_name:
      templateName != null && String(templateName).trim() !== ""
        ? String(templateName).trim()
        : null,
  };

  const row = await Template.findOne({ where });
  if (!row) {
    console.error(
      "No Template row for",
      JSON.stringify(where),
    );
    process.exitCode = 1;
    await sequelize.close();
    return;
  }

  console.log("Template id:", row.id, "| year:", row.year, "| type:", row.type);
  console.log("template_name:", row.template_name);

  let content = row.content;
  if (typeof content === "string") {
    try {
      content = JSON.parse(content);
    } catch {
      printStats("Raw string content (not JSON array)", content);
      await sequelize.close();
      return;
    }
  }

  if (!Array.isArray(content)) {
    console.log("content is not an array:", typeof content);
    printStats("Stringified content", JSON.stringify(content).slice(0, 5000));
    await sequelize.close();
    return;
  }

  const editors = content.filter((f) => f && f.type === "editor");
  console.log("\nTotal fields:", content.length, "| editor fields:", editors.length);

  if (editors.length === 0) {
    content.forEach((f, i) => {
      const v = f && (f.value ?? f.text ?? f.content);
      if (typeof v === "string" && v.length > 50) {
        printStats(`Field[${i}] type=${f.type}`, v);
      }
    });
  } else {
    editors.forEach((f, i) => {
      const v = f.value ?? f.content ?? f.text ?? "";
      if (typeof v !== "string") {
        console.log("\nEditor", i, ": value is", typeof v);
        return;
      }
      const label = f.label || "Content";
      printStats(`Editor #${i + 1} (${label})`, v);
    });
  }

  await sequelize.close();
}

async function main() {
  const args = parseArgs();
  if (args.help || process.argv.length <= 2) {
    console.log(`
Diagnose PDF / template text (why it looks like one paragraph).

  node scripts/diagnose-pdf-template-text.js --file ./extracted.txt

  node scripts/diagnose-pdf-template-text.js --year 2027 --type "Annex A"
  node scripts/diagnose-pdf-template-text.js --year 2027 --type "Main Agreement" --template-name "Named Template"

Environment: for DB mode, run from backend/ with .env configured.
`);
    process.exit(0);
  }

  if (args.file) {
    const abs = path.isAbsolute(args.file)
      ? args.file
      : path.join(process.cwd(), args.file);
    if (!fs.existsSync(abs)) {
      console.error("File not found:", abs);
      process.exit(1);
    }
    const raw = fs.readFileSync(abs, "utf8");
    printStats("File: " + abs, raw);
    return;
  }

  if (args.year != null && args.type) {
    await runDb(args.year, args.type, args.templateName);
    return;
  }

  console.error("Provide --file <path> OR --year <n> --type <Main Agreement|Annex A|Annex B> [--template-name ...]");
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
