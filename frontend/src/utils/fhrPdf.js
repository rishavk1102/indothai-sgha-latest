import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export function fhrPdfFilename(fhrData) {
  const flight =
    fhrData?.arrival_details?.flight_no ||
    fhrData?.departure_details?.flight_no ||
    fhrData?.fhr_id ||
    "FHR";
  const safe = String(flight)
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 40);
  return `FHR_${safe}_${fhrData?.fhr_id || ""}.pdf`;
}

function collectKeepTogetherBlocks(element, scale) {
  const rootRect = element.getBoundingClientRect();
  const byName = new Map();

  element.querySelectorAll("[data-pdf-block]").forEach((el) => {
    const name = el.getAttribute("data-pdf-block") || "block";
    const rect = el.getBoundingClientRect();
    const top = (rect.top - rootRect.top) * scale;
    const bottom = (rect.bottom - rootRect.top) * scale;
    const prev = byName.get(name);
    if (prev) {
      prev.top = Math.min(prev.top, top);
      prev.bottom = Math.max(prev.bottom, bottom);
    } else {
      byName.set(name, { name, top, bottom });
    }
  });

  return [...byName.values()].sort((a, b) => a.top - b.top);
}

/**
 * Prefer breaking between sections, but never leave a mostly-blank page
 * just to keep a large block together.
 */
function computePageBreaks(canvasHeight, pageHeightPxFor, blocks) {
  const breaks = [0];
  let y = 0;
  let pageIndex = 0;
  const MIN_FILL_BEFORE_PUSH = 0.62;

  while (y < canvasHeight - 1) {
    const pageHeightPx = pageHeightPxFor(pageIndex);
    const minSlice = Math.max(40, pageHeightPx * 0.1);
    const idealEnd = Math.min(y + pageHeightPx, canvasHeight);
    if (idealEnd >= canvasHeight) {
      breaks.push(canvasHeight);
      break;
    }

    let cut = idealEnd;
    let pushedForBlock = false;

    for (const block of blocks) {
      if (block.top >= idealEnd) break;
      if (block.top < y) continue;

      if (block.bottom > idealEnd && block.top > y) {
        const fillIfWePush = (block.top - y) / pageHeightPx;
        const blockFitsNextPage = block.bottom - block.top <= pageHeightPx * 0.98;

        if (
          blockFitsNextPage &&
          fillIfWePush >= MIN_FILL_BEFORE_PUSH &&
          block.top - y >= minSlice
        ) {
          cut = Math.min(cut, block.top);
          pushedForBlock = true;
        }
      }
    }

    if (!pushedForBlock) cut = idealEnd;
    if (cut <= y + 8) cut = idealEnd;
    cut = Math.round(cut);
    if (cut <= y) cut = idealEnd;

    breaks.push(Math.min(cut, canvasHeight));
    y = cut;
    pageIndex += 1;
  }

  return breaks;
}

function sliceCanvas(source, sy, ey) {
  const height = Math.max(1, Math.ceil(ey - sy));
  const slice = document.createElement("canvas");
  slice.width = source.width;
  slice.height = height;
  const ctx = slice.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, slice.width, slice.height);
  ctx.drawImage(
    source,
    0,
    sy,
    source.width,
    height,
    0,
    0,
    source.width,
    height
  );
  return slice;
}

/** Render the purple bank footer on its own so it can be pinned to each page bottom. */
async function captureFooter(element, scale) {
  const footerRow = element.querySelector("[data-pdf-footer]");
  if (!footerRow) return null;

  const cell = footerRow.querySelector("td") || footerRow;
  const width = Math.round(element.getBoundingClientRect().width);

  const host = document.createElement("div");
  host.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    `width:${width}px`,
    "background:#9e52a3",
    "color:#fff",
    "text-align:center",
    "font-weight:bold",
    "font-size:18px",
    "padding:15px 10px",
    "box-sizing:border-box",
  ].join(";");
  host.innerHTML = cell.innerHTML;
  document.body.appendChild(host);

  try {
    return await html2canvas(host, {
      scale,
      logging: false,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#9e52a3",
    });
  } finally {
    host.remove();
  }
}

/**
 * Full-bleed pages (no inset margin border).
 * Small top spacing only on continued pages so content isn't flush to the cut.
 * Header on page 1 stays edge-to-edge.
 * Purple bank footer is pinned to the bottom of every page; the on-screen
 * Tariff rating card is not part of the PDF.
 */
export async function downloadFhrViewPdf(element, filename) {
  if (!element) {
    throw new Error("No FHR content to export");
  }

  const scale = 2;
  const blocks = collectKeepTogetherBlocks(element, scale);

  // Only the report body: stop above the footer row (also drops the rating card below it).
  const rootRect = element.getBoundingClientRect();
  const footerRow = element.querySelector("[data-pdf-footer]");
  const contentHeightCss = footerRow
    ? Math.max(1, Math.floor(footerRow.getBoundingClientRect().top - rootRect.top))
    : undefined;

  const canvas = await html2canvas(element, {
    scale,
    logging: false,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    windowWidth: Math.max(element.scrollWidth, 900),
    ...(contentHeightCss ? { height: contentHeightCss } : {}),
  });

  const footerCanvas = await captureFooter(element, scale);

  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const footerHeightMm = footerCanvas
    ? (footerCanvas.height * pageWidth) / footerCanvas.width
    : 0;
  const footerGapMm = footerCanvas ? 2 : 0;
  const footerImg = footerCanvas ? footerCanvas.toDataURL("image/png") : null;

  // No left/right inset — avoids a "margin border" frame.
  // Only a little breathing room at the top of page 2+.
  const continueTopSpacingMm = 6;

  const pageHeightPxFor = (pageIndex) => {
    const top = pageIndex === 0 ? 0 : continueTopSpacingMm;
    const usableMm = pageHeight - top - footerHeightMm - footerGapMm;
    return (usableMm * canvas.width) / pageWidth;
  };

  const breaks = computePageBreaks(canvas.height, pageHeightPxFor, blocks);

  for (let i = 0; i < breaks.length - 1; i++) {
    const sy = breaks[i];
    const ey = breaks[i + 1];
    if (ey <= sy) continue;

    const slice = sliceCanvas(canvas, sy, ey);
    const imgData = slice.toDataURL("image/png");
    const sliceHeightMm = (slice.height * pageWidth) / slice.width;
    const top = i === 0 ? 0 : continueTopSpacingMm;

    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, top, pageWidth, sliceHeightMm);

    if (footerImg) {
      pdf.addImage(
        footerImg,
        "PNG",
        0,
        pageHeight - footerHeightMm,
        pageWidth,
        footerHeightMm
      );
    }
  }

  pdf.save(filename || "FHR.pdf");
}
