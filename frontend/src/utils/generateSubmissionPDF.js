import DOMPurify from "dompurify";
import jsPDF from "jspdf";
import api from "../api/axios";
import logoImage from "../assets/images/logo.png";

/**
 * Parse HTML content to extract items with their text and numbers
 */
const parseHTMLContent = (htmlString) => {
  if (!htmlString) {
    return { items: {} };
  }

  try {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = DOMPurify.sanitize(htmlString, {
      ALLOWED_TAGS: ["ol", "ul", "li"],
    });

    const allLists = Array.from(tempDiv.querySelectorAll("ol, ul"));

    const topLevelLists = allLists.filter((list) => {
      let parent = list.parentElement;
      while (parent && parent !== tempDiv) {
        if (parent.tagName === "OL" || parent.tagName === "UL") {
          return false;
        }
        parent = parent.parentElement;
      }
      return true;
    });

    let globalItemCounter = 1;
    let topLevelIndex = 0;
    const itemsMap = {};

    const convertListItems = (
      listElement,
      parentIndexPath = [],
      isTopLevelList = false,
    ) => {
      if (
        !listElement ||
        (listElement.tagName !== "OL" && listElement.tagName !== "UL")
      ) {
        return [];
      }

      const items = [];
      const allChildren = Array.from(listElement.children);
      let currentItemIndex = 0;

      for (let i = 0; i < allChildren.length; i++) {
        const child = allChildren[i];

        if (child.tagName === "LI") {
          const item = child;
          const itemIndex = currentItemIndex;
          currentItemIndex++;

          const itemClone = item.cloneNode(true);
          const nestedListsInClone = itemClone.querySelectorAll("ol, ul");
          nestedListsInClone.forEach((nestedList) => nestedList.remove());

          const textContent =
            itemClone.textContent || itemClone.innerText || "";
          const cleanText = textContent.trim();

          let currentIndexPath;
          if (isTopLevelList && parentIndexPath.length === 0) {
            topLevelIndex++;
            currentIndexPath = [topLevelIndex];
          } else {
            currentIndexPath = [...parentIndexPath, itemIndex + 1];
          }
          const hierarchicalIndex = currentIndexPath.join(".");

          const itemId = `item-${globalItemCounter}`;
          globalItemCounter++;

          let subItems = null;
          const nestedLists = item.querySelectorAll("ol, ul");
          if (nestedLists.length > 0) {
            subItems = [];
            nestedLists.forEach((nestedList) => {
              const nestedItems = convertListItems(
                nestedList,
                currentIndexPath,
                false,
              );
              nestedItems.forEach((nestedItem) => {
                subItems.push(nestedItem);
              });
            });
          }

          const itemData = {
            id: itemId,
            index: hierarchicalIndex,
            text: cleanText,
            subItems: subItems || [],
          };

          itemsMap[itemId] = itemData;
          items.push(itemData);
        }
      }

      return items;
    };

    topLevelLists.forEach((list) => {
      convertListItems(list, [], true);
    });

    return { items: itemsMap };
  } catch (error) {
    console.error("Error parsing HTML content:", error);
    return { items: {} };
  }
};

/**
 * Parse template data to create a map of item numbers to text
 */
const parseTemplateData = async (templateData, agreementYear = 2025) => {
  if (!templateData || !Array.isArray(templateData)) {
    return { itemTextMap: {}, sectionTitles: {} };
  }

  const sectionMap = {};
  const titlesMap = {};
  let currentSection = null;
  let currentMainSection = null;
  let mainSectionHeading = null;

  templateData.forEach((field, index) => {
    if (field.type === "heading_no") {
      const sectionNum = String(field.value);

      if (["1", "2", "3", "4", "5", "6", "7", "8"].includes(sectionNum)) {
        if (
          index + 1 < templateData.length &&
          templateData[index + 1].type === "heading"
        ) {
          currentMainSection = sectionNum;
          mainSectionHeading = templateData[index + 1].value;
          return;
        }
      }

      if (sectionNum.includes(".") && currentMainSection) {
        const nextField =
          index + 1 < templateData.length ? templateData[index + 1] : null;
        if (nextField && nextField.type === "subheading") {
          currentSection = sectionNum;
          if (!sectionMap[currentSection]) {
            sectionMap[currentSection] = {
              editorContent: null,
            };
          }
          const subheadingText = nextField.value || "";
          const sectionLabel = mainSectionHeading
            ? `${mainSectionHeading} - ${sectionNum} ${subheadingText}`
            : `${sectionNum} ${subheadingText}`;
          titlesMap[currentSection] = sectionLabel;
          return;
        }
      }
    }

    if (field.type === "subheading_no" && currentMainSection) {
      const headingNo = String(field.value);
      if (headingNo.includes(".")) {
        currentSection = headingNo;
        if (!sectionMap[currentSection]) {
          sectionMap[currentSection] = {
            editorContent: null,
          };
        }
        const nextField =
          index + 1 < templateData.length ? templateData[index + 1] : null;
        const subheadingText =
          nextField && nextField.type === "subheading" ? nextField.value : "";
        const sectionLabel = mainSectionHeading
          ? `${mainSectionHeading} - ${headingNo} ${subheadingText}`
          : `${headingNo} ${subheadingText}`;
        titlesMap[currentSection] = sectionLabel;
        return;
      }
    }

    if (field.type === "editor" && currentSection && currentMainSection) {
      if (sectionMap[currentSection]) {
        sectionMap[currentSection].editorContent = field.value;
      }
    }
  });

  const textMap = {};
  Object.keys(sectionMap).forEach((sectionKey) => {
    const sectionInfo = sectionMap[sectionKey];

    if (sectionInfo.editorContent) {
      const parsedContent = parseHTMLContent(sectionInfo.editorContent);
      const itemsMap = parsedContent?.items || {};

      Object.values(itemsMap).forEach((item) => {
        if (item.index && item.text) {
          const fullItemNumber = `${sectionKey}.${item.index}`;
          textMap[fullItemNumber] = item.text;
          textMap[`${fullItemNumber}-main`] = item.text;

          if (item.subItems && Array.isArray(item.subItems)) {
            item.subItems.forEach((subItem) => {
              if (subItem.index && subItem.text) {
                const indexParts = subItem.index.split(".");
                const lastPart = indexParts[indexParts.length - 1];
                const numericIndex = parseInt(lastPart, 10);

                if (!isNaN(numericIndex) && numericIndex > 0) {
                  const letter = String.fromCharCode(96 + numericIndex);
                  const fullSubItemNumberLetter = `${fullItemNumber}.${letter}`;
                  textMap[fullSubItemNumberLetter] = subItem.text;

                  const fullSubItemNumberNumeric = `${fullItemNumber}.${numericIndex}`;
                  textMap[fullSubItemNumberNumeric] = subItem.text;
                }
              }
            });
          }
        }
      });
    }
  });

  return { itemTextMap: textMap, sectionTitles: titlesMap };
};

/**
 * Fetch Annex A template data if not provided
 */
const fetchAnnexATemplateData = async (agreementYear = 2025) => {
  try {
    const response = await api.get(
      `/sgha_template_content/get/${agreementYear}/Annex A/Section Template`,
    );

    if (response.data?.data?.content) {
      const content = response.data.data.content;
      let parsedContent;
      try {
        parsedContent =
          typeof content === "string" ? JSON.parse(content) : content;
      } catch (parseError) {
        console.error("Error parsing Annex A content:", parseError);
        return { itemTextMap: {}, sectionTitles: {} };
      }

      return await parseTemplateData(parsedContent, agreementYear);
    }
  } catch (error) {
    console.error("Error fetching Annex A template data:", error);
  }

  return { itemTextMap: {}, sectionTitles: {} };
};

/**
 * Generate PDF for a submission with Main Agreement, Annex A, and Annex B data
 * @param {Object} submission - The submission object
 * @param {Object} itemTextMap - Map of item numbers to their text descriptions (optional, will be fetched if not provided)
 * @param {Object} sectionTitles - Map of section keys to their titles (optional, will be fetched if not provided)
 * @param {{ openInNewTab?: boolean }} options - openInNewTab: true = open in new tab (default), false = trigger download
 */
