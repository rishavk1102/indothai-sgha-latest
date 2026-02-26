import DOMPurify from 'dompurify';
import { AnimatePresence, motion } from "framer-motion";
import { Badge } from 'primereact/badge';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { TabPanel, TabView } from 'primereact/tabview';
import React, { useEffect, useMemo, useState } from "react";
import { Breadcrumb, Col, Row } from "react-bootstrap";
import { IoChevronBackOutline } from "react-icons/io5";
import { useNavigate, useLocation } from "react-router-dom";
import api from '../../api/axios';
import Sgha_annexA from '../../components/Sgha_annexA';
import Sgha_annexB from '../../components/Sgha_annexB';
import Sgha_mainagreemment from '../../components/Sgha_mainagreemment';

const Agreement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedCities, setSelectedCities] = useState(location.state?.selectedCities || []);
  const [formData, setFormData] = useState(location.state?.formData || {});
  // Use template year from Add New SGHA flow; fallback to sessionStorage (e.g. after refresh) then 2025
  const templateYear = (() => {
    const fromState = location.state?.templateYear;
    if (fromState != null && fromState !== '') {
      const n = typeof fromState === 'number' ? fromState : parseInt(fromState, 10);
      if (!isNaN(n) && n >= 2000 && n <= 2100) return n;
    }
    try {
      const stored = sessionStorage.getItem('sgha_agreement_template_year');
      if (stored != null && stored !== '') {
        const n = parseInt(stored, 10);
        if (!isNaN(n) && n >= 2000 && n <= 2100) return n;
      }
    } catch (e) {
      // ignore
    }
    return 2025;
  })();

   const goBack = () => {
        navigate(-1); // This will take the user back to the previous page in history
    };

    const [visibleRight, setVisibleRight] = useState(false);
    const [showAnnexASummary, setShowAnnexASummary] = useState(false);
    const [pendingIndex, setPendingIndex] = useState(null);
    const [templateData, setTemplateData] = useState(null);
    const [loadingTemplate, setLoadingTemplate] = useState(false);

    const sections = ["main", "annex-a", "annex-b"];
    const [activeIndex, setActiveIndex] = useState(0);

    // Persist template year so refresh or re-mount keeps the selected year
    useEffect(() => {
        if (templateYear >= 2000 && templateYear <= 2100) {
            try {
                sessionStorage.setItem('sgha_agreement_template_year', String(templateYear));
            } catch (e) {
                // ignore
            }
        }
    }, [templateYear]);

    // Fetch template data when dialog is shown (use selected template year)
    useEffect(() => {
        const fetchTemplateData = async () => {
            if (!showAnnexASummary) return;
            
            try {
                setLoadingTemplate(true);
                const response = await api.get(
                    `/sgha_template_content/get/${templateYear}/Annex A/Section Template`
                );

                if (response.data?.data?.content) {
                    const content = response.data.data.content;
                    const parsedContent = typeof content === 'string' 
                        ? JSON.parse(content) 
                        : content;
                    setTemplateData(parsedContent);
                }
            } catch (error) {
                console.error("Error fetching template data:", error);
                setTemplateData(null);
            } finally {
                setLoadingTemplate(false);
            }
        };

        fetchTemplateData();
    }, [showAnnexASummary, templateYear]);

    // Helper function to parse HTML exactly like Annex A does - extract items with their text and IDs
    // Parse HTML content and generate item IDs with section prefix
    // sectionKey is optional for backward compatibility but should be provided for new format
    const parseHTMLContent = (htmlString, sectionKey = null) => {
        if (!htmlString) return { items: {} };
        
        try {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = DOMPurify.sanitize(htmlString, { ALLOWED_TAGS: ['ol', 'ul', 'li'] });
            
            // Find all lists in the content
            const allLists = Array.from(tempDiv.querySelectorAll('ol, ul'));
            
            // Identify top-level lists (lists that are not nested inside another list)
            const topLevelLists = allLists.filter(list => {
                let parent = list.parentElement;
                while (parent && parent !== tempDiv) {
                    if (parent.tagName === 'OL' || parent.tagName === 'UL') {
                        return false;
                    }
                    parent = parent.parentElement;
                }
                return true;
            });
            
            let globalItemCounter = 1;
            let topLevelIndex = 0;
            const itemsMap = {}; // Map of itemId -> { text, index, subItems }
            
            // Recursive function to convert list items (same logic as Annex A)
            const convertListItems = (listElement, parentIndexPath = [], isTopLevelList = false) => {
                if (!listElement || (listElement.tagName !== 'OL' && listElement.tagName !== 'UL')) {
                    return [];
                }
                
                const items = [];
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
                        const cleanText = textContent.trim();
                        
                        // Generate hierarchical index (e.g., "1", "1.1", "1.2", "2", etc.)
                        let currentIndexPath;
                        if (isTopLevelList && parentIndexPath.length === 0) {
                            topLevelIndex++;
                            currentIndexPath = [topLevelIndex];
                        } else {
                            currentIndexPath = [...parentIndexPath, itemIndex + 1];
                        }
                        const hierarchicalIndex = currentIndexPath.join('.');
                        
                        // Generate item ID with section prefix to match Sgha_annexA format
                        // Format: sectionKey:item-N (e.g., "1.1:item-1", "2.1:item-1")
                        const itemId = sectionKey ? `${sectionKey}:item-${globalItemCounter}` : `item-${globalItemCounter}`;
                        globalItemCounter++;
                        
                        // Process nested lists - these should be sub-items of this item
                        let subItems = null;
                        
                        // Check for nested lists as direct children of the <li> element
                        const nestedListsDirect = Array.from(item.children).filter(
                            child => child.tagName === 'OL' || child.tagName === 'UL'
                        );
                        
                        // Also check if the next sibling is a list
                        let nextSiblingList = null;
                        if (i + 1 < allChildren.length) {
                            const nextSibling = allChildren[i + 1];
                            if (nextSibling.tagName === 'OL' || nextSibling.tagName === 'UL') {
                                nextSiblingList = nextSibling;
                                i++; // Skip this list in the main loop
                            }
                        }
                        
                        // Combine both types of nested lists
                        const nestedLists = nestedListsDirect.length > 0 
                            ? nestedListsDirect 
                            : (nextSiblingList ? [nextSiblingList] : []);
                        
                        if (nestedLists.length > 0) {
                            const allSubItems = [];
                            nestedLists.forEach((nestedList) => {
                                const nestedItems = convertListItems(nestedList, currentIndexPath, false);
                                if (nestedItems && nestedItems.length > 0) {
                                    allSubItems.push(...nestedItems);
                                }
                            });
                            if (allSubItems.length > 0) {
                                subItems = allSubItems;
                            }
                        }
                        
                        // Only add this item if it has text OR sub-items
                        if (cleanText || subItems) {
                            const itemData = {
                                id: itemId,
                                index: hierarchicalIndex,
                                text: cleanText,
                                subItems: subItems
                            };
                            items.push(itemData);
                            itemsMap[itemId] = itemData;
                        }
                    }
                }
                
                return items;
            };
            
            // Process each top-level list sequentially to maintain continuous numbering
            topLevelLists.forEach(list => {
                const items = convertListItems(list, [], true);
                // Items are already stored in itemsMap during processing
            });
            
            return { items: itemsMap };
        } catch (error) {
            console.error('Error parsing HTML content:', error);
            return { items: {} };
        }
    };

    // Function to format Annex A summary from localStorage and template data
    const getAnnexASummary = () => {
        console.log('[Summary] getAnnexASummary called');
        const savedStates = localStorage.getItem('sgha_annex_a_states');
        console.log('[Summary] Raw localStorage value:', savedStates);
        console.log('[Summary] Saved states from localStorage:', savedStates ? 'exists' : 'not found');
        
        if (!savedStates) {
            console.log('[Summary] No saved states, returning empty');
            return { serviceTypes: [], sections: [] };
        }

        try {
            const states = JSON.parse(savedStates);
            console.log('[Summary] Parsed states:', {
                hasServiceTypes: !!states.serviceTypes,
                serviceTypes: states.serviceTypes,
                sectionKeys: Object.keys(states).filter(k => k !== 'serviceTypes'),
                hasTemplateData: !!templateData,
                templateDataType: Array.isArray(templateData) ? 'array' : typeof templateData
            });
            
            const summary = {
                serviceTypes: [],
                sections: []
            };

            // Get service types
            if (states.serviceTypes) {
                if (states.serviceTypes.comp) summary.serviceTypes.push('COMP');
                if (states.serviceTypes.ramp) summary.serviceTypes.push('Ramp');
                if (states.serviceTypes.cargo) summary.serviceTypes.push('Cargo');
            }
            
            console.log('[Summary] Service types:', summary.serviceTypes);

            if (!templateData || !Array.isArray(templateData)) {
                // Fallback to just showing numbers if template data not available
                const sectionLabels = {
                    '1.1': '1.1 Representation',
                    '1.2': '1.2 Management and Administrative Functions',
                    '1.3': '1.3 Passenger Services',
                    '1.4': '1.4 Station Management'
                };

                // Get selected service types
                const selectedServiceTypes = states.serviceTypes || {
                    comp: false,
                    ramp: false,
                    cargo: false
                };

                console.log('[Summary] Processing states with sections:', Object.keys(states).filter(k => k !== 'serviceTypes'));
                console.log('[Summary] Selected service types for filtering:', selectedServiceTypes);
                
                Object.keys(states).forEach(sectionKey => {
                    if (sectionKey !== 'serviceTypes' && states[sectionKey]) {
                        const section = states[sectionKey];
                        const checkedItems = [];
                        console.log(`[Summary] Processing section ${sectionKey}:`, section);

                        Object.keys(section).forEach(itemKey => {
                            const item = section[itemKey];
                            if (!item) return;
                            
                            // Prefer new format (ramp/comp/cargo); accept legacy 'checked' for backward compatibility
                            let isItemChecked = false;
                            if (item.checked === true) {
                                isItemChecked = true;
                            } else if (item.ramp !== undefined || item.comp !== undefined || item.cargo !== undefined) {
                                const hasRamp = selectedServiceTypes.ramp && item.ramp === true;
                                const hasComp = selectedServiceTypes.comp && item.comp === true;
                                const hasCargo = selectedServiceTypes.cargo && item.cargo === true;
                                isItemChecked = hasRamp || hasComp || hasCargo;
                            }
                            
                            if (isItemChecked) {
                                const itemLabel = itemKey.includes('-main') 
                                    ? itemKey.replace('-main', '') 
                                    : itemKey;
                                checkedItems.push({ number: itemLabel, text: itemLabel });
                                
                                if (item.subItems) {
                                    Object.keys(item.subItems).forEach(subItemKey => {
                                        const subItem = item.subItems[subItemKey];
                                        
                                        let isSubItemChecked = false;
                                        if (subItem.checked === true) {
                                            isSubItemChecked = true;
                                        } else if (subItem.ramp !== undefined || subItem.comp !== undefined || subItem.cargo !== undefined) {
                                            const hasRamp = selectedServiceTypes.ramp && subItem.ramp === true;
                                            const hasComp = selectedServiceTypes.comp && subItem.comp === true;
                                            const hasCargo = selectedServiceTypes.cargo && subItem.cargo === true;
                                            isSubItemChecked = hasRamp || hasComp || hasCargo;
                                        }
                                        
                                        if (isSubItemChecked) {
                                            checkedItems.push({ 
                                                number: subItemKey, 
                                                text: subItemKey,
                                                isSubItem: true 
                                            });
                                        }
                                    });
                                }
                            }
                        });

                        if (checkedItems.length > 0) {
                            summary.sections.push({
                                section: sectionLabels[sectionKey] || sectionKey,
                                items: checkedItems
                            });
                        }
                    }
                });
                return summary;
            }

            // Parse template data to find ALL sections and their content dynamically
            const sectionMap = {};
            let currentSection = null;
            let currentMainSection = null;
            let mainSectionHeading = null;

            console.log('[Summary] Parsing template data, length:', templateData.length);
            
            templateData.forEach((field, index) => {
                // Check if we're entering a main section (1, 2, 3, 4, 5, 6, 7, 8)
                if (field.type === 'heading_no') {
                    const sectionNum = String(field.value);
                    if (['1', '2', '3', '4', '5', '6', '7', '8'].includes(sectionNum)) {
                        if (index + 1 < templateData.length && templateData[index + 1].type === 'heading') {
                            currentMainSection = sectionNum;
                            mainSectionHeading = templateData[index + 1].value;
                            console.log('[Summary] Entered Section', sectionNum, 'at index', index, 'Main heading:', mainSectionHeading);
                            return;
                        }
                    }
                    
                    // Also handle heading_no with decimal values (like 2.1, 3.1) as subsections
                    if (sectionNum.includes('.') && currentMainSection) {
                        const nextField = index + 1 < templateData.length ? templateData[index + 1] : null;
                        if (nextField && nextField.type === 'subheading') {
                            currentSection = sectionNum;
                            const subheadingText = nextField.value || '';
                            
                            if (!sectionMap[currentSection]) {
                                const sectionLabel = mainSectionHeading 
                                    ? `${mainSectionHeading} - ${currentSection} ${subheadingText}`
                                    : `${currentSection} ${subheadingText}`;
                                sectionMap[currentSection] = {
                                    label: sectionLabel,
                                    mainHeading: mainSectionHeading,
                                    subheading: subheadingText,
                                    editorContent: null,
                                    checkboxConfig: null
                                };
                                console.log('[Summary] Found subsection via heading_no:', currentSection, 'title:', subheadingText);
                            }
                            return;
                        }
                    }
                }

                // Check if this is a subheading_no field (subsections like 1.1, 2.1, 3.1, etc.)
                if (field.type === 'subheading_no' && currentMainSection) {
                    const headingNo = String(field.value);
                    // Check if it's a valid subsection (contains a decimal point)
                    if (headingNo.includes('.')) {
                        currentSection = headingNo;
                        const nextField = index + 1 < templateData.length ? templateData[index + 1] : null;
                        const subheadingText = (nextField && nextField.type === 'subheading') ? nextField.value : '';
                        
                        console.log('[Summary] Found subheading section:', currentSection, 'at index', index, 'title:', subheadingText);
                        if (!sectionMap[currentSection]) {
                            const sectionLabel = mainSectionHeading 
                                ? `${mainSectionHeading} - ${currentSection} ${subheadingText}`
                                : `${currentSection} ${subheadingText}`;
                            sectionMap[currentSection] = {
                                label: sectionLabel,
                                mainHeading: mainSectionHeading,
                                subheading: subheadingText,
                                editorContent: null,
                                checkboxConfig: null
                            };
                        } else if (subheadingText && !sectionMap[currentSection].subheading) {
                            sectionMap[currentSection].subheading = subheadingText;
                            sectionMap[currentSection].label = mainSectionHeading 
                                ? `${mainSectionHeading} - ${currentSection} ${subheadingText}`
                                : `${currentSection} ${subheadingText}`;
                        }
                    }
                    return;
                }

                // Also handle standalone subheading field
                if (field.type === 'subheading' && currentMainSection) {
                    let headingNo = null;
                    for (let i = index - 1; i >= 0; i--) {
                        if (templateData[i].type === 'heading_no' || templateData[i].type === 'subheading_no') {
                            headingNo = String(templateData[i].value);
                            break;
                        }
                    }
                    
                    if (headingNo && headingNo.includes('.')) {
                        if (!sectionMap[headingNo]) {
                            currentSection = headingNo;
                            const subheadingText = field.value || '';
                            console.log('[Summary] Found subheading section (standalone):', currentSection, 'at index', index, 'title:', subheadingText);
                            const sectionLabel = mainSectionHeading 
                                ? `${mainSectionHeading} - ${currentSection} ${subheadingText}`
                                : `${currentSection} ${subheadingText}`;
                            sectionMap[currentSection] = {
                                label: sectionLabel,
                                mainHeading: mainSectionHeading,
                                subheading: subheadingText,
                                editorContent: null,
                                checkboxConfig: null
                            };
                        }
                    }
                    return;
                }

                // Find editor content and checkboxConfig for current section
                if (field.type === 'editor' && currentSection && currentMainSection) {
                    console.log('[Summary] Found editor content for section', currentSection, 'length:', field.value?.length);
                    if (sectionMap[currentSection]) {
                        sectionMap[currentSection].editorContent = field.value;
                        if (field.checkboxConfig && typeof field.checkboxConfig === 'object') {
                            sectionMap[currentSection].checkboxConfig = field.checkboxConfig;
                        }
                    }
                }
            });
            
            console.log('[Summary] Section map created:', Object.keys(sectionMap), sectionMap);

            const sectionOrder = (a, b) => {
                const aParts = a.split('.').map(Number);
                const bParts = b.split('.').map(Number);
                for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
                    if (aParts[i] === undefined) return -1;
                    if (bParts[i] === undefined) return 1;
                    if (aParts[i] !== bParts[i]) return aParts[i] - bParts[i];
                }
                return 0;
            };
            // Include ALL sections: from template (sectionMap) and from saved state, so nothing is missing
            const stateSectionKeys = Object.keys(states).filter((k) => k !== 'serviceTypes' && states[k] && typeof states[k] === 'object');
            const allSectionKeysSet = new Set([...Object.keys(sectionMap), ...stateSectionKeys]);
            const sortedSectionKeys = Array.from(allSectionKeysSet).sort(sectionOrder);
            
            console.log('[Summary] Section keys (template + state):', sortedSectionKeys);
            
            // Get selected service types for checking item selection
            const selectedServiceTypes = states.serviceTypes || {
                comp: false,
                ramp: false,
                cargo: false
            };
            
            // Helper function to check if an item is selected (new format ramp/comp/cargo or legacy checked)
            const isItemSelected = (item) => {
                if (!item || typeof item !== 'object') return false;
                if (item.checked === true) return true;
                if (item.ramp !== undefined || item.comp !== undefined || item.cargo !== undefined) {
                    const hasRamp = selectedServiceTypes.ramp && item.ramp === true;
                    const hasComp = selectedServiceTypes.comp && item.comp === true;
                    const hasCargo = selectedServiceTypes.cargo && item.cargo === true;
                    return hasRamp || hasComp || hasCargo;
                }
                return false;
            };

            // Helper: is item selected by default in template (checkboxConfig) for current service types
            const isDefaultSelectedInTemplate = (checkboxConfig, itemId, sectionKey, itemNum) => {
                if (!checkboxConfig || typeof checkboxConfig !== 'object') return false;
                const possibleKeys = itemNum
                    ? [
                        itemId,
                        `${sectionKey}:item-${itemNum}`,
                        `${sectionKey}:f0:item-${itemNum}`,
                        `item-${itemNum}`,
                        ...Object.keys(checkboxConfig).filter((k) => k.endsWith(`:item-${itemNum}`) || k === `item-${itemNum}`)
                    ]
                    : [itemId];
                let config = null;
                for (const k of possibleKeys) {
                    if (checkboxConfig[k] && typeof checkboxConfig[k] === 'object') {
                        config = checkboxConfig[k];
                        break;
                    }
                }
                if (!config) return false;
                return (selectedServiceTypes.ramp && config.ramp === true) || (selectedServiceTypes.comp && config.comp === true) || (selectedServiceTypes.cargo && config.cargo === true);
            };

            const sectionLabelsFallback = {
                '1.1': '1.1 Representation',
                '1.2': '1.2 Administrative Functions',
                '1.3': '1.3 Supervision and/or Coordination',
                '1.4': '1.4 Station Management'
            };
            
            // Iterate through ALL sections (from template + state)
            sortedSectionKeys.forEach(sectionKey => {
                const sectionInfo = sectionMap[sectionKey] || {
                    label: sectionLabelsFallback[sectionKey] || sectionKey,
                    editorContent: null,
                    checkboxConfig: null
                };
                const checkedItems = [];
                const sectionStates = states[sectionKey] || {};
                const checkboxConfig = (sectionInfo && sectionInfo.checkboxConfig) || {};
                
                // Parse the HTML content for this section to get item text (real clause content)
                const parsedContent = parseHTMLContent(sectionInfo.editorContent, sectionKey);
                const itemsMap = parsedContent?.items || {};
                
                console.log('[Summary] Processing section', sectionKey, {
                    label: sectionInfo.label,
                    hasEditorContent: !!sectionInfo.editorContent,
                    itemsMapCount: Object.keys(itemsMap).length,
                    savedStateKeys: Object.keys(sectionStates)
                });
                
                const addedItemIds = new Set();
                const consumedSavedKeys = new Set(); // keys from sectionStates already matched in main loop (avoid duplicate in fallback)
                const itemsArray = Object.values(itemsMap);
                
                // Add items that are selected (saved state OR default in template); use template text for display
                itemsArray.forEach((parsedItem, arrayIndex) => {
                    if (!parsedItem) return;
                    const itemId = parsedItem.id || parsedItem.index;
                    const itemNum = itemId && String(itemId).match(/item-(\d+)/)?.[1];
                    const rawText = parsedItem.text && String(parsedItem.text).trim();
                    const displayText = rawText || (itemNum ? `Item ${itemNum}` : String(itemId));
                    if (addedItemIds.has(itemId)) return;
                    
                    // Check if this item is selected in saved states
                    // Annex A uses "sectionKey:f0:item-N" (with field index) or legacy "sectionKey:item-N"
                    let savedItemState = sectionStates[itemId];
                    if (savedItemState) consumedSavedKeys.add(itemId);
                    
                    if (!savedItemState && itemNum) {
                        const prefixedKey = `${sectionKey}:item-${itemNum}`;
                        savedItemState = sectionStates[prefixedKey];
                        if (savedItemState) consumedSavedKeys.add(prefixedKey);
                        if (!savedItemState) {
                            const matchingKey = Object.keys(sectionStates).find(
                                (key) => key.startsWith(`${sectionKey}:f`) && key.endsWith(`:item-${itemNum}`)
                            );
                            if (matchingKey) {
                                savedItemState = sectionStates[matchingKey];
                                consumedSavedKeys.add(matchingKey);
                            }
                        }
                        if (!savedItemState && sectionStates[`item-${itemNum}`]) {
                            savedItemState = sectionStates[`item-${itemNum}`];
                            consumedSavedKeys.add(`item-${itemNum}`);
                        }
                    }
                    if (!savedItemState && parsedItem.arrayIndex !== undefined) {
                        const possibleKeys = Object.keys(sectionStates).filter((key) =>
                            key.includes(':item-') || key.startsWith('item-')
                        );
                        const sortedKeys = possibleKeys.sort((a, b) => {
                            const aNum = parseInt(a.match(/item-(\d+)/)?.[1] || '0');
                            const bNum = parseInt(b.match(/item-(\d+)/)?.[1] || '0');
                            return aNum - bNum;
                        });
                        if (parsedItem.arrayIndex < sortedKeys.length) {
                            const posKey = sortedKeys[parsedItem.arrayIndex];
                            savedItemState = sectionStates[posKey];
                            if (savedItemState) consumedSavedKeys.add(posKey);
                        }
                    }
                    
                    const isSelectedInSavedState = isItemSelected(savedItemState);
                    const isDefaultSelected = !savedItemState && isDefaultSelectedInTemplate(checkboxConfig, itemId, sectionKey, itemNum);
                    const isMainItemSelected = isSelectedInSavedState || isDefaultSelected;
                    
                    // Also check for sub-items selection
                    let hasSelectedSubItems = false;
                    const selectedSubItems = [];
                    
                    if (parsedItem.subItems && Array.isArray(parsedItem.subItems)) {
                        parsedItem.subItems.forEach(parsedSubItem => {
                            if (!parsedSubItem || !parsedSubItem.text || !parsedSubItem.text.trim()) {
                                return;
                            }
                            
                            const subItemId = parsedSubItem.id || parsedSubItem.index;
                            
                            // Check saved state for sub-item (Sgha_annexA may use sectionKey:f0:item-N)
                            let subItemState = null;
                            if (savedItemState && savedItemState.subItems) {
                                subItemState = savedItemState.subItems[subItemId];
                                if (!subItemState && typeof subItemId === 'string') {
                                    const subNum = subItemId.match(/item-(\d+)/)?.[1];
                                    if (subNum) {
                                        const subKey = Object.keys(savedItemState.subItems).find(
                                            (k) => k.endsWith(`:item-${subNum}`) || k === `item-${subNum}`
                                        );
                                        if (subKey) subItemState = savedItemState.subItems[subKey];
                                    }
                                }
                            }
                            if (!subItemState) {
                                subItemState = sectionStates[subItemId];
                                if (!subItemState && typeof subItemId === 'string') {
                                    const subNum = subItemId.match(/item-(\d+)/)?.[1];
                                    if (subNum) {
                                        const subKey = Object.keys(sectionStates).find(
                                            (k) => k.endsWith(`:item-${subNum}`) || k === `item-${subNum}`
                                        );
                                        if (subKey) subItemState = sectionStates[subKey];
                                    }
                                }
                            }
                            
                            if (isItemSelected(subItemState)) {
                                hasSelectedSubItems = true;
                                if (!addedItemIds.has(subItemId)) {
                                    addedItemIds.add(subItemId);
                                    selectedSubItems.push({
                                        id: parsedSubItem.id,
                                        number: parsedSubItem.index || subItemId,
                                        text: parsedSubItem.text.trim(),
                                        subItems: []
                                    });
                                }
                            }
                        });
                    }
                    
                    // Only add if main item is selected OR has selected sub-items; use template text for display
                    if (isMainItemSelected || hasSelectedSubItems) {
                        addedItemIds.add(itemId);
                        const itemToAdd = {
                            id: parsedItem.id,
                            number: parsedItem.index || String(arrayIndex + 1),
                            text: displayText,
                            subItems: selectedSubItems
                        };
                        checkedItems.push(itemToAdd);
                    }
                });
                
                // Sort items by their hierarchical number
                const sortItems = (items) => {
                    items.sort((a, b) => {
                        const aParts = (a.number || '').split('.').map(part => {
                            const num = parseInt(part);
                            return isNaN(num) ? part : num;
                        });
                        const bParts = (b.number || '').split('.').map(part => {
                            const num = parseInt(part);
                            return isNaN(num) ? part : num;
                        });
                        
                        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
                            const aVal = aParts[i];
                            const bVal = bParts[i];
                            
                            if (aVal === undefined) return -1;
                            if (bVal === undefined) return 1;
                            
                            if (typeof aVal === 'number' && typeof bVal === 'number') {
                                if (aVal !== bVal) return aVal - bVal;
                            } else if (typeof aVal === 'string' && typeof bVal === 'string') {
                                const comparison = aVal.localeCompare(bVal);
                                if (comparison !== 0) return comparison;
                            } else {
                                if (typeof aVal === 'number') return -1;
                                if (typeof bVal === 'number') return 1;
                            }
                        }
                        return 0;
                    });
                    
                    items.forEach(item => {
                        if (item.subItems && item.subItems.length > 0) {
                            sortItems(item.subItems);
                        }
                    });
                };
                
                sortItems(checkedItems);
                
                // Fallback: add any saved-state keys we didn't match to template (avoid duplicates via consumedSavedKeys)
                Object.keys(sectionStates).forEach((savedKey) => {
                    const isItemFormat = savedKey.startsWith('item-') || savedKey.includes(':item-');
                    if (!isItemFormat || consumedSavedKeys.has(savedKey)) return;
                    const savedItemState = sectionStates[savedKey];
                    if (isItemSelected(savedItemState)) {
                        const itemMatch = savedKey.match(/item-(\d+)/);
                        const itemNum = itemMatch ? itemMatch[1] : savedKey;
                        const matchingTemplateItem = itemsArray.find((item) => {
                            const id = item.id || item.index;
                            const n = id && String(id).match(/item-(\d+)/)?.[1];
                            return n === itemNum;
                        });
                        const text = matchingTemplateItem && (matchingTemplateItem.text && String(matchingTemplateItem.text).trim()) ? matchingTemplateItem.text.trim() : `Item ${itemNum}`;
                        checkedItems.push({
                            id: savedKey,
                            number: itemNum,
                            text,
                            subItems: []
                        });
                        addedItemIds.add(savedKey);
                    }
                });
                
                // Re-sort after adding fallback items
                sortItems(checkedItems);
                
                console.log(`[Summary] Final items for ${sectionKey}:`, checkedItems.length);

                if (checkedItems.length > 0) {
                    summary.sections.push({
                        section: sectionInfo.label || sectionKey,
                        items: checkedItems
                    });
                }
            });
            
            console.log(`[Summary] Final summary:`, {
                serviceTypes: summary.serviceTypes,
                sectionsCount: summary.sections.length,
                totalItems: summary.sections.reduce((sum, sec) => sum + sec.items.length, 0)
            });

            return summary;
        } catch (error) {
            console.error('Error parsing Annex A states:', error);
            return { serviceTypes: [], sections: [] };
        }
    };

    // Get current summary - recalculated when dialog is shown; uses template when loaded, else fallback from localStorage
    const annexASummary = useMemo(() => {
        if (!showAnnexASummary) {
            return { serviceTypes: [], sections: [] };
        }
        // Always compute summary: getAnnexASummary() uses templateData when available, else fallback (so content shows immediately)
        const summary = getAnnexASummary();
        console.log('[Summary] Summary calculated:', {
            serviceTypesCount: summary.serviceTypes.length,
            sectionsCount: summary.sections.length,
            hasTemplateData: !!templateData,
            loadingTemplate
        });
        return summary;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showAnnexASummary, templateData, loadingTemplate]);

    const handleClick = (index) => {
        // If clicking on Annex B (index 2) from Annex A (index 1), show summary
        if (index === 2 && activeIndex === 1) {
            setPendingIndex(index);
            setShowAnnexASummary(true);
        } else {
            setActiveIndex(index);
        }
    };

    const handleNext = () => {
        // If moving from Annex A (index 1) to Annex B (index 2), show summary
        if (activeIndex === 1) {
            setPendingIndex(2);
            setShowAnnexASummary(true);
        } else {
            setActiveIndex((prev) => (prev + 1) % sections.length);
        }
    };

    const handlePrev = () => {
        setActiveIndex((prev) => (prev - 1 + sections.length) % sections.length);
    };

    const handleConfirmSummary = () => {
        setShowAnnexASummary(false);
        if (pendingIndex !== null) {
            setActiveIndex(pendingIndex);
            setPendingIndex(null);
        }
    };

    const handleCancelSummary = () => {
        setShowAnnexASummary(false);
        setPendingIndex(null);
    };
    

    return (
        <>
            <Row>
                <Col md={12} lg={6}>
                    <Breadcrumb>
                        <Breadcrumb.Item onClick={goBack}>
                            <IoChevronBackOutline /> Back
                        </Breadcrumb.Item>
                        <Breadcrumb.Item active>Agreement</Breadcrumb.Item>
                    </Breadcrumb>
                </Col>
            </Row>
            <Row className="mt-4 mx-0">
                <TabView>
                    <TabPanel 
                        header={
                            <div className="flex align-items-center gap-2">
                                <span>Kolkata</span>
                            </div>
                        }
                    >
                        <div className="mx-0 mt-0 documentPart">
                            {/* Left Menu */}
                            <div className="side-div">
                                <ul>
                                <li>
                                    <a
                                    href="#!"
                                    className={activeIndex === 0 ? "active" : ""}
                                    onClick={() => handleClick(0)}
                                    >
                                    Main Agreement
                                    </a>
                                </li>
                                <li>
                                    <a
                                    href="#!"
                                    className={activeIndex === 1 ? "active" : ""}
                                    onClick={() => handleClick(1)}
                                    >
                                    Annex A
                                    </a>
                                </li>
                                <li>
                                    <a
                                    href="#!"
                                    className={activeIndex === 2 ? "active" : ""}
                                    onClick={() => handleClick(2)}
                                    >
                                    Annex B
                                    </a>
                                </li>
                                </ul>
                                
                            </div>

                            {/* Right Content */}
                            <div className="main-div">
                                <AnimatePresence mode="wait">
                                {activeIndex === 0 && (
                                    <motion.div
                                    key="main"
                                    initial={{ x: 100, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: -100, opacity: 0 }}
                                    transition={{ duration: 0.4 }}
                                    className="content-box"
                                    >
                                    <Sgha_mainagreemment templateYear={templateYear}/>

                                    </motion.div>
                                )}


                                {activeIndex === 1 && (
                                    <motion.div
                                    key="annex-a"
                                    initial={{ x: 100, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: -100, opacity: 0 }}
                                    transition={{ duration: 0.4 }}
                                    className="content-box"
                                    >
                                    <Sgha_annexA templateYear={templateYear}/>

                                    </motion.div>
                                )}



                                {activeIndex === 2 && (
                                    <motion.div
                                    key="annex-b"
                                    initial={{ x: 100, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: -100, opacity: 0 }}
                                    transition={{ duration: 0.4 }}
                                    className="content-box"
                                    >
                                    <Sgha_annexB templateYear={templateYear} formData={formData} selectedCities={selectedCities}/>

                                    </motion.div>
                                )}
                                </AnimatePresence>

                                {/* Navigation Buttons */}
                               <div className="nav-buttons d-flex justify-content-end gap-2 mt-4">
                                    {/* Show Back button only when not in Main Agreement (index 0) and not in Annex-B (index 2) */}
                                    {activeIndex !== 0 && activeIndex !== 2 && (
                                        <Button
                                            onClick={handlePrev}
                                            icon="pi pi-arrow-left"
                                            className="py-2 me-2"
                                            severity="secondary"
                                            tooltip="Previous"
                                            iconPos="left"
                                        />
                                    )}

                                    {/* Hide Next button on Annex-B (index 2) */}
                                    {activeIndex !== 2 && (
                                        <Button
                                            onClick={handleNext}
                                            icon="pi pi-arrow-right"
                                            className="py-2"
                                            severity="warning"
                                            label="Next"
                                            iconPos="right"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </TabPanel>
                </TabView>
            </Row>
            {/* Annex A Summary Dialog */}
            <Dialog
                visible={showAnnexASummary}
                onHide={handleCancelSummary}
                header="Annex A Summary"
                style={{ width: '80vw', maxWidth: '900px' }}
                modal
                className="annex-a-summary-dialog"
                footer={
                    <div>
                        <Button 
                            label="Cancel" 
                            icon="pi pi-times" 
                            onClick={handleCancelSummary} 
                            className="p-button-text" 
                        />
                        <Button 
                            label="Continue to Annex B" 
                            icon="pi pi-check" 
                            onClick={handleConfirmSummary} 
                            autoFocus 
                            severity="warning"
                        />
                    </div>
                }
            >
                <style>{`
                    /* Complete CSS for Annex A Summary Dialog - Aggressive selectors with !important */
                    /* Target PrimeReact Dialog structure */
                    .annex-a-summary-dialog .p-dialog-content .legal-section .clauses,
                    .annex-a-summary-dialog .legal-section .clauses {
                        list-style: none !important;
                        padding-left: 0 !important;
                        margin: 0.25rem 0 0 !important;
                    }
                    
                    .annex-a-summary-dialog .p-dialog-content .legal-section .clause,
                    .annex-a-summary-dialog .legal-section .clause {
                        margin: 0.35rem 0 !important;
                        font-size: 13px !important;
                    }
                    
                    .annex-a-summary-dialog .p-dialog-content .legal-section .num,
                    .annex-a-summary-dialog .legal-section .num {
                        font-weight: 600 !important;
                        margin-right: 0.35rem !important;
                        white-space: nowrap !important;
                        font-size: 13px !important;
                    }
                    
                    .annex-a-summary-dialog .p-dialog-content .legal-section .clause > .num,
                    .annex-a-summary-dialog .legal-section .clause > .num {
                        display: inline-block !important;
                        min-width: 3.2rem !important;
                    }
                    
                    /* CRITICAL: Nested sub-items indentation - Override .p-dialog-content ul padding-left: 0 */
                    .annex-a-summary-dialog .p-dialog-content .legal-section .sub,
                    .annex-a-summary-dialog .p-dialog-content .legal-section .sub.alpha,
                    .annex-a-summary-dialog .p-dialog-content .legal-section .sub.decimal,
                    .annex-a-summary-dialog .legal-section .sub,
                    .annex-a-summary-dialog .legal-section .sub.alpha,
                    .annex-a-summary-dialog .legal-section .sub.decimal {
                        list-style: none !important;
                        padding-left: 3.5rem !important;
                        margin-top: 0.5rem !important;
                    }
                    
                    /* Target nested ol inside clause div with multiple selector variations */
                    .annex-a-summary-dialog .p-dialog-content .legal-section .clause > div > ol.sub,
                    .annex-a-summary-dialog .p-dialog-content .legal-section .clause > div > ol.sub.alpha,
                    .annex-a-summary-dialog .p-dialog-content .legal-section .clause > div > ol.sub.decimal,
                    .annex-a-summary-dialog .legal-section .clause > div > ol.sub,
                    .annex-a-summary-dialog .legal-section .clause > div > ol.sub.alpha,
                    .annex-a-summary-dialog .legal-section .clause > div > ol.sub.decimal,
                    .annex-a-summary-dialog .p-dialog-content ol.sub,
                    .annex-a-summary-dialog .p-dialog-content ol.sub.alpha {
                        padding-left: 3.5rem !important;
                        margin-top: 0.5rem !important;
                        list-style: none !important;
                    }
                    
                    .annex-a-summary-dialog .p-dialog-content .legal-section .sub li,
                    .annex-a-summary-dialog .legal-section .sub li {
                        margin: 0.2rem 0 !important;
                        font-size: 13px !important;
                    }
                    
                    .annex-a-summary-dialog .p-dialog-content .legal-section .sub .num,
                    .annex-a-summary-dialog .legal-section .sub .num {
                        margin-right: 0.35rem !important;
                        font-size: 13px !important;
                    }
                `}</style>
                <div className="annex-a-summary-content" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    <h5 className="mb-3">Summary of Items in Annex A</h5>
                    
                    {loadingTemplate && annexASummary.sections.length === 0 && annexASummary.serviceTypes.length === 0 && (
                        <div className="text-center p-4">
                            <i className="pi pi-spin pi-spinner me-2"></i>
                            Loading summary...
                        </div>
                    )}
                    {(annexASummary.sections.length > 0 || annexASummary.serviceTypes.length > 0) && (
                        <>
                            {loadingTemplate && (
                                <p className="text-muted small mb-2">
                                    <i className="pi pi-spin pi-spinner me-1"></i> Loading full item text from template...
                                </p>
                            )}
                            {/* Service Types */}
                            {annexASummary.serviceTypes.length > 0 && (
                                <div className="mb-4">
                                    <h6 className="text-primary mb-2">Service Types:</h6>
                                    <div className="d-flex gap-2 flex-wrap">
                                        {annexASummary.serviceTypes.map((type, idx) => (
                                            <Badge key={idx} value={type} severity="info" className="me-2" />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Sections */}
                            {annexASummary.sections.length > 0 ? (
                                <div>
                                    <h6 className="text-primary mb-3">Sections and Items:</h6>
                                    {annexASummary.sections.map((sectionData, idx) => {
                                        // Render items recursively using simple nested HTML structure
                                        const renderItems = (items, level = 0) => {
                                            if (!items || items.length === 0) return null;
                                            
                                            const listClass = level === 0 ? 'clauses' : level === 1 ? 'sub alpha' : 'sub decimal';
                                            
                                            // Apply inline style for nested lists as final fallback (highest specificity)
                                            const listStyle = level > 0 ? {
                                                listStyle: 'none',
                                                paddingLeft: '3.5rem',
                                                marginTop: '0.5rem'
                                            } : {};
                                            
                                            return (
                                                <ol className={listClass} style={listStyle}>
                                                    {items.map((item, itemIdx) => {
                                                        // If item has sub-items, use simple nested structure
                                                        if (item.subItems && item.subItems.length > 0) {
                                                            return (
                                                                <li key={itemIdx} className={level === 0 ? "clause d-flex align-items-start gap-2" : "d-flex align-items-start gap-2"}>
                                                                    <i className="pi pi-check-circle text-success me-2" style={{ marginTop: '2px', flexShrink: 0 }}></i>
                                                                    <div>
                                                                        <span>
                                                                            <span className="num">{item.number}</span> {item.text}
                                                                        </span>
                                                                        {renderItems(item.subItems, level + 1)}
                                                                    </div>
                                                                </li>
                                                            );
                                                        } else {
                                                            // Item without sub-items
                                                            return (
                                                                <li key={itemIdx} className={level === 0 ? "clause d-flex align-items-start gap-2" : "d-flex align-items-start gap-2"}>
                                                                    <i className="pi pi-check-circle text-success me-2" style={{ marginTop: '2px', flexShrink: 0 }}></i>
                                                                    <div>
                                                                        <span>
                                                                            <span className="num">{item.number}</span> {item.text}
                                                                        </span>
                                                                    </div>
                                                                </li>
                                                            );
                                                        }
                                                    })}
                                                </ol>
                                            );
                                        };
                                        
                                        return (
                                            <div key={idx} className="mb-4 p-3 border rounded legal-section" style={{ backgroundColor: '#f8f9fa' }}>
                                                <h6 className="mb-3 text-dark fw-bold">{sectionData.section}</h6>
                                                {renderItems(sectionData.items, 0)}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center p-4 text-muted">
                                    <i className="pi pi-info-circle me-2"></i>
                                    No content available in Annex A.
                                </div>
                            )}
                        </>
                    )}
                </div>
            </Dialog>
        </>
    );
};

export default Agreement;