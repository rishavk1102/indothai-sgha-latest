import DOMPurify from "dompurify";
import api from "../api/axios";
import logoImage from "../assets/images/logo.png";
import { SDA_PDF } from "./sdaPdfConfig";
import {
  applyLetterhead,
  collapseRepeatedArticleBlocks,
  drawAgreementBlocks,
  drawClauseRow,
  drawCover,
  drawDataTable,
  drawParagraphBanner,
  drawSectionHeading,
  drawSubsectionRow,
  drawWrappedText,
  newSdaDocument,
  resolveCoverModel,
  subsectionLabel,
} from "./sdaPdfLayout";
import {
  createNumberingContext,
  parseAgreementDocument,
  parseClauseLines,
  prefixKeyMarker,
  renumberRepeatedParagraphs,
  selectHandlingCompany,
  splitClauseNumber,
} from "./sghaClauseParser";

/** Set to true to log the raw stored HTML of Annex B articles 9+ (to inspect list shapes). */
const DEBUG_RAW_ANNEX_B = false;

/** Natural sort so 2.1.2 comes before 2.1.10. */
const naturalSort = (a, b) =>
  String(a).localeCompare(String(b), undefined, { numeric: true });

/** Annex A section titles that were stored as extra Annex B articles. */
function isAnnexASectionTitle(title) {
  const text = String(title || "").trim().toLowerCase();
  return (
    /management functions/.test(text) ||
    /passenger services/.test(text) ||
    /ramp services/.test(text) ||
    /load control/.test(text) ||
    /cargo and mail/.test(text) ||
    /support services/.test(text) ||
    /^security\b/.test(text) ||
    /aircraft maintenance/.test(text)
  );
}

function sectionContentKey(section) {
  return [
    section?.sectionNumber || "",
    section?.sectionTitle || "",
    String(section?.content || "").replace(/\s+/g, " ").trim(),
  ].join("|");
}

const hasContent = (section) =>
  !!(section && section.content && String(section.content).trim().length > 0);

function numericPath(value) {
  const raw = String(value || "").trim();
  if (!/^\d/.test(raw)) return null;
  return raw.split(".").map((part) => {
    const n = parseInt(part, 10);
    return Number.isFinite(n) ? n : 0;
  });
}

function compareNumericPaths(a, b) {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const av = a[i] ?? -1;
    const bv = b[i] ?? -1;
    if (av !== bv) return av - bv;
  }
  return 0;
}

/** Numbered sections stay in 1, 2, 3… order. Unnumbered paragraphs keep their place. */
function orderNumberedSections(list) {
  const sections = Array.isArray(list) ? list : [];
  const numbered = sections.filter((section) => numericPath(section?.sectionNumber));
  if (numbered.length < 2) return sections;
  numbered.sort((a, b) =>
    compareNumericPaths(numericPath(a.sectionNumber), numericPath(b.sectionNumber)),
  );
  let index = 0;
  return sections.map((section) =>
    numericPath(section?.sectionNumber) ? numbered[index++] : section,
  );
}

function isClauseSelected(item, serviceTypes) {
  if (item === true) return true;
  if (!item || typeof item !== "object") return false;
  if (item.checked === true) return true;
  const hasServiceType =
    item.ramp !== undefined ||
    item.comp !== undefined ||
    item.cargo !== undefined;
  if (!hasServiceType) return false;
  if (serviceTypes.ramp && item.ramp !== false) return true;
  if (serviceTypes.comp && item.comp !== false) return true;
  if (serviceTypes.cargo && item.cargo !== false) return true;
  return false;
}

/**
 * Checkbox state is stored as { "1.1": { "1.1.2": { ramp: true } } },
 * not as { "1": { "1.1": { "1.1.2": true } } }. Fold both shapes into
 * article -> section -> selected clause keys.
 */
