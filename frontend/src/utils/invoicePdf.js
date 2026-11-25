import jsPDF from "jspdf";
import footerLogo from "../assets/images/footer_logo.png";

const BRAND = [158, 82, 163]; // #9e52a3 — same as FHR report

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

function partyAddr(party) {
  if (!party) return "";
  const line = [
    party.address1,
    party.address2,
    [party.city, party.pincode].filter(Boolean).join(" - "),
    party.state,
    party.country,
  ]
    .filter(Boolean)
    .join(", ");
  return line;
}

function rightText(doc, text, xRight, y) {
  doc.text(String(text ?? ""), xRight, y, { align: "right" });
}

function formatDate(value) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function pickParty(primary, fallback = {}) {
  const a = primary && typeof primary === "object" ? primary : {};
  const b = fallback && typeof fallback === "object" ? fallback : {};
  const pick = (key) => a[key] || b[key] || "";
  return {
    name: pick("name"),
    gstin: pick("gstin"),
    pan: pick("pan"),
    address1: pick("address1"),
    address2: pick("address2"),
    city: pick("city"),
    state: pick("state"),
    pincode: pick("pincode"),
    country: pick("country"),
    email: pick("email"),
    phone: pick("phone"),
    bank: pick("bank"),
    branch: pick("branch"),
    account_no: pick("account_no"),
    ifsc: pick("ifsc"),
    swift_code: pick("swift_code"),
    cin: pick("cin"),
  };
}

function pickBiz(invoice) {
  const from = invoice.bill_from || {};
  const biz = invoice.business || {};
  return {
    ...pickParty(from, biz),
    iata: from.iata || invoice.airport?.iata || "",
  };
}

function pickHeader(invoice) {
  const from = invoice.bill_from || {};
  const h = invoice.header || {};
  return {
    category: h.category || from.category || "",
    airline: h.airline || from.airline || "",
    aircraft_type: h.aircraft_type || from.aircraft_type || "",
    ice_no: h.ice_no || from.ice_no || "",
    epcg_no: h.epcg_no || from.epcg_no || "",
    country_of_origin_of_service:
      h.country_of_origin_of_service || from.country_of_origin_of_service || "",
    place_of_delivery_of_service:
      h.place_of_delivery_of_service || from.place_of_delivery_of_service || "",
  };
}

function drawPurpleHeader(doc, title, pageWidth, marginLeft, marginRight) {
  const barH = 14;
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageWidth, barH, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, pageWidth / 2, 9.2, { align: "center" });
  doc.setTextColor(0, 0, 0);
  return barH + 4;
}

function footerLines(biz) {
  return [
    biz.name || "",
    [
      biz.bank ? `Bank : ${biz.bank}` : null,
      biz.branch ? `Branch : ${biz.branch}` : null,
      biz.account_no ? `A/c No : ${biz.account_no}` : null,
    ]
      .filter(Boolean)
      .join(" | "),
    [
      biz.ifsc ? `RTGS/NEFT IFSC : ${biz.ifsc}` : null,
      biz.swift_code ? `SWIFT Code : ${biz.swift_code}` : null,
      biz.cin ? `CIN : ${biz.cin}` : null,
    ]
      .filter(Boolean)
      .join(" | "),
    [
      biz.email ? `Email : ${biz.email}` : null,
      biz.phone ? `Mobile : ${biz.phone}` : null,
    ]
      .filter(Boolean)
      .join(" | "),
  ].filter(Boolean);
}

/** Fixed height for the purple bank footer band (pinned to page bottom). */
function measureFooterHeight(doc, biz, pageWidth) {
  const contentW = pageWidth - 20;
  const lines = footerLines(biz);
  const lineH = 4.2;
  const padY = 5;
  let textLines = 0;
  lines.forEach((line, idx) => {
    doc.setFont("helvetica", idx === 0 ? "bold" : "normal");
    doc.setFontSize(idx === 0 ? 10 : 8);
    textLines += doc.splitTextToSize(line, contentW).length;
  });
  return padY * 2 + Math.max(textLines, 1) * lineH + 2;
}