export const generateSubmissionPDF = async (
  submission,
  itemTextMap = {},
  sectionTitles = {},
  options = {},
) => {
  const { openInNewTab = true } = options;
  try {
    // Fetch Annex A template data if not provided
    let finalItemTextMap = itemTextMap;
    let finalSectionTitles = sectionTitles;

    if (
      Object.keys(itemTextMap).length === 0 ||
      Object.keys(sectionTitles).length === 0
    ) {
      const templateData = await fetchAnnexATemplateData(
        submission.agreement_year || 2025,
      );
      if (Object.keys(itemTextMap).length === 0) {
        finalItemTextMap = templateData.itemTextMap || {};
      }
      if (Object.keys(sectionTitles).length === 0) {
        finalSectionTitles = templateData.sectionTitles || {};
      }
    }

    // Debug: Log itemTextMap info
    console.log("[PDF] ItemTextMap loaded:", {
      size: Object.keys(finalItemTextMap).length,
      sampleKeys: Object.keys(finalItemTextMap).slice(0, 10),
      sampleValues: Object.keys(finalItemTextMap)
        .slice(0, 3)
        .map((k) => ({ key: k, text: finalItemTextMap[k]?.substring(0, 50) })),
    });

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const footerPadding = 15; // Padding from bottom edge for footer text baseline (moved higher to avoid overlap)
    const footerTextHeight = 4; // Approximate height of footer text (8pt font)
    const footerBuffer = 5; // Additional buffer space above footer
    const footerTotalHeight = footerPadding + footerTextHeight + footerBuffer; // Total space needed for footer area (19mm)
    const logoHeight = 30; // Space reserved for logo at top
    const topMargin = margin + logoHeight + 5; // Start content below logo
    // Increase bottom margin so content never touches the footer
    const bottomMargin = footerTotalHeight + 5; // Extra buffer to avoid any overlap with footer
    const maxWidth = pageWidth - margin * 2;
    let yPos = topMargin; // Start below logo area

    // Helper function to add a new page if needed
    const checkPageBreak = (requiredHeight = 20) => {
      if (yPos + requiredHeight > pageHeight - bottomMargin) {
        doc.addPage();
        yPos = topMargin; // Reset to below logo area on new page
        return true;
      }
      return false;
    };

    // Helper function to add text with word wrapping.
    // Renders line-by-line so individual lines never overflow the footer.
    // Returns the new Y position after the last line.
    const addText = (text, x, y, options = {}) => {
      const {
        fontSize = 10,
        fontStyle = "normal",
        color = [0, 0, 0],
        maxWidth: textMaxWidth = maxWidth,
        align = "left",
      } = options;

      doc.setFontSize(fontSize);
      doc.setFont("helvetica", fontStyle);
      doc.setTextColor(...color);

      const lines = doc.splitTextToSize(String(text ?? ""), textMaxWidth);
      const lineHeight = fontSize * 0.45; // Line height in mm

      let currentY = y;
      lines.forEach((line) => {
        // Page break before each line so content never overflows the footer
        if (currentY + lineHeight > pageHeight - bottomMargin) {
          doc.addPage();
          currentY = topMargin;
          // Re-apply font/size after page add
          doc.setFontSize(fontSize);
          doc.setFont("helvetica", fontStyle);
          doc.setTextColor(...color);
        }
        doc.text(line, x, currentY, { align });
        currentY += lineHeight;
      });

      return currentY; // Return the Y position after the last line
    };

    // Helper function to add text with inline formatting support
    const addFormattedText = (text, x, y, options = {}) => {
      const {
        fontSize = 10,
        color = [0, 0, 0],
        maxWidth: textMaxWidth = maxWidth,
        align = "left",
      } = options;

      doc.setFontSize(fontSize);
      doc.setTextColor(...color);

      // Split text into lines first
      const lines = doc.splitTextToSize(text, textMaxWidth);
      let currentY = y;

      lines.forEach((line, index) => {
        doc.text(line, x, currentY, { align });
        currentY += fontSize * 0.4;
      });

      return lines.length * fontSize * 0.4;
    };

    // Helper function to strip HTML and get plain text with basic list/line structure preserved
    const stripHTML = (html) => {
      if (!html || typeof html !== "string") return "";
      let text = html;
      // Normalize common block/line elements into line breaks
      text = text
        .replace(/<\/p>/gi, "\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/li>/gi, "\n")
        .replace(/<\/div>/gi, "\n");
      // Turn list items into bullet points
      text = text.replace(/<li[^>]*>/gi, "\n• ");
      // Remove all other tags
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
      const plain = tempDiv.textContent || tempDiv.innerText || "";
      // Collapse excessive blank lines
      return plain.replace(/\n{3,}/g, "\n\n").trim();
    };

    // Split Annex B editor HTML by {{ variable }} placeholders (same logic as Sgha_annexB)
    const splitAnnexBContentByVariables = (html) => {
      if (!html || typeof html !== "string")
        return [{ content: html || "", isTable: false }];
      const result = [];
      // Match {{ var }} or {{var}} (allow optional spaces and any variable name)
      const variableRegex = /\{\{\s*([^}]+?)\s*\}\}/g;
      let match;
      let lastIndex = 0;
      while ((match = variableRegex.exec(html)) !== null) {
        const variableName = (match[1] || "").trim();
        if (match.index > lastIndex) {
          const beforeContent = html.substring(lastIndex, match.index);
          if (beforeContent.trim()) {
            result.push({ content: beforeContent.trim(), isTable: false });
          }
        }
        if (variableName === "annex_a_selection") {
          result.push({ isTable: true, tableType: "annex_a_selection" });
        } else if (variableName === "aircraft_options") {
          result.push({ isTable: true, tableType: "aircraft_options" });
        } else if (variableName === "additional_charges") {
          result.push({ isTable: true, tableType: "additional_charges" });
        } else {
          result.push({ isTable: true, tableType: "variable", variableName });
        }
        lastIndex = variableRegex.lastIndex;
      }
      if (lastIndex < html.length) {
        const remaining = html.substring(lastIndex).trim();
        if (remaining) result.push({ content: remaining, isTable: false });
      }
      if (result.length === 0)
        result.push({ content: html.trim(), isTable: false });
      return result;
    };

    // Draw a simple table and return new y position
    const drawSimpleTable = (
      startX,
      startY,
      headers,
      rows,
      colWidths,
      opts = {},
    ) => {
      const fontSize = opts.fontSize || 9;
      const rowHeight = opts.rowHeight || 7;
      doc.setFontSize(fontSize);
      const tableWidth = colWidths.reduce((a, b) => a + b, 0);
      let currentY = startY;
      // Header
      doc.setFont("helvetica", "bold");
      doc.line(startX, currentY, startX + tableWidth, currentY);
      currentY += 2;
      let x = startX;
      headers.forEach((h, i) => {
        doc.text(String(h).substring(0, 28), x + 2, currentY + rowHeight * 0.5);
        if (i < colWidths.length - 1) {
          doc.line(
            x + colWidths[i],
            startY,
            x + colWidths[i],
            currentY + rowHeight,
          );
        }
        x += colWidths[i];
      });
      doc.line(
        startX + tableWidth,
        startY,
        startX + tableWidth,
        currentY + rowHeight,
      );
      currentY += rowHeight;
      doc.line(startX, currentY, startX + tableWidth, currentY);
      doc.setFont("helvetica", "normal");
      // Data rows
      rows.forEach((row) => {
        if (currentY + rowHeight > pageHeight - bottomMargin) {
          doc.addPage();
          currentY = topMargin;
        }
        const cells = Array.isArray(row)
          ? row
          : headers.map((_, i) => row[headers[i]] ?? "-");
        x = startX;
        cells.forEach((cell, i) => {
          doc.text(
            String(cell ?? "-").substring(0, 32),
            x + 2,
            currentY + rowHeight * 0.5,
          );
          if (i < colWidths.length - 1)
            doc.line(
              x + colWidths[i],
              currentY,
              x + colWidths[i],
              currentY + rowHeight,
            );
          x += colWidths[i];
        });
        doc.line(
          startX + tableWidth,
          currentY,
          startX + tableWidth,
          currentY + rowHeight,
        );
        currentY += rowHeight;
        doc.line(startX, currentY, startX + tableWidth, currentY);
      });
      doc.line(startX, startY, startX, currentY);
      return currentY + 4;
    };

    // Normalize stored keys to template keys: 1.1.0.1 -> 1.1.1, 1.1.0.1.a -> 1.1.1.a, 0.0.1 + section 1.3 -> 1.3.1
    const normalizeKeyForTemplate = (key, sectionKey) => {
      if (!key) return key;
      let k = key;
      if (/^0\.0\.\d+$/.test(k) && sectionKey) {
        k = sectionKey + "." + k.split(".").pop();
      }
      if (k.includes(".0.")) {
        k = k.replace(/\.0\./g, ".");
      }
      return k;
    };

    // Helper function to get item text
    const getItemText = (itemNumber) => {
      if (!itemNumber) return null;

      // Try direct match first
      if (finalItemTextMap[itemNumber]) {
        return finalItemTextMap[itemNumber];
      }
      // Stored keys sometimes use .0. (e.g. 1.1.0.1.a); template uses 1.1.1.a
      const collapsedZero = itemNumber.replace(/\.0\./g, ".");
      if (collapsedZero !== itemNumber && finalItemTextMap[collapsedZero]) {
        return finalItemTextMap[collapsedZero];
      }

      // Handle special cases like "1.1.1-main"
      const cleanNumber = itemNumber.replace("-main", "");
      if (finalItemTextMap[cleanNumber]) {
        return finalItemTextMap[cleanNumber];
      }

      // For items with letter suffixes like "1.1.1.a" - use only sub-item text, never parent
      const letterSuffixMatch = itemNumber.match(/^(\d+\.\d+\.\d+)\.([a-z]+)$/);
      if (letterSuffixMatch) {
        if (finalItemTextMap[itemNumber]) {
          return finalItemTextMap[itemNumber];
        }
        // Try numeric variant (e.g. 1.1.1.1 for 1.1.1.a) from template parsing
        const letter = letterSuffixMatch[2];
        const letterIndex = letter.charCodeAt(0) - 96;
        if (letterIndex >= 1) {
          const numericKey = `${letterSuffixMatch[1]}.${letterIndex}`;
          if (finalItemTextMap[numericKey]) {
            return finalItemTextMap[numericKey];
          }
        }
        return null;
      }

      // For items with numeric suffixes like "1.1.1.1" - use only sub-item text, never parent
      const numericSuffixMatch = itemNumber.match(/^(\d+\.\d+\.\d+)\.(\d+)$/);
      if (numericSuffixMatch) {
        const parentNumber = numericSuffixMatch[1];
        if (finalItemTextMap[itemNumber]) {
          return finalItemTextMap[itemNumber];
        }
        const letterIndex = parseInt(numericSuffixMatch[2], 10);
        if (!isNaN(letterIndex) && letterIndex > 0) {
          const letter = String.fromCharCode(96 + letterIndex);
          const letterKey = `${parentNumber}.${letter}`;
          if (finalItemTextMap[letterKey]) {
            return finalItemTextMap[letterKey];
          }
        }
        return null;
      }

      // For items with special format like "1.1.1-", try base number
      const specialMatch = itemNumber.match(/^(\d+\.\d+\.\d+)-/);
      if (specialMatch) {
        const baseNumber = specialMatch[1];
        if (finalItemTextMap[baseNumber]) {
          return finalItemTextMap[baseNumber];
        }
      }

      // Try to match base number (first 3 parts)
      const parts = itemNumber.split(".");
      if (parts.length >= 3) {
        const baseNumber = parts.slice(0, 3).join(".");
        if (finalItemTextMap[baseNumber]) {
          return finalItemTextMap[baseNumber];
        }
      }

      // Try matching with section prefix (e.g., if itemNumber is "1.1.1" and we're in section "1", try "1.1.1")
      // This is already handled by the base number check above

      return null;
    };

    // Header - logo will be added to each page later, so we start content below logo area
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("SGHA Agreement Document", pageWidth / 2, yPos, {
      align: "center",
    });
    yPos += 10;

    // Client Information
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Client Information", margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    yPos = addText(
      `Client Name: ${submission.client_name || "N/A"}`,
      margin,
      yPos,
      { fontSize: 10 },
    );
    yPos = addText(
      `Contact Name: ${submission.contact_name || "N/A"}`,
      margin,
      yPos,
      { fontSize: 10 },
    );
    yPos = addText(
      `Contact Email: ${submission.contact_email || "N/A"}`,
      margin,
      yPos,
      { fontSize: 10 },
    );
    yPos = addText(
      `Contact Phone: ${submission.contact_phone || "N/A"}`,
      margin,
      yPos,
      { fontSize: 10 },
    );
    yPos = addText(
      `Service Type: ${submission.service_type || "N/A"}`,
      margin,
      yPos,
      { fontSize: 10 },
    );
    yPos = addText(
      `Agreement Year: ${submission.agreement_year || "N/A"}`,
      margin,
      yPos,
      { fontSize: 10 },
    );
    yPos = addText(
      `Effective From: ${submission.effective_from ? new Date(submission.effective_from).toLocaleDateString() : "N/A"}`,
      margin,
      yPos,
      { fontSize: 10 },
    );
    yPos = addText(
      `Effective To: ${submission.effective_to ? new Date(submission.effective_to).toLocaleDateString() : "N/A"}`,
      margin,
      yPos,
      { fontSize: 10 },
    );
    yPos = addText(`Status: ${submission.status || "N/A"}`, margin, yPos, {
      fontSize: 10,
    });
    yPos += 10;

    checkPageBreak(30);

    // Main Agreement Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Main Agreement", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;

    // Fetch client registration details for dynamic agreement header
    let clientDetails = null;
    try {
      const clientResponse = await api.get(
        `/api/client/annex-a-submissions/${submission.submission_id}/client-details`,
      );
      if (clientResponse.data?.data) {
        clientDetails = clientResponse.data.data;
      }
    } catch (error) {
      console.error("Error fetching client details:", error);
      // Fallback to submission data if available
      if (submission.client_name) {
        clientDetails = {
          name: submission.client_name,
          city: submission.city || "N/A",
          state: submission.state || "N/A",
          country: submission.country || "N/A",
        };
      }
    }

    // Add the automatically generated agreement header content (same as frontend)
    checkPageBreak(40);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    // Agreement header content - Carrier (fixed)
    // Line 1: "An Agreement made between :" and company name on same line
    const line1Text = "An Agreement made between :";
    const carrierName = "Malindo Airways SDN BHD";
    doc.text(line1Text, margin, yPos);
    const line1Width = doc.getTextWidth(line1Text);
    doc.setFont("helvetica", "bold");
    doc.text(carrierName, margin + line1Width + 3, yPos);
    yPos += 6;

    // Line 2: "having its principal office at·" and address on same line
    doc.setFont("helvetica", "normal");
    const line2Text = "having its principal office at·";
    const carrierAddress = "Petaling Jaya, Malaysia";
    doc.text(line2Text, margin, yPos);
    const line2Width = doc.getTextWidth(line2Text);
    doc.setFont("helvetica", "bold");
    doc.text(carrierAddress, margin + line2Width + 3, yPos);
    yPos += 6;

    // Line 3: Full text on its own line
    doc.setFont("helvetica", "normal");
    yPos = addText(
      "hereinafter referred to as the 'Carrier' or the 'Handling Company' as the case may be,",
      margin,
      yPos,
      { fontSize: 10 },
    );
    yPos += 5;

    // Handling Company (dynamic - based on client)
    // Line 4: "and:" and company name on same line
    doc.setFont("helvetica", "normal");
    const line4Text = "and:";
    const handlingCompanyName =
      clientDetails?.name ||
      submission.client_name ||
      "INDOTHAI KOLKATA PRIVATE LIMITED";
    doc.text(line4Text, margin, yPos);
    const line4Width = doc.getTextWidth(line4Text);
    doc.setFont("helvetica", "bold");
    doc.text(handlingCompanyName, margin + line4Width + 3, yPos);
    yPos += 6;

    // Line 5: "having its principal office at·" and address on same line
    doc.setFont("helvetica", "normal");
    const line5Text = "having its principal office at·";
    // Build address from client details
    let principalOffice = "Kolkata, IN"; // Default fallback
    if (clientDetails) {
      const addressParts = [];
      if (clientDetails.city) addressParts.push(clientDetails.city);
      if (clientDetails.state) addressParts.push(clientDetails.state);
      if (clientDetails.country) addressParts.push(clientDetails.country);
      if (addressParts.length > 0) {
        principalOffice = addressParts.join(", ");
      }
    }
    doc.text(line5Text, margin, yPos);
    const line5Width = doc.getTextWidth(line5Text);
    doc.setFont("helvetica", "bold");
    doc.text(principalOffice, margin + line5Width + 3, yPos);
    yPos += 6;

    // Line 6: Full text on its own line
    doc.setFont("helvetica", "normal");
    yPos = addText(
      "hereinafter referred to as the 'Handling Company' or the 'Carrier', as the case may be, the Carrier and/or the Handling Company may hereinafter be referred to as the \"Party(ies)\" Whereby all the parties agree as follows:",
      margin,
      yPos,
      { fontSize: 10 },
    );
    yPos += 10;

    // Use the same template year + name that the submission used (if available)
    const templateYear = submission.agreement_year || 2025;
    const templateName =
      submission.form_details &&
      typeof submission.form_details === "object" &&
      submission.form_details.template_name &&
      String(submission.form_details.template_name).trim() !== ""
        ? String(submission.form_details.template_name).trim()
        : null;

    try {
      // Fetch Main Agreement template (matching client's chosen template when templateName is set)
      const mainUrl = `/sgha_template_content/get/${templateYear}/Main Agreement/Section Template`;
      const mainParams = templateName ? { template_name: templateName } : {};
      const mainAgreementResponse = await api.get(mainUrl, {
        params: mainParams,
      });

      console.log("[PDF Main] Fetch Main Agreement template:", {
        url: mainUrl,
        params: mainParams,
        status: mainAgreementResponse.status,
      });

      if (mainAgreementResponse.data?.data?.content) {
        const content = mainAgreementResponse.data.data.content;
        let parsedContent =
          typeof content === "string" ? JSON.parse(content) : content;

        // Parse Main Agreement sections (mirror Sgha_mainagreemment logic)
        const sections = [];
        let currentArticle = null;
        let currentSection = null;
        let currentMainSection = null;

        console.log(
          "[PDF Main] Raw parsedContent length:",
          Array.isArray(parsedContent) ? parsedContent.length : "n/a",
        );
        if (Array.isArray(parsedContent)) {
          console.log(
            "[PDF Main] First 40 fields:",
            parsedContent.slice(0, 40).map((f, idx) => ({
              idx,
              type: f?.type,
              value:
                typeof f?.value === "string" ? f.value.slice(0, 80) : f?.value,
            })),
          );
        }

        parsedContent.forEach((field, index) => {
          if (!field || typeof field !== "object" || !field.type) return;

          if (field.type === "heading_no") {
            const sectionNum = String(field.value);

            // Main article numbers (1,2,3...) – heading or subheading
            if (
              !sectionNum.includes(".") &&
              ["1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(sectionNum)
            ) {
              const nextField = parsedContent[index + 1];
              if (
                nextField &&
                (nextField.type === "heading" ||
                  nextField.type === "subheading")
              ) {
                currentMainSection = sectionNum;
                currentSection = null;
                currentArticle = {
                  articleNumber: sectionNum,
                  articleTitle: nextField.value || "",
                  sections: [],
                };
                sections.push(currentArticle);
                console.log("[PDF Main] Created article", {
                  articleNumber: currentArticle.articleNumber,
                  articleTitle: currentArticle.articleTitle,
                });
                return;
              }
            }

            // Subsection numbers like 1.1, 1.2, etc.
            if (sectionNum.includes(".") && currentMainSection) {
              const nextField = parsedContent[index + 1];
              if (nextField && nextField.type === "subheading") {
                currentSection = {
                  sectionNumber: sectionNum,
                  sectionTitle: nextField.value || "",
                  content: null,
                };
                if (currentArticle) {
                  currentArticle.sections.push(currentSection);
                }
                console.log("[PDF Main] Created subsection via heading_no", {
                  article: currentArticle?.articleNumber,
                  sectionNumber: currentSection.sectionNumber,
                  sectionTitle: currentSection.sectionTitle,
                });
                return;
              }
            }
          }

          if (field.type === "subheading_no" && currentMainSection) {
            const headingNo = String(field.value);
            if (headingNo.includes(".")) {
              const nextField = parsedContent[index + 1];
              const subheadingText =
                nextField && nextField.type === "subheading"
                  ? nextField.value || ""
                  : "";
              currentSection = {
                sectionNumber: headingNo,
                sectionTitle: subheadingText,
                content: null,
              };
              if (currentArticle) {
                currentArticle.sections.push(currentSection);
              }
              console.log("[PDF Main] Created subsection via subheading_no", {
                article: currentArticle?.articleNumber,
                sectionNumber: currentSection.sectionNumber,
                sectionTitle: currentSection.sectionTitle,
              });
              return;
            }
          }

          // Editor content for sections or whole article
          if (field.type === "editor" && currentArticle) {
            const html = field.value;
            if (currentSection) {
              // Append or set content for current subsection
              if (!currentSection.content) {
                currentSection.content = html;
              } else if (html) {
                currentSection.content += "<br/>" + html;
              }
              console.log("[PDF Main] Added editor content to subsection", {
                article: currentArticle.articleNumber,
                sectionNumber: currentSection.sectionNumber,
                contentLen: (currentSection.content || "").length,
              });
            } else if (html) {
              // Editor directly under article – create a default section
              const defaultSection = {
                sectionNumber: null,
                sectionTitle: null,
                content: html,
              };
              currentArticle.sections.push(defaultSection);
              console.log(
                "[PDF Main] Added default section with editor content to article",
                {
                  article: currentArticle.articleNumber,
                  contentLen: (html || "").length,
                },
              );
            }
          }
        });

        console.log(
          "[PDF Main] Final sections summary:",
          sections.map((a) => ({
            articleNumber: a.articleNumber,
            articleTitle: a.articleTitle,
            sectionsCount: a.sections.length,
          })),
        );

        // Render Main Agreement sections
        sections.forEach((article) => {
          // Skip articles that have no real content (all sections empty) to avoid blank pages
          const nonEmptySections = (article.sections || []).filter(
            (s) => s && s.content && String(s.content).trim().length > 0,
          );
          if (nonEmptySections.length === 0) {
            console.log("[PDF Main] Skipping article with no content", {
              articleNumber: article.articleNumber,
              articleTitle: article.articleTitle,
            });
            return;
          }

          console.log("[PDF Main] Rendering article", {
            articleNumber: article.articleNumber,
            articleTitle: article.articleTitle,
            sectionsCount: Array.isArray(article.sections)
              ? article.sections.length
              : 0,
          });

          checkPageBreak(30);

          // Article heading - styled prominently (like UI)
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          const articleTitle = `Article ${article.articleNumber}: ${article.articleTitle.toUpperCase()}`;
          doc.text(articleTitle, pageWidth / 2, yPos, { align: "center" });
          yPos += 10;

          nonEmptySections.forEach((section) => {
            // Reserve extra space so section heading and at least part of its content stay on the same page
            checkPageBreak(50);

            // Section heading (e.g., "1.1 General") - bold, like h6 in UI
            if (section.sectionNumber && section.sectionTitle) {
              doc.setFontSize(11);
              doc.setFont("helvetica", "bold");
              doc.text(
                `${section.sectionNumber} ${section.sectionTitle}`,
                margin,
                yPos,
              );
              yPos += 7;
            }

            if (section.content) {
              doc.setFontSize(10);
              doc.setFont("helvetica", "normal");

              // Parse HTML content to preserve formatting (lists, paragraphs, etc.)
              const tempDiv = document.createElement("div");
              tempDiv.innerHTML = DOMPurify.sanitize(section.content, {
                ALLOWED_TAGS: [
                  "p",
                  "ul",
                  "ol",
                  "li",
                  "strong",
                  "em",
                  "b",
                  "i",
                  "br",
                  "div",
                  "span",
                ],
                ALLOWED_ATTR: [],
              });

              // Process HTML content maintaining structure with proper bold handling
              const processNode = (node, indent = 0, isBold = false) => {
                if (!node) return;

                // Handle text nodes
                if (node.nodeType === 3) {
                  // Text node
                  const text = node.textContent?.trim();
                  if (text) {
                    checkPageBreak(8);
                    if (isBold) {
                      doc.setFont("helvetica", "bold");
                    } else {
                      doc.setFont("helvetica", "normal");
                    }
                    yPos = addText(text, margin + indent, yPos, {
                      fontSize: 10,
                    });
                  }
                  return;
                }

                // Handle element nodes
                if (node.nodeType === 1) {
                  // Element node
                  const tagName = node.tagName?.toLowerCase();
                  const shouldBeBold =
                    isBold || tagName === "strong" || tagName === "b";

                  if (tagName === "p") {
                    checkPageBreak(10);
                    // Process paragraph content - render as plain text first, then handle inline formatting if needed
                    // For now, render full text to ensure nothing is missed
                    const pText =
                      node.textContent?.trim() || node.innerText?.trim();
                    if (pText) {
                      doc.setFont("helvetica", "normal");
                      yPos = addText(pText, margin + indent, yPos, {
                        fontSize: 10,
                      });
                      yPos += 5; // Paragraph spacing
                    }
                  } else if (tagName === "ul") {
                    // Unordered list
                    const listItems = node.querySelectorAll(":scope > li");
                    listItems.forEach((li, index) => {
                      checkPageBreak(8);
                      doc.setFont("helvetica", "normal");

                      // Process list item with potential inline formatting
                      const processListItem = (liNode) => {
                        let hasContent = false;
                        Array.from(liNode.childNodes).forEach((child) => {
                          if (child.nodeType === 3) {
                            const text = child.textContent?.trim();
                            if (text) {
                              doc.setFont("helvetica", "normal");
                              yPos = addText(
                                `• ${text}`,
                                margin + indent + 5,
                                yPos,
                                { fontSize: 10 },
                              );
                              hasContent = true;
                            }
                          } else if (child.nodeType === 1) {
                            const childTag = child.tagName?.toLowerCase();
                            if (childTag === "strong" || childTag === "b") {
                              doc.setFont("helvetica", "bold");
                              const boldText = child.textContent?.trim();
                              if (boldText) {
                                yPos = addText(
                                  `• ${boldText}`,
                                  margin + indent + 5,
                                  yPos,
                                  { fontSize: 10 },
                                );
                                hasContent = true;
                              }
                              doc.setFont("helvetica", "normal");
                            } else if (childTag === "ul" || childTag === "ol") {
                              // Nested list
                              processNode(child, indent + 10, false);
                            } else {
                              const text = child.textContent?.trim();
                              if (text) {
                                yPos = addText(
                                  `• ${text}`,
                                  margin + indent + 5,
                                  yPos,
                                  { fontSize: 10 },
                                );
                                hasContent = true;
                              }
                            }
                          }
                        });
                        if (hasContent) {
                          yPos += 4;
                        }
                      };

                      processListItem(li);
                    });
                  } else if (tagName === "ol") {
                    // Ordered list
                    const listItems = node.querySelectorAll(":scope > li");
                    listItems.forEach((li, index) => {
                      checkPageBreak(8);
                      doc.setFont("helvetica", "normal");

                      // Process list item with potential inline formatting
                      const processListItem = (liNode) => {
                        let hasContent = false;
                        Array.from(liNode.childNodes).forEach((child) => {
                          if (child.nodeType === 3) {
                            const text = child.textContent?.trim();
                            if (text) {
                              doc.setFont("helvetica", "normal");
                              yPos = addText(
                                `${index + 1}. ${text}`,
                                margin + indent + 5,
                                yPos,
                                { fontSize: 10 },
                              );
                              hasContent = true;
                            }
                          } else if (child.nodeType === 1) {
                            const childTag = child.tagName?.toLowerCase();
                            if (childTag === "strong" || childTag === "b") {
                              doc.setFont("helvetica", "bold");
                              const boldText = child.textContent?.trim();
                              if (boldText) {
                                yPos = addText(
                                  `${index + 1}. ${boldText}`,
                                  margin + indent + 5,
                                  yPos,
                                  { fontSize: 10 },
                                );
                                hasContent = true;
                              }
                              doc.setFont("helvetica", "normal");
                            } else if (childTag === "ul" || childTag === "ol") {
                              // Nested list
                              processNode(child, indent + 10, false);
                            } else {
                              const text = child.textContent?.trim();
                              if (text) {
                                yPos = addText(
                                  `${index + 1}. ${text}`,
                                  margin + indent + 5,
                                  yPos,
                                  { fontSize: 10 },
                                );
                                hasContent = true;
                              }
                            }
                          }
                        });
                        if (hasContent) {
                          yPos += 4;
                        }
                      };

                      processListItem(li);
                    });
                  } else if (tagName === "br") {
                    yPos += 4; // Line break spacing
                  } else if (tagName === "strong" || tagName === "b") {
                    doc.setFont("helvetica", "bold");
                    const boldText = node.textContent?.trim();
                    if (boldText) {
                      yPos = addText(boldText, margin + indent, yPos, {
                        fontSize: 10,
                      });
                    }
                    doc.setFont("helvetica", "normal");
                  } else if (tagName === "em" || tagName === "i") {
                    doc.setFont("helvetica", "italic");
                    const italicText = node.textContent?.trim();
                    if (italicText) {
                      yPos = addText(italicText, margin + indent, yPos, {
                        fontSize: 10,
                      });
                    }
                    doc.setFont("helvetica", "normal");
                  } else if (tagName === "div" || tagName === "span") {
                    // Process children for div/span elements
                    if (node.childNodes.length > 0) {
                      Array.from(node.childNodes).forEach((child) => {
                        processNode(child, indent, shouldBeBold);
                      });
                    } else {
                      // If no children, render text content
                      const text = node.textContent?.trim();
                      if (text) {
                        checkPageBreak(8);
                        if (shouldBeBold) {
                          doc.setFont("helvetica", "bold");
                        } else {
                          doc.setFont("helvetica", "normal");
                        }
                        yPos = addText(text, margin + indent, yPos, {
                          fontSize: 10,
                        });
                      }
                    }
                  } else {
                    // For any other elements, try to render their text content
                    const text = node.textContent?.trim();
                    if (text) {
                      checkPageBreak(8);
                      if (shouldBeBold) {
                        doc.setFont("helvetica", "bold");
                      } else {
                        doc.setFont("helvetica", "normal");
                      }
                      yPos = addText(text, margin + indent, yPos, {
                        fontSize: 10,
                      });
                    }
                    // Also process children if any
                    if (node.childNodes.length > 0) {
                      Array.from(node.childNodes).forEach((child) => {
                        processNode(child, indent, shouldBeBold);
                      });
                    }
                  }
                }
              };

              // Track if any content was rendered
              let contentRendered = false;

              // Process all top-level nodes - ensure we get ALL content
              if (tempDiv.childNodes.length > 0) {
                Array.from(tempDiv.childNodes).forEach((node) => {
                  const yPosBefore = yPos;
                  processNode(node);
                  // Check if yPos changed, indicating content was rendered
                  if (yPos > yPosBefore) {
                    contentRendered = true;
                  }
                });
              }

              // Only use fallback if NO content was rendered
              if (!contentRendered) {
                // Fallback: if no structured content was rendered, render as plain text
                const plainText = stripHTML(section.content);
                if (plainText && plainText.trim().length > 0) {
                  checkPageBreak(10);
                  doc.setFont("helvetica", "normal");
                  yPos = addText(plainText, margin, yPos, { fontSize: 10 });
                  yPos += 5;
                }
              }

              yPos += 5; // Extra spacing after section content
            }
          });
          yPos += 8; // Extra spacing between articles
        });
      }
    } catch (error) {
      console.error("Error fetching Main Agreement:", error);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      yPos = addText(
        "Main Agreement content could not be loaded.",
        margin,
        yPos,
        { fontSize: 10 },
      );
      yPos += 5;
    }

    checkPageBreak(30);

    // Annex A Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Annex A - Selected Services", pageWidth / 2, yPos, {
      align: "center",
    });
    yPos += 10;

    // Add Annex A header content (same as frontend) before dynamic content
    checkPageBreak(50);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    // "Ground Handling Services" heading
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Ground Handling Services", margin, yPos);
    yPos += 6;

    // "to the Standard Ground Handling Agreement (SGHA) of January 2023"
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    yPos = addText(
      "to the Standard Ground Handling Agreement (SGHA) of January 2023",
      margin,
      yPos,
      { fontSize: 10 },
    );
    yPos += 6;

    // "between: " and company name on same line
    const annexLine1Text = "between: ";
    const annexCarrierName = "Malindo Airways SDN BHD";
    doc.text(annexLine1Text, margin, yPos);
    const annexLine1Width = doc.getTextWidth(annexLine1Text);
    doc.setFont("helvetica", "bold");
    doc.text(annexCarrierName, margin + annexLine1Width + 3, yPos);
    yPos += 6;

    // "having its principal office at·" and address on same line
    doc.setFont("helvetica", "normal");
    const annexLine2Text = "having its principal office at·";
    const annexCarrierAddress = "Petaling Jaya, Malaysia";
    doc.text(annexLine2Text, margin, yPos);
    const annexLine2Width = doc.getTextWidth(annexLine2Text);
    doc.setFont("helvetica", "bold");
    doc.text(annexCarrierAddress, margin + annexLine2Width + 3, yPos);
    yPos += 6;

    // "hereinafter referred to as the 'Carrier'"
    doc.setFont("helvetica", "normal");
    yPos = addText("hereinafter referred to as the 'Carrier'", margin, yPos, {
      fontSize: 10,
    });
    yPos += 6;

    // "and:" and handling company name on same line (dynamic)
    const annexLine3Text = "and:";
    const annexHandlingCompanyName =
      clientDetails?.name ||
      submission.client_name ||
      "INDOTHAI KOLKATA PRIVATE LIMITED";
    doc.text(annexLine3Text, margin, yPos);
    const annexLine3Width = doc.getTextWidth(annexLine3Text);
    doc.setFont("helvetica", "bold");
    doc.text(annexHandlingCompanyName, margin + annexLine3Width + 3, yPos);
    yPos += 6;

    // "having its principal office at·" and address on same line (dynamic)
    doc.setFont("helvetica", "normal");
    const annexLine4Text = "having its principal office at·";
    // Build address from client details
    let annexPrincipalOffice = "Kolkata, IN"; // Default fallback
    if (clientDetails) {
      const addressParts = [];
      if (clientDetails.city) addressParts.push(clientDetails.city);
      if (clientDetails.state) addressParts.push(clientDetails.state);
      if (clientDetails.country) addressParts.push(clientDetails.country);
      if (addressParts.length > 0) {
        annexPrincipalOffice = addressParts.join(", ");
      }
    }
    doc.text(annexLine4Text, margin, yPos);
    const annexLine4Width = doc.getTextWidth(annexLine4Text);
    doc.setFont("helvetica", "bold");
    doc.text(annexPrincipalOffice, margin + annexLine4Width + 3, yPos);
    yPos += 6;

    // "the Carrier and/or the Handling Company may hereinafter be referred to as the "Party(ies)" effective from:"
    doc.setFont("helvetica", "normal");
    yPos = addText(
      'the Carrier and/or the Handling Company may hereinafter be referred to as the "Party(ies)" effective from:',
      margin,
      yPos,
      { fontSize: 10 },
    );
    yPos += 6;

    // "This Annex BX.X for"
    const annexLine5Text = "This Annex BX.X for";
    doc.text(annexLine5Text, margin, yPos);
    yPos += 6;

    // "the location(s):"
    const annexLine6Text = "the location(s):";
    doc.text(annexLine6Text, margin, yPos);
    yPos += 6;

    // "is valid from:"
    const annexLine7Text = "is valid from:";
    doc.text(annexLine7Text, margin, yPos);
    yPos += 6;

    // "and replaces:"
    const annexLine8Text = "and replaces:";
    doc.text(annexLine8Text, margin, yPos);
    yPos += 10;

    if (submission.checkbox_selections) {
      const serviceTypes = submission.checkbox_selections.serviceTypes || {};
      const serviceTypeNames = [];
      if (serviceTypes.comp) serviceTypeNames.push("COMP");
      if (serviceTypes.ramp) serviceTypeNames.push("Ramp");
      if (serviceTypes.cargo) serviceTypeNames.push("Cargo");

      if (serviceTypeNames.length > 0) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`Service Types: ${serviceTypeNames.join(", ")}`, margin, yPos);
        yPos += 8;
      }

      // Process Annex A sections
      Object.keys(submission.checkbox_selections)
        .filter(
          (mainKey) => mainKey !== "serviceTypes" && /^\d+$/.test(mainKey),
        )
        .sort((a, b) => parseInt(a) - parseInt(b))
        .forEach((mainSectionNum) => {
          const mainSection = submission.checkbox_selections[mainSectionNum];
          if (!mainSection || typeof mainSection !== "object") return;

          Object.keys(mainSection)
            .sort()
            .forEach((sectionKey) => {
              const sectionData = mainSection[sectionKey];
              if (!sectionData || Object.keys(sectionData).length === 0) return;

              checkPageBreak(30);
              const sectionTitle =
                finalSectionTitles[sectionKey] || `Section ${sectionKey}`;
              doc.setFontSize(11);
              doc.setFont("helvetica", "bold");
              doc.text(sectionTitle, margin, yPos);
              yPos += 6;

              const items = Object.keys(sectionData)
                .filter((key) => sectionData[key] === true)
                .sort();

              const mainItems = [];
              const groupedSubItems = {};

              items.forEach((item) => {
                const subItemMatchLetter = item.match(
                  /^(\d+\.\d+\.\d+)\.([a-z]+)$/,
                );
                if (subItemMatchLetter) {
                  const parent = subItemMatchLetter[1];
                  if (!groupedSubItems[parent]) groupedSubItems[parent] = [];
                  groupedSubItems[parent].push(item);
                  return;
                }

                const subItemMatchNumeric = item.match(
                  /^(\d+\.\d+\.\d+)\.(\d+)$/,
                );
                if (subItemMatchNumeric) {
                  const parent = subItemMatchNumeric[1];
                  if (!groupedSubItems[parent]) groupedSubItems[parent] = [];
                  groupedSubItems[parent].push(item);
                  return;
                }

                const specialMatch = item.match(/^(\d+\.\d+\.\d+)-/);
                if (specialMatch) {
                  const parent = specialMatch[1];
                  if (!groupedSubItems[parent]) groupedSubItems[parent] = [];
                  groupedSubItems[parent].push(item);
                  return;
                }

                const mainItemMatch3 = item.match(/^(\d+\.\d+\.\d+)$/);
                if (mainItemMatch3) {
                  mainItems.push(item);
                  groupedSubItems[item] = [];
                  return;
                }

                const mainItemMatch2 = item.match(/^(\d+\.\d+)$/);
                if (mainItemMatch2) {
                  mainItems.push(item);
                  groupedSubItems[item] = [];
                  return;
                }

                mainItems.push(item);
                groupedSubItems[item] = [];
              });

              mainItems.sort();

              mainItems.forEach((itemKey) => {
                checkPageBreak(15);
                const subItems = groupedSubItems[itemKey] || [];

                // Construct full item key: itemKey in checkbox_selections is relative to section
                // e.g., sectionKey="1.1", itemKey="1" -> fullKey="1.1.1"
                // But if itemKey already contains dots (like "1.1.1"), use it directly
                let fullItemKey =
                  itemKey.includes(".") && itemKey.split(".").length >= 3
                    ? itemKey
                    : `${sectionKey}.${itemKey}`;
                fullItemKey = normalizeKeyForTemplate(fullItemKey, sectionKey);

                // Try to get item text using the full key (normalized to match template keys)
                let itemText = getItemText(fullItemKey);
                // Fallback: try direct lookup if full key didn't work
                if (!itemText) {
                  itemText = getItemText(
                    normalizeKeyForTemplate(itemKey, sectionKey),
                  );
                }

                // Debug logging
                if (!itemText) {
                  console.warn(
                    `[PDF] No text found for item: ${itemKey} (fullKey: ${fullItemKey})`,
                    {
                      itemTextMapSize: Object.keys(finalItemTextMap).length,
                      sampleKeys: Object.keys(finalItemTextMap).slice(0, 10),
                      sectionKey: sectionKey,
                      triedKeys: [fullItemKey, itemKey],
                    },
                  );
                }

                // Display the item with its original key (as shown in frontend) and text
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                const itemLine = `• ${itemKey}${itemText ? ": " + itemText : ""}`;
                yPos = addText(itemLine, margin + 5, yPos, { fontSize: 10 });

                if (subItems.length > 0) {
                  subItems.sort().forEach((subItem) => {
                    checkPageBreak(10);
                    // Construct full sub-item key
                    // If subItem is like "1.1" relative to section "1.1", it becomes "1.1.1.1"
                    // If subItem is already full like "1.1.1.1", use it directly
                    let fullSubItemKey =
                      subItem.includes(".") && subItem.split(".").length >= 4
                        ? subItem
                        : `${fullItemKey}.${subItem.split(".").pop()}`;
                    fullSubItemKey = normalizeKeyForTemplate(
                      fullSubItemKey,
                      sectionKey,
                    );

                    let subItemText = getItemText(fullSubItemKey);
                    // Fallback: try with parent + sub suffix
                    if (!subItemText) {
                      subItemText = getItemText(
                        normalizeKeyForTemplate(
                          `${fullItemKey}.${subItem.split(".").pop()}`,
                          sectionKey,
                        ),
                      );
                    }
                    // Fallback: try direct lookup (normalized)
                    if (!subItemText) {
                      subItemText = getItemText(
                        normalizeKeyForTemplate(subItem, sectionKey),
                      );
                    }

                    const subItemLine = `  - ${subItem}${subItemText ? ": " + subItemText : ""}`;
                    yPos = addText(subItemLine, margin + 10, yPos, {
                      fontSize: 9,
                    });
                  });
                }
              });

              yPos += 5;
            });
        });
    }

    checkPageBreak(30);

    // Annex B Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Annex B - Additional Information", pageWidth / 2, yPos, {
      align: "center",
    });
    yPos += 10;

    try {
      // Fetch Annex B variables first (needed for substitution in template)
      const variablesResponse = await api.get(
        `/api/client/annex-a-submissions/${submission.submission_id}/variables/template`,
      );
      const variables = variablesResponse.data?.data?.variables || {};
      const templateVariables =
        variablesResponse.data?.data?.templateVariables || [];

      // [PDF Annex B] Debug: log variables available for tables
      console.log("[PDF Annex B] Variables keys:", Object.keys(variables));
      console.log(
        "[PDF Annex B] aircraft_options present:",
        !!variables.aircraft_options,
        typeof variables.aircraft_options,
        variables.aircraft_options
          ? typeof variables.aircraft_options === "string"
            ? variables.aircraft_options.substring(0, 80)
            : JSON.stringify(variables.aircraft_options).substring(0, 80)
          : "",
      );
      console.log(
        "[PDF Annex B] additional_charges present:",
        !!variables.additional_charges,
        typeof variables.additional_charges,
        variables.additional_charges
          ? typeof variables.additional_charges === "string"
            ? variables.additional_charges.substring(0, 80)
            : JSON.stringify(variables.additional_charges).substring(0, 80)
          : "",
      );
      console.log("[PDF Annex B] templateVariables:", templateVariables);

      // Fetch Annex B Section Template and render content with tables (like Add New SGHA Annex B step)
      try {
        const annexBUrl = `/sgha_template_content/get/${templateYear}/Annex B/Section Template`;
        const annexBParams = templateName
          ? { template_name: templateName }
          : {};
        const annexBTemplateRes = await api.get(annexBUrl, {
          params: annexBParams,
        });
        if (annexBTemplateRes.data?.data?.content) {
          const content = annexBTemplateRes.data.data.content;
          const parsedContent =
            typeof content === "string" ? JSON.parse(content) : content;
          console.log(
            "[PDF Annex B] Template field count:",
            parsedContent.length,
            "field types:",
            parsedContent
              .map((f) => f && f.type)
              .filter(Boolean)
              .slice(0, 20),
          );
          const editors = parsedContent.filter((f) => f && f.type === "editor");
          editors.forEach((ed, i) => {
            const html = (ed.value ?? ed.content ?? "").substring(0, 400);
            console.log(
              `[PDF Annex B] Editor ${i} length=${(ed.value || ed.content || "").length} contains {{ =${(ed.value || ed.content || "").includes("{{")} snippet=`,
              html,
            );
          });
          const sections = [];
          let currentArticle = null;
          let currentSection = null;
          let currentMainSection = null;

          parsedContent.forEach((field, index) => {
            if (!field || !field.type) return;

            if (field.type === "heading_no") {
              const sectionNum = String(field.value ?? "");

              // Top-level article (1,2,3...) – followed by heading OR subheading
              if (
                !sectionNum.includes(".") &&
                ["1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(
                  sectionNum,
                )
              ) {
                const nextF = parsedContent[index + 1];
                if (
                  nextF &&
                  (nextF.type === "heading" || nextF.type === "subheading")
                ) {
                  currentMainSection = sectionNum;
                  currentSection = null; // CRITICAL: reset so editors attach to new article
                  currentArticle = {
                    articleNumber: sectionNum,
                    articleTitle: nextF.value ?? "",
                    sections: [],
                  };
                  sections.push(currentArticle);
                  console.log("[PDF Annex B] Created article", {
                    articleNumber: sectionNum,
                    articleTitle: currentArticle.articleTitle,
                  });
                  return;
                }
              }

              // Subsection (e.g. 1.1, 2.3)
              if (sectionNum.includes(".") && currentMainSection) {
                const nextF = parsedContent[index + 1];
                if (nextF && nextF.type === "subheading") {
                  currentSection = {
                    sectionNumber: sectionNum,
                    sectionTitle: nextF.value ?? "",
                    content: null,
                  };
                  if (currentArticle)
                    currentArticle.sections.push(currentSection);
                  return;
                }
              }
            }

            if (field.type === "subheading_no" && currentMainSection) {
              const headingNo = String(field.value ?? "");
              if (headingNo.includes(".")) {
                const nextF = parsedContent[index + 1];
                const sectionTitle =
                  nextF && nextF.type === "subheading"
                    ? (nextF.value ?? "")
                    : "";
                currentSection = {
                  sectionNumber: headingNo,
                  sectionTitle,
                  content: null,
                };
                if (currentArticle)
                  currentArticle.sections.push(currentSection);
                return;
              }
            }

            if (field.type === "editor" && currentArticle) {
              const html = field.value ?? field.content ?? "";
              if (!html) return;
              if (currentSection) {
                // Append to existing section content
                currentSection.content = currentSection.content
                  ? currentSection.content + "<br/>" + html
                  : html;
              } else {
                // Editor directly under article with no subsection – create a default section
                currentArticle.sections.push({
                  sectionNumber: null,
                  sectionTitle: null,
                  content: html,
                });
              }
            }
          });

          // [PDF Annex B] Debug: log parsed sections and whether content has {{ placeholders
          console.log("[PDF Annex B] Parsed sections count:", sections.length);
          sections.forEach((art) => {
            art.sections.forEach((sec) => {
              const content = sec.content || "";
              const hasPlaceholders =
                typeof content === "string" && content.includes("{{");
              const hasAircraft =
                typeof content === "string" && content.includes("aircraft");
              const hasAdditional =
                typeof content === "string" && content.includes("additional");
              console.log(
                `[PDF Annex B] Section ${art.articleNumber}.${sec.sectionNumber || "?"} contentLength=${content.length} has{{=${hasPlaceholders} hasAircraft=${hasAircraft} hasAdditional=${hasAdditional}`,
              );
              if (content.length > 0 && content.length < 500) {
                console.log("[PDF Annex B] Full content:", content);
              } else if (content.length >= 500) {
                console.log(
                  "[PDF Annex B] Content snippet (first 500):",
                  content.substring(0, 500),
                );
              }
            });
          });

          const colWidthsAircraft = [55, 35, 30, 35];
          const colWidthsCharges = [25, 55, 45, 40];

          // Render Annex B sections: split each section content by variables and render text + tables
          sections.forEach((article) => {
            // Skip Annex B articles that have no actual text/table content to avoid heading-only pages
            const nonEmptySections = (article.sections || []).filter(
              (s) => s && s.content && String(s.content).trim().length > 0,
            );
            if (nonEmptySections.length === 0) {
              console.log("[PDF Annex B] Skipping article with no content", {
                articleNumber: article.articleNumber,
                articleTitle: article.articleTitle,
              });
              return;
            }

            checkPageBreak(30);
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            const articleTitleText = `Article ${article.articleNumber}: ${(article.articleTitle || "").toUpperCase()}`;
            doc.text(articleTitleText, pageWidth / 2, yPos, {
              align: "center",
            });
            yPos += 10;

            nonEmptySections.forEach((section) => {
              // Reserve more space so section heading and first lines of content don't split across pages
              checkPageBreak(50);
              if (section.sectionNumber && section.sectionTitle) {
                doc.setFontSize(11);
                doc.setFont("helvetica", "bold");
                doc.text(
                  `${section.sectionNumber} ${section.sectionTitle}`,
                  margin,
                  yPos,
                );
                yPos += 7;
              }
              if (section.content) {
                const parts = splitAnnexBContentByVariables(section.content);
                console.log(
                  `[PDF Annex B] Section ${section.sectionNumber || "n/a"} parts count=${parts.length}`,
                  parts.map((p) => ({
                    isTable: p.isTable,
                    tableType: p.tableType,
                    variableName: p.variableName,
                    contentLen: (p.content || "").length,
                  })),
                );
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                parts.forEach((part, partIndex) => {
                  if (!part.isTable) {
                    const plainText = stripHTML(part.content || "");
                    if (plainText.trim()) {
                      yPos = addText(plainText, margin, yPos, { fontSize: 10 });
                      yPos += 5;
                    }
                    return;
                  }
                  if (part.tableType === "annex_a_selection") {
                    console.log(
                      "[PDF Annex B] Rendering annex_a_selection text",
                    );
                    yPos = addText(
                      "(See Annex A - Selected Services above)",
                      margin,
                      yPos,
                      { fontSize: 10 },
                    );
                    yPos += 5;
                    return;
                  }
                  if (part.tableType === "aircraft_options") {
                    console.log(
                      "[PDF Annex B] Rendering aircraft_options table, data=",
                      variables.aircraft_options != null,
                    );
                    try {
                      let data = variables.aircraft_options;
                      // Even if no variable data was saved, still render an empty table so structure matches Annex B UI.
                      if (data == null) {
                        console.log(
                          "[PDF Annex B] aircraft_options is null/undefined, drawing empty table structure",
                        );
                        checkPageBreak(25);
                        yPos = drawSimpleTable(
                          margin,
                          yPos,
                          [
                            "Aircraft Company",
                            "Region",
                            "MOTW",
                            "Limit Per Incident",
                          ],
                          [],
                          colWidthsAircraft,
                          { fontSize: 9, rowHeight: 7 },
                        );
                        return;
                      }
                      data = typeof data === "string" ? JSON.parse(data) : data;
                      const rows = Array.isArray(data)
                        ? data.map((a) => [
                            a.Company_name || "-",
                            a.Flight_type || "-",
                            a.MTOW || "-",
                            a.Limit_per_incident || "-",
                          ])
                        : [
                            [
                              data.Company_name || "-",
                              data.Flight_type || "-",
                              data.MTOW || "-",
                              data.Limit_per_incident || "-",
                            ],
                          ];
                      if (rows.length === 0) {
                        console.log(
                          "[PDF Annex B] aircraft_options rows empty, drawing empty table",
                        );
                        checkPageBreak(25);
                        yPos = drawSimpleTable(
                          margin,
                          yPos,
                          [
                            "Aircraft Company",
                            "Region",
                            "MOTW",
                            "Limit Per Incident",
                          ],
                          [],
                          colWidthsAircraft,
                          { fontSize: 9, rowHeight: 7 },
                        );
                      } else {
                        console.log(
                          "[PDF Annex B] drawSimpleTable aircraft_options rows=",
                          rows.length,
                          rows,
                        );
                        checkPageBreak(40);
                        yPos = drawSimpleTable(
                          margin,
                          yPos,
                          [
                            "Aircraft Company",
                            "Region",
                            "MOTW",
                            "Limit Per Incident",
                          ],
                          rows,
                          colWidthsAircraft,
                          { fontSize: 9, rowHeight: 7 },
                        );
                      }
                    } catch (e) {
                      console.error(
                        "[PDF Annex B] Failed to render aircraft_options table, falling back to text:",
                        e,
                      );
                      yPos = addText(
                        String(variables.aircraft_options || "N/A"),
                        margin,
                        yPos,
                        { fontSize: 10 },
                      );
                      yPos += 5;
                    }
                    return;
                  }
                  if (part.tableType === "additional_charges") {
                    console.log(
                      "[PDF Annex B] Rendering additional_charges table, data=",
                      variables.additional_charges != null,
                    );
                    try {
                      let data = variables.additional_charges;
                      // Even if no variable data was saved, still render an empty table so structure matches Annex B UI.
                      if (data == null) {
                        console.log(
                          "[PDF Annex B] additional_charges is null/undefined, drawing empty table structure",
                        );
                        checkPageBreak(25);
                        yPos = drawSimpleTable(
                          margin,
                          yPos,
                          [
                            "Serial No.",
                            "Service",
                            "Applicable for",
                            "Unit of Measure",
                          ],
                          [],
                          colWidthsCharges,
                          { fontSize: 9, rowHeight: 7 },
                        );
                        return;
                      }
                      data = typeof data === "string" ? JSON.parse(data) : data;
                      const arr = Array.isArray(data)
                        ? data
                        : data && data.selected
                          ? data.selected
                          : [];
                      const rows = arr.map((c, i) => [
                        i + 1,
                        c.Service_name || c.charge_name || c.name || "-",
                        c.Charge_type || "-",
                        c.unit_or_measure || "-",
                      ]);
                      if (rows.length === 0) {
                        console.log(
                          "[PDF Annex B] additional_charges rows empty, drawing empty table",
                        );
                        checkPageBreak(25);
                        yPos = drawSimpleTable(
                          margin,
                          yPos,
                          [
                            "Serial No.",
                            "Service",
                            "Applicable for",
                            "Unit of Measure",
                          ],
                          [],
                          colWidthsCharges,
                          { fontSize: 9, rowHeight: 7 },
                        );
                      } else {
                        console.log(
                          "[PDF Annex B] drawSimpleTable additional_charges rows=",
                          rows.length,
                        );
                        checkPageBreak(15 + rows.length * 7);
                        yPos = drawSimpleTable(
                          margin,
                          yPos,
                          [
                            "Serial No.",
                            "Service",
                            "Applicable for",
                            "Unit of Measure",
                          ],
                          rows,
                          colWidthsCharges,
                          { fontSize: 9, rowHeight: 7 },
                        );
                      }
                    } catch (e) {
                      console.error(
                        "[PDF Annex B] Failed to render additional_charges table, falling back to text:",
                        e,
                      );
                      yPos = addText(
                        String(variables.additional_charges || "N/A"),
                        margin,
                        yPos,
                        { fontSize: 10 },
                      );
                      yPos += 5;
                    }
                    return;
                  }
                  if (part.tableType === "variable" && part.variableName) {
                    const val = variables[part.variableName];
                    const displayName = part.variableName
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase());
                    doc.setFont("helvetica", "bold");
                    doc.text(`${displayName}:`, margin, yPos);
                    doc.setFont("helvetica", "normal");
                    const valueStr =
                      val === undefined || val === null
                        ? "N/A"
                        : typeof val === "object"
                          ? JSON.stringify(val)
                          : String(val);
                    yPos += 4;
                    yPos = addText(valueStr, margin, yPos, { fontSize: 10 });
                    yPos += 5;
                  }
                });
                yPos += 3;
              }
            });
            yPos += 8;
          });
        }
      } catch (annexBErr) {
        console.warn(
          "Annex B template not loaded, falling back to variables list:",
          annexBErr,
        );
      }

      if (variablesResponse.data?.data) {
        // Display custom variables as fallback/supplement (excluding reserved ones)
        const reservedVariables = [
          "annex_a_selection",
          "aircraft_options",
          "additional_charges",
        ];
        const customVars = templateVariables.filter(
          (v) => !reservedVariables.includes(v),
        );
        if (customVars.length > 0) {
          checkPageBreak(15);
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text("Additional details", margin, yPos);
          yPos += 6;
          customVars.forEach((varName) => {
            checkPageBreak(10);
            const varValue = variables[varName] || "";
            const displayName = varName
              .replace(/_/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase());
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(`${displayName}:`, margin, yPos);
            doc.setFont("helvetica", "normal");
            const valueStr =
              typeof varValue === "object"
                ? JSON.stringify(varValue)
                : String(varValue || "N/A");
            yPos = addText(valueStr, margin + 40, yPos, {
              fontSize: 10,
              maxWidth: maxWidth - 40,
            });
            yPos += 5;
          });
          yPos += 5;
        }

        // Display aircraft options if available
        if (variables.aircraft_options) {
          checkPageBreak(20);
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text("Aircraft Options", margin, yPos);
          yPos += 6;

          try {
            const aircraftData =
              typeof variables.aircraft_options === "string"
                ? JSON.parse(variables.aircraft_options)
                : variables.aircraft_options;

            if (Array.isArray(aircraftData) && aircraftData.length > 0) {
              doc.setFontSize(9);
              doc.setFont("helvetica", "normal");
              aircraftData.forEach((aircraft) => {
                checkPageBreak(10);
                const aircraftLine = `• ${aircraft.aircraft_name || aircraft.name || "N/A"}`;
                yPos = addText(aircraftLine, margin + 5, yPos, { fontSize: 9 });
              });
            } else if (typeof aircraftData === "object") {
              doc.setFontSize(9);
              doc.setFont("helvetica", "normal");
              Object.entries(aircraftData).forEach(([key, value]) => {
                checkPageBreak(10);
                const line = `• ${key}: ${value}`;
                yPos = addText(line, margin + 5, yPos, { fontSize: 9 });
              });
            }
          } catch (e) {
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            yPos = addText(
              String(variables.aircraft_options),
              margin + 5,
              yPos,
              { fontSize: 9 },
            );
          }
          yPos += 5;
        }

        // Display additional charges if available
        if (variables.additional_charges) {
          checkPageBreak(20);
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text("Additional Charges", margin, yPos);
          yPos += 6;

          try {
            const chargesData =
              typeof variables.additional_charges === "string"
                ? JSON.parse(variables.additional_charges)
                : variables.additional_charges;

            if (Array.isArray(chargesData) && chargesData.length > 0) {
              doc.setFontSize(9);
              doc.setFont("helvetica", "normal");
              chargesData.forEach((charge) => {
                checkPageBreak(10);
                const name =
                  charge.Service_name ||
                  charge.charge_name ||
                  charge.name ||
                  "N/A";
                const detail =
                  charge.unit_or_measure || charge.Charge_type
                    ? [charge.Charge_type, charge.unit_or_measure]
                        .filter(Boolean)
                        .join(" · ")
                    : charge.amount || charge.value || "N/A";
                const chargeLine = `• ${name}${detail ? ` (${detail})` : ""}`;
                yPos = addText(chargeLine, margin + 5, yPos, { fontSize: 9 });
              });
            } else if (typeof chargesData === "object") {
              doc.setFontSize(9);
              doc.setFont("helvetica", "normal");
              Object.entries(chargesData).forEach(([key, value]) => {
                checkPageBreak(10);
                const line = `• ${key}: ${value}`;
                yPos = addText(line, margin + 5, yPos, { fontSize: 9 });
              });
            }
          } catch (e) {
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            yPos = addText(
              String(variables.additional_charges),
              margin + 5,
              yPos,
              { fontSize: 9 },
            );
          }
          yPos += 5;
        }
      }
    } catch (error) {
      console.error("Error fetching Annex B data:", error);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      yPos = addText("Annex B data could not be loaded.", margin, yPos, {
        fontSize: 10,
      });
    }

    // Load logo image (before calculating total pages)
    const loadLogo = () => {
      return new Promise((resolve, reject) => {
        // First, try to fetch the image as a blob and convert to data URL
        // This works better with webpack-processed imports
        const tryFetch = (imagePath) => {
          return fetch(imagePath)
            .then((response) => {
              if (!response.ok) throw new Error("Failed to fetch");
              return response.blob();
            })
            .then((blob) => {
              return new Promise((resolveBlob, rejectBlob) => {
                const reader = new FileReader();
                reader.onloadend = () => resolveBlob(reader.result);
                reader.onerror = rejectBlob;
                reader.readAsDataURL(blob);
              });
            });
        };

        // Try loading via Image first (for CORS issues)
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            // Convert image to base64 data URL
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL("image/png");
            resolve(dataURL);
          } catch (error) {
            // If canvas conversion fails, try fetch
            tryFetch(logoImage)
              .then(resolve)
              .catch(() => {
                // Final fallback: try public path
                tryFetch("/logo192.png").then(resolve).catch(reject);
              });
          }
        };
        img.onerror = () => {
          // If Image load fails, try fetch
          tryFetch(logoImage)
            .then(resolve)
            .catch(() => {
              // Final fallback: try public path
              tryFetch("/logo192.png").then(resolve).catch(reject);
            });
        };
        // Try to load from the imported path
        img.src = logoImage;
      });
    };

    // Add logo and footer to all pages
    try {
      const logoDataURL = await loadLogo();
      const maxLogoSize = 30; // Maximum width/height in mm

      // Get image dimensions to calculate aspect ratio
      const getImageDimensions = (dataURL) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            resolve({ width: img.width, height: img.height });
          };
          img.onerror = () => {
            // Default dimensions if image fails to load
            resolve({ width: 1, height: 1 });
          };
          img.src = dataURL;
        });
      };

      const imgDims = await getImageDimensions(logoDataURL);
      const aspectRatio = imgDims.width / imgDims.height;

      // Calculate dimensions that fit within maxLogoSize while maintaining aspect ratio
      let logoWidth, logoHeight;
      if (aspectRatio >= 1) {
        // Width is greater or equal to height (landscape or square)
        logoWidth = maxLogoSize;
        logoHeight = maxLogoSize / aspectRatio;
      } else {
        // Height is greater than width (portrait)
        logoHeight = maxLogoSize;
        logoWidth = maxLogoSize * aspectRatio;
      }

      const logoX = margin;
      const logoY = margin;

      // Get final page count after all content is added
      const finalTotalPages = doc.internal.pages.length - 1;

      for (let i = 1; i <= finalTotalPages; i++) {
        doc.setPage(i);

        // Add logo to top-left with proper aspect ratio (contain mode)
        doc.addImage(logoDataURL, "PNG", logoX, logoY, logoWidth, logoHeight);

        // Add page number at bottom center with proper padding
        // Position footer text baseline at pageHeight - footerPadding
        // This ensures footer text is visible and content doesn't overlap
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        const footerY = pageHeight - footerPadding;
        doc.text(`Page ${i} of ${finalTotalPages}`, pageWidth / 2, footerY, {
          align: "center",
        });
      }
    } catch (error) {
      console.error("Error loading logo:", error);
      // If logo fails to load, just add page numbers
      const finalTotalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= finalTotalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        const footerY = pageHeight - footerPadding;
        doc.text(`Page ${i} of ${finalTotalPages}`, pageWidth / 2, footerY, {
          align: "center",
        });
      }
    }

    const pdfBlob = doc.output("blob");
    if (openInNewTab) {
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, "_blank");
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
    } else {
      const fileName = `Annex-A-Submission-${submission.submission_id || "export"}.pdf`;
      doc.save(fileName);
    }
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Failed to generate PDF. Please try again.");
  }
};