function collectAnnexASelections(selections) {
  const grouped = {};
  if (!selections || typeof selections !== "object") return grouped;
  const serviceTypes = selections.serviceTypes || {
    comp: false,
    ramp: false,
    cargo: false,
  };
  const add = (sectionKey, clauseKey) => {
    const main = String(sectionKey || "").split(".")[0];
    if (!/^\d+$/.test(main) || !clauseKey) return;
    if (!grouped[main]) grouped[main] = {};
    if (!grouped[main][sectionKey]) grouped[main][sectionKey] = {};
    grouped[main][sectionKey][clauseKey] = true;
  };
  const takeClause = (sectionKey, clauseKey, clause) => {
    if (!isClauseSelected(clause, serviceTypes)) return;
    add(sectionKey, clauseKey);
    const subs = clause && typeof clause === "object" ? clause.subItems : null;
    if (!subs || typeof subs !== "object") return;
    Object.keys(subs).forEach((subKey) => {
      if (isClauseSelected(subs[subKey], serviceTypes)) add(sectionKey, subKey);
    });
  };

  Object.keys(selections).forEach((key) => {
    if (key === "serviceTypes" || key.startsWith("_")) return;
    const node = selections[key];
    if (!node || typeof node !== "object") return;

    if (/^\d+\.\d+$/.test(key)) {
      Object.keys(node).forEach((clauseKey) => {
        takeClause(key, clauseKey, node[clauseKey]);
      });
      return;
    }

    if (/^\d+$/.test(key)) {
      Object.keys(node).forEach((sectionKey) => {
        const section = node[sectionKey];
        if (/^\d+\.\d+$/.test(sectionKey) && section && typeof section === "object") {
          Object.keys(section).forEach((clauseKey) => {
            const clause = section[clauseKey];
            if (clause === true) add(sectionKey, clauseKey);
            else takeClause(sectionKey, clauseKey, clause);
          });
          return;
        }
        if (section === true) add(key, sectionKey);
        else takeClause(key, sectionKey, section);
      });
    }
  });
  return grouped;
}