/** Draw FHR-style purple footer flush to the bottom of the current page. */
function drawPurpleFooterAtBottom(doc, biz, pageWidth, pageHeight) {
  const contentW = pageWidth - 20;
  const lines = footerLines(biz);
  const lineH = 4.2;
  const padY = 5;
  const barH = measureFooterHeight(doc, biz, pageWidth);
  const y = pageHeight - barH;

  doc.setFillColor(...BRAND);
  doc.rect(0, y, pageWidth, barH, "F");
  doc.setTextColor(255, 255, 255);
  let ty = y + padY + 3.5;
  lines.forEach((line, idx) => {
    doc.setFont("helvetica", idx === 0 ? "bold" : "normal");
    doc.setFontSize(idx === 0 ? 10 : 8);
    const wrapped = doc.splitTextToSize(line, contentW);
    wrapped.forEach((wline) => {
      doc.text(wline, pageWidth / 2, ty, { align: "center" });
      ty += lineH;
    });
  });
  doc.setTextColor(0, 0, 0);
  return barH;
}

/**
 * Tax Invoice PDF — header/footer match FHR download (purple band + logo + bank footer).
 */
export function downloadInvoicePdf(invoice) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 12;
  const marginRight = 12;
  const contentRight = pageWidth - marginRight;
  const currency = invoice.currency || "INR";
  const biz = pickBiz(invoice);
  const to = pickParty(invoice.bill_to, invoice.client);
  const header = pickHeader(invoice);
  const footerH = measureFooterHeight(doc, biz, pageWidth);
  const contentBottom = pageHeight - footerH - 8;

  let y = drawPurpleHeader(doc, "TAX INVOICE", pageWidth, marginLeft, marginRight);

  // Two-column intro matching FHR: left parties | right logo + flight meta
  const colGap = 4;
  const rightColW = 68;
  const rightColX = contentRight - rightColW;
  const leftColW = rightColX - marginLeft - colGap;
  const ruleColor = [200, 200, 200];

  const drawRule = (x1, x2, atY) => {
    doc.setDrawColor(...ruleColor);
    doc.setLineWidth(0.2);
    doc.line(x1, atY, x2, atY);
  };

  // —— Left column: invoice no / date / provider ——
  let leftY = y;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const invLabel = biz.iata
    ? `Tax Invoice No. : ${biz.iata}/${invoice.invoice_no || "—"}`
    : `Tax Invoice No. : ${invoice.invoice_no || "—"}`;
  doc.text(invLabel, marginLeft, leftY);
  leftY += 3;
  drawRule(marginLeft, rightColX - colGap, leftY);
  leftY += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `Date : ${formatDate(invoice.issued_at || invoice.period_from || invoice.createdAt)}`,
    marginLeft,
    leftY
  );
  leftY += 3;
  drawRule(marginLeft, rightColX - colGap, leftY);
  leftY += 5;

  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.text("Service Provider :", marginLeft, leftY);
  doc.setTextColor(0, 0, 0);
  leftY += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const providerName = doc.splitTextToSize(biz.name || "—", leftColW);
  doc.text(providerName, marginLeft, leftY);
  leftY += providerName.length * 4.2 + 1;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const providerAddr = doc.splitTextToSize(partyAddr(biz) || "—", leftColW);
  doc.text(providerAddr, marginLeft, leftY);
  leftY += providerAddr.length * 3.8 + 1;
  if (biz.gstin) {
    doc.setFont("helvetica", "bold");
    doc.text("GSTIN : ", marginLeft, leftY);
    doc.setFont("helvetica", "normal");
    doc.text(String(biz.gstin), marginLeft + 16, leftY);
    leftY += 4;
  }
  leftY += 2;
  drawRule(marginLeft, rightColX - colGap, leftY);
  leftY += 5;

  // —— Right column: logo + Category / Airline / … ——
  const logoW = 48;
  const logoH = 20;
  const logoX = rightColX + (rightColW - logoW) / 2;
  let rightY = y;
  try {
    doc.addImage(footerLogo, "PNG", logoX, rightY - 2, logoW, logoH);
  } catch (e) {
    // Logo optional if asset fails to load in some builds.
  }
  rightY += logoH + 2;
  drawRule(rightColX, contentRight, rightY);
  rightY += 5;

  const metaRows = [
    ["Category :", header.category],
    ["Airline :", header.airline],
    ["Aircraft Type :", header.aircraft_type],
    ["IEC No. :", header.ice_no],
    ["EPCG No. :", header.epcg_no],
    ["Country of Origin of Services :", header.country_of_origin_of_service],
    ["Place of Delivery of Service :", header.place_of_delivery_of_service],
  ];
  metaRows.forEach(([label, value], idx) => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    const labelText = `${label} `;
    const labelW = doc.getTextWidth(labelText);
    doc.text(label, rightColX, rightY);
    doc.setFont("helvetica", "normal");
    if (labelW > rightColW - 20) {
      const valLines = doc.splitTextToSize(String(value || "—"), rightColW);
      doc.text(valLines, rightColX, rightY + 3.6);
      rightY += (valLines.length + 1) * 3.6 + 1.2;
    } else {
      const valLines = doc.splitTextToSize(
        String(value || "—"),
        rightColW - labelW
      );
      doc.text(valLines, rightColX + labelW, rightY);
      rightY += Math.max(valLines.length, 1) * 3.6 + 1.5;
    }
    if (idx < metaRows.length - 1) {
      drawRule(rightColX, contentRight, rightY - 0.8);
      rightY += 3.2;
    }
  });

  // —— Left column continued: Service Provided To ——
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.text("Service Provided To :", marginLeft, leftY);
  doc.setTextColor(0, 0, 0);
  leftY += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const toName = doc.splitTextToSize(to.name || "—", leftColW);
  doc.text(toName, marginLeft, leftY);
  leftY += toName.length * 4.2 + 1;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const toAddr = doc.splitTextToSize(partyAddr(to) || "—", leftColW);
  doc.text(toAddr, marginLeft, leftY);
  leftY += toAddr.length * 3.8 + 1;
  if (to.gstin) {
    doc.setFont("helvetica", "bold");
    doc.text("GSTIN : ", marginLeft, leftY);
    doc.setFont("helvetica", "normal");
    doc.text(String(to.gstin), marginLeft + 16, leftY);
    leftY += 4.5;
  }
  if (biz.name) {
    doc.setFont("helvetica", "bold");
    doc.text("OPERATOR : ", marginLeft, leftY);
    doc.setFont("helvetica", "normal");
    const opLines = doc.splitTextToSize(String(biz.name), leftColW - 24);
    doc.text(opLines, marginLeft + 24, leftY);
    leftY += opLines.length * 3.8 + 2;
  }

  // Vertical divider spanning both columns
  const midTop = y - 2;
  const midBottom = Math.max(leftY, rightY) + 1;
  doc.setDrawColor(...ruleColor);
  doc.setLineWidth(0.2);
  doc.line(rightColX - colGap / 2, midTop, rightColX - colGap / 2, midBottom);

  y = Math.max(leftY, rightY) + 4;
  drawRule(marginLeft, contentRight, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    `Period: ${invoice.period_from || "—"} to ${invoice.period_to || "—"}`,
    marginLeft,
    y
  );
  y += 8;

  // Line table — purple header like FHR section bars
  const colDesc = marginLeft;
  const colType = 88;
  const colQty = 122;
  const colRate = 158;
  const colAmount = contentRight;
  const tableWidth = contentRight - marginLeft;

  const drawTableHeader = () => {
    doc.setFillColor(...BRAND);
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
  };

  drawTableHeader();

  (invoice.lines || []).forEach((line, index) => {
    const desc = doc.splitTextToSize(String(line.description || "—"), 68);
    const rowH = Math.max(desc.length, 1) * 4.2;
    if (y + rowH > contentBottom) {
      doc.addPage();
      y = drawPurpleHeader(doc, "TAX INVOICE", pageWidth, marginLeft, marginRight);
      drawTableHeader();
    }
    if (index % 2 === 1) {
      doc.setFillColor(248, 244, 249);
      doc.rect(marginLeft, y - 3.5, tableWidth, 6.5, "F");
    }
    doc.setFontSize(8);
    doc.text(desc, colDesc + 1, y);
    doc.text(String(line.line_type || "—").slice(0, 18), colType, y);
    rightText(
      doc,
      Number.isFinite(Number(line.qty)) ? Number(line.qty).toFixed(2) : "—",
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

  if (y + 20 > contentBottom) {
    doc.addPage();
    y = drawPurpleHeader(doc, "TAX INVOICE", pageWidth, marginLeft, marginRight);
  }

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

  // Pin purple bank footer to the bottom of every page (FHR-style page footer).
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    drawPurpleFooterAtBottom(doc, biz, pageWidth, pageHeight);
  }

  doc.save(`${invoice.invoice_no || "invoice"}.pdf`);
}
