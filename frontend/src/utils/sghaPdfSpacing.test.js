const { TextEncoder, TextDecoder } = require("util");

global.TextEncoder = global.TextEncoder || TextEncoder;
global.TextDecoder = global.TextDecoder || TextDecoder;

const { default: jsPDF } = require("jspdf");
const {
  drawAgreementBlocks,
  PDF_BOLD_CLOSE,
  PDF_BOLD_OPEN,
} = require("./sdaPdfLayout");
const { parseAgreementDocument } = require("./sghaClauseParser");

function capture(blocks) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const placed = [];
  const text = doc.text.bind(doc);
  doc.text = (value, x, y, ...rest) => {
    if (typeof value === "string") {
      placed.push({ text: value, x, y, bold: doc.getFont().fontStyle === "bold" });
    }
    return text(value, x, y, ...rest);
  };
  drawAgreementBlocks(doc, 40, blocks);
  return placed;
}

describe("pdf spacing and inline values", () => {
  test("empty editor lines between 3.1, 3.2 and 3.3 leave a gap", () => {
    const html =
      "3.1 The Handling Company is entitled to delegate any of the agreed services.\nIt is understood that the Handling Company shall be responsible.&nbsp;" +
      "<div><br></div><div>3.2 The Carrier shall not appoint any other person.&nbsp;</div>" +
      "<div><br></div><div>3.3 The Carrier shall not perform self-handling.</div>";
    const placed = capture(parseAgreementDocument(html));
    const y = (start) => placed.find((p) => p.text.startsWith(start)).y;
    const step = y("It is understood") - y("3.1 The Handling");
    expect(y("3.2 The Carrier") - y("It is understood")).toBeGreaterThan(step * 1.8);
    expect(y("3.3 The Carrier") - y("3.2 The Carrier")).toBeGreaterThan(step * 1.8);
  });

  test("a filled value is drawn bold on the same line as the sentence", () => {
    const html = `<div>plus an accounting surcharge of ${PDF_BOLD_OPEN}11 %${PDF_BOLD_CLOSE}. In order to claim such disbursements.</div>`;
    const placed = capture(parseAgreementDocument(html));
    const before = placed.find((p) => p.text.includes("surcharge"));
    const bold = placed.filter((p) => p.bold).map((p) => p.text).join("");
    expect(bold.trim()).toBe("11 %");
    placed
      .filter((p) => p.bold)
      .forEach((p) => expect(p.y).toBeCloseTo(before.y, 3));
    expect(placed.find((p) => p.text.startsWith(".")).bold).toBe(false);
    expect(placed.some((p) => /Surcharge Percent/.test(p.text))).toBe(false);
    expect(placed.some((p) => /[\uE000\uE001]/.test(p.text))).toBe(false);
  });
});
