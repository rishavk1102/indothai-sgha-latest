import DOMPurify from "dompurify";
import { Accordion, AccordionTab } from "primereact/accordion";
import { Avatar } from "primereact/avatar";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Chip } from "primereact/chip";
import { RadioButton } from "primereact/radiobutton";
import { Steps } from "primereact/steps";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Table } from "react-bootstrap";
import { MdFlight } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { stringLooksLikeHtml } from "../utils/agreementDocFormat";
import { useAuth } from "../context/AuthContext";
import { getSocket } from "../context/socket";
import CustomToast from "./CustomToast";

const Sgha_annexB = ({
  templateYear = 2025,
  templateName = null,
  formData = {},
  selectedCities = [],
}) => {
  const { roleId, role, userId } = useAuth();
  const agreementYear =
    templateYear >= 2000 && templateYear <= 2100 ? Number(templateYear) : 2025;
  const navigate = useNavigate();
  const socket = getSocket();
  const toastRef = useRef(null);
  const [visibleRight, setVisibleRight] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for cards
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  // State for vertical stepper
  const [activeIndex, setActiveIndex] = useState(0);

  // State for template data
  const [templateData, setTemplateData] = useState(null);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [parsedSections, setParsedSections] = useState([]);

  // State for aircraft options
  const [aircraftOptions, setAircraftOptions] = useState([]);
  const [loadingAircraftOptions, setLoadingAircraftOptions] = useState(false);
  // Single selected aircraft (only one can be selected for handling services)
  const [selectedAircraftId, setSelectedAircraftId] = useState(null);

  // State for additional charges
  const [additionalCharges, setAdditionalCharges] = useState([]);
  const [loadingAdditionalCharges, setLoadingAdditionalCharges] =
    useState(false);
  // Multi-select: selected additional charge ids (for additional_charges variable)
  const [selectedAdditionalChargeIds, setSelectedAdditionalChargeIds] =
    useState([]);

  // State for Annex A checkbox states - initialize from localStorage if available
  const [annexAStates, setAnnexAStates] = useState(() => {
    try {
      const savedStates = localStorage.getItem("sgha_annex_a_states");
      if (savedStates) {
        const parsed = JSON.parse(savedStates);
        return parsed;
      }
    } catch (error) {
      console.error("[Annex B] Error initializing from localStorage:", error);
    }
    return null;
  });

  // Load Annex A checkbox states from localStorage
  useEffect(() => {
    let lastStateString = null;

    const loadAnnexAStates = () => {
      const savedStates = localStorage.getItem("sgha_annex_a_states");

      // Only update if state has actually changed
      if (savedStates === lastStateString) {
        return; // No change, skip update
      }

      lastStateString = savedStates;

      if (savedStates) {
        try {
          const parsed = JSON.parse(savedStates);
          // Ensure serviceTypes exist
          if (!parsed.serviceTypes) {
            parsed.serviceTypes = {
              comp: true,
              ramp: false,
              cargo: false,
            };
          }
          setAnnexAStates(parsed);
        } catch (error) {
          console.error("[Annex B] Error parsing Annex A states:", error);
        }
      } else {
        // Only update if state was not null before
        setAnnexAStates((prev) => {
          if (prev !== null) {
            return null;
          }
          return prev;
        });
      }
    };

    // Load initially
    loadAnnexAStates();

    // Listen for storage changes (when Annex A updates)
    const handleStorageChange = (e) => {
      if (e.key === "sgha_annex_a_states") {
        lastStateString = null; // Reset to force update
        loadAnnexAStates();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Also listen for custom event (for same-tab updates)
    const handleCustomStorage = () => {
      lastStateString = null; // Reset to force update
      loadAnnexAStates();
    };

    window.addEventListener("annexAStatesUpdated", handleCustomStorage);

    // Removed setInterval polling - event listeners should handle all updates
    // If needed, can add a manual refresh mechanism instead

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("annexAStatesUpdated", handleCustomStorage);
    };
  }, []);

  // Memoize checked items grouped by section for table display
  const annexASelectionsBySection = useMemo(() => {
    if (!annexAStates) {
      return {};
    }

    const sectionsData = {};

    // Get selected service types
    const selectedServiceTypes = annexAStates.serviceTypes || {
      comp: true,
      ramp: false,
      cargo: false,
    };

    // Helper to check if item is selected based on service types
    const isItemSelected = (item) => {
      if (!item) return false;

      // Old format: checked property
      if (item.checked === true) return true;

      // New format: ramp/comp/cargo properties
      const hasServiceTypeProps =
        item.ramp !== undefined ||
        item.comp !== undefined ||
        item.cargo !== undefined;
      if (hasServiceTypeProps) {
        if (selectedServiceTypes.ramp && item.ramp !== false) return true;
        if (selectedServiceTypes.comp && item.comp !== false) return true;
        if (selectedServiceTypes.cargo && item.cargo !== false) return true;
      }

      return false;
    };

    // Process each section (1.1, 1.2, 2.1, 2.2, etc.)
    Object.keys(annexAStates).forEach((sectionKey) => {
      // Skip serviceTypes
      if (sectionKey === "serviceTypes") return;

      const section = annexAStates[sectionKey];
      if (!section || typeof section !== "object") return;

      // Get all selected items in this section
      const sectionItems = [];

      Object.keys(section).forEach((itemKey) => {
        const item = section[itemKey];

        // Check if main item is selected
        if (isItemSelected(item)) {
          const hasSubItems =
            item.subItems && Object.keys(item.subItems).length > 0;

          if (hasSubItems) {
            // Get selected sub-items
            const selectedSubItems = Object.keys(item.subItems)
              .filter((subKey) => isItemSelected(item.subItems[subKey]))
              .map((subKey) => {
                // Extract letter from sub-item key (e.g., "1.1.1.a" -> "a" or "1.1.0.1.a" -> "a")
                const match = subKey.match(/\.([a-z])$/i);
                return match ? match[1] : null;
              })
              .filter(Boolean)
              .sort();

            if (selectedSubItems.length > 0) {
              // Normalize itemKey to display format (remove fieldIndex if present, e.g., "1.1.0.1" -> "1.1.1")
              let displayKey = itemKey;
              // If key has format like "1.1.0.1", convert to "1.1.1"
              const keyMatch = itemKey.match(/^(\d+\.\d+)\.\d+\.(\d+)$/);
              if (keyMatch) {
                displayKey = `${keyMatch[1]}.${keyMatch[2]}`;
              }

              // Format: "1.1.1 (a, b)" or "1.1.1 (a)"
              const subItemsStr =
                selectedSubItems.length === 1
                  ? `(${selectedSubItems[0]})`
                  : `(${selectedSubItems.join(", ")})`;
              sectionItems.push(`${displayKey} ${subItemsStr}`);
            } else {
              // Main item selected but no sub-items selected
              // Normalize itemKey
              let displayKey = itemKey;
              const keyMatch = itemKey.match(/^(\d+\.\d+)\.\d+\.(\d+)$/);
              if (keyMatch) {
                displayKey = `${keyMatch[1]}.${keyMatch[2]}`;
              }
              sectionItems.push(displayKey);
            }
          } else {
            // No sub-items, just add the main item
            // Normalize itemKey
            let displayKey = itemKey;
            const keyMatch = itemKey.match(/^(\d+\.\d+)\.\d+\.(\d+)$/);
            if (keyMatch) {
              displayKey = `${keyMatch[1]}.${keyMatch[2]}`;
            }
            sectionItems.push(displayKey);
          }
        }
      });

      // Sort items by their numeric value for proper grouping
      sectionItems.sort((a, b) => {
        const aMatch = a.match(/^(\d+\.\d+\.\d+)/);
        const bMatch = b.match(/^(\d+\.\d+\.\d+)/);
        if (aMatch && bMatch) {
          const aParts = aMatch[1].split(".").map(Number);
          const bParts = bMatch[1].split(".").map(Number);
          for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            if (aParts[i] !== bParts[i]) {
              return (aParts[i] || 0) - (bParts[i] || 0);
            }
          }
        }
        return a.localeCompare(b);
      });

      // Group consecutive items (e.g., "1.1.2-1.1.4")
      if (sectionItems.length > 0) {
        const grouped = [];
        let rangeStart = null;
        let rangeEnd = null;

        sectionItems.forEach((item, index) => {
          const match = item.match(/^(\d+\.\d+\.\d+)/);

          if (!match) {
            // Item with sub-items or special format, add as is
            if (rangeStart !== null) {
              // Close current range
              if (rangeStart === rangeEnd) {
                grouped.push(sectionItems[rangeStart]);
              } else {
                const startMatch =
                  sectionItems[rangeStart].match(/^(\d+\.\d+\.\d+)/);
                const endMatch =
                  sectionItems[rangeEnd].match(/^(\d+\.\d+\.\d+)/);
                if (startMatch && endMatch) {
                  const startBase = startMatch[1].substring(
                    0,
                    startMatch[1].lastIndexOf("."),
                  );
                  const startNum = startMatch[1].split(".").pop();
                  const endNum = endMatch[1].split(".").pop();
                  grouped.push(`${startBase}.${startNum}-${endNum}`);
                } else {
                  grouped.push(...sectionItems.slice(rangeStart, rangeEnd + 1));
                }
              }
              rangeStart = null;
              rangeEnd = null;
            }
            grouped.push(item);
            return;
          }

          const itemBase = match[1].substring(0, match[1].lastIndexOf("."));
          const itemNum = parseInt(match[1].split(".").pop());

          if (rangeStart === null) {
            // Start new range
            rangeStart = index;
            rangeEnd = index;
          } else {
            const prevMatch = sectionItems[rangeEnd].match(/^(\d+\.\d+\.\d+)/);
            if (prevMatch) {
              const prevBase = prevMatch[1].substring(
                0,
                prevMatch[1].lastIndexOf("."),
              );
              const prevNum = parseInt(prevMatch[1].split(".").pop());

              // Check if consecutive and same parent
              if (itemBase === prevBase && itemNum === prevNum + 1) {
                // Extend range
                rangeEnd = index;
              } else {
                // Close current range and start new one
                if (rangeStart === rangeEnd) {
                  grouped.push(sectionItems[rangeStart]);
                } else {
                  const startMatch =
                    sectionItems[rangeStart].match(/^(\d+\.\d+\.\d+)/);
                  const endMatch =
                    sectionItems[rangeEnd].match(/^(\d+\.\d+\.\d+)/);
                  if (startMatch && endMatch) {
                    const startBase = startMatch[1].substring(
                      0,
                      startMatch[1].lastIndexOf("."),
                    );
                    const startNum = startMatch[1].split(".").pop();
                    const endNum = endMatch[1].split(".").pop();
                    grouped.push(`${startBase}.${startNum}-${endNum}`);
                  } else {
                    grouped.push(
                      ...sectionItems.slice(rangeStart, rangeEnd + 1),
                    );
                  }
                }
                rangeStart = index;
                rangeEnd = index;
              }
            }
          }
        });

        // Close any remaining range
        if (rangeStart !== null) {
          if (rangeStart === rangeEnd) {
            grouped.push(sectionItems[rangeStart]);
          } else {
            const startMatch =
              sectionItems[rangeStart].match(/^(\d+\.\d+\.\d+)/);
            const endMatch = sectionItems[rangeEnd].match(/^(\d+\.\d+\.\d+)/);
            if (startMatch && endMatch) {
              const startBase = startMatch[1].substring(
                0,
                startMatch[1].lastIndexOf("."),
              );
              const startNum = startMatch[1].split(".").pop();
              const endNum = endMatch[1].split(".").pop();
              grouped.push(`${startBase}.${startNum}-${endNum}`);
            } else {
              grouped.push(...sectionItems.slice(rangeStart, rangeEnd + 1));
            }
          }
        }

        // Store grouped items by section
        if (grouped.length > 0) {
          sectionsData[sectionKey] = grouped;
        }
      }
    });

    return sectionsData;
  }, [annexAStates]);

  // Memoize checked items to recalculate when annexAStates changes (for backward compatibility)
  const checkedItemsFromAnnexA = useMemo(() => {
    const allItems = [];
    Object.values(annexASelectionsBySection).forEach((sectionItems) => {
      allItems.push(...sectionItems);
    });
    return allItems;
  }, [annexASelectionsBySection]);

  // 8 Steps
  const steps = [
    { label: "1.1 Representation" },
    { label: "1.2 Administrative Functions" },
    { label: "1.3 Supervision and/or Coordination" },
    { label: "1.4 Station Management" },
    // { label: "Step 5" },
    // { label: "Step 6" },
    // { label: "Step 7" },
    // { label: "Step 8" }
  ];

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

  // Steps/charges sections come only from template data — no fallback list
  const items = useMemo(() => {
    if (parsedSections.length > 0) {
      return parsedSections.map((section, index) => ({
        label: section.heading || section.label || `Step ${index + 1}`,
        command: () => setActiveIndex(index),
      }));
    }
    return [];
  }, [parsedSections]);

  // Auto scroll active step into view
  useEffect(() => {
    const activeStep = stepsRef.current?.querySelector(
      ".p-steps-item.p-highlight",
    );
    if (activeStep) {
      activeStep.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeIndex]);

  // Show toast message helper
  const showMessage = (severity, detail) => {
    const summary = severity.charAt(0).toUpperCase() + severity.slice(1);
    toastRef.current?.show(severity, summary, detail);
  };

  const handleNext = async () => {
    if (activeIndex < items.length - 1) {
      setActiveIndex((prev) => prev + 1);
    } else {
      // Submit button clicked - save Annex A selections to database
      if (isSubmitting) {
        return; // Prevent multiple submissions
      }

      // Require one aircraft selected only when template has aircraft section AND table has options
      if (
        templateHasAircraftSection &&
        aircraftOptions.length > 0 &&
        !selectedAircraftId
      ) {
        showMessage(
          "warn",
          "Please select one aircraft from the table to proceed.",
        );
        return;
      }
      // Require at least one additional charge selected only when template has that section AND table has data
      if (
        templateHasAdditionalChargesSection &&
        additionalCharges.length > 0 &&
        selectedAdditionalChargeIds.length === 0
      ) {
        showMessage(
          "warn",
          "Please select at least one additional service/charge to proceed.",
        );
        return;
      }

      setIsSubmitting(true);

      try {
        // Get the latest state from Annex A (from localStorage - includes all modifications)
        const latestAnnexAState = localStorage.getItem("sgha_annex_a_states");

        if (!latestAnnexAState) {
          showMessage(
            "warn",
            "No Annex A selections found. Please complete Annex A first.",
          );
          setIsSubmitting(false);
          return;
        }

        // Parse the state
        let parsedState;
        try {
          parsedState = JSON.parse(latestAnnexAState);
        } catch (parseError) {
          console.error("Error parsing Annex A state:", parseError);
          showMessage(
            "error",
            "Invalid Annex A data. Please refresh and try again.",
          );
          setIsSubmitting(false);
          return;
        }

        // Validate that we have some data
        if (!parsedState || typeof parsedState !== "object") {
          showMessage(
            "warn",
            "Annex A selections are empty. Please complete Annex A first.",
          );
          setIsSubmitting(false);
          return;
        }

        // Log the original state to debug
        console.log(
          "Original Annex A state keys:",
          Object.keys(parsedState).filter((k) => k !== "serviceTypes"),
        );

        // Transform the state to nested structure: { "1": { "1.1": { "1.1.1": true } }, "2": { "2.1": { "2.1.1": true } } }
        const transformToNestedStructure = (state) => {
          const nested = {};

          // Preserve serviceTypes at the top level
          if (state.serviceTypes) {
            nested.serviceTypes = state.serviceTypes;
          }

          // Group sections by their top-level number
          const sectionsByNumber = {};

          // Process all keys in the state
          Object.keys(state).forEach((key) => {
            // Skip serviceTypes
            if (key === "serviceTypes") {
              return;
            }

            // Check if key matches section pattern with subsections (e.g., "1.1", "2.3", "3.1")
            const sectionMatch = key.match(/^(\d+)\.(\d+)$/);
            if (sectionMatch) {
              const topLevelNumber = sectionMatch[1]; // e.g., "1" from "1.1"
              const sectionKey = key; // e.g., "1.1"

              // Initialize the top-level section if it doesn't exist
              if (!sectionsByNumber[topLevelNumber]) {
                sectionsByNumber[topLevelNumber] = {};
              }

              // Process the section data
              if (state[sectionKey] && typeof state[sectionKey] === "object") {
                const sectionData = {};

                // Process each clause in the section
                Object.keys(state[sectionKey]).forEach((clauseKey) => {
                  const clause = state[sectionKey][clauseKey];

                  // If clause is checked, add it to the nested structure
                  if (
                    clause &&
                    typeof clause === "object" &&
                    clause.checked === true
                  ) {
                    sectionData[clauseKey] = true;

                    // Handle subItems (e.g., "1.1.1.a", "1.1.1.b")
                    if (
                      clause.subItems &&
                      typeof clause.subItems === "object"
                    ) {
                      Object.keys(clause.subItems).forEach((subItemKey) => {
                        const subItem = clause.subItems[subItemKey];
                        if (
                          subItem &&
                          typeof subItem === "object" &&
                          subItem.checked === true
                        ) {
                          sectionData[subItemKey] = true;
                        }
                      });
                    }
                  }
                });

                // Only add section if it has checked items
                if (Object.keys(sectionData).length > 0) {
                  sectionsByNumber[topLevelNumber][sectionKey] = sectionData;
                }
              }
            } else {
              // Handle sections stored as single numbers (e.g., "2", "3") or other patterns
              // Check if it's a single number
              const singleNumberMatch = key.match(/^(\d+)$/);
              if (
                singleNumberMatch &&
                state[key] &&
                typeof state[key] === "object"
              ) {
                const topLevelNumber = singleNumberMatch[1]; // e.g., "2" from "2"

                // Initialize the top-level section if it doesn't exist
                if (!sectionsByNumber[topLevelNumber]) {
                  sectionsByNumber[topLevelNumber] = {};
                }

                // Process the section data - it might be a direct object with clauses
                const sectionData = {};
                Object.keys(state[key]).forEach((clauseKey) => {
                  const clause = state[key][clauseKey];

                  // If clause is checked, add it to the nested structure
                  if (
                    clause &&
                    typeof clause === "object" &&
                    clause.checked === true
                  ) {
                    sectionData[clauseKey] = true;

                    // Handle subItems
                    if (
                      clause.subItems &&
                      typeof clause.subItems === "object"
                    ) {
                      Object.keys(clause.subItems).forEach((subItemKey) => {
                        const subItem = clause.subItems[subItemKey];
                        if (
                          subItem &&
                          typeof subItem === "object" &&
                          subItem.checked === true
                        ) {
                          sectionData[subItemKey] = true;
                        }
                      });
                    }
                  }
                });

                // If section has data, add it directly under the top-level number
                if (Object.keys(sectionData).length > 0) {
                  // Use the key itself as the subsection key, or create a default structure
                  sectionsByNumber[topLevelNumber][key] = sectionData;
                }
              }
            }
          });

          // Add all grouped sections to nested structure
          Object.keys(sectionsByNumber).forEach((topLevelNumber) => {
            if (Object.keys(sectionsByNumber[topLevelNumber]).length > 0) {
              nested[topLevelNumber] = sectionsByNumber[topLevelNumber];
            }
          });

          return nested;
        };

        const transformedState = transformToNestedStructure(parsedState);

        console.log("Transformed Annex A state:", transformedState);
        console.log(
          "Transformed sections:",
          Object.keys(transformedState).filter((k) => k !== "serviceTypes"),
        );

        // Build form_details from Add New SGHA (first selected airport's data) so it is saved and shown in list
        let form_details = null;
        if (
          selectedCities &&
          selectedCities.length > 0 &&
          formData &&
          typeof formData === "object"
        ) {
          const firstAirportId = selectedCities[0].airport_id;
          const firstData = formData[firstAirportId];
          if (firstData && typeof firstData === "object") {
            form_details = {
              schedule: !!firstData.schedule,
              nonschedule: !!firstData.nonschedule,
              ramp: firstData.ingredient === "Ramp",
              comp: firstData.ingredient === "Comp",
              cargo: !!firstData.isCargoChecked,
              applicable_for: firstData.applicable_for || null,
              company_name: firstData.company_name || null,
              email: firstData.email || null,
              phone_number: firstData.phone_number || null,
              address_line_1: firstData.address_line_1 || null,
              address_line_2: firstData.address_line_2 || null,
              city: firstData.city || null,
              post_code: firstData.post_code || null,
              state: firstData.state || null,
              country: firstData.country || null,
              pan_card_no: firstData.pan_card_no || null,
              gstn: firstData.gstn || null,
              contact_person: firstData.contact_person || null,
              rate: firstData.rate || null,
              template_year: firstData.template_year || null,
              template_name: firstData.template_name || null,
              other_details: firstData.value || null,
            };
          }
        }

        // Save to database
        // userId is the client_registration_id for clients
        const response = await api.post("/api/client/annex-a-submission", {
          client_registration_id: userId,
          agreement_year: agreementYear,
          checkbox_selections: transformedState,
          form_details,
        });

        if (response.data && response.data.message) {
          showMessage("success", "Annex A selections saved successfully!");
          console.log("✅ Annex A submission saved:", response.data);
        } else {
          showMessage("success", "Submission completed successfully!");
        }

        const submissionId = response.data?.data?.submission_id;
        if (submissionId) {
          const variables = {};
          if (
            selectedAircraftId != null &&
            selectedAircraftId !== "" &&
            Array.isArray(aircraftOptions) &&
            aircraftOptions.length > 0
          ) {
            const selectedAircraft = aircraftOptions.find((a, i) => {
              const rowId = a.aircraft_id ?? `aircraft-${i}`;
              return String(rowId) === String(selectedAircraftId);
            });
            if (selectedAircraft) {
              variables.aircraft_options = {
                selected_aircraft_id:
                  selectedAircraft.aircraft_id ?? selectedAircraftId,
                Company_name: selectedAircraft.Company_name,
                Aircraft_name: selectedAircraft.Aircraft_name,
                Aircraft_model: selectedAircraft.Aircraft_model,
                Flight_type: selectedAircraft.Flight_type,
                MTOW: selectedAircraft.MTOW,
                Limit_per_incident: selectedAircraft.Limit_per_incident,
              };
            }
          }
          if (
            Array.isArray(additionalCharges) &&
            additionalCharges.length > 0 &&
            selectedAdditionalChargeIds.length > 0
          ) {
            const selectedCharges = additionalCharges
              .filter((charge, i) => {
                const rowId = charge.Additional_charges_id ?? `charge-${i}`;
                return selectedAdditionalChargeIds.some(
                  (id) => String(id) === String(rowId),
                );
              })
              .map((c) => ({
                Additional_charges_id: c.Additional_charges_id,
                Service_name: c.Service_name,
                Charge_type: c.Charge_type,
                unit_or_measure: c.unit_or_measure,
              }));
            if (selectedCharges.length > 0) {
              variables.additional_charges = selectedCharges;
            }
          }
          if (Object.keys(variables).length > 0) {
            try {
              await api.put(
                `/api/client/annex-a-submissions/${submissionId}/variables`,
                { variables },
              );
            } catch (varsErr) {
              console.error(
                "Failed to save variables (non-blocking):",
                varsErr,
              );
            }
          }
        }

        navigate("/dashboard/reportsummary");
      } catch (error) {
        console.error("Error saving Annex A submission:", error);

        // Handle different error types
        if (error.response) {
          const status = error.response.status;
          const message =
            error.response.data?.message || "Failed to save submission";

          if (status === 429) {
            // Throttling error
            const retryAfter = error.response.data?.retryAfter || 5;
            showMessage(
              "warn",
              `Please wait ${retryAfter} second(s) before submitting again.`,
            );
          } else if (status === 401) {
            showMessage(
              "error",
              "Authentication required. Please log in again.",
            );
          } else if (status === 400) {
            showMessage("error", message);
          } else {
            showMessage("error", `Failed to save submission: ${message}`);
          }
        } else if (error.request) {
          showMessage(
            "error",
            "Network error. Please check your connection and try again.",
          );
        } else {
          showMessage(
            "error",
            "An unexpected error occurred. Please try again.",
          );
        }
      } finally {
        setIsSubmitting(false);
      }
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

  // Fetch template data for Annex B (use selected agreement year + template_name for named templates)
  useEffect(() => {
    const fetchTemplateData = async () => {
      try {
        setLoadingTemplate(true);
        const urlB = `/sgha_template_content/get/${agreementYear}/Annex B/Section Template`;
        const params =
          templateName != null && String(templateName).trim() !== ""
            ? { template_name: String(templateName).trim() }
            : {};
        console.log("[Annex B] fetch:", urlB, "params:", params);
        const response = await api.get(urlB, { params });

        const hasContent = !!response.data?.data?.content;
        console.log(
          "[Annex B] response:",
          response.status,
          "| data.data:",
          response.data?.data ? "present" : "null",
          "| has content:",
          hasContent,
        );
        if (!hasContent && response.data?.data !== undefined) {
          console.log(
            "[Annex B] template row found but content empty/null. Full data:",
            response.data?.data,
          );
        }

        if (response.data?.data?.content) {
          const content = response.data.data.content;
          const parsedContent =
            typeof content === "string" ? JSON.parse(content) : content;

          setTemplateData(parsedContent);
          const types = Array.isArray(parsedContent)
            ? parsedContent.slice(0, 10).map((i) => i?.type)
            : typeof parsedContent === "object"
              ? Object.keys(parsedContent)
              : [];
          console.log("[Annex B] content structure (first 10 types):", types);

          // Parse the content to extract sections with headings and editor content
          let sections = parseTemplateContent(parsedContent);
          if (sections.length === 0 && Array.isArray(parsedContent)) {
            const editors = parsedContent.filter(
              (i) => i && (i.type === "editor" || i.type === "text"),
            );
            if (editors.length > 0) {
              sections = editors.map((item, i) => ({
                headingNo: String(i + 1),
                heading:
                  item.type === "editor"
                    ? "Section " + (i + 1)
                    : item.value?.slice(0, 50) || "Content",
                editor: {
                  value: item.value || "",
                  checkboxConfig: {},
                  commentConfig: {},
                },
                index: i,
              }));
              console.log(
                "[Annex B] fallback: created",
                sections.length,
                "sections from editor/text items",
              );
            }
          }
          setParsedSections(sections);
          console.log(
            "[Annex B] parsed sections count:",
            sections?.length ?? 0,
          );
        } else {
          // No template data, use default items
          setParsedSections([]);
        }
      } catch (error) {
        console.error(
          "[Annex B] Error fetching template:",
          error?.response?.status,
          error?.response?.data ?? error.message,
        );
        setParsedSections([]);
      } finally {
        setLoadingTemplate(false);
      }
    };

    fetchTemplateData();
  }, [agreementYear, templateName]);

  // Whether the current year's template includes aircraft selection ({{ aircraft_options }})
  const templateHasAircraftSection = useMemo(() => {
    if (!templateData) return false;
    const content = Array.isArray(templateData) ? templateData : [templateData];
    const aircraftVarRegex = /\{\{\s*aircraft_options\s*\}\}/i;
    for (const item of content) {
      if (
        item &&
        item.type === "editor" &&
        typeof item.value === "string" &&
        aircraftVarRegex.test(item.value)
      ) {
        return true;
      }
    }
    return false;
  }, [templateData]);

  // Whether the current year's template includes additional charges ({{ additional_charges }})
  const templateHasAdditionalChargesSection = useMemo(() => {
    if (!templateData) return false;
    const content = Array.isArray(templateData) ? templateData : [templateData];
    const additionalVarRegex = /\{\{\s*additional_charges\s*\}\}/i;
    for (const item of content) {
      if (
        item &&
        item.type === "editor" &&
        typeof item.value === "string" &&
        additionalVarRegex.test(item.value)
      ) {
        return true;
      }
    }
    return false;
  }, [templateData]);

  // Helper function to parse template content into structured sections
  const parseTemplateContent = (content) => {
    if (!content) return [];

    const sections = [];
    let currentSection = null;
    let processedIndices = new Set();

    // If content is an array of fields
    if (Array.isArray(content)) {
      content.forEach((item, index) => {
        if (
          !item ||
          typeof item !== "object" ||
          !item.type ||
          processedIndices.has(index)
        ) {
          return;
        }

        // Handle heading_no + heading pairs (main sections/stepper items)
        if (item.type === "heading_no") {
          const nextItem = content[index + 1];
          // heading_no can be followed by 'heading' (PARAGRAPH 1 style) or 'subheading' (1.1, 1.2 style from PDF/editor)
          const titleItem =
            nextItem &&
            (nextItem.type === "heading" || nextItem.type === "subheading")
              ? nextItem
              : null;
          if (titleItem) {
            currentSection = {
              headingNo: String(item.value),
              heading: titleItem.value ?? "",
              editor: null,
              id: item.id || titleItem.id,
              index: sections.length,
            };
            sections.push(currentSection);
            processedIndices.add(index);
            processedIndices.add(index + 1);
            return;
          }
        }

        // Handle subheading_no + subheading pairs (alternative format)
        if (item.type === "subheading_no") {
          const nextItem = content[index + 1];
          if (nextItem && nextItem.type === "subheading") {
            // Start a new section
            currentSection = {
              headingNo: String(item.value),
              heading: nextItem.value,
              editor: null,
              id: item.id || nextItem.id,
              index: sections.length,
            };
            sections.push(currentSection);
            processedIndices.add(index);
            processedIndices.add(index + 1);
            return;
          }
        }

        // Handle editor content - attach to current section, or create section if none (editor-only content)
        if (item.type === "editor") {
          if (!currentSection) {
            currentSection = {
              headingNo: String(sections.length + 1),
              heading: "Section " + (sections.length + 1),
              editor: {
                value: item.value || "",
                checkboxConfig: item.checkboxConfig || {},
                commentConfig: item.commentConfig || {},
              },
              id: item.id,
              index: sections.length,
            };
            sections.push(currentSection);
          } else if (!currentSection.editor) {
            currentSection.editor = {
              value: item.value || "",
              checkboxConfig: item.checkboxConfig || {},
              commentConfig: item.commentConfig || {},
            };
          } else if (item.value) {
            const existingValue = currentSection.editor.value || "";
            currentSection.editor.value =
              existingValue + (existingValue ? "<br/>" : "") + item.value;
          }
          processedIndices.add(index);
        }

        // Handle text content - attach to current section, or create section if none
        if (item.type === "text") {
          if (!currentSection) {
            currentSection = {
              headingNo: String(sections.length + 1),
              heading: "Section " + (sections.length + 1),
              editor: {
                value: item.value || "",
                checkboxConfig: {},
                commentConfig: {},
              },
              id: item.id,
              index: sections.length,
            };
            sections.push(currentSection);
          } else {
            if (!currentSection.editor) {
              currentSection.editor = {
                value: item.value || "",
                checkboxConfig: {},
                commentConfig: {},
              };
            } else if (item.value) {
              const existingValue = currentSection.editor.value || "";
              currentSection.editor.value =
                existingValue + (existingValue ? "<br/>" : "") + item.value;
            }
          }
          processedIndices.add(index);
        }
      });
    }

    // If content is an object with section keys
    if (content && typeof content === "object" && !Array.isArray(content)) {
      Object.keys(content).forEach((key, index) => {
        const sectionData = content[key];
        sections.push({
          headingNo: key,
          heading:
            sectionData?.heading || sectionData?.title || `Section ${key}`,
          editor:
            sectionData?.editor ||
            (sectionData?.content ? { value: sectionData.content } : null),
          index: index,
        });
      });
    }

    return sections;
  };

  // Section number to name mapping - dynamically built from template data
  const sectionNames = useMemo(() => {
    const names = {
      1.1: "Representation",
      1.2: "Administrative Functions",
      1.3: "Supervision and/or Coordination",
      1.4: "Station Management",
    };

    // Add from parsedSections (Annex B) if available
    if (parsedSections && Array.isArray(parsedSections)) {
      parsedSections.forEach((section) => {
        if (section.subsections) {
          section.subsections.forEach((sub) => {
            if (sub.subheadingNo && !names[sub.subheadingNo]) {
              names[sub.subheadingNo] =
                sub.subheading || `Section ${sub.subheadingNo}`;
            }
          });
        }
      });
    }

    return names;
  }, [parsedSections]);

  // Fetch additional charges
  useEffect(() => {
    if (!socket || !roleId) {
      console.log(
        "[Annex B] Socket or roleId not available for additional charges",
      );
      return;
    }

    // Set up listeners first
    const handleSuccess = (data) => {
      console.log(
        "[Annex B] Additional charges fetched successfully:",
        data?.length || 0,
        "items",
      );
      if (data && Array.isArray(data)) {
        setAdditionalCharges(data);
      } else {
        setAdditionalCharges([]);
      }
      setLoadingAdditionalCharges(false);
    };

    const handleNoContent = () => {
      console.log("[Annex B] No additional charges found");
      setAdditionalCharges([]);
      setLoadingAdditionalCharges(false);
    };

    const handleError = (error) => {
      console.error("[Annex B] Error fetching additional charges:", error);
      setAdditionalCharges([]);
      setLoadingAdditionalCharges(false);
    };

    const handleUpdate = () => {
      console.log("[Annex B] Additional charges updated, refetching...");
      fetchAdditionalCharges();
    };

    // Register listeners
    socket.on("view-new-additional-charges-success", handleSuccess);
    socket.on("view-new-additional-charges-no-content", handleNoContent);
    socket.on("view-new-additional-charges-error", handleError);
    socket.on("additional-charges-updated", handleUpdate);

    const fetchAdditionalCharges = () => {
      setLoadingAdditionalCharges(true);
      console.log("[Annex B] Fetching additional charges with roleId:", roleId);

      // Try to get business and airport from localStorage or context if available
      // For now, we'll try to fetch without filters, but backend requires them
      // So we'll need to handle the error gracefully
      const payload = {
        role_id: roleId,
        page_name: "Additional Charges",
        sortOrder: "ASC",
        limit: 1000,
        searchTerm: "",
        // Note: Business_id and Airport_id are required by backend
        // If not provided, it will return an error which we handle gracefully
      };

      console.log(
        "[Annex B] Emitting view-new-additional-charges with payload:",
        payload,
      );
      socket.emit("view-new-additional-charges", payload);
    };

    // Check if socket is connected
    if (socket.connected) {
      fetchAdditionalCharges();
    } else {
      console.log(
        "[Annex B] Socket not connected for additional charges, waiting...",
      );
      const onConnect = () => {
        console.log(
          "[Annex B] Socket connected, fetching additional charges...",
        );
        fetchAdditionalCharges();
      };
      socket.on("connect", onConnect);

      const timeoutId = setTimeout(() => {
        if (socket.connected) {
          fetchAdditionalCharges();
        }
      }, 1000);

      return () => {
        socket.off("connect", onConnect);
        clearTimeout(timeoutId);
        socket.off("view-new-additional-charges-success", handleSuccess);
        socket.off("view-new-additional-charges-no-content", handleNoContent);
        socket.off("view-new-additional-charges-error", handleError);
        socket.off("additional-charges-updated", handleUpdate);
      };
    }

    return () => {
      socket.off("view-new-additional-charges-success", handleSuccess);
      socket.off("view-new-additional-charges-no-content", handleNoContent);
      socket.off("view-new-additional-charges-error", handleError);
      socket.off("additional-charges-updated", handleUpdate);
    };
  }, [socket, roleId]);

  // Function to render Additional Charges table (with checkboxes for user to select)
  const renderAdditionalChargesTable = () => {
    if (loadingAdditionalCharges) {
      return (
        <Table bordered className="mb-0 mt-4">
          <tbody>
            <tr>
              <td colSpan="5" className="text-center text-muted">
                Loading additional charges...
              </td>
            </tr>
          </tbody>
        </Table>
      );
    }

    if (!additionalCharges || additionalCharges.length === 0) {
      return (
        <Table bordered className="mb-0 mt-4">
          <tbody>
            <tr>
              <td colSpan="5" className="text-center text-muted">
                No additional charges available
              </td>
            </tr>
          </tbody>
        </Table>
      );
    }

    const toggleAdditionalCharge = (rowId) => {
      setSelectedAdditionalChargeIds((prev) => {
        const key = String(rowId);
        const next = prev.filter((id) => String(id) !== key);
        if (next.length === prev.length) return [...prev, rowId];
        return next;
      });
    };

    return (
      <Table bordered className="mb-0 mt-4">
        <thead>
          <tr className="table-primary">
            <th style={{ width: "80px" }} className="text-center">
              Select
            </th>
            <th style={{ width: "100px" }}>Serial. No.</th>
            <th>Service</th>
            <th>Applicable for</th>
            <th>Unit of Measure</th>
          </tr>
        </thead>
        <tbody>
          {additionalCharges.map((charge, index) => {
            const rowId = charge.Additional_charges_id ?? `charge-${index}`;
            const isChecked = selectedAdditionalChargeIds.some(
              (id) => String(id) === String(rowId),
            );
            return (
              <tr key={charge.Additional_charges_id || index}>
                <td className="align-middle text-center">
                  <Checkbox
                    inputId={`additional-charge-select-${rowId}`}
                    checked={isChecked}
                    onChange={() => toggleAdditionalCharge(rowId)}
                  />
                </td>
                <td>{index + 1}</td>
                <td>{charge.Service_name || "-"}</td>
                <td>{charge.Charge_type || "-"}</td>
                <td>{charge.unit_or_measure || "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    );
  };

  // Function to render Aircraft Options table (with radio selection - single aircraft)
  const renderAircraftOptionsTable = () => {
    if (loadingAircraftOptions) {
      return (
        <Table bordered className="mb-0 mt-4">
          <tbody>
            <tr>
              <td colSpan="5" className="text-center text-muted">
                Loading aircraft options...
              </td>
            </tr>
          </tbody>
        </Table>
      );
    }

    if (!aircraftOptions || aircraftOptions.length === 0) {
      return (
        <Table bordered className="mb-0 mt-4">
          <tbody>
            <tr>
              <td colSpan="5" className="text-center text-muted">
                No aircraft options available
              </td>
            </tr>
          </tbody>
        </Table>
      );
    }

    return (
      <Table bordered className="mb-0 mt-4">
        <thead>
          <tr className="table-primary">
            <th style={{ width: "80px" }} className="text-center">
              Select
            </th>
            <th style={{ width: "300px" }}>Aircraft Company</th>
            <th style={{ width: "120px" }}>Region</th>
            <th>MOTW</th>
            <th style={{ width: "120px" }}>Limit Per Incident</th>
          </tr>
        </thead>
        <tbody>
          {aircraftOptions.map((aircraft, index) => {
            const rowId = aircraft.aircraft_id ?? `aircraft-${index}`;
            return (
              <tr key={aircraft.aircraft_id || index}>
                <td className="align-middle text-center">
                  <RadioButton
                    inputId={`aircraft-select-${rowId}`}
                    name="selectedAircraft"
                    value={rowId}
                    checked={String(selectedAircraftId) === String(rowId)}
                    onChange={() => setSelectedAircraftId(rowId)}
                  />
                </td>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <Avatar
                      className="me-2"
                      style={{
                        backgroundColor: "rgb(197 197 197 / 27%)",
                        color: "rgb(146 74 151)",
                      }}
                      shape="circle"
                    >
                      <MdFlight />
                    </Avatar>
                    <span className="d-flex flex-column gap-1">
                      <b>{aircraft.Company_name}</b>
                      <small>
                        Aircraft Name : <b>{aircraft.Aircraft_name || "-"}</b>
                      </small>
                      <small>
                        Model/Make : <b>{aircraft.Aircraft_model || "-"}</b>
                      </small>
                    </span>
                  </div>
                </td>
                <td>{aircraft.Flight_type || "-"}</td>
                <td>{aircraft.MTOW || "-"}</td>
                <td>{aircraft.Limit_per_incident || "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    );
  };

  // State for Annex A template content
  const [annexATemplateContent, setAnnexATemplateContent] = useState(null);
  const [loadingAnnexAContent, setLoadingAnnexAContent] = useState(true);

  // Fetch Annex A template content
  useEffect(() => {
    const fetchAnnexAContent = async () => {
      try {
        setLoadingAnnexAContent(true);
        const urlA = `/sgha_template_content/get/${agreementYear}/Annex A/Section Template`;
        const paramsA =
          templateName != null && String(templateName).trim() !== ""
            ? { template_name: String(templateName).trim() }
            : {};
        console.log("[Annex B → Annex A] fetch:", urlA, "params:", paramsA);
        const response = await api.get(urlA, { params: paramsA });
        console.log(
          "[Annex B → Annex A] response:",
          response.status,
          "| has content:",
          !!response.data?.data?.content,
        );

        if (response.data?.data?.content) {
          const content = response.data.data.content;
          const parsedContent =
            typeof content === "string" ? JSON.parse(content) : content;
          setAnnexATemplateContent(parsedContent);
        }
      } catch (error) {
        console.error("Error fetching Annex A template content:", error);
      } finally {
        setLoadingAnnexAContent(false);
      }
    };

    fetchAnnexAContent();
  }, [agreementYear, templateName]);

  // Parse Annex A content into sections with all items
  const annexAAllSections = useMemo(() => {
    if (!annexATemplateContent || !Array.isArray(annexATemplateContent)) {
      return [];
    }

    const sections = [];
    let currentMainSection = null;
    let currentSubsection = null;
    let mainSectionHeading = null;

    annexATemplateContent.forEach((item, index) => {
      if (!item || typeof item !== "object" || !item.type) return;

      // Handle main sections (1, 2, 3, etc.)
      if (item.type === "heading_no") {
        const sectionNum = String(item.value);
        const nextItem = annexATemplateContent[index + 1];

        if (
          ["1", "2", "3", "4", "5", "6", "7", "8"].includes(sectionNum) &&
          nextItem?.type === "heading"
        ) {
          currentMainSection = {
            sectionNo: sectionNum,
            heading: nextItem.value,
            subsections: [],
          };
          sections.push(currentMainSection);
          mainSectionHeading = nextItem.value;
          currentSubsection = null;
          return;
        }

        // Handle subsections (1.1, 2.1, etc.)
        if (
          sectionNum.includes(".") &&
          currentMainSection &&
          nextItem?.type === "subheading"
        ) {
          currentSubsection = {
            subheadingNo: sectionNum,
            subheading: nextItem.value,
            items: [],
          };
          currentMainSection.subsections.push(currentSubsection);
          return;
        }
      }

      // Handle subheading_no
      if (item.type === "subheading_no" && currentMainSection) {
        const nextItem = annexATemplateContent[index + 1];
        if (nextItem?.type === "subheading") {
          currentSubsection = {
            subheadingNo: String(item.value),
            subheading: nextItem.value,
            items: [],
          };
          currentMainSection.subsections.push(currentSubsection);
        }
        return;
      }

      // Handle editor content - parse items from HTML
      if (item.type === "editor" && currentSubsection && item.value) {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = DOMPurify.sanitize(item.value);

        const listItems = tempDiv.querySelectorAll("li");
        let itemCounter = 1;

        listItems.forEach((li) => {
          const text = li.textContent?.trim();
          if (text) {
            currentSubsection.items.push({
              number: itemCounter,
              text: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
            });
            itemCounter++;
          }
        });
      }
    });

    return sections;
  }, [annexATemplateContent]);

  // Extended section names including Annex A template data
  const extendedSectionNames = useMemo(() => {
    const names = { ...sectionNames };

    // Add section names from Annex A template content
    if (annexAAllSections && Array.isArray(annexAAllSections)) {
      annexAAllSections.forEach((mainSection) => {
        if (mainSection.subsections) {
          mainSection.subsections.forEach((sub) => {
            if (sub.subheadingNo && !names[sub.subheadingNo]) {
              names[sub.subheadingNo] =
                sub.subheading || `Section ${sub.subheadingNo}`;
            }
          });
        }
      });
    }

    return names;
  }, [sectionNames, annexAAllSections]);

  // Function to render Annex A selection table with ALL subsections from template
  const renderAnnexASelectionTable = () => {
    // Get all subsections from Annex A template
    const allSubsections = [];
    if (annexAAllSections && Array.isArray(annexAAllSections)) {
      annexAAllSections.forEach((mainSection, mainIdx) => {
        if (mainSection.subsections) {
          mainSection.subsections.forEach((sub, subIdx) => {
            // Generate possible keys that might be used in localStorage
            const possibleKeys = [
              sub.subheadingNo, // e.g., "2.1"
              `${mainSection.sectionNo}.${subIdx + 1}`, // e.g., "2.1" (computed)
            ].filter(Boolean);

            allSubsections.push({
              sectionKey:
                sub.subheadingNo || `${mainSection.sectionNo}.${subIdx + 1}`,
              possibleKeys: possibleKeys,
              sectionName: sub.subheading || `Section ${sub.subheadingNo}`,
              mainSectionNo: mainSection.sectionNo,
              mainSectionHeading: mainSection.heading,
              subIdx: subIdx,
            });
          });
        }
      });
    }

    // Sort subsections by their numeric value
    allSubsections.sort((a, b) => {
      const aParts = (a.sectionKey || "").split(".").map(Number);
      const bParts = (b.sectionKey || "").split(".").map(Number);
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        if (aParts[i] !== bParts[i]) {
          return (aParts[i] || 0) - (bParts[i] || 0);
        }
      }
      return 0;
    });

    if (allSubsections.length === 0) {
      return (
        <Table bordered className="mb-0 mt-4">
          <tbody>
            <tr>
              <td colSpan="2" className="text-center text-muted">
                No sections available in Annex A
              </td>
            </tr>
          </tbody>
        </Table>
      );
    }

    return (
      <Table bordered className="mb-0 mt-4">
        <thead>
          <tr>
            <th style={{ width: "180px" }}>Section</th>
            <th>Selected Items</th>
          </tr>
        </thead>
        <tbody>
          {allSubsections.map((subsection, idx) => {
            // Try to find selected items using any of the possible keys
            let selectedItems = [];
            for (const key of subsection.possibleKeys) {
              if (
                annexASelectionsBySection[key] &&
                annexASelectionsBySection[key].length > 0
              ) {
                selectedItems = annexASelectionsBySection[key];
                break;
              }
            }

            return (
              <tr key={idx}>
                <th style={{ width: "180px" }}>{subsection.sectionName}</th>
                <td>
                  {selectedItems.length > 0 ? (
                    <div className="d-flex flex-wrap gap-2">
                      {selectedItems.map((item, index) => (
                        <Chip key={index} label={item} />
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    );
  };

  // Reserved variables that should not be replaced with underscores
  const RESERVED_VARIABLES = [
    "aircraft_options",
    "additional_charges",
    "annex_a_selection",
  ];

  // Fetch aircraft options
  useEffect(() => {
    if (!socket || !roleId) {
      console.log("[Annex B] Socket or roleId not available:", {
        socket: !!socket,
        roleId: !!roleId,
      });
      return;
    }

    // Set up listeners first, before emitting
    const handleSuccess = (data) => {
      console.log(
        "[Annex B] Aircraft options fetched successfully:",
        data?.length || 0,
        "items",
      );
      if (data && Array.isArray(data)) {
        setAircraftOptions(data);
      } else {
        setAircraftOptions([]);
      }
      setLoadingAircraftOptions(false);
    };

    const handleError = (error) => {
      console.error("[Annex B] Error fetching aircraft options:", error);
      console.error(
        "[Annex B] Full error object:",
        JSON.stringify(error, null, 2),
      );
      // Set empty array and log the error for debugging
      setAircraftOptions([]);
      setLoadingAircraftOptions(false);
    };

    const handleUpdate = () => {
      console.log("[Annex B] Aircraft options updated, refetching...");
      fetchAircraftOptions();
    };

    // Register listeners
    socket.on("view-company-aircrafts-success", handleSuccess);
    socket.on("view-company-aircrafts-error", handleError);
    socket.on("company-aircrafts-updated", handleUpdate);

    const fetchAircraftOptions = () => {
      setLoadingAircraftOptions(true);
      console.log(
        "[Annex B] Fetching aircraft options with roleId:",
        roleId,
        "role:",
        role,
      );

      // Use "Add New SGHA" page name for clients, "Aircraft Options" for employees
      const pageName = role === "Client" ? "Add New SGHA" : "Aircraft Options";

      const payload = {
        role_id: roleId,
        page_name: pageName,
        sortOrder: "ASC",
        limit: 1000, // Fetch all aircraft options
        searchTerm: "",
        // No business_id or airport_id filters - fetch all aircraft options
      };

      console.log(
        "[Annex B] Emitting view-company-aircrafts with payload:",
        JSON.stringify(payload, null, 2),
      );
      socket.emit("view-company-aircrafts", payload);
    };

    // Check if socket is connected
    if (socket.connected) {
      // Socket is connected, fetch immediately
      fetchAircraftOptions();
    } else {
      // Wait for connection
      console.log("[Annex B] Socket not connected, waiting for connection...");
      const onConnect = () => {
        console.log("[Annex B] Socket connected, fetching aircraft options...");
        fetchAircraftOptions();
      };
      socket.on("connect", onConnect);

      // Also try to fetch after a short delay in case connection happens quickly
      const timeoutId = setTimeout(() => {
        if (socket.connected) {
          fetchAircraftOptions();
        }
      }, 1000);

      return () => {
        socket.off("connect", onConnect);
        clearTimeout(timeoutId);
        socket.off("view-company-aircrafts-success", handleSuccess);
        socket.off("view-company-aircrafts-error", handleError);
        socket.off("company-aircrafts-updated", handleUpdate);
      };
    }

    return () => {
      socket.off("view-company-aircrafts-success", handleSuccess);
      socket.off("view-company-aircrafts-error", handleError);
      socket.off("company-aircrafts-updated", handleUpdate);
    };
  }, [socket, roleId]);

  // Function to replace non-reserved variables with underscores
  const replaceVariablesWithUnderscores = (htmlContent) => {
    if (!htmlContent || typeof htmlContent !== "string") {
      return htmlContent;
    }

    // Replace all variables in double curly braces, except reserved ones
    let processedContent = htmlContent;

    // Match all variables in double curly braces: {{variable_name}}
    const variableRegex = /\{\{([^}]+)\}\}/g;

    processedContent = processedContent.replace(
      variableRegex,
      (match, variableName) => {
        // Check if it's a reserved variable
        if (RESERVED_VARIABLES.includes(variableName.trim())) {
          // Keep reserved variables as is
          return match;
        }
        // Replace non-reserved variables with underscores
        return "________";
      },
    );

    return processedContent;
  };

  // Function to check if content has a specific variable
  const hasVariable = (htmlContent, variableName) => {
    if (!htmlContent || typeof htmlContent !== "string") {
      return false;
    }
    return htmlContent.includes(`{{${variableName}}}`);
  };

  // Check if content has any {{ variable }} placeholder
  const hasAnyVariable = (htmlContent) => {
    if (!htmlContent || typeof htmlContent !== "string") return false;
    return /\{\{[^}]+\}\}/.test(htmlContent);
  };

  // Function to split content by ALL variables and return parts with markers.
  // Reserved variables (annex_a_selection, aircraft_options, additional_charges) get their tables;
  // any other {{ var }} gets a simple Variable/Value table.
  const splitByVariables = (htmlContent) => {
    if (!htmlContent || typeof htmlContent !== "string") {
      return [];
    }
    const result = [];
    // Match ALL variables: {{ anything }}
    const variableRegex = /\{\{([^}]+)\}\}/g;
    let match;
    let lastIndex = 0;

    while ((match = variableRegex.exec(htmlContent)) !== null) {
      const variableName = (match[1] || "").trim();
      // Content before this variable
      if (match.index > lastIndex) {
        const beforeContent = htmlContent.substring(lastIndex, match.index);
        if (beforeContent.trim()) {
          result.push({
            content: DOMPurify.sanitize(beforeContent),
            needsAnnexTable: false,
            needsAircraftTable: false,
            needsAdditionalChargesTable: false,
            needsVariableTable: false,
          });
        }
      }
      // Marker for this variable: reserved tables or generic variable table
      if (variableName === "annex_a_selection") {
        result.push({
          content: "",
          needsAnnexTable: true,
          needsAircraftTable: false,
          needsAdditionalChargesTable: false,
          needsVariableTable: false,
        });
      } else if (variableName === "aircraft_options") {
        result.push({
          content: "",
          needsAnnexTable: false,
          needsAircraftTable: true,
          needsAdditionalChargesTable: false,
          needsVariableTable: false,
        });
      } else if (variableName === "additional_charges") {
        result.push({
          content: "",
          needsAnnexTable: false,
          needsAircraftTable: false,
          needsAdditionalChargesTable: true,
          needsVariableTable: false,
        });
      } else {
        result.push({
          content: "",
          needsAnnexTable: false,
          needsAircraftTable: false,
          needsAdditionalChargesTable: false,
          needsVariableTable: true,
          variableName,
        });
      }
      lastIndex = variableRegex.lastIndex;
    }
    // Remaining content after last variable
    if (lastIndex < htmlContent.length) {
      const remainingContent = htmlContent.substring(lastIndex);
      if (remainingContent.trim()) {
        result.push({
          content: DOMPurify.sanitize(remainingContent),
          needsAnnexTable: false,
          needsAircraftTable: false,
          needsAdditionalChargesTable: false,
          needsVariableTable: false,
        });
      }
    }
    if (result.length === 0) {
      result.push({
        content: DOMPurify.sanitize(htmlContent),
        needsAnnexTable: false,
        needsAircraftTable: false,
        needsAdditionalChargesTable: false,
        needsVariableTable: false,
      });
    }
    return result;
  };

  /*-----------------Add remove table column---------------------*/

  const [rows, setRows] = useState([
    // { subSection: "3.4.1 (a)(c)1", description: "GPU", perUnit: "", rate: "" },
    // { subSection: "3.4.1 (a)(c)5", description: "Air Starter Unit", perUnit: "", rate: "" },
  ]);

  // Add new row (empty inputs)
  const addRow = () => {
    setRows([
      ...rows,
      { subSection: "", description: "", perUnit: "", rate: "" },
    ]);
  };

  // Remove row
  const removeRow = (index) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  // Handle input change
  const handleChange = (rowIndex, key, value) => {
    const updatedRows = [...rows];
    updatedRows[rowIndex][key] = value;
    setRows(updatedRows);
  };

  return (
    <>
      <div
        className="d-flex justify-content-center align-items-center flex-column gap-2 mb-2 p-3 sticky-top"
        style={{ background: "#f6e9f7", borderRadius: "10px" }}
      >
        <h6>IATA STANDARD GROUND HANDLING AGREEMENT ANNEX BX.X-Kolkata</h6>
        <div className="d-flex gap-4">
          <div className="d-flex align-items-center">
            <Checkbox
              inputId="ingredient1"
              name="servic"
              value="Comp"
              checked={annexAStates?.serviceTypes?.comp || false}
              disabled
            />
            <label htmlFor="ingredient1" className="ms-2">
              <b>COMP</b>
            </label>
          </div>

          <div className="d-flex align-items-center">
            <Checkbox
              inputId="ingredient2"
              name="servic"
              value="Ramp"
              checked={annexAStates?.serviceTypes?.ramp || false}
              disabled
            />
            <label htmlFor="ingredient2" className="ms-2">
              <b>Ramp</b>
            </label>
          </div>

          <div className="d-flex align-items-center">
            <Checkbox
              inputId="ingredient3"
              name="servic"
              value="Cargo"
              checked={annexAStates?.serviceTypes?.cargo || false}
              disabled
            />
            <label htmlFor="ingredient3" className="ms-2">
              <b>Cargo</b>
            </label>
          </div>
        </div>
      </div>
      <div className="annex-b comSty">
        <Accordion activeIndex={0}>
          <AccordionTab header="Agreed Services and Charges">
            <Table borderless>
              <tbody>
                <tr>
                  <td>
                    <h6>Agreed Services and Charges</h6>
                    <span>
                      to the Standard Ground Handling Agreement (SGHA) of
                      January 2023
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="">
                    <span>between: </span>
                    <b className="mb-0">Malindo Airways SDN BHD</b>
                  </td>
                </tr>
                <tr>
                  <td className="">
                    <span>having its principal office at:</span>
                    <b className="mb-0"></b>
                  </td>
                </tr>
                <tr>
                  <td className="">
                    <span>having its principal office at·</span>
                    <b className="mb-0">Petaling Jaya, Malaysia</b>
                  </td>
                </tr>
                <tr>
                  <td>hereinafter referred to as the 'Carrier'</td>
                  <b className="mb-0"></b>
                </tr>
                <tr>
                  <td className="">
                    <span>and:</span>
                    <b className="mb-0">INDOTHAI KOLKATA PRIVATE LIMITED</b>
                  </td>
                </tr>
                <tr>
                  <td className="">
                    <span>having its principal office at·</span>
                    <b className="mb-0">Kolkata, IN</b>
                  </td>
                </tr>
                <tr>
                  <td>
                    the Carrier and/or the Handling Company may hereinafter be
                    referred to as the "Party(ies)" effective from:
                  </td>
                </tr>

                <tr>
                  <td className="">
                    <span>This Annex BX.X for </span>
                    <b className="mb-0"></b>
                  </td>
                </tr>
                <tr>
                  <td className="">
                    <span>the location(s) :</span>
                    <b className="mb-0"></b>
                  </td>
                </tr>
                <tr>
                  <td className="">
                    <span>is valid from:</span>
                    <b className="mb-0"></b>
                  </td>
                </tr>
                <tr>
                  <td className="">
                    <span>and replaces : </span>
                    <b className="mb-0"></b>
                  </td>
                </tr>
              </tbody>
            </Table>
          </AccordionTab>
          <AccordionTab header="Charges">
            <div>
              {/* Steps header only when we have template data — no fallback sections */}
              {items.length > 0 && (
                <div className="steps-scroll overflow-x-auto" ref={stepsRef}>
                  <Steps
                    model={items}
                    activeIndex={activeIndex}
                    readOnly={true}
                  />
                </div>
              )}

              {/* Step Content */}
              <div className="p-4 mt-4 rounded">
                {loadingTemplate ? (
                  <div className="text-center p-4">
                    <p>Loading template data...</p>
                  </div>
                ) : parsedSections.length > 0 ? (
                  // Dynamic content from template
                  parsedSections.map(
                    (section, sectionIndex) =>
                      sectionIndex === activeIndex && (
                        <div key={section.id || sectionIndex}>
                          {section.headingNo && (
                            <h6>
                              {section.headingNo && (
                                <span className="me-2">
                                  {section.headingNo}
                                </span>
                              )}
                              <b>{section.heading}</b>
                            </h6>
                          )}
                          {!section.headingNo && section.heading && (
                            <h6>
                              <b>{section.heading}</b>
                            </h6>
                          )}
                          <hr />
                          {section.editor &&
                            section.editor.value &&
                            (() => {
                              const hasAnyVar = hasAnyVariable(
                                section.editor.value,
                              );
                              if (hasAnyVar) {
                                const parts = splitByVariables(
                                  section.editor.value,
                                );
                                return (
                                  <div className="mt-4">
                                    {parts.map((partObj, partIndex) => (
                                      <React.Fragment key={partIndex}>
                                        {partObj.needsAnnexTable &&
                                          renderAnnexASelectionTable()}
                                        {partObj.needsAircraftTable &&
                                          renderAircraftOptionsTable()}
                                        {partObj.needsAdditionalChargesTable &&
                                          renderAdditionalChargesTable()}
                                        {partObj.needsVariableTable &&
                                          partObj.variableName && (
                                            <Table
                                              bordered
                                              size="sm"
                                              className="mb-3 mt-2"
                                            >
                                              <thead>
                                                <tr>
                                                  <th
                                                    style={{ width: "200px" }}
                                                  >
                                                    Variable
                                                  </th>
                                                  <th>Value</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                <tr>
                                                  <td>
                                                    {partObj.variableName.replace(
                                                      /_/g,
                                                      " ",
                                                    )}
                                                  </td>
                                                  <td>
                                                    <span
                                                      className="border-bottom d-inline-block"
                                                      style={{
                                                        minWidth: "200px",
                                                      }}
                                                    >
                                                      ________________
                                                    </span>
                                                  </td>
                                                </tr>
                                              </tbody>
                                            </Table>
                                          )}
                                        {partObj.content &&
                                          partObj.content.trim() &&
                                          (stringLooksLikeHtml(partObj.content) ? (
                                            <div
                                              className="sgha-doc-html"
                                              dangerouslySetInnerHTML={{
                                                __html: DOMPurify.sanitize(
                                                  partObj.content,
                                                ),
                                              }}
                                            />
                                          ) : (
                                            <div className="sgha-doc-html sgha-doc-plain">
                                              {partObj.content}
                                            </div>
                                          ))}
                                      </React.Fragment>
                                    ))}
                                  </div>
                                );
                              }
                              const processedContent =
                                replaceVariablesWithUnderscores(
                                  section.editor.value,
                                );
                              if (!stringLooksLikeHtml(processedContent)) {
                                return (
                                  <div className="mt-4 sgha-doc-html sgha-doc-plain">
                                    {processedContent}
                                  </div>
                                );
                              }
                              return (
                                <div
                                  className="mt-4 sgha-doc-html"
                                  dangerouslySetInnerHTML={{
                                    __html:
                                      DOMPurify.sanitize(processedContent),
                                  }}
                                />
                              );
                            })()}
                          {!section.editor && (
                            <p className="mt-4 text-muted">
                              No content available for this section.
                            </p>
                          )}
                        </div>
                      ),
                  )
                ) : (
                  // Content comes only from the selected template; no static fallback
                  <div className="p-4 text-center text-muted">
                    <p className="mb-0">
                      No template content available for the selected template
                      (Year {agreementYear}
                      {templateName ? ` – ${templateName}` : ""}).
                    </p>
                    <p className="small mt-2 mb-0">
                      Annex B data is loaded only from the template you selected
                      on the previous step.
                    </p>
                  </div>
                )}
              </div>

              {/* Navigation buttons */}
              <div className="d-flex justify-content-end gap-3 mt-4">
                {/* Hide Previous on first step */}
                {activeIndex > 0 ? (
                  <Button
                    icon="pi pi-arrow-left"
                    onClick={() => setActiveIndex((prev) => prev - 1)}
                    className="py-2"
                    severity="warning"
                  />
                ) : (
                  <span /> // keeps spacing consistent
                )}

                {/* Next/Finish button */}
                <Button
                  label={
                    items.length === 0 || activeIndex === items.length - 1
                      ? isSubmitting
                        ? "Submitting..."
                        : "Submit"
                      : ""
                  }
                  icon={
                    items.length === 0 || activeIndex === items.length - 1
                      ? isSubmitting
                        ? "pi pi-spin pi-spinner"
                        : "pi pi-send"
                      : "pi pi-arrow-right"
                  }
                  iconPos="right"
                  onClick={handleNext}
                  className="py-2"
                  severity="warning"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </AccordionTab>
        </Accordion>
      </div>
      <CustomToast ref={toastRef} />
    </>
  );
};

export default Sgha_annexB;
