import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { Divider } from 'primereact/divider';
import { InputText } from 'primereact/inputtext';
import { Toolbar } from 'primereact/toolbar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../api/axios';
import {
    FaAlignCenter,
    FaAlignLeft,
    FaAlignRight,
    FaBold,
    FaItalic,
    FaListOl,
    FaListUl,
    FaUnderline
} from 'react-icons/fa';

const CustomEditor = ({ value, onTextChange, style, placeholder, showVariablePreview = false }) => {
  const editorRef = useRef(null);
  
  // State for checkbox configuration
  const [showCheckboxDialog, setShowCheckboxDialog] = useState(false);
  const [listConfigurations, setListConfigurations] = useState({});
  const [detectedLists, setDetectedLists] = useState([]);
  const [detectedListItems, setDetectedListItems] = useState([]);
  
  // State for comment configuration
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [commentConfigurations, setCommentConfigurations] = useState({});
  const [detectedCommentElements, setDetectedCommentElements] = useState([]);
  
  // State for variable default values
  const [variableDefaults, setVariableDefaults] = useState({});
  const [detectedVariables, setDetectedVariables] = useState([]);

  // State for {{ variable suggestion dropdown (type {{ to see list, select to insert → value table in view)
  const [variableSuggestions, setVariableSuggestions] = useState({
    show: false,
    filter: '',
    selectedIndex: 0,
    top: 0,
    left: 0,
  });
  const variableSuggestionsListRef = useRef([]);

  // Reserved variables with their default values
  const RESERVED_VARIABLES = {
    aircraft_options: "This variable will show a table with all the options available in Aircraft Options",
    additional_charges: "This variable will show a table with all additional charges",
    annex_a_selection: "This variable will show all the selections in Annexure A"
  };

  // Reserved variables that render as tables when showVariablePreview is true
  const RESERVED_TABLE_VARIABLES = ['annex_a_selection', 'aircraft_options', 'additional_charges'];

  // ===== Annex A inline table (only when showVariablePreview is true) =====
  const [annexAStates, setAnnexAStates] = useState(null);
  const [annexATemplateContent, setAnnexATemplateContent] = useState(null);

  // Read Annex A selections from localStorage and listen for updates
  useEffect(() => {
    if (!showVariablePreview) return;
    const load = () => {
      try {
        const raw = localStorage.getItem('sgha_annex_a_states');
        if (raw) setAnnexAStates(JSON.parse(raw));
        else setAnnexAStates(null);
      } catch { setAnnexAStates(null); }
    };
    load();
    const onStorage = (e) => { if (e.key === 'sgha_annex_a_states') load(); };
    const onCustom = () => load();
    window.addEventListener('storage', onStorage);
    window.addEventListener('annexAStatesUpdated', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('annexAStatesUpdated', onCustom);
    };
  }, [showVariablePreview]);

  // Fetch Annex A template content (section headers) once
  useEffect(() => {
    if (!showVariablePreview) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/sgha_template_content/get/2025/Annex A/Section Template');
        if (!cancelled && res.data?.data?.content) {
          const content = res.data.data.content;
          setAnnexATemplateContent(typeof content === 'string' ? JSON.parse(content) : content);
        }
      } catch (err) {
        console.error('Error fetching Annex A template for preview:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [showVariablePreview]);

  // Group Annex A selections by section (same logic as Sgha_annexB)
  const annexASelectionsBySection = useMemo(() => {
    if (!annexAStates) return {};
    const sectionsData = {};
    const selectedServiceTypes = annexAStates.serviceTypes || { comp: true, ramp: false, cargo: false };
    const isItemSelected = (item) => {
      if (!item) return false;
      if (item.checked === true) return true;
      const has = item.ramp !== undefined || item.comp !== undefined || item.cargo !== undefined;
      if (has) {
        if (selectedServiceTypes.ramp && item.ramp !== false) return true;
        if (selectedServiceTypes.comp && item.comp !== false) return true;
        if (selectedServiceTypes.cargo && item.cargo !== false) return true;
      }
      return false;
    };
    Object.keys(annexAStates).forEach(sectionKey => {
      if (sectionKey === 'serviceTypes') return;
      const section = annexAStates[sectionKey];
      if (!section || typeof section !== 'object') return;
      const sectionItems = [];
      Object.keys(section).forEach(itemKey => {
        const item = section[itemKey];
        if (isItemSelected(item)) {
          let displayKey = itemKey;
          const km = itemKey.match(/^(\d+\.\d+)\.\d+\.(\d+)$/);
          if (km) displayKey = `${km[1]}.${km[2]}`;
          const hasSubItems = item.subItems && Object.keys(item.subItems).length > 0;
          if (hasSubItems) {
            const subs = Object.keys(item.subItems)
              .filter(sk => isItemSelected(item.subItems[sk]))
              .map(sk => { const m = sk.match(/\.([a-z])$/i); return m ? m[1] : null; })
              .filter(Boolean).sort();
            if (subs.length > 0) {
              sectionItems.push(`${displayKey} (${subs.join(', ')})`);
            } else {
              sectionItems.push(displayKey);
            }
          } else {
            sectionItems.push(displayKey);
          }
        }
      });
      sectionItems.sort((a, b) => {
        const am = a.match(/^(\d+\.\d+\.\d+)/);
        const bm = b.match(/^(\d+\.\d+\.\d+)/);
        if (am && bm) {
          const ap = am[1].split('.').map(Number);
          const bp = bm[1].split('.').map(Number);
          for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
            if (ap[i] !== bp[i]) return (ap[i] || 0) - (bp[i] || 0);
          }
        }
        return a.localeCompare(b);
      });
      if (sectionItems.length > 0) sectionsData[sectionKey] = sectionItems;
    });
    return sectionsData;
  }, [annexAStates]);

  // Parse Annex A template into section list (for table row headers)
  const annexASections = useMemo(() => {
    if (!annexATemplateContent || !Array.isArray(annexATemplateContent)) return [];
    const sections = [];
    let currentMain = null;
    annexATemplateContent.forEach((item, index) => {
      if (!item || !item.type) return;
      if (item.type === 'heading_no') {
        const num = String(item.value);
        const next = annexATemplateContent[index + 1];
        if (['1','2','3','4','5','6','7','8'].includes(num) && next?.type === 'heading') {
          currentMain = { sectionNo: num, heading: next.value, subsections: [] };
          sections.push(currentMain);
          return;
        }
        if (num.includes('.') && currentMain && next?.type === 'subheading') {
          currentMain.subsections.push({ subheadingNo: num, subheading: next.value });
          return;
        }
      }
      if (item.type === 'subheading_no' && currentMain) {
        const next = annexATemplateContent[index + 1];
        if (next?.type === 'subheading') {
          currentMain.subsections.push({ subheadingNo: String(item.value), subheading: next.value });
        }
      }
    });
    return sections;
  }, [annexATemplateContent]);

  // Refs so processVariables (which has [] deps) can read current annex data
  const annexADataRef = useRef({ selectionsBySection: {}, sections: [] });
  const showVariablePreviewRef = useRef(showVariablePreview);
  annexADataRef.current = { selectionsBySection: annexASelectionsBySection, sections: annexASections };
  showVariablePreviewRef.current = showVariablePreview;

  const buildAnnexATableHTML = useCallback(() => {
    const { selectionsBySection, sections } = annexADataRef.current;
    const allSubsections = [];
    if (sections && sections.length > 0) {
      sections.forEach((mainSection) => {
        if (mainSection.subsections) {
          mainSection.subsections.forEach((sub, subIdx) => {
            allSubsections.push({
              sectionKey: sub.subheadingNo || `${mainSection.sectionNo}.${subIdx + 1}`,
              possibleKeys: [sub.subheadingNo, `${mainSection.sectionNo}.${subIdx + 1}`].filter(Boolean),
              sectionName: sub.subheading || `Section ${sub.subheadingNo}`,
            });
          });
        }
      });
    }
    allSubsections.sort((a, b) => {
      const ap = (a.sectionKey || '').split('.').map(Number);
      const bp = (b.sectionKey || '').split('.').map(Number);
      for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
        if (ap[i] !== bp[i]) return (ap[i] || 0) - (bp[i] || 0);
      }
      return 0;
    });
    if (allSubsections.length === 0 && Object.keys(selectionsBySection).length === 0) {
      return '<p style="color:#6c757d;font-size:13px;font-style:italic;margin:4px 0;">No Annex A selections found. Complete Annex A first.</p>';
    }
    const rows = allSubsections.length > 0
      ? allSubsections
      : Object.keys(selectionsBySection).sort().map(k => ({ sectionKey: k, possibleKeys: [k], sectionName: `Section ${k}` }));
    let html = '<table style="width:100%;border-collapse:collapse;font-size:12px;">';
    html += '<thead><tr style="background:#e7f1ff;">';
    html += '<th style="padding:6px 8px;border:1px solid #b6d4fe;text-align:left;width:160px;color:#495057;font-size:11px;">Section</th>';
    html += '<th style="padding:6px 8px;border:1px solid #b6d4fe;text-align:left;color:#495057;font-size:11px;">Selected Items</th>';
    html += '</tr></thead><tbody>';
    rows.forEach((sub) => {
      let items = [];
      for (const key of sub.possibleKeys) {
        if (selectionsBySection[key] && selectionsBySection[key].length > 0) { items = selectionsBySection[key]; break; }
      }
      html += '<tr>';
      html += `<td style="padding:4px 8px;border:1px solid #dee2e6;font-weight:500;vertical-align:top;color:#495057;font-size:11px;">${sub.sectionName}</td>`;
      html += '<td style="padding:4px 8px;border:1px solid #dee2e6;">';
      if (items.length > 0) {
        items.forEach(item => {
          html += `<span style="display:inline-block;padding:1px 6px;margin:2px;background:#e7f1ff;border-radius:10px;font-size:11px;color:#0d6efd;border:1px solid #b6d4fe;">${item}</span>`;
        });
      } else {
        html += '<span style="color:#adb5bd;">—</span>';
      }
      html += '</td></tr>';
    });
    html += '</tbody></table>';
    return html;
  }, []);

  // Returns inner HTML for a reserved table-type variable block (used when typing {{variable_name}})
  const getReservedTableBlockHTML = useCallback((varName) => {
    const titles = {
      annex_a_selection: 'Annex A Selections',
      aircraft_options: 'Aircraft Options',
      additional_charges: 'Additional Charges'
    };
    const titleText = titles[varName] || varName;
    const headerStyle = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;';
    const titleStyle = 'font-size:11px;font-weight:600;color:#333;';
    const removeBtnStyle = 'cursor:pointer;background:#dc3545;color:white;border:none;border-radius:4px;width:22px;height:22px;font-size:14px;line-height:1;padding:0;flex-shrink:0;';
    const header = `<div class="variable-table-header" style="${headerStyle}"><span style="${titleStyle}">${titleText}</span><button type="button" class="variable-table-remove" title="Remove table" style="${removeBtnStyle}">×</button></div>`;
    if (varName === 'annex_a_selection') {
      return header + buildAnnexATableHTML();
    }
    if (varName === 'aircraft_options') {
      const table = '<table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#e7f1ff;">' +
        '<th style="padding:6px 8px;border:1px solid #b6d4fe;text-align:left;">Aircraft Company</th>' +
        '<th style="padding:6px 8px;border:1px solid #b6d4fe;">Region</th>' +
        '<th style="padding:6px 8px;border:1px solid #b6d4fe;">MTOW</th>' +
        '<th style="padding:6px 8px;border:1px solid #b6d4fe;">Limit Per Incident</th></tr></thead><tbody>' +
        '<tr><td style="padding:6px 8px;border:1px solid #dee2e6;color:#6c757d;font-style:italic;" colspan="4">Table will be shown to client</td></tr></tbody></table>';
      return header + table;
    }
    if (varName === 'additional_charges') {
      const table = '<table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#e7f1ff;">' +
        '<th style="padding:6px 8px;border:1px solid #b6d4fe;text-align:left;">Charge</th>' +
        '<th style="padding:6px 8px;border:1px solid #b6d4fe;">Details</th></tr></thead><tbody>' +
        '<tr><td style="padding:6px 8px;border:1px solid #dee2e6;color:#6c757d;font-style:italic;" colspan="2">Table will be shown to client</td></tr></tbody></table>';
      return header + table;
    }
    return header + '<p style="color:#6c757d;font-size:12px;">Reserved variable table</p>';
  }, [buildAnnexATableHTML]);

  // Re-render existing inline table blocks when annex data changes
  useEffect(() => {
    if (!showVariablePreview || !editorRef.current) return;
    const tableBlocks = editorRef.current.querySelectorAll('.variable-table-block[data-variable-name="annex_a_selection"]');
    if (tableBlocks.length > 0) {
      const fullHTML = getReservedTableBlockHTML('annex_a_selection');
      tableBlocks.forEach(block => {
        block.innerHTML = fullHTML;
      });
    }
  }, [showVariablePreview, annexASelectionsBySection, annexASections, buildAnnexATableHTML, getReservedTableBlockHTML]);

  // Get text from start of editor to current caret (for {{ variable trigger)
  const getTextBeforeCaret = useCallback(() => {
    if (!editorRef.current) return '';
    const sel = window.getSelection();
    if (!sel.rangeCount) return '';
    const range = sel.getRangeAt(0).cloneRange();
    range.setStart(editorRef.current, 0);
    return range.toString();
  }, []);

  // Build full variable list (reserved first, then others)
  const getVariableOptions = useCallback(() => {
    const reserved = Object.keys(RESERVED_VARIABLES);
    const others = (detectedVariables || []).filter(v => !RESERVED_VARIABLES[v]);
    return [...reserved, ...others].filter((v, i, a) => a.indexOf(v) === i);
  }, [detectedVariables]);

  // Refs to break the circular initialization dependency between insertVariableSuggestion and processVariables/handleContentChange
  const processVariablesRef = useRef(null);
  const handleContentChangeRef = useRef(null);
  // When we send content to parent, they echo it back as value.htmlValue. Skip overwriting the editor with that to avoid resetting cursor to start.
  const lastSentHtmlRef = useRef(null);

  // Serialize current editor innerHTML by replacing inline table blocks with {{variable}} text
  // so we can compare against the parent-supplied htmlValue (which never contains table HTML).
  const serializeEditorHTML = useCallback(() => {
    if (!editorRef.current) return '';
    const clone = editorRef.current.cloneNode(true);
    clone.querySelectorAll('.variable-table-block').forEach(el => {
      const varName = el.getAttribute('data-variable-name');
      if (varName) el.replaceWith(document.createTextNode(`{{${varName}}}`));
    });
    return clone.innerHTML;
  }, []);

  // Insert selected variable and close {{ }} then hide suggestions
  const insertVariableSuggestion = useCallback((varName) => {
    if (!editorRef.current) return;
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const textBefore = getTextBeforeCaret();
    const match = textBefore.match(/\{\{[^}]*$/);
    if (!match) {
      setVariableSuggestions(prev => ({ ...prev, show: false }));
      return;
    }
    const toReplace = match[0];
    const insertText = '{{' + varName + '}}';
    const editor = editorRef.current;
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);
    let startNode = null;
    let startOffset = 0;
    let endNode = null;
    let endOffset = 0;
    let currentLen = 0;
    let foundStart = false;
    let foundEnd = false;
    let textNode;
    const replaceStartPos = textBefore.length - toReplace.length;
    while ((textNode = walker.nextNode())) {
      const len = textNode.textContent.length;
      if (!foundStart && currentLen + len >= replaceStartPos) {
        startNode = textNode;
        startOffset = replaceStartPos - currentLen;
        if (startOffset < 0) startOffset = 0;
        foundStart = true;
      }
      if (!foundEnd && currentLen + len >= textBefore.length) {
        endNode = textNode;
        endOffset = textBefore.length - currentLen;
        foundEnd = true;
        break;
      }
      currentLen += len;
    }
    if (!foundStart) {
      startNode = range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer : range.startContainer.childNodes[range.startOffset] || range.startContainer.firstChild;
      startOffset = 0;
    }
    if (!startNode) {
      setVariableSuggestions(prev => ({ ...prev, show: false }));
      return;
    }
    if (!endNode) {
      endNode = range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer : range.startContainer;
      endOffset = range.startOffset;
    }
    try {
      const r = document.createRange();
      r.setStart(startNode, startOffset);
      r.setEnd(endNode, endOffset);
      sel.removeAllRanges();
      sel.addRange(r);
      document.execCommand('insertText', false, insertText);
      setVariableSuggestions(prev => ({ ...prev, show: false }));
      setTimeout(() => {
        if (processVariablesRef.current) processVariablesRef.current();
        if (typeof handleContentChangeRef.current === 'function') handleContentChangeRef.current();
      }, 0);
    } catch (err) {
      setVariableSuggestions(prev => ({ ...prev, show: false }));
    }
  }, [getTextBeforeCaret]);

  // Helper function to calculate nesting level (1 = top level, 2 = first nested, etc.)
  const getNestingLevel = useCallback((listElement) => {
    let level = 1;
    let current = listElement;
    while (current && current !== editorRef.current) {
      if (current.tagName === 'OL' || current.tagName === 'UL') {
        const parent = current.parentElement;
        if (parent && parent.tagName === 'LI') {
          level++;
          current = parent.parentElement;
        } else {
          break;
        }
      } else {
        current = current.parentElement;
      }
    }
    return level;
  }, []);

  // Helper function to set list type - all lists use simple numbering (1, 2, 3...)
  const setListType = useCallback((listElement) => {
    if (listElement.tagName === 'OL') {
      // All ordered lists use simple numbering
      listElement.type = '1';
      listElement.classList.remove('decimal-nested-list', 'letter-list');
    }
  }, []);

  // Normalize all lists - all use simple numbering (1, 2, 3...)
  const normalizeAllLists = useCallback(() => {
    if (!editorRef.current) return;
    
    const allLists = Array.from(editorRef.current.querySelectorAll('ol'));
    allLists.forEach((list) => {
      setListType(list);
    });
  }, [setListType]);

  // Helper function to move cursor outside a variable span (but still inside editor)
  const moveCursorOutsideVariable = useCallback((variableSpan) => {
    if (!variableSpan || !editorRef.current) return false;
    
    const editor = editorRef.current;
    const sel = window.getSelection();
    
    // Ensure we're working within the editor
    if (!editor.contains(variableSpan)) return false;
    
    // Get the parent of the variable span (should be within editor)
    const parent = variableSpan.parentNode;
    if (!parent || !editor.contains(parent)) return false;
    
    try {
      const newRange = document.createRange();
      
      // Method 1: Try setStartAfter - this is the most direct way
      try {
        newRange.setStartAfter(variableSpan);
        newRange.collapse(true);
        
        // Verify the range is valid and within editor
        if (newRange.startContainer && editor.contains(newRange.startContainer)) {
          sel.removeAllRanges();
          sel.addRange(newRange);
          editor.focus();
          return true;
        }
      } catch (e1) {
        // setStartAfter might fail in some edge cases, continue to fallback
      }
      
      // Method 2: Find existing text node after the span
      let nextNode = variableSpan.nextSibling;
      
      // Look for the first usable node after the span
      while (nextNode) {
        if (nextNode.nodeType === Node.TEXT_NODE) {
          // Found a text node, place cursor at its start
          newRange.setStart(nextNode, 0);
          newRange.collapse(true);
          if (editor.contains(newRange.startContainer)) {
            sel.removeAllRanges();
            sel.addRange(newRange);
            editor.focus();
            return true;
          }
          break;
        } else if (nextNode.nodeType === Node.ELEMENT_NODE) {
          // For element nodes, try to place cursor at the start
          // First, try to find a text node inside
          const walker = document.createTreeWalker(
            nextNode,
            NodeFilter.SHOW_TEXT,
            null
          );
          const firstTextNode = walker.nextNode();
          if (firstTextNode) {
            newRange.setStart(firstTextNode, 0);
            newRange.collapse(true);
            if (editor.contains(newRange.startContainer)) {
              sel.removeAllRanges();
              sel.addRange(newRange);
              editor.focus();
              return true;
            }
          } else {
            // No text node found, place cursor at start of element
            newRange.setStart(nextNode, 0);
            newRange.collapse(true);
            if (editor.contains(newRange.startContainer)) {
              sel.removeAllRanges();
              sel.addRange(newRange);
              editor.focus();
              return true;
            }
          }
          break;
        }
        nextNode = nextNode.nextSibling;
      }
      
      // Method 3: Create a text node after the span as a placeholder
      const textNode = document.createTextNode('');
      
      if (variableSpan.nextSibling) {
        parent.insertBefore(textNode, variableSpan.nextSibling);
      } else {
        parent.appendChild(textNode);
      }
      
      newRange.setStart(textNode, 0);
      newRange.collapse(true);
      
      if (editor.contains(newRange.startContainer)) {
        sel.removeAllRanges();
        sel.addRange(newRange);
        editor.focus();
        return true;
      }
    } catch (e) {
      console.error('Error moving cursor outside variable:', e);
    }
    
    return false;
  }, []);

  // Function to detect and wrap variables ({{variableName}}) in spans
  const processVariables = useCallback(() => {
    if (!editorRef.current) return;
    
    const editor = editorRef.current;
    console.log('[CustomEditor processVariables] START - editor innerHTML length:', editor.innerHTML.length, 'childNodes:', editor.childNodes.length);
    console.log('[CustomEditor processVariables] showVariablePreview:', showVariablePreviewRef.current);
    console.log('[CustomEditor processVariables] Full editor innerHTML (first 500 chars):', editor.innerHTML.substring(0, 500));
    
    // Save current selection
    const selection = window.getSelection();
    let savedRange = null;
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      savedRange = {
        startContainer: range.startContainer,
        startOffset: range.startOffset,
        endContainer: range.endContainer,
        endOffset: range.endOffset
      };
    }
    
    // Function to process text nodes and wrap variables
    const processTextNode = (textNode) => {
      const text = textNode.textContent;
      const variableRegex = /\{\{([^}]+)\}\}/g;
      const matches = [...text.matchAll(variableRegex)];
      
      if (matches.length === 0) return;
      
      const parent = textNode.parentNode;
      if (!parent) return;
      
      // If parent is already a variable span, skip to avoid nesting
      if (parent.classList && parent.classList.contains('variable-text')) {
        return;
      }
      
      let lastIndex = 0;
      const fragment = document.createDocumentFragment();
      
      matches.forEach((match) => {
        const matchStart = match.index;
        const matchEnd = matchStart + match[0].length;
        const varName = match[1].trim();
        
        // Add text before the match
        if (matchStart > lastIndex) {
          fragment.appendChild(document.createTextNode(text.substring(lastIndex, matchStart)));
        }
        
        if (RESERVED_TABLE_VARIABLES.includes(varName) && showVariablePreviewRef.current) {
          console.log('[CustomEditor processTextNode] Creating table block for reserved var:', varName, 'parent tag:', parent.tagName, 'textBefore:', text.substring(lastIndex, matchStart)?.substring(0, 50));
          const tableDiv = document.createElement('div');
          tableDiv.className = 'variable-text variable-table-block';
          tableDiv.setAttribute('data-variable-name', varName);
          tableDiv.setAttribute('contenteditable', 'false');
          tableDiv.style.cssText = 'display:block;clear:both;margin:10px 0;padding:8px;cursor:default;user-select:all;';
          tableDiv.innerHTML = getReservedTableBlockHTML(varName);
          fragment.appendChild(tableDiv);
        } else {
          const varSpan = document.createElement('span');
          varSpan.className = 'variable-text';
          varSpan.setAttribute('data-variable-name', varName);
          varSpan.textContent = match[0];
          fragment.appendChild(varSpan);
        }
        lastIndex = matchEnd;
      });
      
      // Add remaining text after last match
      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
      }
      
      // Replace the text node with the fragment
      parent.replaceChild(fragment, textNode);
    };
    
    // Walk through all text nodes in the editor
    const walker = document.createTreeWalker(
      editor,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip text nodes inside variable spans
          let parent = node.parentNode;
          while (parent && parent !== editor) {
            if (parent.classList && parent.classList.contains('variable-text')) {
              return NodeFilter.FILTER_REJECT;
            }
            parent = parent.parentNode;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    
    console.log('[CustomEditor processVariables] Text nodes to process:', textNodes.length);
    console.log('[CustomEditor processVariables] Editor childNodes BEFORE processTextNode:', editor.childNodes.length);
    
    // Process each text node
    textNodes.forEach(processTextNode);
    
    console.log('[CustomEditor processVariables] Editor childNodes AFTER processTextNode:', editor.childNodes.length);
    
    // Convert existing reserved table variable spans into inline table blocks.
    // Fix malformed spans first: the stored HTML may have spans that wrap content
    // well beyond just the {{variable}} text (contenteditable quirk). We must move
    // that extra content out before replacing the span with a table block.
    if (showVariablePreviewRef.current) {
      RESERVED_TABLE_VARIABLES.forEach((varName) => {
        const spans = editor.querySelectorAll(`span.variable-text[data-variable-name="${varName}"]`);
        spans.forEach(span => {
          const varText = `{{${varName}}}`;
          const children = Array.from(span.childNodes);
          let passedVariable = false;
          const toMove = [];

          for (const child of children) {
            if (passedVariable) {
              toMove.push(child);
            } else if (child.nodeType === Node.TEXT_NODE) {
              const idx = child.textContent.indexOf(varText);
              if (idx !== -1) {
                passedVariable = true;
                const afterText = child.textContent.substring(idx + varText.length);
                child.textContent = child.textContent.substring(0, idx + varText.length);
                if (afterText) {
                  toMove.push(document.createTextNode(afterText));
                }
              }
            }
          }

          if (toMove.length > 0 && span.parentNode) {
            console.log('[CustomEditor processVariables] Unwrapping', toMove.length, 'extra nodes from span:', varName);
            const ref = span.nextSibling;
            for (const node of toMove) {
              span.parentNode.insertBefore(node, ref);
            }
          }

          const tableDiv = document.createElement('div');
          tableDiv.className = 'variable-text variable-table-block';
          tableDiv.setAttribute('data-variable-name', varName);
          tableDiv.setAttribute('contenteditable', 'false');
          tableDiv.style.cssText = 'display:block;clear:both;margin:10px 0;padding:8px;cursor:default;user-select:all;';
          tableDiv.innerHTML = getReservedTableBlockHTML(varName);
          span.parentNode.replaceChild(tableDiv, span);
        });
      });

      // After unwrapping malformed spans above, freed text nodes may contain
      // {{variable}} patterns that were skipped by the first TreeWalker pass.
      // Run a second pass to process them.
      const walker2 = document.createTreeWalker(
        editor,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (n) => {
            let p = n.parentNode;
            while (p && p !== editor) {
              if (p.classList && p.classList.contains('variable-text')) {
                return NodeFilter.FILTER_REJECT;
              }
              p = p.parentNode;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );
      const freeTextNodes = [];
      let n2;
      while (n2 = walker2.nextNode()) {
        if (/\{\{([^}]+)\}\}/.test(n2.textContent)) {
          freeTextNodes.push(n2);
        }
      }
      if (freeTextNodes.length > 0) {
        console.log('[CustomEditor processVariables] Second pass: processing', freeTextNodes.length, 'freed text nodes');
        freeTextNodes.forEach(processTextNode);
      }
    }

    // Lift variable table blocks out of <p> so they stack correctly (p cannot contain block divs)
    const paragraphsWithBlocks = new Set();
    editor.querySelectorAll('.variable-table-block').forEach((block) => {
      const p = block.parentNode;
      if (p && p.tagName === 'P' && p.parentNode) {
        paragraphsWithBlocks.add(p);
      }
    });
    console.log('[CustomEditor processVariables] paragraphsWithBlocks to lift:', paragraphsWithBlocks.size);
    paragraphsWithBlocks.forEach((P) => {
      const children = Array.from(P.childNodes);
      console.log('[CustomEditor processVariables] Lifting from <p>, childNodes:', children.length, children.map(c => c.nodeName + (c.className ? '.' + c.className : '')));
      const fragment = document.createDocumentFragment();
      let currentP = document.createElement('p');
      for (const child of children) {
        if (child.nodeType === Node.ELEMENT_NODE && child.classList && child.classList.contains('variable-table-block')) {
          if (currentP.childNodes.length > 0) {
            fragment.appendChild(currentP);
          }
          fragment.appendChild(child);
          currentP = document.createElement('p');
        } else {
          currentP.appendChild(child);
        }
      }
      if (currentP.childNodes.length > 0) {
        fragment.appendChild(currentP);
      }
      console.log('[CustomEditor processVariables] Fragment children after lift:', fragment.childNodes.length);
      if (P.parentNode) {
        P.parentNode.replaceChild(fragment, P);
      } else {
        console.warn('[CustomEditor processVariables] P.parentNode is null, cannot replace!');
      }
    });

    // Clean up: remove variable spans that no longer contain variables (skip inline table blocks)
    const existingVariableSpans = editor.querySelectorAll('.variable-text');
    existingVariableSpans.forEach(span => {
      if (span.classList.contains('variable-table-block')) return;
      const text = span.textContent;
      if (!/\{\{([^}]+)\}\}/.test(text)) {
        const parent = span.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(text), span);
          parent.normalize();
        }
      }
    });
    
    // Try to restore selection
    if (savedRange) {
      try {
        const range = document.createRange();
        range.setStart(savedRange.startContainer, savedRange.startOffset);
        range.setEnd(savedRange.endContainer, savedRange.endOffset);
        selection.removeAllRanges();
        selection.addRange(range);
      } catch (e) {
        // Selection restoration failed, which is okay
      }
    }
    
    console.log('[CustomEditor processVariables] END - editor innerHTML length:', editor.innerHTML.length, 'childNodes:', editor.childNodes.length);
    console.log('[CustomEditor processVariables] END - Full innerHTML (first 500 chars):', editor.innerHTML.substring(0, 500));
    console.log('[CustomEditor processVariables] END - Full innerHTML (last 500 chars):', editor.innerHTML.substring(Math.max(0, editor.innerHTML.length - 500)));
  }, [getReservedTableBlockHTML]);
  processVariablesRef.current = processVariables;
  
  // Function to detect all variables in the editor
  const detectVariables = useCallback(() => {
    if (!editorRef.current) return [];
    
    const editor = editorRef.current;
    
    // Get variables from existing spans and inline table blocks
    const variableEls = editor.querySelectorAll('.variable-text');
    const variables = new Set();
    
    variableEls.forEach((el) => {
      const varName = el.getAttribute('data-variable-name');
      if (varName) {
        variables.add(varName);
      }
    });
    
    // Also scan the HTML content directly for any variables that might not be wrapped yet
    const htmlContent = editor.innerHTML || '';
    const variableRegex = /\{\{([^}]+)\}\}/g;
    let match;
    while ((match = variableRegex.exec(htmlContent)) !== null) {
      const varName = match[1].trim();
      if (varName) {
        variables.add(varName);
      }
    }
    
    return Array.from(variables).sort();
  }, []);

  // Initialize editor content and configurations from value prop
  useEffect(() => {
    if (editorRef.current && value !== undefined) {
      // Handle both string (legacy) and object formats
      if (typeof value === 'string') {
        // Legacy format: just HTML string
        console.log('[CustomEditor] Legacy string value, length:', value.length);
        if (editorRef.current.innerHTML !== value) {
          editorRef.current.innerHTML = value || '';
          setTimeout(() => {
            processVariables();
            normalizeAllLists();
          }, 0);
        }
      } else if (typeof value === 'object' && value !== null) {
        // Skip overwrite when value matches what we last sent to parent
        // (the parent echoes it back and we don't want to reset the editor)
        const incomingHtml = value.htmlValue || '';
        const isSameAsLastSent = incomingHtml && incomingHtml === lastSentHtmlRef.current;

        // Also compare the normalised (table-blocks → {{var}}) version of the
        // current editor content so that table-block presence doesn't force a
        // spurious innerHTML reset on every parent re-render.
        const currentNormalized = serializeEditorHTML();
        const isSameContent = incomingHtml && incomingHtml === currentNormalized;

        console.log('[CustomEditor] Init useEffect:', {
          incomingHtmlLength: incomingHtml.length,
          incomingHtmlPreview: incomingHtml.substring(0, 200),
          isSameAsLastSent,
          isSameContent,
          currentNormalizedLength: currentNormalized.length,
          currentNormalizedPreview: currentNormalized.substring(0, 200),
          lastSentHtmlRefLength: lastSentHtmlRef.current?.length || 0,
          willSetInnerHTML: !isSameAsLastSent && !isSameContent && !!incomingHtml,
          showVariablePreview
        });

        if (!isSameAsLastSent && !isSameContent && incomingHtml) {
          console.log('[CustomEditor] Setting innerHTML, full incoming HTML:', incomingHtml.substring(0, 500));
          editorRef.current.innerHTML = incomingHtml;
          console.log('[CustomEditor] innerHTML set, editor childNodes count:', editorRef.current.childNodes.length);
          lastSentHtmlRef.current = null;
          setTimeout(() => {
            console.log('[CustomEditor] Before processVariables, editor innerHTML length:', editorRef.current?.innerHTML?.length);
            processVariables();
            console.log('[CustomEditor] After processVariables, editor innerHTML length:', editorRef.current?.innerHTML?.length);
            console.log('[CustomEditor] After processVariables, editor childNodes count:', editorRef.current?.childNodes?.length);
            const tableBlocks = editorRef.current?.querySelectorAll('.variable-table-block');
            console.log('[CustomEditor] Table blocks found:', tableBlocks?.length);
            normalizeAllLists();
            setTimeout(() => {
              console.log('[CustomEditor] After normalizeAllLists, editor innerHTML length:', editorRef.current?.innerHTML?.length);
              syncVariableDefaults();
            }, 50);
          }, 0);
        } else {
          console.log('[CustomEditor] Skipping innerHTML set (content matches)');
        }
        if (value.checkboxConfig) {
          setListConfigurations(value.checkboxConfig);
        }
        if (value.commentConfig) {
          setCommentConfigurations(value.commentConfig);
        }
        if (value.variableDefaults) {
          const mergedDefaults = {
            ...value.variableDefaults,
            ...RESERVED_VARIABLES
          };
          setVariableDefaults(mergedDefaults);
        } else {
          setVariableDefaults({ ...RESERVED_VARIABLES });
        }
      }
    }
  }, [value, normalizeAllLists, processVariables, detectVariables, serializeEditorHTML]);

  // Auto-initialize checkbox and comment configs when HTML content has lists but configs are empty
  useEffect(() => {
    if (!editorRef.current) return;
    
    // Wait for DOM to be ready after content is set
    const timeoutId = setTimeout(() => {
      const allLists = Array.from(editorRef.current.querySelectorAll('ol'));
      
      if (allLists.length > 0) {
        // Detect all list items and create IDs
        const allItems = [];
        let globalIndex = 1;
        
        const extractItems = (listElement) => {
          if (!listElement || (listElement.tagName !== 'OL' && listElement.tagName !== 'UL')) {
            return;
          }
          
          const items = Array.from(listElement.querySelectorAll(':scope > li'));
          items.forEach((item) => {
            allItems.push(`item-${globalIndex}`);
            globalIndex++;
            
            // Recursively process nested lists
            const nestedListsInItem = Array.from(item.querySelectorAll(':scope > ol, :scope > ul'));
            nestedListsInItem.forEach(nestedList => {
              extractItems(nestedList);
            });
          });
        };
        
        allLists.forEach(list => {
          extractItems(list);
        });
        
        // Get current configs from value prop
        const valueCheckboxConfig = typeof value === 'object' && value !== null 
          ? (value.checkboxConfig || {}) 
          : {};
        const valueCommentConfig = typeof value === 'object' && value !== null 
          ? (value.commentConfig || {}) 
          : {};
        
        // Check if configs need initialization (empty or missing entries)
        const checkboxConfigEmpty = Object.keys(valueCheckboxConfig).length === 0;
        const commentConfigEmpty = Object.keys(valueCommentConfig).length === 0;
        
        let needsUpdate = false;
        const newCheckboxConfig = { ...valueCheckboxConfig };
        const newCommentConfig = { ...valueCommentConfig };
        
        // Initialize checkbox config if empty or has missing entries
        // Check if old format exists (list-0, list-1, etc.) and convert to new format
        const hasOldFormat = Object.keys(valueCheckboxConfig).some(key => key.startsWith('list-'));
        
        if (hasOldFormat) {
          // Convert old format to new format - initialize all items with default values
          allItems.forEach((itemId) => {
            if (!(itemId in newCheckboxConfig)) {
              newCheckboxConfig[itemId] = {
                ramp: true,
                comp: true,
                cargo: true
              };
              needsUpdate = true;
            }
          });
        } else if (checkboxConfigEmpty || allItems.some(id => !(id in newCheckboxConfig))) {
          allItems.forEach((itemId) => {
            if (!(itemId in newCheckboxConfig)) {
              newCheckboxConfig[itemId] = {
                ramp: true,
                comp: true,
                cargo: true
              };
              needsUpdate = true;
            } else if (typeof newCheckboxConfig[itemId] === 'boolean') {
              // Convert old boolean format to new object format
              const enabled = newCheckboxConfig[itemId];
              newCheckboxConfig[itemId] = {
                ramp: enabled,
                comp: enabled,
                cargo: enabled
              };
              needsUpdate = true;
            }
          });
        }
        
        // Initialize comment config if empty or has missing entries (keep old format for comments)
        const detectedListIds = allLists.map((list, index) => `list-${index}`);
        if (commentConfigEmpty || detectedListIds.some(id => !(id in newCommentConfig))) {
          detectedListIds.forEach((listId) => {
            if (!(listId in newCommentConfig)) {
              newCommentConfig[listId] = true;
              needsUpdate = true;
            }
          });
        }
        
        // Update states and trigger save if configs were initialized
        if (needsUpdate) {
          console.log('[CustomEditor autoInit] needsUpdate=true, about to send serialized HTML to parent');
          setListConfigurations(newCheckboxConfig);
          setCommentConfigurations(newCommentConfig);
          
          // Serialize content (replace table blocks with {{variable}} text)
          // before sending to parent to avoid corrupting stored data.
          if (onTextChange) {
            const clone = editorRef.current.cloneNode(true);
            clone.querySelectorAll('.variable-table-block').forEach(el => {
              const varName = el.getAttribute('data-variable-name');
              if (varName) el.replaceWith(document.createTextNode(`{{${varName}}}`));
            });
            const serializedHtml = clone.innerHTML;
            console.log('[CustomEditor autoInit] serializedHtml length:', serializedHtml.length, 'preview:', serializedHtml.substring(0, 300));
            console.log('[CustomEditor autoInit] serializedHtml end:', serializedHtml.substring(Math.max(0, serializedHtml.length - 300)));
            lastSentHtmlRef.current = serializedHtml;
            onTextChange({
              htmlValue: serializedHtml,
              checkboxConfig: newCheckboxConfig,
              commentConfig: newCommentConfig
            });
          }
        } else {
          console.log('[CustomEditor autoInit] No update needed');
        }
      }
    }, 100); // Small delay to ensure DOM is updated
    
    return () => clearTimeout(timeoutId);
  }, [value, onTextChange]);
  
  // Initialize reserved variables on mount
  useEffect(() => {
    // Initialize reserved variable defaults if not already set
    setVariableDefaults(prev => {
      const updated = { ...prev };
      let needsUpdate = false;
      Object.keys(RESERVED_VARIABLES).forEach(varName => {
        if (!(varName in updated) || updated[varName] !== RESERVED_VARIABLES[varName]) {
          updated[varName] = RESERVED_VARIABLES[varName];
          needsUpdate = true;
        }
      });
      return needsUpdate ? updated : prev;
    });
    
    // Ensure reserved variables are in the detected variables list
    setDetectedVariables(prev => {
      const allVariables = Array.from(new Set([...prev, ...Object.keys(RESERVED_VARIABLES)])).sort();
      return allVariables.length !== prev.length ? allVariables : prev;
    });
  }, []); // Only run on mount

  // Sync variable defaults with detected variables when content changes
  const syncVariableDefaults = useCallback(() => {
    if (!editorRef.current) return;
    
    const variables = detectVariables();
    // Combine detected variables with reserved variables
    const allVariables = Array.from(new Set([...variables, ...Object.keys(RESERVED_VARIABLES)])).sort();
    setDetectedVariables(allVariables);
    setVariableDefaults(prev => {
      const currentDefaults = { ...prev };
      let needsUpdate = false;
      
      // Add missing variables with defaults (reserved variables get their default, others get empty)
      allVariables.forEach((varName) => {
        if (!(varName in currentDefaults)) {
          // Use reserved variable default if it exists, otherwise empty string
          currentDefaults[varName] = RESERVED_VARIABLES[varName] || '';
          needsUpdate = true;
        } else if (varName in RESERVED_VARIABLES && currentDefaults[varName] !== RESERVED_VARIABLES[varName]) {
          // Ensure reserved variables always have their default value
          currentDefaults[varName] = RESERVED_VARIABLES[varName];
          needsUpdate = true;
        }
      });
      
      // Remove variables that no longer exist (but keep reserved variables)
      Object.keys(currentDefaults).forEach((varName) => {
        if (!allVariables.includes(varName)) {
          delete currentDefaults[varName];
          needsUpdate = true;
        }
      });
      
      return needsUpdate ? currentDefaults : prev;
    });
  }, [detectVariables]);

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current.focus();
    
    // Normalize list types after list operations
    if (command === 'insertOrderedList' || command === 'insertUnorderedList') {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        processVariables();
        normalizeAllLists();
        handleContentChange();
      }, 0);
    } else {
      // Process variables after formatting commands
      setTimeout(() => {
        processVariables();
        handleContentChange();
      }, 0);
    }
  };

  const handleContentChange = useCallback((customCheckboxConfig = null, customCommentConfig = null, customVariableDefaults = null) => {
    if (onTextChange && editorRef.current) {
      const clone = editorRef.current.cloneNode(true);
      clone.querySelectorAll('.variable-table-block').forEach(el => {
        const varName = el.getAttribute('data-variable-name');
        if (varName) el.replaceWith(document.createTextNode(`{{${varName}}}`));
      });
      const serializedHtml = clone.innerHTML;
      console.log('[CustomEditor handleContentChange] Sending to parent, serializedHtml length:', serializedHtml.length, 'preview:', serializedHtml.substring(0, 300));
      lastSentHtmlRef.current = serializedHtml;
      onTextChange({ 
        htmlValue: serializedHtml,
        checkboxConfig: customCheckboxConfig !== null ? customCheckboxConfig : listConfigurations,
        commentConfig: customCommentConfig !== null ? customCommentConfig : commentConfigurations,
        variableDefaults: customVariableDefaults !== null ? customVariableDefaults : variableDefaults
      });
    }
  }, [onTextChange, listConfigurations, commentConfigurations, variableDefaults]);
  handleContentChangeRef.current = handleContentChange;

  // Function to generate a stable ID for a list based on its position and content
  const getListId = (list, index) => {
    // Use index as primary identifier since lists are detected in document order
    // This is stable as long as the HTML structure doesn't change
    return `list-${index}`;
  };

  // Function to detect all lists in the editor
  const detectLists = useCallback(() => {
    if (!editorRef.current) return [];
    
    const allLists = Array.from(editorRef.current.querySelectorAll('ol'));
    const lists = allLists.map((list, index) => {
      const firstItem = list.querySelector('li');
      const firstText = firstItem ? firstItem.textContent.trim() : '';
      const cleanText = firstText.replace(/^\d+\.\s*/, '').replace(/^[a-z]\.\s*/, '').replace(/^[A-Z]\.\s*/, '');
      const listId = getListId(list, index);
      
      return {
        id: listId,
        element: list,
        label: cleanText || `List ${index + 1}`,
        enabled: listConfigurations[listId] !== false // Default to enabled, check saved config
      };
    });
    
    return lists;
  }, [listConfigurations]);

  // Function to detect all list items in the editor
  const detectListItems = useCallback(() => {
    if (!editorRef.current) return [];
    
    // Find all lists in the editor
    const allLists = Array.from(editorRef.current.querySelectorAll('ol, ul'));
    
    // Identify top-level lists (lists that are not nested inside another list)
    const topLevelLists = allLists.filter(list => {
      let parent = list.parentElement;
      while (parent && parent !== editorRef.current) {
        if (parent.tagName === 'OL' || parent.tagName === 'UL') {
          return false; // This list is nested inside another list
        }
        parent = parent.parentElement;
      }
      return true; // This is a top-level list
    });
    
    const allItems = [];
    let globalItemCounter = 1;
    let topLevelIndex = 0; // Track top-level item index across all lists
    
    // Recursive function to extract all list items with hierarchical indices
    const extractItems = (listElement, parentIndexPath = [], isTopLevelList = false) => {
      if (!listElement || (listElement.tagName !== 'OL' && listElement.tagName !== 'UL')) {
        return;
      }
      
      // Get all direct children - handle both <li> and nested <ol>/<ul> elements
      const allChildren = Array.from(listElement.children);
      let currentItemIndex = 0;
      
      for (let i = 0; i < allChildren.length; i++) {
        const child = allChildren[i];
        
        // If this is a list item, process it
        if (child.tagName === 'LI') {
          const item = child;
          const itemIndex = currentItemIndex;
          currentItemIndex++;
          
          // Clone item to remove nested lists for text extraction
          const itemClone = item.cloneNode(true);
          const nestedListsInClone = itemClone.querySelectorAll('ol, ul');
          nestedListsInClone.forEach(nestedList => nestedList.remove());
          
          const textContent = itemClone.textContent || itemClone.innerText || '';
          const cleanText = textContent.trim().replace(/^\d+\.\s*/, '').replace(/^[a-z]\.\s*/, '').replace(/^[A-Z]\.\s*/, '');
          
          // Generate hierarchical index
          let currentIndexPath;
          if (isTopLevelList && parentIndexPath.length === 0) {
            // Top-level item in a top-level list - use sequential numbering across all lists
            topLevelIndex++;
            currentIndexPath = [topLevelIndex];
          } else {
            // Nested item - use parent path + current index
            currentIndexPath = [...parentIndexPath, itemIndex + 1];
          }
          const hierarchicalIndex = currentIndexPath.join('.');
          
          const itemId = `item-${globalItemCounter}`;
          const currentConfig = listConfigurations[itemId] || {};
          
          allItems.push({
            id: itemId,
            index: hierarchicalIndex,
            element: item,
            text: cleanText || `Item ${hierarchicalIndex}`,
            ramp: currentConfig.ramp !== false, // Default to true
            comp: currentConfig.comp !== false, // Default to true
            cargo: currentConfig.cargo !== false // Default to true
          });
          
          globalItemCounter++;
          
          // Recursively process nested lists (they are not top-level)
          // Check for nested lists as direct children of the <li> element
          const nestedListsDirect = Array.from(item.children).filter(
            child => child.tagName === 'OL' || child.tagName === 'UL'
          );
          
          // Also check if the next sibling is a list (some editors structure it this way)
          let nextSiblingList = null;
          if (i + 1 < allChildren.length) {
            const nextSibling = allChildren[i + 1];
            if (nextSibling.tagName === 'OL' || nextSibling.tagName === 'UL') {
              nextSiblingList = nextSibling;
              i++; // Skip this list in the main loop since we're handling it here
            }
          }
          
          // Combine both types of nested lists
          const nestedListsInItem = nestedListsDirect.length > 0 
            ? nestedListsDirect 
            : (nextSiblingList ? [nextSiblingList] : []);
          
          nestedListsInItem.forEach(nestedList => {
            extractItems(nestedList, currentIndexPath, false);
          });
        }
        // If it's a list (OL/UL) that's not a child of an LI, it's likely a sibling
        // This case is handled above when we check for nextSiblingList
      }
    };
    
    // Process each top-level list sequentially to maintain continuous numbering
    topLevelLists.forEach(list => {
      extractItems(list, [], true);
    });
    
    return allItems;
  }, [listConfigurations]);

  // Function to detect commentable lists in the editor
  const detectCommentElements = useCallback(() => {
    if (!editorRef.current) return [];
    
    // Detect ordered lists (OL elements) for comments, same as checkbox detection
    const allLists = Array.from(editorRef.current.querySelectorAll('ol'));
    const lists = allLists.map((list, index) => {
      const firstItem = list.querySelector('li');
      const firstText = firstItem ? firstItem.textContent.trim() : '';
      const cleanText = firstText.replace(/^\d+\.\s*/, '').replace(/^[a-z]\.\s*/, '').replace(/^[A-Z]\.\s*/, '');
      const listId = `list-${index}`; // Use same ID format as checkbox config
      
      return {
        id: listId,
        element: list,
        label: cleanText || `List ${index + 1}`,
        enabled: commentConfigurations[listId] !== false // Default to enabled, check saved config
      };
    });
    
    return lists;
  }, [commentConfigurations]);

  // Function to reset styles for text after variable spans
  const resetStylesAfterVariables = useCallback(() => {
    if (!editorRef.current) return;
    
    const editor = editorRef.current;
    
    // Find all elements that have inline color or font-family styles
    // and are not variable-text spans
    const allElements = editor.querySelectorAll('*');
    allElements.forEach((element) => {
      // Skip variable-text spans
      if (element.classList && element.classList.contains('variable-text')) {
        return;
      }
      
      // Skip if element contains a variable-text (don't reset styles of containers that have variables)
      if (element.querySelector('.variable-text')) {
        // But still reset the element's own styles if it has them
        if (element.style.color && !element.classList.contains('variable-text')) {
          element.style.color = '';
        }
        if (element.style.fontFamily && !element.classList.contains('variable-text')) {
          element.style.fontFamily = '';
        }
        return;
      }
      
      // Remove inline color and font-family styles
      if (element.style.color) {
        element.style.color = '';
      }
      if (element.style.fontFamily) {
        element.style.fontFamily = '';
      }
    });
    
    // Also ensure the editor itself has the correct default styles
    if (editor.style.color) {
      editor.style.color = '';
    }
    if (editor.style.fontFamily) {
      editor.style.fontFamily = '';
    }
  }, []);

  // Handle input events
  const handleInput = useCallback(() => {
    // Check for {{ variable trigger: show list of options when user types {{
    const textBefore = getTextBeforeCaret();
    const variableMatch = textBefore.match(/\{\{([^}]*)$/);
    const options = getVariableOptions();
    if (variableMatch && options.length > 0) {
      const filter = (variableMatch[1] || '').trim().toLowerCase();
      const filtered = filter
        ? options.filter(v => v.toLowerCase().includes(filter))
        : options;
      variableSuggestionsListRef.current = filtered;
      const rect = editorRef.current && window.getSelection()?.rangeCount
        ? window.getSelection().getRangeAt(0).getBoundingClientRect()
        : null;
      setVariableSuggestions({
        show: true,
        filter: variableMatch[1] || '',
        selectedIndex: 0,
        top: rect ? rect.bottom : 0,
        left: rect ? rect.left : 0,
      });
    } else {
      setVariableSuggestions(prev => (prev.show ? { ...prev, show: false } : prev));
    }

    // Process variables first
    processVariables();
    
    // Sync variable defaults after processing (with delay to ensure DOM is updated)
    // Call multiple times to catch all variables
    setTimeout(() => {
      syncVariableDefaults();
    }, 50);
    setTimeout(() => {
      syncVariableDefaults();
    }, 150);
    setTimeout(() => {
      syncVariableDefaults();
    }, 300);
    
    // Reset styles for text after variables (with a small delay to ensure it runs after browser applies styles)
    setTimeout(() => {
      resetStylesAfterVariables();
    }, 0);
    
    // Function to check and move cursor if needed - more aggressive approach
    const checkAndMove = () => {
      if (!editorRef.current) return false;
      
      const selection = window.getSelection();
      if (!selection.rangeCount) return false;
      
      const range = selection.getRangeAt(0);
      
      // Find all variable spans that end with }}
      const allVariableSpans = editorRef.current.querySelectorAll('span.variable-text');
      let targetSpan = null;
      
      // First, check if cursor is inside any variable span
      let node = range.startContainer;
      while (node && node !== editorRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE && 
            node.classList && 
            node.classList.contains('variable-text')) {
          targetSpan = node;
          break;
        }
        node = node.parentNode;
      }
      
      // If not found by traversal, check all spans to see if cursor is at end of any
      if (!targetSpan) {
        for (const span of allVariableSpans) {
          const spanText = span.textContent || '';
          if (!spanText.endsWith('}}')) continue;
          
          try {
            const spanRange = document.createRange();
            spanRange.selectNodeContents(span);
            spanRange.collapse(false);
            const comparison = range.compareBoundaryPoints(Range.START_TO_END, spanRange);
            if (comparison >= 0) {
              targetSpan = span;
              break;
            }
          } catch (e) {
            // Skip this span if comparison fails
          }
        }
      }
      
      if (!targetSpan) return false;
      
      const spanText = targetSpan.textContent || '';
      // Only move cursor if variable is complete (ends with }})
      if (!spanText.endsWith('}}')) return false;
      
      // Check if cursor is at the end - use range comparison for reliability
      let isAtEnd = false;
      
      try {
        const spanRange = document.createRange();
        spanRange.selectNodeContents(targetSpan);
        spanRange.collapse(false); // Collapse to end of span
        
        // Compare cursor position with end of span
        const comparison = range.compareBoundaryPoints(Range.START_TO_END, spanRange);
        isAtEnd = comparison >= 0;
      } catch (e) {
        // Fallback: check if cursor is at end of text node
        if (range.startContainer.nodeType === Node.TEXT_NODE) {
          const textNode = range.startContainer;
          if (textNode.parentNode === targetSpan) {
            isAtEnd = range.startOffset >= textNode.textContent.length;
          } else {
            // Assume we're at end if we're inside the span
            isAtEnd = true;
          }
        } else if (range.startContainer === targetSpan) {
          isAtEnd = range.startOffset >= spanText.length;
        }
      }
      
      // Move cursor outside if at end
      if (isAtEnd) {
        return moveCursorOutsideVariable(targetSpan);
      }
      
      return false;
    };
    
    // Check immediately after processing (multiple attempts)
    const attemptMove = (delay = 0, attempt = 1) => {
      setTimeout(() => {
        const moved = checkAndMove();
        if (!moved && attempt < 5) {
          // Try up to 5 times with increasing delays
          attemptMove(attempt * 10, attempt + 1);
        }
        if (attempt === 1 || moved) {
          normalizeAllLists();
          handleContentChange();
        }
      }, delay);
    };
    
    // Start attempting immediately
    attemptMove(0, 1);
  }, [getTextBeforeCaret, getVariableOptions, handleContentChange, normalizeAllLists, processVariables, moveCursorOutsideVariable, resetStylesAfterVariables, syncVariableDefaults]);

  // Remove a variable table block and notify parent
  const removeVariableTableBlock = useCallback((block) => {
    if (!block || !block.parentNode || !editorRef.current) return;
    const sel = window.getSelection();
    const range = document.createRange();
    const nextNode = block.nextSibling;
    const prevNode = block.previousSibling;
    block.parentNode.removeChild(block);
    if (nextNode) {
      try {
        range.setStartBefore(nextNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (err) {
        if (prevNode) {
          range.setStartAfter(prevNode);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    } else if (prevNode) {
      range.setStartAfter(prevNode);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    editorRef.current.focus();
    handleContentChange();
  }, [handleContentChange]);

  // Handle editor area click (e.g. Remove button on variable table blocks)
  const handleEditorAreaClick = useCallback((e) => {
    const removeBtn = e.target.closest('.variable-table-remove');
    if (!removeBtn) return;
    e.preventDefault();
    e.stopPropagation();
    const block = removeBtn.closest('.variable-table-block');
    if (block) removeVariableTableBlock(block);
  }, [removeVariableTableBlock]);

  // Handle keyboard events for Tab/Shift+Tab and Enter
  const handleKeyDown = useCallback((e) => {
    if (variableSuggestions.show) {
      const list = variableSuggestionsListRef.current || [];
      if (e.key === 'Escape') {
        e.preventDefault();
        setVariableSuggestions(prev => ({ ...prev, show: false }));
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setVariableSuggestions(prev => ({
          ...prev,
          selectedIndex: list.length ? (prev.selectedIndex + 1) % list.length : 0,
        }));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setVariableSuggestions(prev => ({
          ...prev,
          selectedIndex: list.length ? (prev.selectedIndex - 1 + list.length) % list.length : 0,
        }));
        return;
      }
      if (e.key === 'Enter' && list.length > 0) {
        e.preventDefault();
        const selected = list[variableSuggestions.selectedIndex];
        if (selected) {
          insertVariableSuggestion(selected);
        }
        return;
      }
    }

    // Backspace/Delete: remove variable table block when cursor is adjacent or block is selected
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0 && editorRef.current) {
        const range = selection.getRangeAt(0);
        const blocks = editorRef.current.querySelectorAll('.variable-table-block');
        if (!range.collapsed) {
          for (const block of blocks) {
            try {
              if (range.intersectsNode(block)) {
                e.preventDefault();
                removeVariableTableBlock(block);
                return;
              }
            } catch (err) {
              // ignore
            }
          }
          return;
        }
        for (const block of blocks) {
          const rangeBefore = document.createRange();
          rangeBefore.setStartBefore(block);
          rangeBefore.collapse(true);
          const rangeAfter = document.createRange();
          rangeAfter.setStartAfter(block);
          rangeAfter.collapse(true);
          const cursorBeforeBlock = range.compareBoundaryPoints(Range.START_TO_START, rangeBefore) === 0;
          const cursorAfterBlock = range.compareBoundaryPoints(Range.START_TO_START, rangeAfter) === 0;
          if (e.key === 'Backspace' && cursorBeforeBlock) {
            e.preventDefault();
            removeVariableTableBlock(block);
            return;
          }
          if (e.key === 'Delete' && cursorAfterBlock) {
            e.preventDefault();
            removeVariableTableBlock(block);
            return;
          }
        }
      }
    }

    if (e.key === 'Tab') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let node = range.startContainer;
        
        // Find the list item element by traversing up the DOM tree
        let listItem = null;
        while (node && node !== editorRef.current) {
          if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'LI') {
            listItem = node;
            break;
          }
          node = node.parentNode;
        }
        
        // Check if we're in a list item
        if (listItem) {
          e.preventDefault();
          
          if (e.shiftKey) {
            // Shift+Tab: Outdent
            outdentListItem(listItem);
          } else {
            // Tab: Indent
            indentListItem(listItem);
          }
          
          // Normalize lists and trigger content change after indenting/outdenting
          normalizeAllLists();
          handleContentChange();
        }
      }
    } else if (e.key === 'Enter') {
      // After Enter is pressed, normalize lists to ensure decimal format is maintained
      setTimeout(() => {
        normalizeAllLists();
        handleContentChange();
      }, 0);
    } else if (e.key === '}') {
      // When '}' is typed, handleInput will process variables and move cursor
      // We just need to ensure the check happens after the character is inserted
      // This is handled in handleInput, so we don't need to do anything here
    } else if (e.key === 'ArrowRight' && !e.shiftKey) {
      // Check if right arrow key is pressed and we're inside a variable span
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let node = range.startContainer;
        
        // Find if we're inside a variable span
        let variableSpan = null;
        while (node && node !== editorRef.current) {
          if (node.nodeType === Node.ELEMENT_NODE && 
              node.classList && 
              node.classList.contains('variable-text')) {
            variableSpan = node;
            break;
          }
          node = node.parentNode;
        }
        
        if (variableSpan) {
          // Check if cursor is at or past the end of the variable span
          let isAtEnd = false;
          
          // Method 1: Try to create a test range one position forward
          // If that position is outside the span, we're at the end
          try {
            const testRange = range.cloneRange();
            testRange.collapse(false); // Collapse to end of current range
            
            // Try to move forward by one character
            try {
              testRange.setStart(testRange.startContainer, Math.min(
                testRange.startOffset + 1,
                testRange.startContainer.nodeType === Node.TEXT_NODE 
                  ? testRange.startContainer.textContent.length 
                  : testRange.startContainer.childNodes.length
              ));
              testRange.collapse(true);
            } catch (e) {
              // If we can't move forward, we might be at the end
            }
            
            // Check if the test position is still inside the variable span
            let testNode = testRange.startContainer;
            let stillInsideSpan = false;
            while (testNode && testNode !== editorRef.current) {
              if (testNode === variableSpan) {
                stillInsideSpan = true;
                break;
              }
              testNode = testNode.parentNode;
            }
            
            // If test position is outside span, we're at the end
            isAtEnd = !stillInsideSpan;
          } catch (err) {
            // Method 2: Fallback - use range comparison
            try {
              const spanEndRange = document.createRange();
              spanEndRange.selectNodeContents(variableSpan);
              spanEndRange.collapse(false);
              
              const comparison = range.compareBoundaryPoints(Range.START_TO_END, spanEndRange);
              isAtEnd = comparison >= 0;
            } catch (err2) {
              // Method 3: Simple text-based check
              if (range.startContainer.nodeType === Node.TEXT_NODE) {
                const textNode = range.startContainer;
                if (textNode.parentNode === variableSpan) {
                  isAtEnd = range.startOffset >= textNode.textContent.length;
                } else {
                  // Check if we're at the end by comparing text lengths
                  const spanText = variableSpan.textContent || '';
                  const spanRange = document.createRange();
                  spanRange.selectNodeContents(variableSpan);
                  
                  const cursorRange = document.createRange();
                  cursorRange.setStart(spanRange.startContainer, spanRange.startOffset);
                  cursorRange.setEnd(range.startContainer, range.startOffset);
                  
                  isAtEnd = cursorRange.toString().length >= spanText.length;
                }
              }
            }
          }
          
          // If we're at the end, prevent default arrow behavior and move cursor outside
          if (isAtEnd) {
            e.preventDefault();
            e.stopPropagation();
            
            // Move cursor outside
            setTimeout(() => {
              moveCursorOutsideVariable(variableSpan);
            }, 0);
          }
        }
      }
    }
  }, [variableSuggestions.show, variableSuggestions.selectedIndex, insertVariableSuggestion, handleContentChange, normalizeAllLists, moveCursorOutsideVariable, removeVariableTableBlock]);

  const indentListItem = (listItem) => {
    const parentList = listItem.parentElement;
    
    // Check if parent is already a list (OL or UL)
    if (!parentList || (parentList.tagName !== 'OL' && parentList.tagName !== 'UL')) {
      return; // Not in a list, can't indent
    }
    
    const previousItem = listItem.previousElementSibling;
    
    if (previousItem && previousItem.tagName === 'LI') {
      // Create or find nested list under previous item
      let nestedList = previousItem.querySelector('ol, ul');
      if (!nestedList) {
        // Create a nested list with the same type as parent
        nestedList = document.createElement(parentList.tagName);
        nestedList.style.marginLeft = '20px';
        nestedList.style.paddingLeft = '20px';
        previousItem.appendChild(nestedList);
      }
      
      // Set list type - all lists use simple numbering
      setListType(nestedList);
      
      // Move current item to nested list
      listItem.remove();
      nestedList.appendChild(listItem);
      
      // Restore cursor position
      const range = document.createRange();
      const sel = window.getSelection();
      range.setStart(listItem, 0);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      
      editorRef.current.focus();
    } else {
      // No previous sibling, can't indent (first item)
      return;
    }
  };

  const outdentListItem = (listItem) => {
    const parentList = listItem.parentElement;
    
    // Check if parent is a list
    if (!parentList || (parentList.tagName !== 'OL' && parentList.tagName !== 'UL')) {
      return; // Not in a list, can't outdent
    }
    
    const grandParentList = parentList.parentElement;
    
    // Check if this is a nested list (parent list is inside an LI)
    if (grandParentList && grandParentList.tagName === 'LI') {
      const topLevelList = grandParentList.parentElement;
      
      // Check if top level is a list
      if (topLevelList && (topLevelList.tagName === 'OL' || topLevelList.tagName === 'UL')) {
        // Move item to top-level list, after the grandparent LI
        listItem.remove();
        grandParentList.parentNode.insertBefore(listItem, grandParentList.nextSibling);
        
        // Remove empty nested list
        if (parentList.children.length === 0) {
          parentList.remove();
        }
        
        // Restore cursor position
        const range = document.createRange();
        const sel = window.getSelection();
        range.setStart(listItem, 0);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        
        editorRef.current.focus();
      }
    }
  };

  // Handle toolbar button clicks
  const handleToolbarClick = useCallback(() => {
    // Toolbar click handler - no longer needed for checkboxes
  }, []);




  // Toolbar items
  const leftToolbarItems = (
    <React.Fragment>
      <Button
        icon={<FaBold />}
        size="small"
        severity="secondary"
        text
        onClick={() => {
          execCommand('bold');
          handleToolbarClick();
        }}
        tooltip="Bold"
        tooltipOptions={{ position: 'bottom' }}
        style={{ minWidth: '36px', height: '36px' }}
      />
      <Button
        icon={<FaItalic />}
        size="small"
        severity="secondary"
        text
        onClick={() => {
          execCommand('italic');
          handleToolbarClick();
        }}
        tooltip="Italic"
        tooltipOptions={{ position: 'bottom' }}
        style={{ minWidth: '36px', height: '36px' }}
      />
      <Button
        icon={<FaUnderline />}
        size="small"
        severity="secondary"
        text
        onClick={() => {
          execCommand('underline');
          handleToolbarClick();
        }}
        tooltip="Underline"
        tooltipOptions={{ position: 'bottom' }}
        style={{ minWidth: '36px', height: '36px' }}
      />
      <Divider layout="vertical" style={{ height: '24px', margin: '0 8px' }} />
      <Button
        icon={<FaListUl />}
        size="small"
        severity="secondary"
        text
        onClick={() => {
          execCommand('insertUnorderedList');
          handleToolbarClick();
        }}
        tooltip="Bullet List"
        tooltipOptions={{ position: 'bottom' }}
        style={{ minWidth: '36px', height: '36px' }}
      />
      <Button
        icon={<FaListOl />}
        size="small"
        severity="secondary"
        text
        onClick={() => {
          execCommand('insertOrderedList');
          handleToolbarClick();
        }}
        tooltip="Numbered List"
        tooltipOptions={{ position: 'bottom' }}
        style={{ minWidth: '36px', height: '36px' }}
      />
      <Divider layout="vertical" style={{ height: '24px', margin: '0 8px' }} />
      <Button
        icon={<FaAlignLeft />}
        size="small"
        severity="secondary"
        text
        onClick={() => {
          execCommand('justifyLeft');
          handleToolbarClick();
        }}
        tooltip="Align Left"
        tooltipOptions={{ position: 'bottom' }}
        style={{ minWidth: '36px', height: '36px' }}
      />
      <Button
        icon={<FaAlignCenter />}
        size="small"
        severity="secondary"
        text
        onClick={() => {
          execCommand('justifyCenter');
          handleToolbarClick();
        }}
        tooltip="Align Center"
        tooltipOptions={{ position: 'bottom' }}
        style={{ minWidth: '36px', height: '36px' }}
      />
      <Button
        icon={<FaAlignRight />}
        size="small"
        severity="secondary"
        text
        onClick={() => {
          execCommand('justifyRight');
          handleToolbarClick();
        }}
        tooltip="Align Right"
        tooltipOptions={{ position: 'bottom' }}
        style={{ minWidth: '36px', height: '36px' }}
      />
      <Divider layout="vertical" style={{ height: '24px', margin: '0 8px' }} />
      <Button
        label="Setup Checkboxes"
        size="small"
        severity="info"
        text
        onClick={() => {
          // Refresh items to get latest state
          const items = detectListItems();
          setDetectedListItems(items);
          setShowCheckboxDialog(true);
        }}
        tooltip="Configure which list items should show checkboxes"
        tooltipOptions={{ position: 'bottom' }}
        style={{ minWidth: '100px', height: '32px', fontSize: '12px' }}
      />
      <Button
        label="Setup Comments"
        size="small"
        severity="warning"
        text
        onClick={() => {
          const elements = detectCommentElements();
          setDetectedCommentElements(elements);
          setShowCommentDialog(true);
        }}
        tooltip="Configure which lists should allow comments"
        tooltipOptions={{ position: 'bottom' }}
        style={{ minWidth: '100px', height: '32px', fontSize: '12px' }}
      />
    </React.Fragment>
  );

  return (
    <div className="custom-editor" style={style}>
      {/* Toolbar */}
      <Toolbar
        start={leftToolbarItems}
        style={{
          border: '1px solid #dee2e6',
          borderBottom: 'none',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px 6px 0 0',
          padding: '8px 12px',
          gap: '4px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}
      />

      {/* Editor Content */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onClick={handleEditorAreaClick}
        onKeyDown={handleKeyDown}
        style={{
          padding: '16px',
          height: '250px',
          minHeight: '250px',
          maxHeight: 'none',
          outline: 'none',
          backgroundColor: 'white',
          fontSize: '14px',
          lineHeight: '1.6',
          border: '2px solid #000000',
          color: '#333333',
          fontFamily: 'Arial, sans-serif',
          borderRadius: '4px',
          margin: '8px',
          resize: 'vertical',
          overflow: 'auto',
          boxSizing: 'border-box',
          border: '1px solid #dee2e6',
          borderTop: 'none',
          borderRadius: '0 0 6px 6px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}
        data-placeholder={placeholder || 'Start typing your content...'}
        suppressContentEditableWarning={true}
      />

      {/* Variable suggestions dropdown: type {{ to see list, select to insert (shows as value table in Annex B) */}
      {variableSuggestions.show && variableSuggestionsListRef.current.length > 0 && (
        <div
          role="listbox"
          style={{
            position: 'fixed',
            top: variableSuggestions.top + 4,
            left: variableSuggestions.left,
            zIndex: 9999,
            minWidth: '200px',
            maxHeight: '240px',
            overflowY: 'auto',
            background: 'white',
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '4px 0',
          }}
        >
          {variableSuggestionsListRef.current.map((varName, idx) => (
            <div
              key={varName}
              role="option"
              aria-selected={idx === variableSuggestions.selectedIndex}
              onClick={() => insertVariableSuggestion(varName)}
              onMouseDown={(e) => e.preventDefault()}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '13px',
                backgroundColor: idx === variableSuggestions.selectedIndex ? '#e9ecef' : 'transparent',
                color: '#495057',
              }}
            >
              {`{{${varName}}}`}
            </div>
          ))}
        </div>
      )}

      {/* Regular Variables Section */}
      {detectedVariables.filter(varName => !(varName in RESERVED_VARIABLES)).length > 0 && (
        <div style={{
          margin: '8px',
          padding: '16px',
          border: '1px solid #dee2e6',
          borderRadius: '6px',
          backgroundColor: '#f8f9fa'
        }}>
          <h3 style={{
            marginTop: 0,
            marginBottom: '16px',
            fontSize: '16px',
            fontWeight: '600',
            color: '#495057'
          }}>
            Variables
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {detectedVariables.filter(varName => !(varName in RESERVED_VARIABLES)).map((varName) => (
              <div
                key={varName}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  border: '1px solid #dee2e6'
                }}
              >
                <label
                  style={{
                    minWidth: '150px',
                    fontWeight: '500',
                    color: '#495057',
                    fontSize: '14px'
                  }}
                >
                  {varName}
                </label>
                <InputText
                  value={variableDefaults[varName] || ''}
                  onChange={(e) => {
                    setVariableDefaults(prev => ({
                      ...prev,
                      [varName]: e.target.value
                    }));
                    handleContentChange(null, null, {
                      ...variableDefaults,
                      [varName]: e.target.value
                    });
                  }}
                  placeholder="Enter default value"
                  style={{
                    flex: 1,
                    fontSize: '14px'
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Checkbox Configuration Dialog */}
      <Dialog
        header="Setup Checkboxes"
        visible={showCheckboxDialog}
        style={{ width: '60vw' }}
        onHide={() => setShowCheckboxDialog(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button
              label="Cancel"
              severity="secondary"
              onClick={() => setShowCheckboxDialog(false)}
            />
            <Button
              label="Apply"
              onClick={() => {
                // Use current state configurations (already updated by onChange handlers)
                const currentConfigs = {};
                detectedListItems.forEach((item) => {
                  const itemConfig = listConfigurations[item.id] || { ramp: item.ramp, comp: item.comp, cargo: item.cargo };
                  currentConfigs[item.id] = {
                    ramp: itemConfig.ramp !== false,
                    comp: itemConfig.comp !== false,
                    cargo: itemConfig.cargo !== false
                  };
                });
                
                // Update state with captured configurations
                setListConfigurations(currentConfigs);
                
                // Close dialog and trigger save immediately with captured configs
                setShowCheckboxDialog(false);
                handleContentChange(currentConfigs, commentConfigurations, variableDefaults);
              }}
            />
          </div>
        }
      >
        <div style={{ padding: '16px 0' }}>
          <p style={{ marginBottom: '16px', color: '#666' }}>
            Select which checkboxes should display for each list item to the client.
          </p>
          {detectedListItems.length === 0 ? (
            <p style={{ color: '#999', fontStyle: 'italic' }}>
              No list items found in the editor. Create some numbered lists first.
            </p>
          ) : (
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {/* Table Header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 1fr 80px 80px 80px',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: '#e9ecef',
                  borderBottom: '2px solid #dee2e6',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  color: '#495057',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10
                }}
              >
                <div>Index</div>
                <div>Item</div>
                <div style={{ textAlign: 'center' }}>Ramp</div>
                <div style={{ textAlign: 'center' }}>COMP</div>
                <div style={{ textAlign: 'center' }}>Cargo</div>
              </div>
              
              {/* Table Rows */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {detectedListItems.map((item) => {
                  const itemConfig = listConfigurations[item.id] || { ramp: item.ramp, comp: item.comp, cargo: item.cargo };
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '60px 1fr 80px 80px 80px',
                        gap: '12px',
                        padding: '12px',
                        borderBottom: '1px solid #dee2e6',
                        backgroundColor: '#ffffff',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ 
                        fontWeight: 'bold', 
                        color: '#495057',
                        fontSize: '14px'
                      }}>
                        {item.index}
                      </div>
                      <div style={{ 
                        fontSize: '14px',
                        color: '#495057'
                      }}>
                        {item.text}
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        <Checkbox
                          inputId={`${item.id}-ramp`}
                          checked={itemConfig.ramp !== false}
                          onChange={(e) => {
                            setListConfigurations(prev => ({
                              ...prev,
                              [item.id]: {
                                ...(prev[item.id] || {}),
                                ramp: e.checked
                              }
                            }));
                          }}
                        />
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        <Checkbox
                          inputId={`${item.id}-comp`}
                          checked={itemConfig.comp !== false}
                          onChange={(e) => {
                            setListConfigurations(prev => ({
                              ...prev,
                              [item.id]: {
                                ...(prev[item.id] || {}),
                                comp: e.checked
                              }
                            }));
                          }}
                        />
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        <Checkbox
                          inputId={`${item.id}-cargo`}
                          checked={itemConfig.cargo !== false}
                          onChange={(e) => {
                            setListConfigurations(prev => ({
                              ...prev,
                              [item.id]: {
                                ...(prev[item.id] || {}),
                                cargo: e.checked
                              }
                            }));
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Dialog>

      {/* Comment Configuration Dialog */}
      <Dialog
        header="Setup Comment Functionality"
        visible={showCommentDialog}
        style={{ width: '50vw' }}
        onHide={() => setShowCommentDialog(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button
              label="Cancel"
              severity="secondary"
              onClick={() => setShowCommentDialog(false)}
            />
            <Button
              label="Apply"
              onClick={() => {
                // Capture current checkbox states from dialog
                const currentConfigs = {};
                detectedCommentElements.forEach((element) => {
                  const checkbox = document.getElementById(element.id);
                  if (checkbox) {
                    currentConfigs[element.id] = checkbox.checked;
                  } else {
                    // Fallback to state
                    currentConfigs[element.id] = commentConfigurations[element.id] !== false;
                  }
                });
                
                // Update state with captured configurations
                setCommentConfigurations(currentConfigs);
                
                // Close dialog and trigger save immediately with captured configs
                setShowCommentDialog(false);
                handleContentChange(listConfigurations, currentConfigs, variableDefaults);
              }}
            />
          </div>
        }
      >
        <div style={{ padding: '16px 0' }}>
          <p style={{ marginBottom: '16px', color: '#666' }}>
            Select which lists should allow comments from the client.
          </p>
          {detectedCommentElements.length === 0 ? (
            <p style={{ color: '#999', fontStyle: 'italic' }}>
              No numbered lists found in the editor. Create some numbered lists first.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {detectedCommentElements.map((element) => (
                <div
                  key={element.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    border: '1px solid #dee2e6',
                    borderRadius: '6px',
                    backgroundColor: '#f8f9fa'
                  }}
                >
                  <Checkbox
                    inputId={element.id}
                    checked={commentConfigurations[element.id] !== false}
                    onChange={(e) => {
                      setCommentConfigurations(prev => ({
                        ...prev,
                        [element.id]: e.checked
                      }));
                    }}
                    style={{ marginRight: '12px' }}
                  />
                  <label
                    htmlFor={element.id}
                    style={{
                      flex: 1,
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#495057'
                    }}
                  >
                    {element.label}
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      </Dialog>

      <style jsx>{`
        .custom-editor {
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .custom-editor [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #6c757d;
          font-style: italic;
        }
        
        .custom-editor [contenteditable]:focus {
          outline: none;
          border: 2px solid #000000 !important;
          box-shadow: 0 0 0 2px rgba(0,0,0,0.1);
        }
        
        .custom-editor [contenteditable] {
          height: 250px !important;
          min-height: 250px !important;
          max-height: none !important;
        }
        
        .custom-editor [contenteditable]:not([style*="height"]) {
          height: 250px !important;
        }
        
        .custom-editor .p-toolbar {
          display: flex;
          align-items: center;
          gap: 4px;
          background: #f8f9fa !important;
          border-bottom: 1px solid #dee2e6 !important;
        }
        
        .custom-editor .p-button {
          border-radius: 4px;
          transition: all 0.2s ease;
          border: 1px solid transparent;
          background: transparent;
        }
        
        .custom-editor .p-button:hover {
          background-color: #e9ecef !important;
          border-color: #007bff !important;
          color: #007bff !important;
        }
        
        .custom-editor .p-button:focus {
          box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
        }
        
        .custom-editor .p-button:active {
          background-color: #007bff !important;
          color: white !important;
        }
        
        .custom-editor .p-divider {
          background-color: #dee2e6;
          width: 1px;
        }
        
        .custom-editor [contenteditable] {
          color: #333333 !important;
          font-family: Arial, sans-serif !important;
        }
        
        .custom-editor .variable-text {
          background-color: transparent;
          font-weight: 500;
        }
        
        /* Reset styles for all elements except variable-text */
        .custom-editor [contenteditable] span:not(.variable-text),
        .custom-editor [contenteditable] p,
        .custom-editor [contenteditable] div,
        .custom-editor [contenteditable] strong,
        .custom-editor [contenteditable] em,
        .custom-editor [contenteditable] u,
        .custom-editor [contenteditable] b,
        .custom-editor [contenteditable] i {
          color: #333333 !important;
          font-family: Arial, sans-serif !important;
        }
        
      `}</style>
    </div>
  );
};

export default CustomEditor;