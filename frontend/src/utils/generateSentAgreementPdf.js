import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export function sentAgreementPdfFilename(template) {
  const base =
    template?.template_name ||
    template?.mainAgreement?.template_name ||
    "agreement";
  const safe = String(base)
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
  return `${safe || "agreement"}.pdf`;
}

/** Rasterize the same HTML as the Agreements view sidebar and save as PDF. */
export async function downloadSentAgreementPdf(element, filename) {
  if (!element) {
    throw new Error("No content to export");
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    logging: false,
    useCORS: true,
    backgroundColor: "#ffffff",
    windowWidth: element.scrollWidth,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgHeight = (canvas.height * pageWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename || "agreement.pdf");
}
