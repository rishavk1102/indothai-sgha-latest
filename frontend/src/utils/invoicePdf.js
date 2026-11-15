import jsPDF from "jspdf";

function money(value, currency = "INR") {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency || ""} ${n.toFixed(2)}`.trim();
  }
}

function addr(party) {
  if (!party) return "";
  return [party.address1, party.address2, party.city, party.state, party.pincode, party.country]
    .filter(Boolean)
    .join(", ");
}

export function downloadInvoicePdf(invoice) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const currency = invoice.currency || "INR";
  let y = 18;

  doc.setFontSize(16);
  doc.text("TAX INVOICE", 14, y);
  doc.setFontSize(11);
  doc.text(invoice.invoice_no || "", 196, y, { align: "right" });
  y += 8;
  doc.setFontSize(9);
  doc.text(`Status: ${invoice.status || ""}`, 196, y, { align: "right" });
  y += 8;

  const from = invoice.bill_from || invoice.business || {};
  const to = invoice.bill_to || invoice.client || {};
  doc.setFontSize(10);
  doc.text("From", 14, y);
  doc.text("Bill to", 110, y);
  y += 5;
  doc.setFontSize(9);
  const fromLines = doc.splitTextToSize(
    [from.name, addr(from), from.gstin ? `GSTIN: ${from.gstin}` : "", from.pan ? `PAN: ${from.pan}` : ""]
      .filter(Boolean)
      .join("\n"),
    90
  );
  const toLines = doc.splitTextToSize(
    [to.name, addr(to), to.gstin ? `GSTIN: ${to.gstin}` : "", to.pan ? `PAN: ${to.pan}` : ""]
      .filter(Boolean)
      .join("\n"),
    86
  );
  doc.text(fromLines, 14, y);
  doc.text(toLines, 110, y);
  y += Math.max(fromLines.length, toLines.length) * 4.2 + 8;

  doc.text(
    `Period: ${invoice.period_from || "—"} to ${invoice.period_to || "—"}`,
    14,
    y
  );
  if (invoice.issued_at) {
    doc.text(`Issued: ${new Date(invoice.issued_at).toLocaleString()}`, 110, y);
  }
  y += 8;

  const cols = [14, 92, 118, 140, 162];
  doc.setFillColor(158, 82, 163);
  doc.rect(14, y - 4, 182, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.text("Description", cols[0], y);
  doc.text("Type", cols[1], y);
  doc.text("Qty", cols[2], y);
  doc.text("Rate", cols[3], y);
  doc.text("Amount", cols[4], y);
  doc.setTextColor(0, 0, 0);
  y += 6;

  (invoice.lines || []).forEach((line) => {
    if (y > 270) {
      doc.addPage();
      y = 18;
    }
    const desc = doc.splitTextToSize(String(line.description || ""), 76);
    doc.text(desc, cols[0], y);
    doc.text(String(line.line_type || ""), cols[1], y);
    doc.text(String(line.qty ?? ""), cols[2], y);
    doc.text(money(line.unit_rate, currency), cols[3], y);
    doc.text(money(line.amount, currency), cols[4], y);
    y += Math.max(desc.length, 1) * 4.2 + 1;
  });

  y += 6;
  doc.text(`Subtotal: ${money(invoice.subtotal, currency)}`, 196, y, { align: "right" });
  y += 5;
  doc.text(`Tax: ${money(invoice.tax_total, currency)}`, 196, y, { align: "right" });
  y += 6;
  doc.setFontSize(12);
  doc.text(`Grand total: ${money(invoice.grand_total, currency)}`, 196, y, {
    align: "right",
  });

  doc.save(`${invoice.invoice_no || "invoice"}.pdf`);
}
