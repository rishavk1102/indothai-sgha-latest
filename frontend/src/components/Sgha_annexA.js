import DOMPurify from 'dompurify';
import { Accordion, AccordionTab } from 'primereact/accordion';
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Steps } from "primereact/steps";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, Form, InputGroup, Table } from 'react-bootstrap';
import api from "../api/axios";

const Sgha_annexA = ({ templateYear = 2025, templateName = null }) => {
    const [visibleRight, setVisibleRight] = useState(false);
        
          // State for cards
          const [currentCardIndex, setCurrentCardIndex] = useState(0);
        
          // State for vertical stepper
          const [activeIndex, setActiveIndex] = useState(0);

          // State for template data
          const [templateData, setTemplateData] = useState(null);
          const [loadingTemplate, setLoadingTemplate] = useState(true);
          const [section1Content, setSection1Content] = useState(null);
          
          // State for table row data
          const [tableRowData, setTableRowData] = useState(null);
          const [loadingTableRow, setLoadingTableRow] = useState(false);

          // Version key to force reset of old localStorage data
          // Increment this when changing the default state structure
          // Version 3: Fixed section keys to use actual subsection numbers instead of array indices
          // Version 4: Fixed item ID format to be section-specific (sectionKey:item-N) to prevent ID collisions
          // Item ID now includes field index (sectionKey:f{fieldIndex}:item-N) with legacy key fallback for migration
          const ANNEX_A_STATE_VERSION = 4;

          // Check and clear old localStorage data BEFORE component renders
          // This runs once during module initialization
          (() => {
            try {
              const savedVersion = localStorage.getItem('sgha_annex_a_version');
              if (!savedVersion || parseInt(savedVersion) < ANNEX_A_STATE_VERSION) {
                console.log('[Annex A] Clearing old localStorage data (version upgrade from', savedVersion, 'to', ANNEX_A_STATE_VERSION, ')');
                localStorage.removeItem('sgha_annex_a_states');
                localStorage.setItem('sgha_annex_a_version', String(ANNEX_A_STATE_VERSION));
              }
            } catch (e) {
              console.error('[Annex A] Error checking version:', e);
            }
          })();

          // Default state structure - EMPTY by default
          // Users must explicitly check items they want to include
          // Items are only added to state when user interacts with checkboxes
          const getDefaultState = () => ({
            serviceTypes: {
              comp: false,
              ramp: false,
              cargo: false
            }
            // No section items by default - they are added when user checks them
          });

          // Initialize state from localStorage if available, otherwise use default
          const [checkboxStates, setCheckboxStates] = useState(() => {
            try {
              const savedStates = localStorage.getItem('sgha_annex_a_states');
              if (savedStates) {
                const parsed = JSON.parse(savedStates);
                // Ensure serviceTypes exist
                if (parsed.serviceTypes) {
                  console.log('[Annex A] Initializing from localStorage:', parsed.serviceTypes);
                  console.log('[Annex A] Loaded sections:', Object.keys(parsed).filter(k => k !== 'serviceTypes'));
                  // Use saved state directly - no merging with defaults
                  // Only items the user has checked are in the saved state
                  return {
                    serviceTypes: parsed.serviceTypes,
                    ...parsed
                  };
                }
              }
            } catch (error) {
              console.error('[Annex A] Error initializing from localStorage:', error);
            }
            // Return default state if no saved state or error
            console.log('[Annex A] Using empty default state (no items selected)');
            return getDefaultState();
          });

          // Checkbox change handlers - For 1.1, 1.2, 1.3, and 1.4 sections
          const handleServiceTypeChange = (serviceType, checked) => {
            setCheckboxStates(prev => {
              const newServiceTypes = {
                ...prev.serviceTypes,
                [serviceType]: checked
              };
              
              // Ramp and COMP are mutually exclusive
              if (serviceType === 'ramp' && checked) {
                // If Ramp is checked, uncheck COMP
                newServiceTypes.comp = false;
              } else if (serviceType === 'comp' && checked) {
                // If COMP is checked, uncheck Ramp
                newServiceTypes.ramp = false;
              }
              
              // Cargo is independent - no special handling needed
              // But ensure at least one of Ramp or COMP is always selected
              if (serviceType === 'ramp' && !checked && !newServiceTypes.comp) {
                // If unchecking Ramp and COMP is not checked, keep Ramp checked
                newServiceTypes.ramp = true;
              } else if (serviceType === 'comp' && !checked && !newServiceTypes.ramp) {
                // If unchecking COMP and Ramp is not checked, keep COMP checked
                newServiceTypes.comp = true;
              }
              
              return {
                ...prev,
                serviceTypes: newServiceTypes
              };
            });
          };

          // Note: saveCheckboxStates will be defined later, but we'll use it via ref
          const saveCheckboxStatesRef = useRef(null);
          
          // Helper function to recursively update all sub-items (for checked property)
          const updateSubItemsRecursively = (subItems, checked, clauseId = null) => {
            if (!subItems || typeof subItems !== 'object') {
              return {};
            }
            
            const updatedSubItems = {};
            Object.keys(subItems).forEach(subItemId => {
              const subItem = subItems[subItemId];
              // Ensure we preserve the structure
              const updatedSubItem = {
                ...subItem,
                    checked: checked
              };
              
              // Recursively update nested sub-items if they exist
              if (subItem.subItems && typeof subItem.subItems === 'object') {
                updatedSubItem.subItems = updateSubItemsRecursively(subItem.subItems, checked, subItemId);
              }
              
              updatedSubItems[subItemId] = updatedSubItem;
            });
            return updatedSubItems;
          };

          // Helper function to recursively update all sub-items (for ramp/comp/cargo properties)
          const updateSubItemsRecursivelyServiceType = (subItems, serviceType, checked) => {
            if (!subItems || typeof subItems !== 'object') {
              return {};
            }
            
            const updatedSubItems = {};
            Object.keys(subItems).forEach(subItemId => {
              const subItem = subItems[subItemId];
              updatedSubItems[subItemId] = {
                ...subItem,
                [serviceType]: checked,
                // Preserve other service types
                ramp: serviceType === 'ramp' ? checked : (subItem.ramp === true),
                comp: serviceType === 'comp' ? checked : (subItem.comp === true),
                cargo: serviceType === 'cargo' ? checked : (subItem.cargo === true),
                // Recursively update nested sub-items if they exist
                subItems: subItem.subItems ? updateSubItemsRecursivelyServiceType(subItem.subItems, serviceType, checked) : undefined
              };
            });
            return updatedSubItems;
          };

          // Helper function to recursively update child items stored separately in state (for parsed HTML items)
          const updateChildItemsInState = (state, sectionKey, childItemsArray, serviceType, checked) => {
            if (!childItemsArray || !Array.isArray(childItemsArray) || childItemsArray.length === 0) {
              return state;
            }
            
            const updated = { ...state };
            if (!updated[sectionKey]) {
              updated[sectionKey] = {};
            } else {
              updated[sectionKey] = { ...updated[sectionKey] };
            }
            
            childItemsArray.forEach(childItem => {
              if (childItem && childItem.id) {
                const childState = updated[sectionKey][childItem.id] || {
                  ramp: childItem.ramp === true,
                  comp: childItem.comp === true,
                  cargo: childItem.cargo === true,
                  subItems: {}
                };
                
                updated[sectionKey][childItem.id] = {
                  ...childState,
                  [serviceType]: checked,
                  // Preserve other service types
                  ramp: serviceType === 'ramp' ? checked : (childState.ramp === true),
                  comp: serviceType === 'comp' ? checked : (childState.comp === true),
                  cargo: serviceType === 'cargo' ? checked : (childState.cargo === true),
                  // Recursively update nested sub-items
                  subItems: childState.subItems ? updateSubItemsRecursivelyServiceType(childState.subItems, serviceType, checked) : {}
                };
                
                // Recursively update child items of this child
                if (childItem.subItems && Array.isArray(childItem.subItems) && childItem.subItems.length > 0) {
                  Object.assign(updated, updateChildItemsInState(updated, sectionKey, childItem.subItems, serviceType, checked));
                }
              }
            });
            
            return updated;
          };

          const handleCheckboxChange = (section, clauseId, checked, subItemsArray = null) => {
            setCheckboxStates(prev => {
              const currentItem = prev[section]?.[clauseId] || {};
              let existingSubItems = currentItem.subItems || {};
              
              // If subItemsArray is provided and sub-items don't exist yet, initialize them
              if (subItemsArray && Array.isArray(subItemsArray) && subItemsArray.length > 0) {
                if (Object.keys(existingSubItems).length === 0) {
                  existingSubItems = subItemsArray.reduce((acc, subItem, idx) => {
                    const subItemId = `${clauseId}.${String.fromCharCode(97 + idx)}`;
                    acc[subItemId] = { checked: false };
                    return acc;
                  }, {});
                }
              }
              
              const newState = {
                ...prev,
                [section]: {
                  ...(prev[section] || {}),
                  [clauseId]: {
                    ...currentItem,
                    checked: checked,
                    // Automatically update all sub-items to match parent's checked state
                    subItems: updateSubItemsRecursively(existingSubItems, checked, clauseId)
                  }
                }
              };

              // Save immediately
              setTimeout(() => {
                if (saveCheckboxStatesRef.current) {
                  saveCheckboxStatesRef.current(newState);
                }
              }, 0);

              return newState;
            });
          };

          const handleSubItemChange = (section, parentClause, subItemId, checked) => {
            setCheckboxStates(prev => {
              const newState = {
                ...prev,
                [section]: {
                  ...(prev[section] || {}),
                  [parentClause]: {
                    ...(prev[section]?.[parentClause] || {}),
                    subItems: {
                      ...(prev[section]?.[parentClause]?.subItems || {}),
                      [subItemId]: { checked: checked }
                    }
                  }
                }
              };
              
              // Save immediately
              setTimeout(() => {
                if (saveCheckboxStatesRef.current) {
                  saveCheckboxStatesRef.current(newState);
                }
              }, 0);
              
              return newState;
            });
          };

          // Use ref to track if component has mounted and loaded initial state
          const isInitialMount = useRef(true);
          const hasLoadedInitialState = useRef(false);
          const checkboxStatesRef = useRef(checkboxStates);
          const isSavingRef = useRef(false); // Prevent infinite loop
          
          // Keep ref in sync with state
          useEffect(() => {
            checkboxStatesRef.current = checkboxStates;
          }, [checkboxStates]);

          // Save checkbox states to localStorage
          const saveCheckboxStates = useCallback((statesToSave = null) => {
            if (isSavingRef.current) {
              console.log('[Annex A] Already saving, skipping...');
              return; // Prevent recursive saves
            }
            isSavingRef.current = true;
            try {
              const states = statesToSave || checkboxStatesRef.current;
              localStorage.setItem('sgha_annex_a_states', JSON.stringify(states));
              console.log('[Annex A] Checkbox states saved:', states);
              // Dispatch custom event to notify Annex B of updates (but not Annex A itself)
              window.dispatchEvent(new CustomEvent('annexAStatesUpdated'));
            } finally {
              // Reset flag after a short delay to allow state updates to complete
              setTimeout(() => {
                isSavingRef.current = false;
              }, 100);
            }
          }, []);
          
          // Store save function in ref so it can be accessed by handlers defined earlier
          saveCheckboxStatesRef.current = saveCheckboxStates;

          // Load checkbox states from localStorage
          const loadCheckboxStates = useCallback(() => {
            const savedStates = localStorage.getItem('sgha_annex_a_states');
            if (savedStates) {
              try {
                const parsed = JSON.parse(savedStates);
                // Ensure serviceTypes exist and are properly initialized
                if (!parsed.serviceTypes) {
                  // If no service types in saved state, default to none selected
                  parsed.serviceTypes = {
                    comp: false,
                    ramp: false,
                    cargo: false
                  };
                }
                // Use saved state directly - no merging with defaults
                // Only items the user has checked are in the saved state
                const loadedState = {
                  serviceTypes: parsed.serviceTypes,
                  ...parsed
                };
                setCheckboxStates(loadedState);
                console.log('[Annex A] Checkbox states loaded:', {
                  serviceTypes: loadedState.serviceTypes,
                  sections: Object.keys(loadedState).filter(k => k !== 'serviceTypes')
                });
                hasLoadedInitialState.current = true;
              } catch (error) {
                console.error('[Annex A] Error loading checkbox states:', error);
                // On error, use default state
                setCheckboxStates(getDefaultState());
                hasLoadedInitialState.current = true;
              }
            } else {
              // No saved state - use empty default
              console.log('[Annex A] No saved state, using empty default');
              setCheckboxStates(getDefaultState());
              hasLoadedInitialState.current = true;
            }
          }, []);

          // Load states on component mount
          useEffect(() => {
            loadCheckboxStates();
            isInitialMount.current = false;
            
            // Only listen for storage events (cross-tab updates)
            // Don't listen to annexAStatesUpdated event - it causes infinite loops
            // Annex B will listen to that event, but Annex A should only respond to actual storage changes
            const handleStorageChange = (e) => {
              if (e.key === 'sgha_annex_a_states' && !isSavingRef.current) {
                console.log('[Annex A] Storage changed (cross-tab), reloading states...');
                loadCheckboxStates();
              }
            };
            
            window.addEventListener('storage', handleStorageChange);
            
            return () => {
              window.removeEventListener('storage', handleStorageChange);
            };
          }, [loadCheckboxStates]);
          
          // Auto-save checkbox states whenever they change (with debounce to avoid too many saves)
          useEffect(() => {
            // Skip saving on initial mount or before initial state is loaded
            if (isInitialMount.current || !hasLoadedInitialState.current) {
              return;
            }
            
            // Skip if we're already saving (prevents infinite loops)
            if (isSavingRef.current) {
              return;
            }
            
            // Debounce saves to avoid too many localStorage writes
            const timeoutId = setTimeout(() => {
              if (!isSavingRef.current) {
                saveCheckboxStates();
              }
            }, 100); // Reduced debounce time for faster updates
            
            return () => clearTimeout(timeoutId);
          }, [checkboxStates, saveCheckboxStates]);
        
          // Fetch template data for selected year Annex A
          useEffect(() => {
            const fetchTemplateData = async () => {
              try {
                setLoadingTemplate(true);
                const url = `/sgha_template_content/get/${templateYear}/Annex A/Section Template`;
                const params = (templateName != null && String(templateName).trim() !== '')
                  ? { template_name: String(templateName).trim() }
                  : {};
                console.log('[Annex A] fetch:', url, 'params:', params);
                const response = await api.get(url, { params });
                console.log('[Annex A] response:', response.status, '| has content:', !!response.data?.data?.content);

                if (response.data?.data?.content) {
                  const content = response.data.data.content;
                  const parsedContent = typeof content === 'string' 
                    ? JSON.parse(content) 
                    : content;
                  setTemplateData(parsedContent);
                  
                  // Use the full content for parsing - don't filter it here
                  // The parseTemplateContent function will handle extracting Section 1
                  if (Array.isArray(parsedContent)) {
                    setSection1Content(parsedContent);
                  } else if (parsedContent && typeof parsedContent === 'object') {
                    // If it's an object, check if it has a section1 property or use the whole object
                    setSection1Content(parsedContent.section1 || parsedContent);
                  } else {
                    setSection1Content(parsedContent);
                  }
                }
              } catch (error) {
                console.error("Error fetching template data:", error);
                // If no template exists, we'll fall back to static content
                setSection1Content(null);
              } finally {
                setLoadingTemplate(false);
              }
            };

            fetchTemplateData();
          }, [templateYear, templateName]);

          // Fetch table row data with row_id 2 for Section 1
          useEffect(() => {
            const fetchTableRow = async () => {
              try {
                setLoadingTableRow(true);
                const response = await api.get(
                  `/annxroutes/table-row/2/Section Template`
                );

                if (response.data?.data) {
                  setTableRowData(response.data.data);
                }
              } catch (error) {
                if (error?.response?.status !== 404) {
                  console.error("Error fetching table row data:", error);
                }
                setTableRowData(null);
              } finally {
                setLoadingTableRow(false);
              }
            };

            fetchTableRow();
          }, []);

          // Helper function to get default title for a section
          const getDefaultTitle = (sectionKey) => {
            const defaults = {
              "1.1": "Representation",
              "1.2": "Administrative Functions",
              "1.3": "Supervision and/or Coordination",
              "1.4": "Station Management"
            };
            return defaults[sectionKey] || "";
          };
        
          // Helper function to parse template content into structured sections
          const parseTemplateContent = (content) => {
            if (!content) return null;
            
            // If content is an array of fields
            if (Array.isArray(content)) {
              const sections = {}; // Dynamic sections object - only create sections that exist
              
              let currentSection = null;
              let inSection1 = false; // Track if we're in Section 1 (heading "1")
              
              content.forEach((field, index) => {
                // First, check if this is the main heading "1" (Section 1)
                if (field.type === 'heading_no' && (field.value === '1' || field.value === 1)) {
                  // Check if next field is heading type with "MANAGEMENT AND ADMINISTRATIVE FUNCTIONS"
                  if (index + 1 < content.length && content[index + 1].type === 'heading') {
                    inSection1 = true;
                    // Skip these fields as they're just section markers
                    return;
                  }
                }
                
                // Check if this is a subheading field (1.1, 1.2, 1.3, 1.4) - these are the stepper items
                if (field.type === 'subheading' && inSection1) {
                  // Find the heading_no that precedes this subheading
                  let headingNo = null;
                  for (let i = index - 1; i >= 0; i--) {
                    if (content[i].type === 'heading_no') {
                      headingNo = String(content[i].value);
                      break;
                    }
                  }
                  
                  // Only create section if it matches a valid subsection number (1.1, 1.2, 1.3, 1.4)
                  if (headingNo && (headingNo === '1.1' || headingNo === '1.2' || headingNo === '1.3' || headingNo === '1.4')) {
                    currentSection = headingNo;
                    // Initialize section if it doesn't exist
                    if (!sections[headingNo]) {
                      sections[headingNo] = { 
                        title: field.value || getDefaultTitle(headingNo), 
                        fields: [] 
                      };
                    } else {
                      sections[headingNo].title = field.value || sections[headingNo].title;
                    }
                  }
                  // Don't add the subheading field itself to fields array
                  return;
                }
                
                // If we're in a section, add content fields (editor, text, etc.)
                if (currentSection && inSection1) {
                  // Skip heading_no fields that are section markers (1, 1.1, 1.2, 1.3, 1.4)
                  if (field.type === 'heading_no') {
                    const headingStr = String(field.value);
                    if (headingStr === '1' || headingStr === '1.1' || headingStr === '1.2' || 
                        headingStr === '1.3' || headingStr === '1.4') {
                      return; // Skip section marker heading_no fields
                    }
                  }
                  
                  // Add ALL content fields to the section - especially editor fields
                  // This includes editor, text, and any other content fields
                  if (field.type === 'editor' || field.type === 'text' || 
                      (field.type === 'heading_no' && field.value && String(field.value).startsWith(`${currentSection}.`))) {
                    // Ensure section exists before pushing
                    if (!sections[currentSection]) {
                      sections[currentSection] = { 
                        title: getDefaultTitle(currentSection), 
                        fields: [] 
                      };
                    }
                    sections[currentSection].fields.push(field);
                  }
                }
              });
              
              return sections;
            }
            
            // If content is an object with section keys
            if (content && typeof content === 'object' && !Array.isArray(content)) {
              // Only return sections that actually exist in the content
              const sections = {};
              const sectionKeys = ["1.1", "1.2", "1.3", "1.4"];
              sectionKeys.forEach(key => {
                if (content[key]) {
                  sections[key] = {
                    title: content[key]?.title || getDefaultTitle(key),
                    fields: content[key]?.fields || content[key] || []
                  };
                }
              });
              return Object.keys(sections).length > 0 ? sections : null;
            }
            
            return content;
          };

          // Parse section1Content into structured sections
          const parsedSections = section1Content ? parseTemplateContent(section1Content) : null;

          // Main Section 1 title from template (e.g. "MANAGEMENT AND ADMINISTRATIVE FUNCTIONS") for accordion header
          const section1MainTitle = useMemo(() => {
            if (!section1Content || !Array.isArray(section1Content)) return null;
            for (let i = 0; i < section1Content.length - 1; i++) {
              const field = section1Content[i];
              if (field.type === 'heading_no' && (field.value === '1' || field.value === 1)) {
                const next = section1Content[i + 1];
                if (next && next.type === 'heading' && next.value) {
                  return String(next.value).trim();
                }
                break;
              }
            }
            return null;
          }, [section1Content]);
          
          // Parse all sections (1-8) from templateData
          const allParsedSections = useMemo(() => {
            if (!templateData || !Array.isArray(templateData)) {
              return [];
            }
            
            const sections = [];
            let currentSection = null;
            let currentSubsection = null;
            let processedIndices = new Set();
            
            templateData.forEach((item, index) => {
              if (!item || typeof item !== 'object' || !item.type || processedIndices.has(index)) {
                return;
              }
              
              // Handle heading_no + heading pairs (main sections 1-8)
              if (item.type === 'heading_no') {
                const nextItem = templateData[index + 1];
                if (nextItem && nextItem.type === 'heading') {
                  const sectionNum = String(item.value);
                  // Only process main sections (1, 2, 3, 4, 5, 6, 7, 8)
                  if (['1', '2', '3', '4', '5', '6', '7', '8'].includes(sectionNum)) {
                    currentSection = {
                      sectionNo: sectionNum,
                      heading: nextItem.value,
                      subsections: [],
                      id: item.id || nextItem.id
                    };
                    sections.push(currentSection);
                    currentSubsection = null;
                    processedIndices.add(index);
                    processedIndices.add(index + 1);
                  }
                  return;
                }
              }
              
              // Handle subheading_no + subheading pairs (subsections like 1.1, 1.2, etc.)
              if (item.type === 'subheading_no' && currentSection) {
                const nextItem = templateData[index + 1];
                if (nextItem && nextItem.type === 'subheading') {
                  currentSubsection = {
                    subheadingNo: item.value,
                    subheading: nextItem.value,
                    editor: null,
                    id: item.id || nextItem.id
                  };
                  currentSection.subsections.push(currentSubsection);
                  processedIndices.add(index);
                  processedIndices.add(index + 1);
                  return;
                }
              }
              
              // Also handle heading_no with decimal values (like 2.1) + subheading pairs
              if (item.type === 'heading_no' && currentSection) {
                const sectionNum = String(item.value);
                // Check if this is a subsection number (contains a decimal point)
                if (sectionNum.includes('.')) {
                  const nextItem = templateData[index + 1];
                  if (nextItem && nextItem.type === 'subheading') {
                    currentSubsection = {
                      subheadingNo: item.value,
                      subheading: nextItem.value,
                      editor: null,
                      id: item.id || nextItem.id
                    };
                    currentSection.subsections.push(currentSubsection);
                    processedIndices.add(index);
                    processedIndices.add(index + 1);
                    return;
                  }
                }
              }
              
              // Handle editor content - attach to current subsection
              if (item.type === 'editor' && currentSection) {
                if (currentSubsection) {
                  currentSubsection.editor = {
                    value: item.value,
                    checkboxConfig: item.checkboxConfig || {},
                    commentConfig: item.commentConfig || {}
                  };
                } else if (currentSection.subsections.length > 0) {
                  // Attach to last subsection if no current subsection
                  const lastSubsection = currentSection.subsections[currentSection.subsections.length - 1];
                  if (lastSubsection) {
                    lastSubsection.editor = {
                      value: item.value,
                      checkboxConfig: item.checkboxConfig || {},
                      commentConfig: item.commentConfig || {}
                    };
                  }
                }
                processedIndices.add(index);
              }
            });
            
            // Debug: Log parsed sections
            console.log('All parsed sections:', sections);
            console.log(`Found ${sections.length} sections:`, sections.map(s => `Section ${s.sectionNo}: ${s.heading} (${s.subsections.length} subsections)`));
            
            return sections;
          }, [templateData]);
          
          // Debug: Log when templateData changes
          useEffect(() => {
            console.log('Template data updated:', templateData);
            console.log('Number of items in templateData:', templateData?.length);
          }, [templateData]);
          
          // State to track active index for each section
          const [sectionActiveIndices, setSectionActiveIndices] = useState({});
          
          // Helper function to get/set active index for a specific section
          const getSectionActiveIndex = (sectionNo) => sectionActiveIndices[sectionNo] || 0;
          const setSectionActiveIndex = (sectionNo, index) => {
            setSectionActiveIndices(prev => ({ ...prev, [sectionNo]: index }));
          };
          
          // Helper function to render a dynamic section from parsed data
          const renderDynamicSection = (section) => {
            if (!section || !section.subsections || section.subsections.length === 0) {
              return null;
            }
            
            const sectionActiveIdx = getSectionActiveIndex(section.sectionNo);
            
            // Create steps model from subsections
            const sectionSteps = section.subsections.map((sub, idx) => ({
              id: sub.id || `step-${section.sectionNo}-${idx}`,
              label: sub.subheadingNo && sub.subheadingNo.trim() !== '' 
                ? `${sub.subheadingNo} ${sub.subheading}` 
                : sub.subheading || `Subsection ${idx + 1}`
            }));
            
            // Determine section status (checkmark or X)
            const hasContent = section.subsections.some(sub => 
              sub.editor && sub.editor.value && sub.editor.value.trim() !== '' && sub.editor.value !== '<p><br></p>'
            );
            const statusIcon = hasContent ? 'pi-check' : 'pi-times';
            
            const handleSectionPrev = () => {
              if (sectionActiveIdx > 0) {
                setSectionActiveIndex(section.sectionNo, sectionActiveIdx - 1);
                setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 10);
              }
            };
            
            const handleSectionNext = () => {
              if (sectionActiveIdx < sectionSteps.length - 1) {
                setSectionActiveIndex(section.sectionNo, sectionActiveIdx + 1);
                setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 10);
              }
            };
            
            return (
              <AccordionTab 
                key={`section-${section.sectionNo}`}
                header={
                  <div className="d-flex justify-content-between align-items-center">
                    <span>SECTION {section.sectionNo}. {section.heading}</span>
                    <span><i className={`pi ${statusIcon}`}></i></span>
                  </div>
                }
              >
                <Card className="h-auto border-0 shadow-0">
                  <Card.Body>
                    <div className="vertical-stepper-container">
                      <Steps
                        model={sectionSteps}
                        activeIndex={sectionActiveIdx}
                        onSelect={(e) => setSectionActiveIndex(section.sectionNo, e.index)}
                        readOnly={false}
                        orientation="vertical"
                      />
                    </div>
                    <div className="vertical-stepper-content" style={{ flex: 1, marginLeft: "20px" }}>
                      {section.subsections.map((subsection, subIdx) => (
                        sectionActiveIdx === subIdx && (
                          <div key={subsection.id || `sub-${subIdx}`} className="step-content-box mt-0">
                            {subsection.subheadingNo && subsection.subheadingNo.trim() !== '' ? (
                              <h6><span className="num">{subsection.subheadingNo}</span> {subsection.subheading}</h6>
                            ) : (
                              <h6>{subsection.subheading || `Subsection ${subIdx + 1}`}</h6>
                            )}
                            {subsection.editor && subsection.editor.value && (
                              <div className="editor-content mt-3">
                                {parseEditorContent(
                                  subsection.editor.value,
                                  subsection.subheadingNo || `${section.sectionNo}.${subIdx + 1}`,
                                  0,
                                  subsection.editor.checkboxConfig || {}
                                )}
                              </div>
                            )}
                          </div>
                        )
                      ))}
                    </div>
                  </Card.Body>
                  <Card.Footer className="d-flex justify-content-between bg-white border-0 shadow-0">
                    <div className="w-75 d-flex gap-2">
                      <Button 
                        variant="outline-success" 
                        onClick={saveCheckboxStates}
                        label="Save States"
                        className="py-1"
                        outlined
                        severity="success"
                        icon="pi pi-save"
                      />
                    </div>
                    <div>
                      <Button
                        icon="pi pi-chevron-left"
                        tooltip="Prv"
                        severity="warning"
                        className="py-1 me-2"
                        iconPos="left"
                        onClick={handleSectionPrev}
                        disabled={sectionActiveIdx === 0}
                      />
                      <Button
                        icon="pi pi-chevron-right"
                        severity="warning"
                        tooltip="Next"
                        className="py-1"
                        iconPos="right"
                        onClick={handleSectionNext}
                        disabled={sectionActiveIdx === sectionSteps.length - 1}
                      />
                    </div>
                  </Card.Footer>
                </Card>
              </AccordionTab>
            );
          };
          
          // Debug: Log parsed sections to see what we're getting
          useEffect(() => {
            console.log("=== Section 1 Content Debug ===");
            console.log("section1Content:", section1Content);
            if (parsedSections) {
              console.log("Parsed sections keys:", Object.keys(parsedSections));
              console.log("Parsed sections:", parsedSections);
              if (parsedSections["1.1"]) {
                console.log("Section 1.1 fields:", parsedSections["1.1"].fields);
                parsedSections["1.1"].fields?.forEach((field, idx) => {
                  console.log(`Field ${idx}:`, field.type, field.value ? "has value" : "no value");
                });
              }
            } else {
              console.log("No parsed sections found");
            }
          }, [parsedSections, section1Content]);

          // Helper function to render a clause/item from template data
          const renderClause = (field, sectionKey, clauseIndex, allFields = []) => {
            // Handle editor type fields - these contain the clauses with checkboxValue
            if (field.type === 'editor' && field.checkboxValue && Array.isArray(field.checkboxValue) && field.checkboxValue.length > 0) {
              // Render all clauses from checkboxValue array
              return field.checkboxValue.map((item, itemIndex) => {
                const clauseId = item.number || item.code || `${sectionKey}.${clauseIndex}.${itemIndex + 1}`;
                const clauseText = typeof item === 'string' ? item : (item.label || item.value || item.text || '');
                const hasSubItems = item.subItems && Array.isArray(item.subItems) && item.subItems.length > 0;
                
                // Initialize checkbox state
                const currentState = checkboxStates[sectionKey]?.[clauseId] || { 
                  checked: false, 
                  subItems: hasSubItems ? item.subItems.reduce((acc, subItem, idx) => {
                    const subItemId = `${clauseId}.${String.fromCharCode(97 + idx)}`;
                    acc[subItemId] = { checked: false };
                    return acc;
                  }, {}) : {}
                };
                
                if (hasSubItems) {
                  return (
                    <li key={clauseId} className="clause d-flex align-items-start gap-2">
                      <Checkbox 
                        inputId={`clause-${clauseId}`}
                        checked={currentState.checked}
                        onChange={(e) => handleCheckboxChange(sectionKey, clauseId, e.checked, item.subItems)}
                      />
                      <div>
                        <span className="num">{clauseId}</span>
                        <ol className="sub alpha">
                          {item.subItems.map((subItem, subIdx) => {
                            const subItemId = `${clauseId}.${String.fromCharCode(97 + subIdx)}`;
                            const subItemText = typeof subItem === 'string' ? subItem : (subItem.label || subItem.value || subItem.text || '');
                            return (
                              <li key={subItemId} className="d-flex align-items-start gap-2">
                                <Checkbox 
                                  inputId={`clause-${subItemId}`}
                                  checked={currentState.subItems[subItemId]?.checked || false}
                                  onChange={(e) => handleSubItemChange(sectionKey, clauseId, subItemId, e.checked)}
                                />
                                <span>
                                  <span className="num">{String.fromCharCode(97 + subIdx)})</span> {subItemText}
                                </span>
                              </li>
                            );
                          })}
                        </ol>
                      </div>
                    </li>
                  );
                } else {
                  return (
                    <li key={clauseId} className="clause d-flex align-items-center gap-2">
                      <Checkbox 
                        inputId={`clause-${clauseId}`}
                        checked={currentState.checked}
                        onChange={(e) => handleCheckboxChange(sectionKey, clauseId, e.checked, null)}
                      />
                      <span>
                        <span className="num">{clauseId}</span> {clauseText}
                      </span>
                    </li>
                  );
                }
              });
            }
            
            // Extract clause ID from various possible field names
            const clauseId = (field.type === 'heading_no' ? field.value : '') ||
                            field.heading_no || 
                            field.headingNo || 
                            field.number || 
                            field.code ||
                            `${sectionKey}.${clauseIndex}`;
            
            // For heading_no fields, the text is usually in the next field
            let clauseText = '';
            if (field.type === 'heading_no') {
              // Look for the next text field after this heading_no
              const currentIndex = allFields.indexOf(field);
              if (currentIndex >= 0 && currentIndex + 1 < allFields.length) {
                const nextField = allFields[currentIndex + 1];
                if (nextField.type === 'text' || nextField.type === 'subheading') {
                  clauseText = nextField.value || nextField.label || '';
                }
              }
            } else {
              // Extract clause text from various possible field names
              clauseText = field.value || 
                          field.label || 
                          field.body || 
                          field.text ||
                          field.content ||
                          '';
            }
            
            // Check for sub-items in various possible structures
            const hasSubItems = (field.checkboxValue && Array.isArray(field.checkboxValue) && field.checkboxValue.length > 0) ||
                               (field.subItems && Array.isArray(field.subItems) && field.subItems.length > 0) ||
                               (field.children && Array.isArray(field.children) && field.children.length > 0);
            
            const subItemsArray = field.checkboxValue || field.subItems || field.children || [];
            
            // Get current state or use default
            const currentState = checkboxStates[sectionKey]?.[clauseId] || { 
              checked: false, 
              subItems: hasSubItems ? subItemsArray.reduce((acc, item, idx) => {
                const subItemId = `${clauseId}.${String.fromCharCode(97 + idx)}`; // a, b, c, etc.
                acc[subItemId] = { checked: false };
                return acc;
              }, {}) : {}
            };

            if (hasSubItems) {
              return (
                <li key={clauseId} className="clause d-flex align-items-start gap-2">
                  <Checkbox 
                    inputId={`clause-${clauseId}`}
                    checked={currentState.checked}
                    onChange={(e) => handleCheckboxChange(sectionKey, clauseId, e.checked, subItemsArray)}
                  />
                  <div>
                    <span className="num">{clauseId}</span>
                    <ol className="sub alpha">
                      {subItemsArray.map((subItem, subIdx) => {
                        const subItemId = `${clauseId}.${String.fromCharCode(97 + subIdx)}`;
                        const subItemText = typeof subItem === 'string' ? subItem : (subItem.label || subItem.value || subItem.text || subItem.body || '');
                        return (
                          <li key={subItemId} className="d-flex align-items-start gap-2">
                            <Checkbox 
                              inputId={`clause-${subItemId}`}
                              checked={currentState.subItems[subItemId]?.checked || false}
                              onChange={(e) => handleSubItemChange(sectionKey, clauseId, subItemId, e.checked)}
                            />
                            <span>
                              <span className="num">{String.fromCharCode(97 + subIdx)})</span> {subItemText}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                </li>
              );
            } else {
              return (
                <li key={clauseId} className="clause d-flex align-items-center gap-2">
                  <Checkbox 
                    inputId={`clause-${clauseId}`}
                    checked={currentState.checked}
                    onChange={(e) => handleCheckboxChange(sectionKey, clauseId, e.checked, null)}
                  />
                  <span>
                    <span className="num">{clauseId}</span> {clauseText}
                  </span>
                </li>
              );
            }
          };

          // Helper function to parse HTML and convert list items to checkboxes
          const parseEditorContent = (htmlContent, sectionKey, fieldIndex, checkboxConfig = {}) => {
            if (!htmlContent) return null;
            
            // Create a temporary DOM element to parse HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = DOMPurify.sanitize(htmlContent);
            
            // Find all lists in the content
            const allLists = Array.from(tempDiv.querySelectorAll('ol, ul'));
            
            // Identify top-level lists (lists that are not nested inside another list)
            const topLevelLists = allLists.filter(list => {
              let parent = list.parentElement;
              while (parent && parent !== tempDiv) {
                if (parent.tagName === 'OL' || parent.tagName === 'UL') {
                  return false; // This list is nested inside another list
                }
                parent = parent.parentElement;
              }
              return true; // This is a top-level list
            });
            
            let globalItemCounter = 1;
            let topLevelIndex = 0;
            
            // Recursive function to convert list items to React components
            const convertListItems = (listElement, parentIndexPath = [], isTopLevelList = false) => {
              if (!listElement || (listElement.tagName !== 'OL' && listElement.tagName !== 'UL')) {
                return null;
              }
              
              const items = [];
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
                  const cleanText = textContent.trim();
                  
                  // Generate hierarchical index (e.g., "1", "1.1", "1.2", "2", etc.)
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
                  
                  // Generate item ID with section + field index to ensure correct mapping when section has multiple editors
                  // Format: sectionKey:f{fieldIndex}:item-N (e.g., "3.1:f0:item-1") so types (COMP/Ramp/Cargo) map to same item
                  const itemId = `${sectionKey}:f${fieldIndex}:item-${globalItemCounter}`;
                  globalItemCounter++;
                  const legacyItemId = itemId.replace(/:f\d+:/, ':'); // backward compat: "3.1:item-1"
                  // Admin Setup Checkboxes uses keys "item-1", "item-2", ... (no section prefix)
                  const shortItemId = itemId.includes('item-') ? itemId.substring(itemId.lastIndexOf('item-')) : null;
                  const itemCheckboxConfig = checkboxConfig[itemId] || checkboxConfig[legacyItemId] || (shortItemId ? checkboxConfig[shortItemId] : null) || {
                    ramp: false,
                    comp: false,
                    cargo: false
                  };
                  
                  // Get or initialize checkbox state (try new key then legacy for migration)
                  const savedState = checkboxStates[sectionKey]?.[itemId] || checkboxStates[sectionKey]?.[legacyItemId];
                  const currentState = savedState || {
                    ramp: itemCheckboxConfig.ramp === true,
                    comp: itemCheckboxConfig.comp === true,
                    cargo: itemCheckboxConfig.cargo === true,
                    subItems: {}
                  };
                
                  // Process nested lists - these should be sub-items of this item
                  let subItems = null;
                  
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
                  const nestedLists = nestedListsDirect.length > 0 
                    ? nestedListsDirect 
                    : (nextSiblingList ? [nextSiblingList] : []);
                  
                  if (nestedLists.length > 0) {
                    // Process each nested list found within this <li>
                    const allSubItems = [];
                    nestedLists.forEach((nestedList) => {
                      // Recursively process the nested list
                      const nestedItems = convertListItems(nestedList, currentIndexPath, false);
                      if (nestedItems && nestedItems.length > 0) {
                        // Add all items from this nested list as sub-items
                        allSubItems.push(...nestedItems);
                      }
                    });
                    if (allSubItems.length > 0) {
                      subItems = allSubItems;
                    }
                  }
                  
                  // Only add this item if it has text OR sub-items
                  // This prevents adding empty items
                  if (cleanText || subItems) {
                    const itemData = {
                      id: itemId,
                      index: hierarchicalIndex,
                      text: cleanText,
                      ramp: currentState.ramp === true,
                      comp: currentState.comp === true,
                      cargo: currentState.cargo === true,
                      subItems: subItems, // This will be null if no nested lists, or an array if nested lists exist
                      level: parentIndexPath.length
                    };
                    items.push(itemData);
                  }
                }
                // If it's a list (OL/UL) that's not a child of an LI, it's likely a sibling
                // This case is handled above when we check for nextSiblingList
              }
              
              return items;
            };
            
            // Process each top-level list sequentially to maintain continuous numbering
            const allParsedItems = [];
            topLevelLists.forEach(list => {
              const items = convertListItems(list, [], true);
              if (items && items.length > 0) {
                allParsedItems.push(...items);
              }
            });
            
            if (allParsedItems.length === 0) {
              // If no list, return the sanitized HTML as is
              return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent) }} />;
            }
            
            // Get selected service types from top header
            const selectedServiceTypes = checkboxStates.serviceTypes || {
              comp: false,
              ramp: false,
              cargo: false
            };
            
            // Render items with checkboxes
            const renderItems = (items, level = 0, parentId = null) => {
              if (!items || items.length === 0) {
                return null;
              }
              
              const listClass = level === 0 ? 'clauses' : level === 1 ? 'sub alpha' : 'sub decimal';
              
              return (
                <ol key={`list-${level}-${parentId || 'root'}`} className={listClass}>
                  {items.map((item) => {
                    // Get current checkbox state (try new key then legacy for migration)
                    const legacyId = item.id.replace(/:f\d+:/, ':');
                    const currentState = checkboxStates[sectionKey]?.[item.id] || checkboxStates[sectionKey]?.[legacyId] || {
                      ramp: item.ramp === true,
                      comp: item.comp === true,
                      cargo: item.cargo === true,
                      subItems: {}
                    };
                    
                    // Determine which checkboxes to show based on top header selection
                    const showRamp = selectedServiceTypes.ramp;
                    const showComp = selectedServiceTypes.comp;
                    const showCargo = selectedServiceTypes.cargo;
                    const onlyRamp = showRamp && !showComp && !showCargo;
                    const onlyComp = showComp && !showRamp && !showCargo;
                    const onlyCargo = showCargo && !showRamp && !showComp;
                    // Legacy: when only one type selected, fall back to .checked if per-type state missing
                    const rampChecked = currentState.ramp === true || (onlyRamp && currentState.checked === true);
                    const compChecked = currentState.comp === true || (onlyComp && currentState.checked === true);
                    const cargoChecked = currentState.cargo === true || (onlyCargo && currentState.checked === true);
                    
                    // Count how many checkboxes will be shown
                    const checkboxCount = [showRamp, showComp, showCargo].filter(Boolean).length;
                    
                    return (
                      <li key={item.id} className={level === 0 ? "clause d-flex align-items-start gap-2" : "d-flex align-items-start gap-2"}>
                        <div style={{ display: 'flex', gap: '8px', marginRight: '8px', flexDirection: 'column', alignItems: 'center', minWidth: checkboxCount > 0 ? '40px' : '0px' }}>
                          {showRamp && (
                            <Checkbox
                              inputId={`${item.id}-ramp`}
                              checked={rampChecked}
                              onChange={(e) => {
                                setCheckboxStates(prev => {
                                  const legacyId = item.id.replace(/:f\d+:/, ':');
                                  const currentItemState = prev[sectionKey]?.[item.id] || prev[sectionKey]?.[legacyId] || {};
                                  const existingSubItems = currentItemState.subItems || {};
                                  let updated = {
                                    ...prev,
                                    [sectionKey]: {
                                      ...prev[sectionKey] || {},
                                      [item.id]: {
                                        ...currentItemState,
                                        ramp: e.checked,
                                        comp: currentItemState.comp === true,
                                        cargo: currentItemState.cargo === true,
                                        // Automatically update all sub-items to match parent's ramp state
                                        subItems: updateSubItemsRecursivelyServiceType(existingSubItems, 'ramp', e.checked)
                                      }
                                    }
                                  };
                                  
                                  // Also update child items stored separately (for parsed HTML items)
                                  if (item.subItems && Array.isArray(item.subItems) && item.subItems.length > 0) {
                                    updated = updateChildItemsInState(updated, sectionKey, item.subItems, 'ramp', e.checked);
                                  }
                                  
                                  setTimeout(() => {
                                    saveCheckboxStates(updated);
                                  }, 0);
                                  return updated;
                                });
                              }}
                            />
                          )}
                          {showComp && (
                            <Checkbox
                              inputId={`${item.id}-comp`}
                              checked={compChecked}
                              onChange={(e) => {
                                setCheckboxStates(prev => {
                                  const legacyId = item.id.replace(/:f\d+:/, ':');
                                  const currentItemState = prev[sectionKey]?.[item.id] || prev[sectionKey]?.[legacyId] || {};
                                  const existingSubItems = currentItemState.subItems || {};
                                  let updated = {
                                    ...prev,
                                    [sectionKey]: {
                                      ...prev[sectionKey] || {},
                                      [item.id]: {
                                        ...currentItemState,
                                        ramp: currentItemState.ramp === true,
                                        comp: e.checked,
                                        cargo: currentItemState.cargo === true,
                                        // Automatically update all sub-items to match parent's comp state
                                        subItems: updateSubItemsRecursivelyServiceType(existingSubItems, 'comp', e.checked)
                                      }
                                    }
                                  };
                                  
                                  // Also update child items stored separately (for parsed HTML items)
                                  if (item.subItems && Array.isArray(item.subItems) && item.subItems.length > 0) {
                                    updated = updateChildItemsInState(updated, sectionKey, item.subItems, 'comp', e.checked);
                                  }
                                  
                                  setTimeout(() => {
                                    saveCheckboxStates(updated);
                                  }, 0);
                                  return updated;
                                });
                              }}
                            />
                          )}
                          {showCargo && (
                            <Checkbox
                              inputId={`${item.id}-cargo`}
                              checked={cargoChecked}
                              onChange={(e) => {
                                setCheckboxStates(prev => {
                                  const legacyId = item.id.replace(/:f\d+:/, ':');
                                  const currentItemState = prev[sectionKey]?.[item.id] || prev[sectionKey]?.[legacyId] || {};
                                  const existingSubItems = currentItemState.subItems || {};
                                  let updated = {
                                    ...prev,
                                    [sectionKey]: {
                                      ...prev[sectionKey] || {},
                                      [item.id]: {
                                        ...currentItemState,
                                        ramp: currentItemState.ramp === true,
                                        comp: currentItemState.comp === true,
                                        cargo: e.checked,
                                        // Automatically update all sub-items to match parent's cargo state
                                        subItems: updateSubItemsRecursivelyServiceType(existingSubItems, 'cargo', e.checked)
                                      }
                                    }
                                  };
                                  
                                  // Also update child items stored separately (for parsed HTML items)
                                  if (item.subItems && Array.isArray(item.subItems) && item.subItems.length > 0) {
                                    updated = updateChildItemsInState(updated, sectionKey, item.subItems, 'cargo', e.checked);
                                  }
                                  
                                  setTimeout(() => {
                                    saveCheckboxStates(updated);
                                  }, 0);
                                  return updated;
                                });
                              }}
                            />
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <span>
                            <span className="num">{item.index}</span> {item.text}
                          </span>
                          {(() => {
                            if (item.subItems && item.subItems.length > 0) {
                              return (
                                <div style={{ marginTop: '8px' }}>
                                  {renderItems(item.subItems, level + 1, item.id)}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              );
            };
            
            return renderItems(allParsedItems, 0, null);
          };

          // Helper function to render a section dynamically
          const renderSection = (sectionKey, defaultTitle) => {
            if (!parsedSections || !parsedSections[sectionKey]) {
              console.log(`[renderSection] Section ${sectionKey} not found in parsedSections`);
              return null; // Return null to fall back to static content
            }

            const section = parsedSections[sectionKey];
            const sectionTitle = section.title || defaultTitle;
            const sectionFields = section.fields || (Array.isArray(section) ? section : []);
            
            console.log(`[renderSection] Rendering section ${sectionKey} with ${sectionFields.length} fields`);
            sectionFields.forEach((field, idx) => {
              console.log(`[renderSection] Field ${idx}: type=${field.type}, hasValue=${!!field.value}`);
            });
            
            // Always render the section header and content, even if fields are empty
            const renderedFields = sectionFields.map((field, index) => {
              // Render editor fields with parsed HTML and checkboxes
              if (field.type === 'editor' && field.value) {
                console.log(`[renderSection] Rendering editor field ${index} with value length: ${field.value.length}`);
                return (
                  <div key={`editor-${index}`}>
                    {parseEditorContent(field.value, sectionKey, index, field.checkboxConfig || {})}
                  </div>
                );
              }
              // Render other field types using existing logic
              if (field.type === 'heading_no') {
                return renderClause(field, sectionKey, index, sectionFields);
              }
              if (field.type === 'text' && (!index || sectionFields[index - 1]?.type !== 'heading_no')) {
                return renderClause(field, sectionKey, index, sectionFields);
              }
              return null;
            }).filter(Boolean);
            
            console.log(`[renderSection] Rendered ${renderedFields.length} fields for section ${sectionKey}`);
            
            return (
              <div className="step-content-box mt-0">
                <h6><span className="num">{sectionKey}</span> {sectionTitle}</h6>
                {renderedFields.length > 0 ? renderedFields : (
                  <p>No content available for this section.</p>
                )}
              </div>
            );
          };

          // Dynamic Steps - Only show sections that exist in the template data
          const getSteps = () => {
            // Only use parsed sections if they exist AND have at least one section
            if (parsedSections && typeof parsedSections === 'object' && Object.keys(parsedSections).length > 0) {
              const sectionKeys = Object.keys(parsedSections).sort();
              console.log("Creating steps from parsed sections:", sectionKeys);
              // Use parsed sections if they exist
              return sectionKeys.map(sectionKey => ({
                label: parsedSections[sectionKey]?.title 
                  ? `${sectionKey} ${parsedSections[sectionKey].title}` 
                  : `${sectionKey} ${getDefaultTitle(sectionKey)}`
              }));
            }
            // Only show fallback if we're still loading or truly have no data
            // But we should check if we have section1Content that just needs parsing
            if (loadingTemplate) {
              // Show default while loading
              return [
                { label: "1.1 Representation" },
                { label: "1.2 Administrative Functions" },
                { label: "1.3 Supervision and/or Coordination" },
                { label: "1.4 Station Management" }
              ];
            }
            // If we have section1Content but no parsed sections, try to parse it again
            if (section1Content && Array.isArray(section1Content)) {
              // Extract section numbers directly from the content
              const foundSections = [];
              section1Content.forEach((field, index) => {
                if (field.type === 'heading_no' && field.value) {
                  const value = String(field.value);
                  if (value === '1.1' || value === '1.2' || value === '1.3' || value === '1.4') {
                    // Find the next subheading for the title
                    let title = getDefaultTitle(value);
                    for (let i = index + 1; i < section1Content.length && i < index + 3; i++) {
                      if (section1Content[i].type === 'subheading') {
                        title = section1Content[i].value || title;
                        break;
                      }
                    }
                    if (!foundSections.find(s => s.key === value)) {
                      foundSections.push({ key: value, title });
                    }
                  }
                }
              });
              
              if (foundSections.length > 0) {
                console.log("Found sections directly from content:", foundSections);
                return foundSections.sort((a, b) => a.key.localeCompare(b.key)).map(s => ({
                  label: `${s.key} ${s.title}`
                }));
              }
            }
            // Final fallback - but this should rarely happen
            console.log("Using fallback steps");
            return [
              { label: "1.1 Representation" },
              { label: "1.2 Administrative Functions" },
              { label: "1.3 Supervision and/or Coordination" },
              { label: "1.4 Station Management" }
            ];
          };
          
          const steps = getSteps();
        
          // Card navigation
          const nextCard = () => {
            if (currentCardIndex < 2) {
              setCurrentCardIndex((prev) => prev + 1);
            }
          };
        
          const prevCard = () => {
            if (currentCardIndex > 0) {
              setCurrentCardIndex((prev) => prev - 1);
            }
          };
        
          // Stepper navigation
          const nextStep = () => {
            if (activeIndex < steps.length - 1) {
              setActiveIndex((prev) => prev + 1);
            }
          };
        
          const prevStep = () => {
            if (activeIndex > 0) {
              setActiveIndex((prev) => prev - 1);
            }
        };

    /*---------------For Last Step---------------*/
        const stepsRef = useRef(null);
          const items = [
            { label: "Handling Services & Charges", command: () => setActiveIndex(0) },
            { label: "Additional Services & Charges", command: () => setActiveIndex(1) },
            { label: "Disbursements", command: () => setActiveIndex(2) },
            { label: "Training", command: () => setActiveIndex(3) },
            { label: "Limit of Liability", command: () => setActiveIndex(4) },
            { label: "Transfer of Services", command: () => setActiveIndex(5) },
            { label: "Payment", command: () => setActiveIndex(6) },
            { label: "Supervision & Administration", command: () => setActiveIndex(7) },
            { label: "Use of Yllow Pages", command: () => setActiveIndex(8) },
            { label: "Duration, Modification & Termination", command: () => setActiveIndex(9) },
            { label: "Notification", command: () => setActiveIndex(10) },
            { label: "Governing Law", command: () => setActiveIndex(11) },
          ];
        
          // Auto scroll active step into view
          useEffect(() => {
            const activeStep = stepsRef.current?.querySelector(".p-steps-item.p-highlight");
            if (activeStep) {
              activeStep.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                inline: "center",
              });
            }
          }, [activeIndex]);
        
          const handleNext = () => {
            if (activeIndex < items.length - 1) {
              setActiveIndex((prev) => prev + 1);
            } else {
              alert("🎉 Finished all steps!");
            }
        };

        /*--------------show hide comment box-------------*/
            
        const [showInput, setShowInput] = useState(false);
            const [comment, setComment] = useState("");
        
            const handleAddClick = () => {
            setShowInput(true);
            };
        
            const handleCancel = () => {
            setShowInput(false);
            setComment(""); // clear input
            };
        
            const handleSend = () => {
            console.log("Comment submitted:", comment);
            setComment("");
            setShowInput(false);
        };

     return (
        <>
            <div className='d-flex justify-content-center align-items-center flex-column gap-2 mb-2 p-3 sticky-top' style={{background:'#f6e9f7', borderRadius:'10px'}}>
                <h6>IATA Standard Ground Handling Agreement ANNEX A</h6>
                <div className="d-flex gap-4">
                    <div className="d-flex align-items-center">
                    <Checkbox 
                        inputId="ingredient1" 
                        name="servic" 
                        value="Comp" 
                        checked={checkboxStates.serviceTypes.comp}
                        onChange={(e) => handleServiceTypeChange('comp', e.checked)}
                    />
                    <label htmlFor="ingredient1" className="ms-2"><b>COMP</b></label>
                    </div>

                    <div className="d-flex align-items-center">
                    <Checkbox 
                        inputId="ingredient2" 
                        name="servic" 
                        value="Ramp" 
                        checked={checkboxStates.serviceTypes.ramp}
                        onChange={(e) => handleServiceTypeChange('ramp', e.checked)}
                    />
                    <label htmlFor="ingredient2" className="ms-2"><b>Ramp</b></label>
                    </div>

                    <div className="d-flex align-items-center">
                    <Checkbox 
                        inputId="ingredient3" 
                        name="servic" 
                        value="Cargo" 
                        checked={checkboxStates.serviceTypes.cargo}
                        onChange={(e) => handleServiceTypeChange('cargo', e.checked)}
                    />
                    <label htmlFor="ingredient3" className="ms-2"><b>Cargo</b></label>
                    </div>
                </div>
            </div>

            <div className="annex-a comSty">
                <Accordion activeIndex={0}>
                    <AccordionTab header="Ground Handling Services">
                        <Table className="table" borderless>
                        <tbody>
                        <tr>
                            <td>
                            <h6>Ground Handling Services</h6>
                            <span>to the Standard Ground Handling Agreement (SGHA) of January 2023</span>
                            </td>
                        </tr>
                        <tr>
                            <td className="d-flex gap-2">
                            <span className="d-block">between: </span>
                            <b className="mb-0">Malindo Airways SDN BHD</b>
                            </td>
                        </tr>
                        <tr>
                            <td className="d-flex gap-2">
                            <span className="d-block">having its principal office at:</span>
                            <b className="mb-0"></b>
                            </td>
                        </tr>
                        <tr>
                            <td className="d-flex gap-2">
                            <span className="d-block">having its principal office at·</span>
                            <b className="mb-0">Petaling Jaya, Malaysia</b>
                            </td>
                        </tr>
                        <tr>
                            <td>hereinafter referred to as the 'Carrier'</td>
                            <td><b className="mb-0"></b></td>
                        </tr>
                        <tr>
                            <td className="d-flex gap-2">
                            <span className="d-block">and:</span>
                            <b className="mb-0">INDOTHAI KOLKATA PRIVATE LIMITED</b>
                            </td>
                        </tr>
                        <tr>
                            <td className="d-flex gap-2">
                            <span className="d-block">having its principal office at·</span>
                            <b className="mb-0">Kolkata, IN</b>
                            </td>
                        </tr>
                        <tr>
                            <td>the Carrier and/or the Handling Company may hereinafter be referred to as the "Party(ies)" effective from:</td>
                        </tr>

                        <tr>
                            <td className="d-flex gap-2">
                            <span className="d-block">This Annex BX.X for </span>
                            <b className="mb-0"></b>
                            </td>
                        </tr>
                        <tr>
                            <td className="d-flex gap-2">
                            <span className="d-block">the location(s) :</span>
                            <b className="mb-0"></b>
                            </td>
                        </tr>
                        <tr>
                            <td className="d-flex gap-2">
                            <span className="d-block">is valid from:</span>
                            <b className="mb-0"></b>
                            </td>
                        </tr>
                        <tr>
                            <td className="d-flex gap-2">
                            <span className="d-block">and replaces : </span>
                            <b className="mb-0"></b>
                            </td>
                        </tr>
                        </tbody>
                    </Table>
                    </AccordionTab>
                    <AccordionTab 
                        header={
                        <div className="d-flex justify-content-between align-items-center">
                            <span>SECTION 1. {section1MainTitle || 'MANAGEMENT AND ADMINISTRATIVE FUNCTIONS'}</span>
                            <span><i className="pi pi-check"></i></span>
                        </div>
                        }
                    >
                        <Card className="h-auto border-0 shadow-0">
                        <Card.Body>
                            <div className="vertical-stepper-container">
                                <Steps
                                    model={steps}
                                    activeIndex={activeIndex}
                                    onSelect={(e) => setActiveIndex(e.index)}
                                    readOnly={false}
                                    orientation="vertical"
                                />
                                
                            </div> 

                                {/* Stepper Content */}

                            <div className="vertical-stepper-content" style={{ flex: 1, marginLeft: "20px" }}>

                                {/* Step 1 Content */}
                                {activeIndex === 0 && (
                                <>
                                    {/* Display table row data if available */}
                                    {tableRowData && (
                                        <div className="step-content-box mt-0 mb-3" style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
                                            <h6 className="mb-3">Template Table Row Data (ID: {tableRowData.row_id})</h6>
                                            <Table striped bordered hover responsive>
                                                <thead>
                                                    <tr>
                                                        <th>Section</th>
                                                        <th>Description</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td>{tableRowData.section || 'N/A'}</td>
                                                        <td>{tableRowData.description || 'N/A'}</td>
                                                    </tr>
                                                </tbody>
                                            </Table>
                                        </div>
                                    )}
                                    {loadingTableRow && (
                                        <div className="step-content-box mt-0 mb-3">
                                            <p>Loading table row data...</p>
                                        </div>
                                    )}
                                    {/* Always try to render dynamic content first if available */}
                                    {(() => {
                                      // Check if we have parsed sections with content
                                      if (parsedSections && parsedSections["1.1"]) {
                                        const rendered = renderSection("1.1", "Representation");
                                        if (rendered) {
                                          return rendered;
                                        }
                                      }
                                      
                                      // If no parsed sections or rendering failed, show static content
                                      return null;
                                    })()}
                                    
                                    {/* Only show static content if we don't have parsed sections */}
                                    {!parsedSections || !parsedSections["1.1"] ? (
                                <div className="step-content-box mt-0">
                                    <h6><span className="num">1.1</span> Representation</h6>
                                    <ol className="clauses">
                                        <li className="clause d-flex align-items-start gap-2">
                                            <Checkbox 
                                                inputId="clause-1-1-1" 
                                                checked={checkboxStates["1.1"]?.["1.1.1"]?.checked ?? false}
                                                onChange={(e) => handleCheckboxChange('1.1', '1.1.1', e.checked, null)}
                                            />
                                            <div>
                                                <span className="num">1.1.1</span>
                                                <ol className="sub alpha">
                                                    <li className="d-flex align-items-start gap-2">
                                                        <Checkbox 
                                                            inputId="clause-1-1-1-a" 
                                                            checked={checkboxStates["1.1"]?.["1.1.1"]?.subItems?.["1.1.1.a"]?.checked ?? false}
                                                            onChange={(e) => handleSubItemChange('1.1', '1.1.1', '1.1.1.a', e.checked)}
                                                        />
                                                        <span>
                                                            <span className="num">a)</span> Provide a financial guarantee to facilitate the Carrier's activities with third party(ies).
                                                        </span>
                                                    </li>
                                                    <li className="d-flex align-items-start gap-2">
                                                        <Checkbox 
                                                            inputId="clause-1-1-1-b" 
                                                            checked={checkboxStates["1.1"]?.["1.1.1"]?.subItems?.["1.1.1.b"]?.checked ?? false}
                                                            onChange={(e) => handleSubItemChange('1.1', '1.1.1', '1.1.1.b', e.checked)}
                                                        />
                                                        <span>
                                                            <span className="num">b)</span> Arrange for a financial guarantee to facilitate the Carrier's activities with third party(ies).
                                                        </span>
                                                    </li>
                                                </ol>
                                            </div>
                                        </li>
                                        <li className="clause d-flex align-items-center gap-2">
                                            <Checkbox 
                                                inputId="clause-1-1-1-main" 
                                                checked={checkboxStates["1.1"]?.["1.1.1-main"]?.checked ?? false}
                                                onChange={(e) => handleCheckboxChange('1.1', '1.1.1-main', e.checked, null)}
                                            />
                                            <span>
                                                <span className="num">1.1.1</span> Liaise with local authorities.
                                            </span>
                                        </li>
                                        <li className="clause d-flex align-items-center gap-2">
                                            <Checkbox 
                                                inputId="clause-1-1-2" 
                                                checked={checkboxStates["1.1"]?.["1.1.2"]?.checked ?? false}
                                                onChange={(e) => handleCheckboxChange('1.1', '1.1.2', e.checked, null)}
                                            />
                                            <span>
                                                <span className="num">1.1.2</span> Indicate that the Handling Company is acting as handling agent for the Carrier.
                                            </span>
                                        </li>
                                        <li className="clause d-flex align-items-center gap-2">
                                            <Checkbox 
                                                inputId="clause-1-1-3" 
                                                checked={checkboxStates["1.1"]?.["1.1.3"]?.checked ?? false}
                                                onChange={(e) => handleCheckboxChange('1.1', '1.1.3', e.checked, null)}
                                            />
                                            <span>
                                                <span className="num">1.1.3</span> Inform all interested parties concerning schedules of the Carrier's Aircraft.
                                            </span>
                                        </li>
                                    </ol>
                                </div>
                                    ) : null}
                                </>
                                )}
                                
                                {/* Step 2 Content - 1.2 */}
                                {activeIndex === 1 && (
                                  <>
                                    {(() => {
                                      if (parsedSections && parsedSections["1.2"]) {
                                        const rendered = renderSection("1.2", "Administrative Functions");
                                        if (rendered) return rendered;
                                      }
                                      return (
                                        <div className="step-content-box mt-0">
                                          <h6><span className="num">1.2</span> Administrative Functions</h6>
                                          <p>No content available for this section.</p>
                                        </div>
                                      );
                                    })()}
                                  </>
                                )}
                                
                                {/* Step 3 Content - 1.3 */}
                                {activeIndex === 2 && (
                                  <>
                                    {(() => {
                                      if (parsedSections && parsedSections["1.3"]) {
                                        const rendered = renderSection("1.3", "Supervision and/or Coordination");
                                        if (rendered) return rendered;
                                      }
                                      return (
                                        <div className="step-content-box mt-0">
                                          <h6><span className="num">1.3</span> Supervision and/or Coordination</h6>
                                          <p>No content available for this section.</p>
                                        </div>
                                      );
                                    })()}
                                  </>
                                )}
                                
                                {/* Step 4 Content - 1.4 */}
                                {activeIndex === 3 && (
                                  <>
                                    {(() => {
                                      if (parsedSections && parsedSections["1.4"]) {
                                        const rendered = renderSection("1.4", "Station Management");
                                        if (rendered) return rendered;
                                      }
                                      return (
                                        <div className="step-content-box mt-0">
                                          <h6><span className="num">1.4</span> Station Management</h6>
                                          <p>No content available for this section.</p>
                                        </div>
                                      );
                                    })()}
                                  </>
                                )}
                            </div>
                        </Card.Body>
                        <Card.Footer className="d-flex justify-content-between bg-white border-0 shadow-0">
                            <div className="w-75 d-flex gap-2">
                                <Button 
                                    variant="outline-success" 
                                    onClick={saveCheckboxStates}
                                    label="Save States"
                                    className="py-1"
                                    outlined
                                    severity="success"
                                    icon="pi pi-save"
                                />
                            </div>
                            <div>
                                <Button
                                    icon="pi pi-chevron-left"
                                    tooltip="Prv"
                                    severity="warning"
                                    className="py-1 me-2"
                                    iconPos="left"
                                    onClick={() => {
                                        prevStep();
                                        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 10);
                                    }}
                                    disabled={activeIndex === 0}
                                />

                                <Button
                                    icon="pi pi-chevron-right"
                                    severity="warning"
                                    tooltip="Next"
                                    className="py-1"
                                    iconPos="right"
                                    onClick={() => {
                                        nextStep();
                                        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 10);
                                    }}
                                    disabled={activeIndex === steps.length - 1}
                                />
                            </div>
                        </Card.Footer>
                        </Card>
                    </AccordionTab>
                    
                    {/* Dynamic Sections - rendered from allParsedSections */}
                    {allParsedSections.filter(s => s.sectionNo !== '1').map((section) => {
                      const sectionActiveIdx = getSectionActiveIndex(section.sectionNo);
                      const sectionSteps = section.subsections?.map((sub, idx) => ({
                        id: sub.id || `step-${section.sectionNo}-${idx}`,
                        label: sub.subheadingNo && sub.subheadingNo.trim() !== '' 
                          ? `${sub.subheadingNo} ${sub.subheading}` 
                          : sub.subheading || `Subsection ${idx + 1}`
                      })) || [{ label: `${section.sectionNo}.1 General` }];
                      const currentSubsection = section.subsections?.[sectionActiveIdx];
                      const hasContent = section.subsections?.some(sub => 
                        sub.editor && sub.editor.value && sub.editor.value.trim() !== '' && sub.editor.value !== '<p><br></p>'
                      );
                      const statusIcon = hasContent ? 'pi-check' : 'pi-times';
                      
                      return (
                        <AccordionTab 
                          key={`section-${section.sectionNo}`}
                          header={
                            <div className="d-flex justify-content-between align-items-center">
                              <span>SECTION {section.sectionNo}. {section.heading}</span>
                              <span><i className={`pi ${statusIcon}`}></i></span>
                            </div>
                          }
                        >
                          <Card className="h-auto border-0 shadow-0">
                            <Card.Body>
                              <div className="vertical-stepper-container">
                                <Steps
                                  model={sectionSteps}
                                  activeIndex={sectionActiveIdx}
                                  onSelect={(e) => setSectionActiveIndex(section.sectionNo, e.index)}
                                  readOnly={false}
                                  orientation="vertical"
                                />
                              </div> 
                              <div className="vertical-stepper-content" style={{ flex: 1, marginLeft: "20px" }}>
                                <div className="step-content-box mt-0">
                                  <h6>
                                    <span className="num">{currentSubsection?.subheadingNo || `${section.sectionNo}.1`}</span> {currentSubsection?.subheading || 'General'}
                                  </h6>
                                  {currentSubsection?.editor?.value && (
                                    <div className="editor-content mt-3">
                                      {parseEditorContent(
                                        currentSubsection.editor.value, 
                                        currentSubsection.subheadingNo || `${section.sectionNo}.${sectionActiveIdx + 1}`, 
                                        0, 
                                        currentSubsection.editor.checkboxConfig || {}
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Card.Body>
                            <Card.Footer className="d-flex justify-content-between bg-white border-0 shadow-0">
                              <div className="w-75 d-flex gap-2">
                                <Button 
                                  variant="outline-success" 
                                  onClick={saveCheckboxStates}
                                  label="Save States"
                                  className="py-1"
                                  outlined
                                  severity="success"
                                  icon="pi pi-save"
                                />
                              </div>
                              <div>
                                <Button
                                  icon="pi pi-chevron-left"
                                  tooltip="Prv"
                                  severity="warning"
                                  className="py-1 me-2"
                                  iconPos="left"
                                  onClick={() => {
                                    if (sectionActiveIdx > 0) {
                                      setSectionActiveIndex(section.sectionNo, sectionActiveIdx - 1);
                                      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 10);
                                    }
                                  }}
                                  disabled={sectionActiveIdx === 0}
                                />
                                <Button
                                  icon="pi pi-chevron-right"
                                  severity="warning"
                                  tooltip="Next"
                                  className="py-1"
                                  iconPos="right"
                                  onClick={() => {
                                    if (sectionActiveIdx < sectionSteps.length - 1) {
                                      setSectionActiveIndex(section.sectionNo, sectionActiveIdx + 1);
                                      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 10);
                                    }
                                  }}
                                  disabled={sectionActiveIdx === sectionSteps.length - 1}
                                />
                              </div>
                            </Card.Footer>
                          </Card>
                        </AccordionTab>
                      );
                    })}
                </Accordion>
            </div>
        </>
    );
};

export default Sgha_annexA;