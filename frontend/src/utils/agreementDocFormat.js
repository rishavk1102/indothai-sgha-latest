/**
 * Agreement / template body text: many DB rows and PDF extracts are plain text with newlines.
 * Setting that string as innerHTML collapses line breaks in the browser; contenteditable does the same.
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
    const lines = block.split(/\r?\n/);
    const inner = lines.map((line) => escapeHtml(line)).join("<br>");
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
  return plainTextToAgreementHtml(s);
}
