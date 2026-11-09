import {
  resolveCheckboxServiceFlags,
  walkAgreementListTree,
} from "./nestedListHtml";

/**
 * Set on Annex A local state rebuilt from a saved submission. The submission
 * only lists selected clauses, so anything missing was deselected and must not
 * fall back to the template default.
 */
export const ANNEX_A_FROM_SUBMISSION_KEY = "_fromSubmission";

const NO_SERVICE_FLAGS = { ramp: false, comp: false, cargo: false };

export function isAnnexAFlagsSelected(flags, serviceTypes = {}) {
  if (flags === true) return true;
  if (!flags || typeof flags !== "object") return false;
  if (
    flags.checked === true &&
    flags.ramp == null &&
    flags.comp == null &&
    flags.cargo == null
  ) {
    return true;
  }
  return (
    (!!serviceTypes.ramp && flags.ramp === true) ||
    (!!serviceTypes.comp && flags.comp === true) ||
    (!!serviceTypes.cargo && flags.cargo === true)
  );
}

/** Submission clause key for a list node, e.g. section "1.1" + index "3.2" -> "1.1.3.2". */
export function annexAClauseKey(sectionKey, index) {
  if (!sectionKey || !index) return null;
  return `${sectionKey}.${index}`;
}

export function letterClauseKey(clauseKey) {
  const parts = String(clauseKey || "").split(".");
  if (parts.length < 4) return null;
  const last = parseInt(parts[parts.length - 1], 10);
  if (Number.isNaN(last) || last < 1 || last > 26) return null;
  return [...parts.slice(0, -1), String.fromCharCode(96 + last)].join(".");
}

/** Saved state for a list node: Annex A ids first, then submission clause keys. */
export function findAnnexASavedState(sectionState, sectionKey, node, fieldIndex = 0) {
  if (!sectionState || !node) return null;
  const keys = [
    `${sectionKey}:f${fieldIndex}:${node.shortId}`,
    `${sectionKey}:${node.shortId}`,
    node.shortId,
  ];
  const clauseKey = annexAClauseKey(sectionKey, node.index);
  if (clauseKey) {
    keys.push(clauseKey);
    const letterKey = letterClauseKey(clauseKey);
    if (letterKey) keys.push(letterKey);
  }
  for (const key of keys) {
    if (key && sectionState[key]) return sectionState[key];
  }
  return null;
}

/** Ramp/COMP/Cargo flags for a node: saved click, else template default (unless restored). */
export function resolveAnnexAItemFlags(states, sectionKey, node, fieldIndex = 0, checkboxConfig = {}) {
  const saved = findAnnexASavedState(states?.[sectionKey], sectionKey, node, fieldIndex);
  if (saved) return saved;
  if (states?.[ANNEX_A_FROM_SUBMISSION_KEY]) return { ...NO_SERVICE_FLAGS };
  return resolveCheckboxServiceFlags(
    checkboxConfig?.[`${sectionKey}:f${fieldIndex}:${node.shortId}`] ||
      checkboxConfig?.[`${sectionKey}:f0:${node.shortId}`] ||
      checkboxConfig?.[`${sectionKey}:${node.shortId}`] ||
      checkboxConfig?.[node.shortId],
  );
}

/** Calls back once per Annex A editor with its subsection key ("1.1"). */
export function forEachAnnexAEditor(templateContent, callback) {
  if (!Array.isArray(templateContent)) return;
  let currentMain = null;
  let currentSubKey = null;
  let currentSubName = null;
  let editorIndex = 0;

  templateContent.forEach((item, index) => {
    if (!item || typeof item !== "object" || !item.type) return;
    const next = templateContent[index + 1];
    const value = String(item.value ?? "").trim();

    if (item.type === "heading_no" && /^\d+$/.test(value)) {
      currentMain = value;
      currentSubKey = null;
      currentSubName = null;
      editorIndex = 0;
      return;
    }

    if ((item.type === "heading_no" || item.type === "subheading_no") && currentMain) {
      if (value.includes(".")) {
        currentSubKey = value;
        currentSubName =
          next?.type === "subheading"
            ? String(next.value || "").trim() || `Section ${value}`
            : `Section ${value}`;
        editorIndex = 0;
      }
      return;
    }

    if (item.type === "editor" && currentSubKey && item.value) {
      callback({
        html: item.value,
        checkboxConfig: item.checkboxConfig || {},
        mainKey: currentMain,
        sectionKey: currentSubKey,
        sectionName: currentSubName,
        editorIndex,
      });
      editorIndex += 1;
    }
  });
}

/**
 * Nested payload saved as checkbox_selections:
 * { serviceTypes, "1": { "1.1": { "1.1.3": true, "1.1.3.1": true } } }
 * Uses the same saved-or-default rule as the Annex A screen and summary.
 */
export function buildAnnexASubmissionSelections(templateContent, states = {}) {
  const serviceTypes = states.serviceTypes || { ...NO_SERVICE_FLAGS };
  const nested = { serviceTypes };

  forEachAnnexAEditor(templateContent, ({ html, checkboxConfig, mainKey, sectionKey }) => {
    const root = document.createElement("div");
    root.innerHTML = html;
    const { flat } = walkAgreementListTree(root, { cleanText: true });
    flat.forEach((node) => {
      const clauseKey = annexAClauseKey(sectionKey, node.index);
      if (!clauseKey) return;
      const flags = resolveAnnexAItemFlags(states, sectionKey, node, 0, checkboxConfig);
      if (!isAnnexAFlagsSelected(flags, serviceTypes)) return;
      if (!nested[mainKey]) nested[mainKey] = {};
      if (!nested[mainKey][sectionKey]) nested[mainKey][sectionKey] = {};
      nested[mainKey][sectionKey][clauseKey] = true;
    });
  });

  return nested;
}
