import jsPDF from "jspdf";

/** PDF-safe money — Helvetica cannot draw ₹ from en-IN currency format. */
function money(value, currency = "INR") {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  const code = String(currency || "INR").toUpperCase();
  if (code === "INR") return `Rs. ${formatted}`;
  if (code === "USD") return `USD ${formatted}`;
  return `${code} ${formatted}`;
}

function addr(party) {
  if (!party) return "";
  return [party.address1, party.address2, party.city, party.state, party.pincode, party.country]
    .filter(Boolean)
    .join(", ");
}

function rightText(doc, text, xRight, y) {
  doc.text(String(text ?? ""), xRight, y, { align: "right" });
}

export function downloadInvoicePdf(invoice) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 14;
  const marginRight = 14;
  const contentRight = pageWidth - marginRight;
  const currency = invoice.currency || "INR";
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("TAX INVOICE", marginLeft, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  rightText(doc, invoice.invoice_no || "", contentRight, y);
  y += 7;
  doc.setFontSize(9);
  rightText(doc, `Status: ${invoice.status || ""}`, contentRight, y);
  y += 10;

  const from = invoice.bill_from || invoice.business || {};
  const to = invoice.bill_to || invoice.client || {};
  const midX = 110;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("From", marginLeft, y);
  doc.text("Bill to", midX, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const fromLines = doc.splitTextToSize(
    [from.name, addr(from), from.gstin ? `GSTIN: ${from.gstin}` : "", from.pan ? `PAN: ${from.pan}` : ""]
      .filter(Boolean)
      .join("\n"),
    88
  );
  const toLines = doc.splitTextToSize(
    [to.name, addr(to), to.gstin ? `GSTIN: ${to.gstin}` : "", to.pan ? `PAN: ${to.pan}` : ""]
      .filter(Boolean)
      .join("\n"),
    82
  );
  doc.text(fromLines, marginLeft, y);
  doc.text(toLines, midX, y);
  y += Math.max(fromLines.length, toLines.length) * 4.2 + 8;

  doc.text(
    `Period: ${invoice.period_from || "-"} to ${invoice.period_to || "-"}`,
    marginLeft,
    y
  );
  if (invoice.issued_at) {
    rightText(
      doc,
      `Issued: ${new Date(invoice.issued_at).toLocaleString("en-IN")}`,
      contentRight,
      y
    );
  }
  y += 10;

  // Columns: Description | Type | Qty | Rate | Amount
  const colDesc = marginLeft;
  const colType = 88;
  const colQty = 122;
  const colRate = 158;
  const colAmount = contentRight;
  const tableWidth = contentRight - marginLeft;

  doc.setFillColor(158, 82, 163);
  doc.rect(marginLeft, y - 4.5, tableWidth, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Description", colDesc + 1, y);
  doc.text("Type", colType, y);
  rightText(doc, "Qty", colQty, y);
  rightText(doc, "Rate", colRate, y);
  rightText(doc, "Amount", colAmount, y);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  y += 7;

  (invoice.lines || []).forEach((line, index) => {
    if (y > 265) {
      doc.addPage();
      y = 18;
    }
    if (index % 2 === 1) {
      doc.setFillColor(248, 244, 249);
      doc.rect(marginLeft, y - 3.5, tableWidth, 6.5, "F");
    }
    const desc = doc.splitTextToSize(String(line.description || "-"), 68);
    const rowH = Math.max(desc.length, 1) * 4.2;
    doc.text(desc, colDesc + 1, y);
    doc.text(String(line.line_type || "-").slice(0, 18), colType, y);
    rightText(
      doc,
      Number.isFinite(Number(line.qty)) ? Number(line.qty).toFixed(2) : "-",
      colQty,
      y
    );
    rightText(doc, money(line.unit_rate, currency), colRate, y);
    rightText(doc, money(line.amount, currency), colAmount, y);
    y += rowH + 2;
  });

  y += 4;
  doc.setDrawColor(220, 220, 220);
  doc.line(colRate - 40, y, contentRight, y);
  y += 7;

  doc.setFontSize(9);
  rightText(doc, `Subtotal: ${money(invoice.subtotal, currency)}`, contentRight, y);
  y += 5;
  rightText(doc, `Tax: ${money(invoice.tax_total, currency)}`, contentRight, y);
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  rightText(
    doc,
    `Grand total: ${money(invoice.grand_total, currency)}`,
    contentRight,
    y
  );

  doc.save(`${invoice.invoice_no || "invoice"}.pdf`);
}
