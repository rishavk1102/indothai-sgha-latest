/**
 * Template/editor HTML often stores nested lists as siblings:
 *   <li>parent</li><ol><li>child</li></ol>
 * Browsers keep that invalid structure. Move each sibling list into the
 * preceding <li> so nesting is preserved for parse/render/save.
 */
export function normalizeSiblingLists(root) {
  if (!root || typeof root.querySelectorAll !== "function") return root;

  let changed = true;
  let guard = 0;
  while (changed && guard < 50) {
    changed = false;
    guard += 1;

    const lists = [];
    if (/^(OL|UL)$/i.test(root.tagName || "")) lists.push(root);
    lists.push(...Array.from(root.querySelectorAll("ol, ul")));

    for (const list of lists) {
      const children = Array.from(list.children);
      for (let i = 0; i < children.length; i += 1) {
        const child = children[i];
        if (!/^(OL|UL)$/i.test(child.tagName || "")) continue;

        let prev = child.previousElementSibling;
        while (prev && !/^(LI)$/i.test(prev.tagName || "")) {
          prev = prev.previousElementSibling;
        }
        if (prev && /^(LI)$/i.test(prev.tagName || "")) {
          prev.appendChild(child);
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  }

  return root;
}

/**
 * Nested lists for an <li>: direct child lists plus any consecutive following
 * sibling lists (editor quirk). Caller should advance the child index past
 * consumed siblings.
 */
export function collectNestedListsForLi(item, allChildren, index) {
  const nestedDirect = Array.from(item.children || []).filter((child) =>
    /^(OL|UL)$/i.test(child.tagName || ""),
  );

  const siblingLists = [];
  let cursor = index + 1;
  while (cursor < allChildren.length) {
    const next = allChildren[cursor];
    if (/^(OL|UL)$/i.test(next?.tagName || "")) {
      siblingLists.push(next);
      cursor += 1;
    } else {
      break;
    }
  }

  const seen = new Set();
  const nestedLists = [];
  [...nestedDirect, ...siblingLists].forEach((list) => {
    if (!list || seen.has(list)) return;
    seen.add(list);
    nestedLists.push(list);
  });

  return {
    nestedLists,
    nextIndex: cursor - 1, // convertListItems for-loop will i++ after body
  };
}

/**
 * Pull a leading SGHA clause number out of heading text, e.g.
 * "2.2.12 Direct Passengers" → { number: "2.2.12", parts: ["2","2","12"], rest: "Direct Passengers" }
 */
export function splitLeadingClauseNumber(text) {
  const m = String(text || "")
    .trim()
    .match(/^(\d+(?:\.\d+){1,})\.?\s*([\s\S]*)$/);
  if (!m) return null;
  return {
    number: m[1],
    parts: m[1].split("."),
    rest: String(m[2] || "").trim(),
  };
}

const BLOCK_TAGS = /^(DIV|P|H[1-6]|SECTION|ARTICLE|BLOCKQUOTE|TABLE|TR)$/;

const BLANK_BLOCK = "<div><br></div>";

function escapeHtmlText(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Top-level lists in document order, each with the content that sits between
 * it and the previous list (e.g. "2.2.15 At the gate perform").
 * - `lines`: plain text per block, used for clause-number detection
 * - `html`: the same content with the editor's own markup preserved, for display
 */
function collectTopLevelListEntries(root) {
  const entries = [];
  let lines = [];
  let line = "";
  let htmlBlocks = [];
  let inlineHtml = "";

  const flushLine = () => {
    const text = line.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    if (text) lines.push(text);
    line = "";
  };

  const flushInlineHtml = () => {
    const plain = inlineHtml.replace(/<br\s*\/?>/gi, "").replace(/&nbsp;|\u00a0/g, "").trim();
    if (plain) htmlBlocks.push(`<div>${inlineHtml.trim()}</div>`);
    inlineHtml = "";
  };

  const flushAll = () => {
    flushLine();
    flushInlineHtml();
  };

  const takeSegment = () => {
    flushAll();
    while (htmlBlocks.length && htmlBlocks[0] === BLANK_BLOCK) htmlBlocks.shift();
    while (htmlBlocks.length && htmlBlocks[htmlBlocks.length - 1] === BLANK_BLOCK) htmlBlocks.pop();
    const segment = { lines, html: htmlBlocks.join("") };
    lines = [];
    htmlBlocks = [];
    return segment;
  };

  const visit = (node) => {
    if (node.nodeType === 3) {
      const text = node.textContent || "";
      line += text;
      inlineHtml += escapeHtmlText(text);
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = String(node.tagName || "").toUpperCase();
    if (tag === "OL" || tag === "UL") {
      entries.push({ list: node, ...takeSegment() });
      return;
    }
    if (tag === "BR") {
      flushLine();
      inlineHtml += "<br>";
      return;
    }

    const isBlock = BLOCK_TAGS.test(tag);
    const containsList = typeof node.querySelector === "function" && node.querySelector("ol, ul");

    if (!containsList) {
      // Leaf content: keep the element as authored (bold/italic/etc. only if the editor had it)
      if (isBlock) {
        flushAll();
        const text = (node.textContent || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
        if (text) {
          lines.push(text);
          htmlBlocks.push(node.outerHTML);
        } else if (node.querySelector("br") && htmlBlocks[htmlBlocks.length - 1] !== BLANK_BLOCK) {
          htmlBlocks.push(BLANK_BLOCK);
        }
      } else {
        line += node.textContent || "";
        inlineHtml += node.outerHTML;
      }
      return;
    }

    if (isBlock) flushAll();
    Array.from(node.childNodes || []).forEach(visit);
    if (isBlock) flushAll();
  };

  Array.from(root.childNodes || []).forEach(visit);
  const trailing = takeSegment();
  return { entries, trailingLines: trailing.lines, trailingHtml: trailing.html };
}

function listItemText(itemClone) {
  itemClone.querySelectorAll("br").forEach((br) => br.replaceWith(" "));
  return (itemClone.textContent || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Walk editor/template list HTML into a nested tree + flat DFS item list.
 * - Normalizes sibling <ol>/<ul> into the preceding <li> first
 * - Only walks top-level lists (no nested double-count)
 * - Flat order is the same item-1…item-N used by Setup Checkboxes / Annex A
 * - `index` is the legacy running number (kept for saved submission keys);
 *   `displayIndex` follows the clause heading before each list (2.2.15 → 2.2.15.1)
 * - First item of each top-level list carries `groupHeading` (text lines before it)
 */
export function walkAgreementListTree(root, options = {}) {
  const {
    idPrefix = "",
    cleanText = true,
  } = options;

  if (!root) {
    return { tree: [], flat: [], trailingLines: [], trailingHtml: "" };
  }

  normalizeSiblingLists(root);

  const { entries, trailingLines, trailingHtml } = collectTopLevelListEntries(root);

  const flat = [];
  let globalItemCounter = 1;
  let topLevelIndex = 0;
  let headingParts = null;
  let headingCounter = 0;

  const extractItems = (listElement, parentIndexPath = [], isTopLevelList = false, parentShortId = null, parentDisplayPath = []) => {
    if (!listElement || (listElement.tagName !== "OL" && listElement.tagName !== "UL")) {
      return [];
    }

    const items = [];
    const allChildren = Array.from(listElement.children);
    let currentItemIndex = 0;

    for (let i = 0; i < allChildren.length; i += 1) {
      const child = allChildren[i];
      if (child.tagName !== "LI") continue;

      const item = child;

      const { nestedLists, nextIndex } = collectNestedListsForLi(item, allChildren, i);
      i = nextIndex;

      const itemClone = item.cloneNode(true);
      itemClone.querySelectorAll("ol, ul").forEach((nested) => nested.remove());

      const htmlBodyRaw = (itemClone.innerHTML || "").trim();
      let textContent = listItemText(itemClone);
      if (cleanText) {
        textContent = textContent
          .replace(/^\d+\.\s*/, "")
          .replace(/^[a-z]\.\s*/i, "")
          .replace(/^[A-Z]\.\s*/, "");
      }

      if (!textContent && !htmlBodyRaw && nestedLists.length === 0) {
        continue;
      }

      const itemIndex = currentItemIndex;
      currentItemIndex += 1;

      let currentIndexPath;
      let displayPath;
      if (isTopLevelList && parentIndexPath.length === 0) {
        topLevelIndex += 1;
        currentIndexPath = [topLevelIndex];
        headingCounter += 1;
        displayPath = headingParts
          ? [...headingParts, headingCounter]
          : [headingCounter];
      } else {
        currentIndexPath = [...parentIndexPath, itemIndex + 1];
        displayPath = [...parentDisplayPath, itemIndex + 1];
      }
      const hierarchicalIndex = currentIndexPath.join(".");
      const displayIndex = displayPath.join(".");
      const shortId = `item-${globalItemCounter}`;
      const id = `${idPrefix}${shortId}`;
      globalItemCounter += 1;

      // Pre-order: parent before children so item-N matches Setup / Annex A mapping
      const node = {
        shortId,
        id,
        index: hierarchicalIndex,
        displayIndex,
        text: textContent || `Item ${displayIndex}`,
        htmlBodyRaw: htmlBodyRaw || null,
        level: parentIndexPath.length,
        parentShortId,
        childIds: [],
        subItems: null,
        groupHeading: null,
        element: item,
      };
      items.push(node);
      flat.push(node);

      const subItems = [];
      nestedLists.forEach((nestedList) => {
        subItems.push(
          ...extractItems(nestedList, currentIndexPath, false, shortId, displayPath),
        );
      });

      if (subItems.length > 0) {
        node.subItems = subItems;
        const childIds = [];
        const collectChildIds = (nodes) => {
          nodes.forEach((child) => {
            childIds.push(child.shortId);
            if (child.subItems?.length) collectChildIds(child.subItems);
          });
        };
        collectChildIds(subItems);
        node.childIds = childIds;
      }
    }

    return items;
  };

  const tree = [];
  entries.forEach(({ list, lines, html }) => {
    let groupHeading = null;
    if (lines.length > 0) {
      // Number from the last clause-numbered line before this list; lists with
      // no text in between (or unnumbered text) continue the current clause.
      let numbered = null;
      for (let i = lines.length - 1; i >= 0; i -= 1) {
        numbered = splitLeadingClauseNumber(lines[i]);
        if (numbered) break;
      }
      if (numbered) {
        headingParts = numbered.parts;
        headingCounter = 0;
      }
      groupHeading = { number: numbered?.number || null, lines, html };
    }

    const items = extractItems(list, [], true, null, []);
    if (items.length > 0 && groupHeading) {
      items[0].groupHeading = groupHeading;
    }
    tree.push(...items);
  });

  return { tree, flat, trailingLines, trailingHtml };
}

/** Default Ramp/COMP/Cargo when Setup Checkboxes has no saved value for an item. */
export const DEFAULT_CHECKBOX_SERVICE_FLAGS = {
  ramp: true,
  comp: true,
  cargo: true,
};

export function resolveCheckboxServiceFlags(configEntry) {
  if (configEntry == null) {
    return { ...DEFAULT_CHECKBOX_SERVICE_FLAGS };
  }
  if (typeof configEntry === "boolean") {
    return { ramp: configEntry, comp: configEntry, cargo: configEntry };
  }
  return {
    ramp: configEntry.ramp !== false,
    comp: configEntry.comp !== false,
    cargo: configEntry.cargo !== false,
  };
}

/**
 * Walk a content root in document order into text + top-level list segments.
 * Preserves headings like "2.2.7 Effect conveyance..." that sit between lists.
 */
export function collectListContentSegments(root) {
  const segments = [];

  const pushText = (value) => {
    const text = String(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) return;
    segments.push({ type: "text", text });
  };

  const walk = (node) => {
    if (!node) return;
    if (node.nodeType === 3) {
      pushText(node.textContent);
      return;
    }
    if (node.nodeType !== 1) return;

    const tag = String(node.tagName || "").toUpperCase();
    if (tag === "OL" || tag === "UL") {
      segments.push({ type: "list", el: node });
      return;
    }
    if (tag === "BR") {
      return;
    }

    const kids = Array.from(node.childNodes || []);
    const hasListChild = kids.some((kid) =>
      /^(OL|UL)$/i.test(kid.tagName || ""),
    );

    if (!hasListChild) {
      pushText(node.textContent);
      return;
    }

    kids.forEach(walk);
  };

  Array.from(root.childNodes || []).forEach(walk);
  return segments;
}