/** A run of Annex A sections (2, then 4, then 3) is drawn as 2, 3, 4. */
function orderAnnexASectionRun(list) {
  const result = [];
  let index = 0;
  while (index < list.length) {
    if (!list[index].annexASection) {
      result.push(list[index]);
      index += 1;
      continue;
    }
    const run = [];
    while (index < list.length && list[index].annexASection) {
      run.push(list[index]);
      index += 1;
    }
    run.sort((a, b) =>
      compareNumericPaths(
        numericPath(a.articleNumber) || [0],
        numericPath(b.articleNumber) || [0],
      ),
    );
    result.push(...run);
  }
  return result;
}

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
      ALLOWED_TAGS: ["ol", "ul", "li", "p", "br"],
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

    // Direct child lists only. querySelectorAll would also return deeper
    // descendants, which are processed again by the recursive call.
    const childLists = (el) =>
      Array.from(el.children).filter((c) => c.tagName === "OL" || c.tagName === "UL");

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
          itemClone.querySelectorAll("ol, ul").forEach((nested) => nested.remove());
          itemClone.querySelectorAll("br").forEach((br) => br.replaceWith(" "));
          itemClone.querySelectorAll("p").forEach((p) => p.append(" "));
          const cleanText = (itemClone.textContent || "").replace(/\s+/g, " ").trim();

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
          const nestedLists = childLists(item);
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
  void agreementYear;
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

      if (/^\d{1,2}$/.test(sectionNum)) {
        if (
          index + 1 < templateData.length &&
          templateData[index + 1].type === "heading"
        ) {
          currentMainSection = sectionNum;
          mainSectionHeading = templateData[index + 1].value;
          titlesMap[sectionNum] = mainSectionHeading || "";
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

/* ------------------------------------------------------------------ */
/* One article builder for Main Agreement, Annex A and Annex B         */
/* ------------------------------------------------------------------ */

// Any 1-2 digit number followed by a heading starts an article (no 1-9 limit).
const ARTICLE_NO = /^\d{1,2}$/;
const norm = (s) => String(s || "").trim().toLowerCase();

/**
 * @param {Array} fields  stored template fields (heading_no, heading, subheading_no, subheading, editor)
 * @param {{ annexAAware?: boolean, sort?: boolean }} options
 *   annexAAware: keep Annex A section titles stored inside Annex B as separate
 *                "annexASection" articles even when the article number repeats.
 *   sort:        order articles by number (not for Annex B, where Article 1 and
 *                Annex A Section 1 share a number).
 */
function buildArticlesFromTemplate(fields, { annexAAware = false, sort = false } = {}) {
  const articles = [];
  if (!Array.isArray(fields)) return articles;
  let article = null;
  let section = null;

  fields.forEach((field, index) => {
    if (!field || !field.type) return;
    const next = fields[index + 1];

    if (field.type === "heading_no") {
      const no = String(field.value ?? "").trim();

      if (
        ARTICLE_NO.test(no) &&
        next &&
        (next.type === "heading" || next.type === "subheading")
      ) {
        const title = next.value ?? "";
        const annexASection = annexAAware && isAnnexASectionTitle(title);
        section = null; // editors that follow attach to the article, not the old section
        const existing = articles.find(
          (a) =>
            a.articleNumber === no &&
            (annexASection
              ? a.annexASection
              : !a.annexASection && norm(a.articleTitle) === norm(title)),
        );
        if (existing) {
          article = existing;
          return;
        }
        article = { articleNumber: no, articleTitle: title, sections: [], annexASection };
        articles.push(article);
        return;
      }

      if (no.includes(".") && article && next && next.type === "subheading") {
        section = { sectionNumber: no, sectionTitle: next.value || "", content: null };
        article.sections.push(section);
        return;
      }
    }

    if (field.type === "subheading_no" && article) {
      const no = String(field.value ?? "").trim();
      if (no.includes(".")) {
        section = {
          sectionNumber: no,
          sectionTitle: next && next.type === "subheading" ? next.value || "" : "",
          content: null,
        };
        article.sections.push(section);
        return;
      }
    }

    if (field.type === "editor" && article) {
      const html = field.value ?? field.content ?? "";
      if (!html) return;
      if (section) {
        section.content = section.content ? `${section.content}<br/>${html}` : html;
      } else {
        article.sections.push({ sectionNumber: null, sectionTitle: null, content: html });
      }
    }
  });

  return sort
    ? articles.sort((a, b) =>
        compareNumericPaths(
          numericPath(a.articleNumber) || [0],
          numericPath(b.articleNumber) || [0],
        ),
      )
    : articles;
}

/**
 * Fetch Annex A template data if not provided
 */
const fetchAnnexATemplateData = async (agreementYear = 2025, templateName = null) => {
  try {
    const params =
      templateName != null && String(templateName).trim() !== ""
        ? { template_name: String(templateName).trim() }
        : {};
    const response = await api.get(
      `/sgha_template_content/get/${agreementYear}/Annex A/Section Template`,
      { params },
    );

    if (response.data?.data?.content) {
      const content = response.data.data.content;
      let parsedContent;
      try {
        parsedContent =
          typeof content === "string" ? JSON.parse(content) : content;
      } catch (parseError) {
        console.error("Error parsing Annex A content:", parseError);
        return { itemTextMap: {}, sectionTitles: {}, fields: [] };
      }

      const parsed = await parseTemplateData(parsedContent, agreementYear);
      return { ...parsed, fields: parsedContent };
    }
  } catch (error) {
    console.error("Error fetching Annex A template data:", error);
  }

  return { itemTextMap: {}, sectionTitles: {}, fields: [] };
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

    const doc = newSdaDocument();

    const pageWidth = SDA_PDF.page.width;
    const pageHeight = SDA_PDF.page.height;
    const margin = SDA_PDF.margin.left;
    const topMargin = SDA_PDF.contentTop;
    const bottomMargin = SDA_PDF.margin.bottom;
    const maxWidth = pageWidth - SDA_PDF.margin.left - SDA_PDF.margin.right;
    let yPos = topMargin;

    // Helper function to add a new page if needed
    const checkPageBreak = (requiredHeight = 20) => {
      if (yPos + requiredHeight > pageHeight - bottomMargin) {
        doc.addPage();
        yPos = topMargin; // Reset to below logo area on new page
        return true;
      }
      return false;
    };

    // Word-wrapped body text. Emails are painted as mailto links.
    const addText = (text, x, y, opts = {}) => {
      return drawWrappedText(doc, text, x, y, {
        fontSize: opts.fontSize || SDA_PDF.font.body,
        fontStyle: opts.fontStyle || "normal",
        color: opts.color || SDA_PDF.color.black,
        maxWidth: opts.maxWidth || maxWidth,
        align: opts.align || "left",
        bottom: pageHeight - bottomMargin,
        top: topMargin,
      });
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

    /** Parse stored editor HTML and draw it. `numbering` carries list numbers across one article. */
    const renderHtmlBody = (html, numbering) => {
      const blocks = parseAgreementDocument(html, numbering ? { numbering } : {});
      yPos = blocks.length
        ? drawAgreementBlocks(doc, yPos, blocks)
        : drawAgreementBlocks(doc, yPos, [
            { type: "paragraph", lines: parseClauseLines(stripHTML(html)) },
          ]);
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

    // Grey-header table. Long cells wrap and the header repeats on the next page.
    const drawSimpleTable = (
      startX,
      startY,
      headers,
      rows,
      colWidths,
      opts = {},
    ) => {
      void startX;
      return drawDataTable(doc, startY, headers, rows, colWidths, opts);
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

      return null;
    };

    // Cover uses the Annex B1.0 letterhead. Client fields fill the party tables.
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
      if (submission.client_name) {
        clientDetails = {
          name: submission.client_name,
          city: submission.city || "",
          state: submission.state || "",
          country: submission.country || "",
        };
      }
    }

    let handlingCompany = null;
    try {
      const businessResponse = await api.get("/business/fetch_businesses_test", {
        params: { limit: 100 },
      });
      handlingCompany = selectHandlingCompany(
        businessResponse.data?.data || [],
        submission,
      );
    } catch (error) {
      console.error("Error fetching handling company:", error);
    }

    yPos = drawCover(
      doc,
      yPos,
      resolveCoverModel(submission, clientDetails, handlingCompany),
    );

    // Use the same template year + name that the submission used (if available)
    const templateYear = submission.agreement_year || 2025;
    const templateName =
      submission.form_details &&
      typeof submission.form_details === "object" &&
      submission.form_details.template_name &&
      String(submission.form_details.template_name).trim() !== ""
        ? String(submission.form_details.template_name).trim()
        : null;

    /* -------------------------- MAIN AGREEMENT -------------------------- */
    try {
      // Fetch Main Agreement template (matching client's chosen template when templateName is set)
      const mainUrl = `/sgha_template_content/get/${templateYear}/Main Agreement/Section Template`;
      const mainParams = templateName ? { template_name: templateName } : {};
      const mainAgreementResponse = await api.get(mainUrl, {
        params: mainParams,
      });

      if (mainAgreementResponse.data?.data?.content) {
        const content = mainAgreementResponse.data.data.content;
        const parsedContent =
          typeof content === "string" ? JSON.parse(content) : content;

        const renderable = buildArticlesFromTemplate(parsedContent)
          .map((article) => ({
            article,
            sections: orderNumberedSections(article.sections).filter(hasContent),
          }))
          .filter((entry) => entry.sections.length > 0);

        // Draw the banner only when there is something to put under it.
        if (renderable.length) {
          yPos = drawParagraphBanner(doc, yPos, "MAIN AGREEMENT");
        }

        renderable.forEach(({ article, sections }) => {
          yPos = drawParagraphBanner(
            doc,
            yPos,
            `ARTICLE ${article.articleNumber}: ${(article.articleTitle || "").toUpperCase()}`,
          );

          sections.forEach((section) => {
            if (section.sectionNumber && section.sectionTitle) {
              yPos = drawSubsectionRow(
                doc,
                yPos,
                section.sectionNumber,
                section.sectionTitle,
              );
            }
            renderHtmlBody(section.content);
          });
          yPos += 2;
        });
      }
    } catch (error) {
      console.error("Error fetching Main Agreement:", error);
      yPos = drawParagraphBanner(doc, yPos, "MAIN AGREEMENT");
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

    /* ------------------------------ ANNEX A ------------------------------ */
    yPos = drawParagraphBanner(doc, yPos, "ANNEX A — SELECTED SERVICES");

    if (submission.checkbox_selections) {
      const serviceTypes = submission.checkbox_selections.serviceTypes || {};
      const serviceTypeNames = [];
      if (serviceTypes.comp) serviceTypeNames.push("COMP");
      if (serviceTypes.ramp) serviceTypeNames.push("Ramp");
      if (serviceTypes.cargo) serviceTypeNames.push("Cargo");

      if (serviceTypeNames.length > 0) {
        yPos = addText(
          `Service types: ${serviceTypeNames.join(", ")}`,
          margin,
          yPos,
          { fontSize: 10, fontStyle: "bold" },
        );
        yPos += 3;
      }

      // Process Annex A sections. Selections live on "1.1" / "2.1" keys.
      const annexAByArticle = collectAnnexASelections(
        submission.checkbox_selections,
      );
      Object.keys(annexAByArticle)
        .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
        .forEach((mainSectionNum) => {
          const mainSection = annexAByArticle[mainSectionNum];
          if (!mainSection || typeof mainSection !== "object") return;

          const mainTitle = finalSectionTitles[mainSectionNum] || "";
          yPos = drawSectionHeading(
            doc,
            yPos,
            `SECTION ${mainSectionNum}. ${mainTitle}`.trim(),
          );

          Object.keys(mainSection)
            .sort(naturalSort)
            .forEach((sectionKey) => {
              const sectionData = mainSection[sectionKey];
              if (!sectionData || Object.keys(sectionData).length === 0) return;

              const sectionTitle = finalSectionTitles[sectionKey] || "";
              yPos = drawSubsectionRow(
                doc,
                yPos,
                sectionKey,
                subsectionLabel(sectionKey, sectionTitle) ||
                  sectionTitle ||
                  sectionKey,
              );

              const items = Object.keys(sectionData)
                .filter((key) => sectionData[key] === true)
                .sort(naturalSort);

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

              Object.keys(groupedSubItems).forEach((parent) => {
                if (!mainItems.includes(parent)) mainItems.push(parent);
              });
              mainItems.sort(naturalSort);

              const markerForKey = (key) => {
                const letter = String(key).match(/\.([a-z])$/i);
                if (letter) return `(${letter[1].toLowerCase()})`;
                const num = String(key).match(/\.(\d+)$/);
                if (num) return `${num[1]}.`;
                return "";
              };

              // Rows with the same base clause number are merged into one row.
              const clauseRows = new Map();

              mainItems.forEach((itemKey) => {
                const subItems = groupedSubItems[itemKey] || [];

                // itemKey in checkbox_selections is relative to the section
                // (sectionKey="1.1", itemKey="1" -> "1.1.1"), unless it already
                // contains dots (like "1.1.1"), then it is used directly.
                let fullItemKey =
                  itemKey.includes(".") && itemKey.split(".").length >= 3
                    ? itemKey
                    : `${sectionKey}.${itemKey}`;
                fullItemKey = normalizeKeyForTemplate(fullItemKey, sectionKey);

                let itemText = getItemText(fullItemKey);
                if (!itemText) {
                  itemText = getItemText(
                    normalizeKeyForTemplate(itemKey, sectionKey),
                  );
                }

                if (!itemText) {
                  console.warn(
                    `[PDF] No text found for item: ${itemKey} (fullKey: ${fullItemKey})`,
                  );
                }

                const lines = parseClauseLines(itemText || "");
                subItems.sort(naturalSort).forEach((subItem) => {
                  let fullSubItemKey =
                    subItem.includes(".") && subItem.split(".").length >= 4
                      ? subItem
                      : `${fullItemKey}.${subItem.split(".").pop()}`;
                  fullSubItemKey = normalizeKeyForTemplate(
                    fullSubItemKey,
                    sectionKey,
                  );

                  let subItemText = getItemText(fullSubItemKey);
                  if (!subItemText) {
                    subItemText = getItemText(
                      normalizeKeyForTemplate(
                        `${fullItemKey}.${subItem.split(".").pop()}`,
                        sectionKey,
                      ),
                    );
                  }
                  if (!subItemText) {
                    subItemText = getItemText(
                      normalizeKeyForTemplate(subItem, sectionKey),
                    );
                  }

                  const marker = markerForKey(fullSubItemKey);
                  const parsed = parseClauseLines(subItemText || "");
                  if (!parsed.length) {
                    if (marker) {
                      lines.push({
                        indent: /^\d+\.$/.test(marker) ? 2 : 1,
                        text: marker,
                      });
                    }
                    return;
                  }
                  parsed.forEach((line, index) => {
                    let value = line.text;
                    const hasMarker =
                      /^\([a-z]\)(?:\s|$)/i.test(value) ||
                      /^(?:[1-9]|1\d|20)\.\s/.test(value);
                    if (index === 0 && marker && !hasMarker) {
                      value = `${marker} ${value}`.trim();
                    }
                    const indent = /^(?:[1-9]|1\d|20)\.\s/.test(value)
                      ? 2
                      : Math.max(line.indent || 0, 1);
                    lines.push({ indent, text: value });
                  });
                });

                // Keep only the clean number in the left column; move any
                // glued marker such as "(a)" into the text.
                const { number: baseNumber, markers } =
                  splitClauseNumber(fullItemKey);
                prefixKeyMarker(lines, markers);
                if (clauseRows.has(baseNumber)) {
                  clauseRows.get(baseNumber).push(...lines);
                } else {
                  clauseRows.set(baseNumber, lines);
                }
              });

              clauseRows.forEach((rowLines, num) => {
                yPos = drawClauseRow(doc, yPos, num, rowLines);
              });
            });
        });
    }

    try {
      const annexATemplate = await fetchAnnexATemplateData(
        templateYear,
        templateName,
      );
      const annexAArticles = buildArticlesFromTemplate(annexATemplate.fields, {
        sort: true,
      });
      annexAArticles.forEach((article) => {
        const nonEmptySections = orderNumberedSections(article.sections).filter(hasContent);
        if (!nonEmptySections.length) return;
        yPos = drawParagraphBanner(
          doc,
          yPos,
          `SECTION ${article.articleNumber}. ${(article.articleTitle || "").toUpperCase()}`.trim(),
        );
        nonEmptySections.forEach((section) => {
          if (section.sectionNumber && section.sectionTitle) {
            yPos = drawSubsectionRow(
              doc,
              yPos,
              section.sectionNumber,
              section.sectionTitle,
            );
          }
          renderHtmlBody(section.content);
        });
        yPos += 2;
      });
    } catch (error) {
      console.error("Error rendering Annex A template:", error);
    }

    /* ------------------------------ ANNEX B ------------------------------ */
    yPos = drawParagraphBanner(doc, yPos, "ANNEX B — AGREED TERMS");

    try {
      // Fetch Annex B variables first (needed for substitution in template)
      const variablesResponse = await api.get(
        `/api/client/annex-a-submissions/${submission.submission_id}/variables/template`,
      );
      const variables = variablesResponse.data?.data?.variables || {};
      const templateVariables =
        variablesResponse.data?.data?.templateVariables || [];

      // Fetch Annex B Section Template and render content with tables (like Add New SGHA Annex B step)
      let annexBBodyRendered = false;
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

          const sections = buildArticlesFromTemplate(parsedContent, {
            annexAAware: true,
          });

          if (DEBUG_RAW_ANNEX_B) {
            sections
              .filter((a) => Number(a.articleNumber) >= 9)
              .forEach((a) =>
                a.sections.forEach((s) =>
                  console.log("[RAW]", a.articleNumber, s.sectionNumber, s.content),
                ),
              );
          }

          const colWidthsAircraft = [55, 35, 30, 35];
          const colWidthsCharges = [25, 55, 45, 40];

          // List numbering carries across all sections of one article, so a plain
          // <ol> in Article 14 is drawn 14.1, 14.2 ... and Annex A sections that
          // follow Article 1 continue Article 1's counter (1.2, 1.3 ...).
          let bodyNumbering = createNumberingContext("");

          // Annex A sections inside an article are drawn 1, 2, 3… rather than in stored order.
          orderAnnexASectionRun(sections).forEach((article) => {
            if (!article.annexASection) {
              bodyNumbering = createNumberingContext(article.articleNumber);
            }

            // Skip Annex B articles that have no actual text/table content to avoid heading-only pages
            const nonEmptySections = orderNumberedSections(article.sections).filter(hasContent);
            if (nonEmptySections.length === 0) return;

            annexBBodyRendered = true;
            if (article.annexASection) {
              yPos = drawSectionHeading(
                doc,
                yPos,
                `SECTION ${article.articleNumber}. ${article.articleTitle || ""}`.trim(),
              );
            } else {
              yPos = drawParagraphBanner(
                doc,
                yPos,
                `ARTICLE ${article.articleNumber}: ${(article.articleTitle || "").toUpperCase()}`,
              );
            }

            const seenSectionContent = new Set();
            nonEmptySections.forEach((section) => {
              const contentKey = sectionContentKey(section);
              if (seenSectionContent.has(contentKey)) return;
              seenSectionContent.add(contentKey);
              if (section.sectionNumber && section.sectionTitle) {
                yPos = drawSubsectionRow(
                  doc,
                  yPos,
                  section.sectionNumber,
                  section.sectionTitle,
                );
              }
              if (section.content) {
                const parts = splitAnnexBContentByVariables(section.content);
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                parts.forEach((part) => {
                  if (!part.isTable) {
                    const blocks = collapseRepeatedArticleBlocks(
                      renumberRepeatedParagraphs(
                        parseAgreementDocument(part.content || "", {
                          numbering: bodyNumbering,
                        }),
                      ),
                    );
                    if (blocks.length) {
                      yPos = drawAgreementBlocks(doc, yPos, blocks);
                    }
                    return;
                  }
                  if (part.tableType === "annex_a_selection") {
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
                    try {
                      let data = variables.aircraft_options;
                      if (data == null) return;
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
                      if (rows.length === 0) return;
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
                    try {
                      let data = variables.additional_charges;
                      if (data == null) return;
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
                      if (rows.length === 0) return;
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
                    if (val === undefined || val === null || val === "") return;
                    const displayName = part.variableName
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase());
                    doc.setFont("helvetica", "bold");
                    doc.text(`${displayName}:`, margin, yPos);
                    doc.setFont("helvetica", "normal");
                    const valueStr =
                      typeof val === "object" ? JSON.stringify(val) : String(val);
                    yPos += 4;
                    yPos = addText(valueStr, margin, yPos, { fontSize: 10 });
                    yPos += 3;
                  }
                });
                yPos += 3;
              }
            });
            yPos += 2;
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
        const filledCustomVars = customVars.filter((varName) => {
          const varValue = variables[varName];
          return varValue !== undefined && varValue !== null && varValue !== "";
        });
        if (filledCustomVars.length > 0) {
          yPos = drawParagraphBanner(doc, yPos, "ADDITIONAL DETAILS");
          filledCustomVars.forEach((varName) => {
            checkPageBreak(10);
            const varValue = variables[varName];
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
                : String(varValue);
            yPos = addText(valueStr, margin + 40, yPos, {
              fontSize: 10,
              maxWidth: maxWidth - 40,
            });
            yPos += 3;
          });
          yPos += 2;
        }

        // Bullet lists only when the Annex B template did not already draw these tables.
        if (!annexBBodyRendered && variables.aircraft_options) {
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
        if (!annexBBodyRendered && variables.additional_charges) {
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

    // Letterhead (logo, top right) and page number on every page.
    let logoDataURL = null;
    try {
      const response = await fetch(logoImage);
      if (response.ok) {
        const blob = await response.blob();
        logoDataURL = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } catch (error) {
      console.error("Error loading letterhead logo:", error);
    }
    applyLetterhead(doc, logoDataURL);

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