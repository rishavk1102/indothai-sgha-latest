import DOMPurify from "dompurify";
import { Avatar } from "primereact/avatar";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Checkbox } from "primereact/checkbox";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { TabPanel, TabView } from "primereact/tabview";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Badge,
  Breadcrumb,
  Card,
  Col,
  Form,
  Row,
  Table,
} from "react-bootstrap";
import { AiOutlineEdit, AiOutlineForm } from "react-icons/ai";
import { BiText } from "react-icons/bi";
import { FaHeading } from "react-icons/fa";
import { IoChevronBackOutline } from "react-icons/io5";
import { LuTable } from "react-icons/lu";
import {
  MdCheckBox,
  MdFlight,
  MdFormatListNumbered,
  MdOutlineSubdirectoryArrowRight,
  MdSubtitles,
} from "react-icons/md";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import CustomEditor from "../../components/CustomEditor";
import { useAuth } from "../../context/AuthContext";
import { getSocket } from "../../context/socket";
import GifLoder from "../../interfaces/GifLoder";
import { generateSubmissionPDF } from "../../utils/generateSubmissionPDF";

const AgreedServicesCharges = () => {
  const { role, userId, username } = useAuth();
  const navigate = useNavigate();
  const goBack = () => {
    navigate(-1);
  };

  const [expandedRow, setExpandedRow] = useState(null);
  const [visible, setVisible] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusCounts, setStatusCounts] = useState({
    Pending: 0,
    "In Progress": 0,
    Completed: 0,
    Suspended: 0,
    Cancelled: 0,
    Expired: 0,
  });
  const [activeStatus, setActiveStatus] = useState("Pending");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [perPage, setPerPage] = useState(15);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [effectiveStartDate, setEffectiveStartDate] = useState(null);
  const [effectiveEndDate, setEffectiveEndDate] = useState(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [itemTextMap, setItemTextMap] = useState({}); // Map of item numbers to their text
  const [sectionTitles, setSectionTitles] = useState({}); // Map of section keys to their titles
  const [dialogVariables, setDialogVariables] = useState({}); // Variables for the dialog
  const [dialogTemplateVariables, setDialogTemplateVariables] = useState([]); // Template variable names for dialog
  const [loadingDialogVariables, setLoadingDialogVariables] = useState(false); // Loading state for dialog variables
  const [submissionVariables, setSubmissionVariables] = useState({}); // Map of submission_id to variables
  const [templateVariables, setTemplateVariables] = useState({}); // Map of submission_id to template variable names
  const [loadingVariables, setLoadingVariables] = useState({}); // Map of submission_id to loading state
  const isClosingRef = useRef(false); // Ref to track if we're intentionally closing

  // Comment state
  const [commentVisible, setCommentVisible] = useState(false);
  const [commentSubmission, setCommentSubmission] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [sendingComment, setSendingComment] = useState(false);
  const commentsEndRef = useRef(null);

  // Edit agreement state (template-based like createSGHATemplate)
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [editSubmission, setEditSubmission] = useState(null);
  const [editFields, setEditFields] = useState([]);
  const [editTemplateData, setEditTemplateData] = useState(null);
  const [editNote, setEditNote] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // Snapshot of editFields when dialog opened (for correct edit history when submission had no _templateFields)
  const initialEditFieldsRef = useRef(null);
  const submissionHadTemplateFieldsRef = useRef(false);

  // History state (employee can see what was changed)
  const [historyDialogVisible, setHistoryDialogVisible] = useState(false);
  const [historySubmission, setHistorySubmission] = useState(null);
  const [editHistory, setEditHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const senderType = role === "Client" ? "Client" : "Employee";

  const toggleRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  // Fetch comments for a submission
  const fetchComments = async (submissionId) => {
    try {
      setCommentsLoading(true);
      const res = await api.get(
        `/api/client/submissions/${submissionId}/comments`,
      );
      if (res.data && res.data.data) {
        setComments(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  // Open comment dialog
  const openCommentDialog = (submission) => {
    setCommentSubmission(submission);
    setCommentVisible(true);
    setReplyingTo(null);
    setNewMessage("");
    fetchComments(submission.submission_id);
  };

  // Send comment or reply
  const handleSendComment = async () => {
    if (!newMessage.trim() || !commentSubmission) return;

    try {
      setSendingComment(true);
      await api.post(
        `/api/client/submissions/${commentSubmission.submission_id}/comments`,
        {
          sender_type: senderType,
          sender_id: userId,
          sender_name: username || "Unknown",
          message: newMessage.trim(),
          parent_comment_id: replyingTo?.comment_id || null,
        },
      );
      setNewMessage("");
      setReplyingTo(null);
      await fetchComments(commentSubmission.submission_id);
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      console.error("Error sending comment:", err);
    } finally {
      setSendingComment(false);
    }
  };

  // Listen for real-time comment events
  useEffect(() => {
    try {
      const socket = getSocket();
      if (socket) {
        const handler = (data) => {
          if (
            commentSubmission &&
            data.submission_id === commentSubmission.submission_id
          ) {
            fetchComments(commentSubmission.submission_id);
          }
        };
        socket.on("submission-comment-added", handler);
        return () => socket.off("submission-comment-added", handler);
      }
    } catch (e) {
      // Socket not connected yet
    }
  }, [commentSubmission]);

  // Format comment time
  const formatCommentTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Function to close dialog and reset state
  const closeDialog = useCallback(() => {
    if (isClosingRef.current) return; // Prevent double close
    isClosingRef.current = true;

    setVisible(false);
    setSelectedSubmission(null);
    setSelectedStatus(null);
    setEffectiveStartDate(null);
    setEffectiveEndDate(null);
    setDialogVariables({});
    setDialogTemplateVariables([]);
    setLoadingDialogVariables(false);

    // Reset the ref after a short delay
    setTimeout(() => {
      isClosingRef.current = false;
    }, 100);
  }, []);

  // Parse HTML content to extract items with their text and numbers
  const parseHTMLContent = useCallback((htmlString) => {
    console.log("=== PARSE HTML: Starting parseHTMLContent ===", {
      htmlLength: htmlString?.length,
      htmlType: typeof htmlString,
      htmlPreview: htmlString?.substring(0, 200),
    });

    if (!htmlString) {
      console.warn("=== PARSE HTML: No HTML string provided ===");
      return { items: {} };
    }

    try {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = DOMPurify.sanitize(htmlString, {
        ALLOWED_TAGS: ["ol", "ul", "li"],
      });

      console.log("=== PARSE HTML: After sanitization ===", {
        innerHTML: tempDiv.innerHTML.substring(0, 500),
      });

      const allLists = Array.from(tempDiv.querySelectorAll("ol, ul"));
      console.log("=== PARSE HTML: All lists found ===", {
        totalLists: allLists.length,
        listTags: allLists.map((list) => list.tagName),
      });

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

      console.log("=== PARSE HTML: Top level lists ===", {
        count: topLevelLists.length,
        listTags: topLevelLists.map((list) => list.tagName),
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

        console.log(`=== PARSE HTML: Processing list element ===`, {
          tagName: listElement.tagName,
          childrenCount: allChildren.length,
          parentIndexPath,
          isTopLevelList,
        });

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

            console.log(`=== PARSE HTML: Created item ===`, {
              id: itemId,
              index: hierarchicalIndex,
              textPreview: cleanText.substring(0, 50),
              hasSubItems: (subItems?.length || 0) > 0,
            });

            itemsMap[itemId] = itemData;
            items.push(itemData);
          }
        }

        return items;
      };

      topLevelLists.forEach((list, idx) => {
        console.log(`=== PARSE HTML: Processing top level list ${idx + 1} ===`);
        convertListItems(list, [], true);
      });

      console.log("=== PARSE HTML: Final itemsMap ===", {
        totalItems: Object.keys(itemsMap).length,
        sampleItems: Object.values(itemsMap)
          .slice(0, 5)
          .map((item) => ({
            id: item.id,
            index: item.index,
            text: item.text?.substring(0, 50),
          })),
      });

      return { items: itemsMap };
    } catch (error) {
      console.error("=== PARSE HTML: Error parsing HTML content ===", error);
      return { items: {} };
    }
  }, []);

  // Parse template data to create a map of item numbers to text
  const parseTemplateData = useCallback(
    (templateData) => {
      console.log("=== PARSE TEMPLATE: Starting parseTemplateData ===", {
        hasData: !!templateData,
        isArray: Array.isArray(templateData),
        length: Array.isArray(templateData) ? templateData.length : "N/A",
        firstFewFields: Array.isArray(templateData)
          ? templateData.slice(0, 10)
          : templateData,
      });

      if (!templateData || !Array.isArray(templateData)) {
        console.warn("=== PARSE TEMPLATE: Invalid template data ===", {
          type: typeof templateData,
          isArray: Array.isArray(templateData),
          value: templateData,
        });
        setItemTextMap({});
        return;
      }

      const sectionMap = {};
      const titlesMap = {}; // Map to store section titles
      let currentSection = null;
      let currentMainSection = null;
      let mainSectionHeading = null; // Store main section heading (e.g., "MANAGEMENT AND ADMINISTRATIVE FUNCTIONS")

      console.log("=== PARSE TEMPLATE: Iterating through template fields ===", {
        totalFields: templateData.length,
      });

      templateData.forEach((field, index) => {
        if (index < 20) {
          // Log first 20 fields for debugging
          console.log(`=== PARSE TEMPLATE: Field ${index} ===`, {
            type: field.type,
            value: field.value?.substring
              ? field.value.substring(0, 100)
              : field.value,
          });
        }

        if (field.type === "heading_no") {
          const sectionNum = String(field.value);
          console.log(
            `=== PARSE TEMPLATE: Found heading_no "${sectionNum}" ===`,
            {
              index,
              currentMainSection,
            },
          );

          if (["1", "2", "3", "4", "5", "6", "7", "8"].includes(sectionNum)) {
            if (
              index + 1 < templateData.length &&
              templateData[index + 1].type === "heading"
            ) {
              currentMainSection = sectionNum;
              mainSectionHeading = templateData[index + 1].value; // Store main heading
              console.log(
                `=== PARSE TEMPLATE: Set currentMainSection to "${sectionNum}", mainHeading: "${mainSectionHeading}" ===`,
              );
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
              // Create section title: "MAIN HEADING - SECTION_NUM SUBHEADING"
              const subheadingText = nextField.value || "";
              const sectionLabel = mainSectionHeading
                ? `${mainSectionHeading} - ${sectionNum} ${subheadingText}`
                : `${sectionNum} ${subheadingText}`;
              titlesMap[currentSection] = sectionLabel;
              console.log(
                `=== PARSE TEMPLATE: Set currentSection to "${sectionNum}", title: "${sectionLabel}" ===`,
              );
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
            // Get subheading text from next field
            const nextField =
              index + 1 < templateData.length ? templateData[index + 1] : null;
            const subheadingText =
              nextField && nextField.type === "subheading"
                ? nextField.value
                : "";
            const sectionLabel = mainSectionHeading
              ? `${mainSectionHeading} - ${headingNo} ${subheadingText}`
              : `${headingNo} ${subheadingText}`;
            titlesMap[currentSection] = sectionLabel;
            console.log(
              `=== PARSE TEMPLATE: Found subheading_no "${headingNo}", set currentSection, title: "${sectionLabel}" ===`,
            );
            return;
          }
        }

        if (field.type === "editor" && currentSection && currentMainSection) {
          if (sectionMap[currentSection]) {
            sectionMap[currentSection].editorContent = field.value;
            console.log(
              `=== PARSE TEMPLATE: Added editor content to section "${currentSection}" ===`,
              {
                contentLength: field.value ? field.value.length : 0,
                contentPreview: field.value
                  ? field.value.substring(0, 200)
                  : null,
              },
            );
          }
        }
      });

      // Store section titles
      setSectionTitles(titlesMap);

      console.log("=== PARSE TEMPLATE: Section map created ===", {
        sectionKeys: Object.keys(sectionMap),
        sectionsWithContent: Object.keys(sectionMap).filter(
          (key) => sectionMap[key].editorContent,
        ),
        sectionDetails: Object.entries(sectionMap).map(([key, value]) => ({
          key,
          hasContent: !!value.editorContent,
          contentLength: value.editorContent ? value.editorContent.length : 0,
        })),
      });

      // Parse each section's content and build item text map
      const textMap = {};
      Object.keys(sectionMap).forEach((sectionKey) => {
        const sectionInfo = sectionMap[sectionKey];
        console.log(
          `=== PARSE TEMPLATE: Processing section ${sectionKey} ===`,
          {
            hasEditorContent: !!sectionInfo.editorContent,
            contentLength: sectionInfo.editorContent
              ? sectionInfo.editorContent.length
              : 0,
            contentPreview: sectionInfo.editorContent
              ? sectionInfo.editorContent.substring(0, 300)
              : null,
          },
        );

        if (sectionInfo.editorContent) {
          const parsedContent = parseHTMLContent(sectionInfo.editorContent);
          const itemsMap = parsedContent?.items || {};

          console.log(
            `=== PARSE TEMPLATE: Parsed HTML for section ${sectionKey} ===`,
            {
              itemsCount: Object.keys(itemsMap).length,
              itemIds: Object.keys(itemsMap).slice(0, 5),
              sampleItems: Object.values(itemsMap)
                .slice(0, 3)
                .map((item) => ({
                  id: item.id,
                  index: item.index,
                  text: item.text?.substring(0, 50),
                  subItemsCount: item.subItems?.length || 0,
                })),
            },
          );

          // Build map: hierarchicalIndex -> text
          // IMPORTANT: Prefix item indices with section key (e.g., "1.1" + "." + "1" = "1.1.1")
          Object.values(itemsMap).forEach((item) => {
            if (item.index && item.text) {
              // Create full item number by combining section key with item index
              // For section "1.1" and item index "1", this becomes "1.1.1"
              const fullItemNumber = `${sectionKey}.${item.index}`;
              textMap[fullItemNumber] = item.text;

              // Also map the "-main" variant (e.g., "1.1.1-main")
              textMap[`${fullItemNumber}-main`] = item.text;

              console.log(
                `=== PARSE TEMPLATE: Mapped ${fullItemNumber} (from section ${sectionKey}, item ${item.index}) -> ${item.text.substring(0, 50)}... ===`,
              );

              // Also map sub-items with full path - support both letter AND numeric suffixes
              if (item.subItems && Array.isArray(item.subItems)) {
                item.subItems.forEach((subItem, subIndex) => {
                  if (subItem.index && subItem.text) {
                    // The subItem.index is hierarchical like "1.1", "1.2", etc., where:
                    // - "1.1" means it's the first sub-item of main item "1"
                    // - "1.2" means it's the second sub-item of main item "1"
                    const indexParts = subItem.index.split(".");
                    const lastPart = indexParts[indexParts.length - 1];
                    const numericIndex = parseInt(lastPart, 10);

                    if (!isNaN(numericIndex) && numericIndex > 0) {
                      // Map with LETTER suffix (e.g., "1.1.1.a") for legacy support
                      const letter = String.fromCharCode(96 + numericIndex); // 'a' = 97, so 1 -> 97, 2 -> 98, etc.
                      const fullSubItemNumberLetter = `${fullItemNumber}.${letter}`;
                      textMap[fullSubItemNumberLetter] = subItem.text;

                      // ALSO map with NUMERIC suffix (e.g., "1.1.1.1") for new format
                      const fullSubItemNumberNumeric = `${fullItemNumber}.${numericIndex}`;
                      textMap[fullSubItemNumberNumeric] = subItem.text;

                      console.log(
                        `=== PARSE TEMPLATE: Mapped sub-item ${fullSubItemNumberLetter} AND ${fullSubItemNumberNumeric} (from section ${sectionKey}, main item ${item.index}, sub-item index ${subItem.index}) -> ${subItem.text.substring(0, 50)}... ===`,
                      );
                    } else {
                      console.warn(
                        `=== PARSE TEMPLATE: Could not convert sub-item index "${subItem.index}" to suffix ===`,
                      );
                    }
                  }
                });
              }
            }
          });
        } else {
          console.warn(
            `=== PARSE TEMPLATE: Section ${sectionKey} has no editor content ===`,
          );
        }
      });

      console.log("=== PARSE TEMPLATE: Final textMap ===", {
        totalItems: Object.keys(textMap).length,
        sampleKeys: Object.keys(textMap).slice(0, 10),
        sampleEntries: Object.entries(textMap)
          .slice(0, 5)
          .map(([key, value]) => ({
            key,
            text: value.substring(0, 50),
          })),
        allKeys: Object.keys(textMap),
      });

      setItemTextMap(textMap);
    },
    [parseHTMLContent],
  );

  // --- Edit agreement (template-based, same format as createSGHATemplate) ---
  const getNextHeadingNumber = (currentFields) => {
    let maxNumber = 0;
    currentFields.forEach((field, index) => {
      if (
        field.type === "heading_no" &&
        field.value &&
        !field.value.includes(".") &&
        index + 1 < currentFields.length &&
        (currentFields[index + 1].type === "heading" ||
          currentFields[index + 1].type === "subheading")
      ) {
        const num = parseInt(field.value, 10);
        if (!isNaN(num) && num > maxNumber) maxNumber = num;
      }
    });
    return maxNumber + 1;
  };

  const getNextSubheadingNumber = (currentFields) => {
    let lastHeadingNumber = 0;
    let lastHeadingIndex = -1;
    for (let i = 0; i < currentFields.length; i++) {
      if (
        currentFields[i].type === "heading_no" &&
        currentFields[i].value &&
        i + 1 < currentFields.length &&
        currentFields[i + 1].type === "heading"
      ) {
        const num = parseInt(currentFields[i].value, 10);
        if (!isNaN(num) && !String(currentFields[i].value).includes(".")) {
          lastHeadingNumber = num;
          lastHeadingIndex = i;
        }
      }
    }
    if (lastHeadingIndex === -1) lastHeadingNumber = 1;
    let subheadingCount = 0;
    if (lastHeadingIndex >= 0) {
      for (let i = lastHeadingIndex + 1; i < currentFields.length; i++) {
        if (
          currentFields[i].type === "heading_no" &&
          currentFields[i].value &&
          String(currentFields[i].value).includes(".")
        ) {
          const parts = String(currentFields[i].value).split(".");
          if (
            parts.length === 2 &&
            parseInt(parts[0], 10) === lastHeadingNumber
          ) {
            const subNum = parseInt(parts[1], 10);
            if (!isNaN(subNum) && subNum > subheadingCount)
              subheadingCount = subNum;
          }
        }
      }
    }
    return `${lastHeadingNumber}.${subheadingCount + 1}`;
  };

  const addEditField = (type, label) => {
    const currentFields = [...editFields];
    let newFields = [];
    if (type === "heading") {
      const nextNum = getNextHeadingNumber(currentFields);
      newFields.push({
        id: Date.now(),
        type: "heading_no",
        label: "Heading No.",
        value: nextNum.toString(),
        checkboxValue: [],
      });
    }
    if (type === "subheading") {
      const nextNum = getNextSubheadingNumber(currentFields);
      newFields.push({
        id: Date.now(),
        type: "heading_no",
        label: "Subheading No.",
        value: nextNum,
        checkboxValue: [],
      });
    }
    const newField =
      type === "table"
        ? {
            id: Date.now() + newFields.length * 1000,
            type,
            label,
            rows: [
              {
                id: Date.now() + newFields.length * 1000 + 1,
                checked: false,
                section: "",
                description: "",
              },
            ],
          }
        : type === "editor"
          ? {
              id: Date.now() + newFields.length * 1000,
              type,
              label,
              value: "",
              checkboxValue: [],
              checkboxConfig: {},
              commentConfig: {},
              variableDefaults: {},
            }
          : {
              id: Date.now() + newFields.length * 1000,
              type,
              label,
              value: "",
              checkboxValue: [],
            };
    newFields.push(newField);
    setEditFields([...currentFields, ...newFields]);
  };

  const handleEditChange = (id, value) => {
    setEditFields((prev) =>
      prev.map((f) => {
        if (f.id === id) {
          if (
            typeof value === "object" &&
            value !== null &&
            !Array.isArray(value)
          ) {
            return {
              ...f,
              value: value.htmlValue ?? f.value ?? "",
              checkboxConfig: value.checkboxConfig ?? f.checkboxConfig ?? {},
              commentConfig: value.commentConfig ?? f.commentConfig ?? {},
              variableDefaults:
                value.variableDefaults ?? f.variableDefaults ?? {},
            };
          }
          return { ...f, value };
        }
        return f;
      }),
    );
  };

  const handleEditCheckboxChange = (id, option) => {
    setEditFields((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              checkboxValue: f.checkboxValue?.includes(option)
                ? f.checkboxValue.filter((o) => o !== option)
                : [...(f.checkboxValue || []), option],
            }
          : f,
      ),
    );
  };

  const addEditTableRow = (fieldId) => {
    setEditFields((prev) =>
      prev.map((f) =>
        f.id === fieldId
          ? {
              ...f,
              rows: [
                ...(f.rows || []),
                {
                  id: Date.now(),
                  checked: false,
                  section: "",
                  description: "",
                },
              ],
            }
          : f,
      ),
    );
  };

  const deleteEditTableRow = (fieldId, rowId) => {
    setEditFields((prev) =>
      prev.map((f) =>
        f.id === fieldId
          ? { ...f, rows: (f.rows || []).filter((r) => r.id !== rowId) }
          : f,
      ),
    );
  };

  const handleEditTableRowChange = (fieldId, rowId, key, value) => {
    setEditFields((prev) =>
      prev.map((f) =>
        f.id === fieldId
          ? {
              ...f,
              rows: (f.rows || []).map((r) =>
                r.id === rowId ? { ...r, [key]: value } : r,
              ),
            }
          : f,
      ),
    );
  };

  const deleteEditField = (id) => {
    setEditFields((prev) => prev.filter((f) => f.id !== id));
  };

  const openEditDialog = useCallback(async (submission) => {
    setEditSubmission(submission);
    setEditDialogVisible(true);
    setEditLoading(true);
    setEditNote("");
    try {
      const res = await api.get(
        `/api/client/annex-a-submissions/${submission.submission_id}/details`,
      );
      if (res.data?.data) {
        const data = res.data.data;
        const selections = data.checkbox_selections || {};
        setEditTemplateData(selections);
        if (
          selections._templateFields &&
          Array.isArray(selections._templateFields) &&
          selections._templateFields.length > 0
        ) {
          submissionHadTemplateFieldsRef.current = true;
          const fields = selections._templateFields;
          setEditFields(fields);
          initialEditFieldsRef.current = JSON.parse(JSON.stringify(fields));
        } else {
          submissionHadTemplateFieldsRef.current = false;
          try {
            const templateRes = await api.get(
              `/sgha_template_content/get/${submission.agreement_year || 2025}/Annex A/Section Template`,
            );
            if (templateRes.data?.data?.content) {
              const content = templateRes.data.data.content;
              const parsed =
                typeof content === "string" ? JSON.parse(content) : content;
              setEditFields(parsed);
              initialEditFieldsRef.current = JSON.parse(JSON.stringify(parsed));
            } else {
              setEditFields([]);
              initialEditFieldsRef.current = [];
            }
          } catch (templateErr) {
            console.error("Error loading template:", templateErr);
            setEditFields([]);
            initialEditFieldsRef.current = [];
          }
        }
      }
    } catch (err) {
      console.error("Error opening edit dialog:", err);
      setEditDialogVisible(false);
    } finally {
      setEditLoading(false);
    }
  }, []);

  const handleSaveEdit = async () => {
    if (!editSubmission) return;
    setEditSaving(true);
    try {
      const updatedSelections = {
        ...(editTemplateData || {}),
        _templateFields: editFields,
      };
      const payload = {
        checkbox_selections: updatedSelections,
        editor_type: "Employee",
        editor_id: userId,
        editor_name: username || "Unknown",
        edit_note: editNote || undefined,
      };
      if (
        !submissionHadTemplateFieldsRef.current &&
        initialEditFieldsRef.current &&
        initialEditFieldsRef.current.length > 0
      ) {
        payload.previous_template_fields = initialEditFieldsRef.current;
      }
      const res = await api.put(
        `/api/client/annex-a-submissions/${editSubmission.submission_id}/edit`,
        payload,
      );
      const newStatus =
        res.data?.data?.status ??
        (editSubmission.status === "Pending"
          ? "In Progress"
          : editSubmission.status);
      const wasPending = editSubmission.status === "Pending";
      setSubmissions((prev) =>
        prev.map((sub) =>
          sub.submission_id === editSubmission.submission_id
            ? {
                ...sub,
                checkbox_selections: updatedSelections,
                status: newStatus,
                updated_at: new Date().toISOString(),
              }
            : sub,
        ),
      );
      if (wasPending && newStatus === "In Progress") {
        setStatusCounts((prev) => ({
          ...prev,
          Pending: Math.max(0, (prev.Pending || 0) - 1),
          "In Progress": (prev["In Progress"] || 0) + 1,
        }));
      }
      setEditTemplateData(updatedSelections);
      setEditDialogVisible(false);
      setEditSubmission(null);
      setEditFields([]);
      setEditNote("");
      setEditTemplateData(null);
      initialEditFieldsRef.current = null;
      submissionHadTemplateFieldsRef.current = false;
      await fetchSubmissions();
    } catch (err) {
      console.error("Error saving edit:", err);
      if (
        err.response?.status === 400 &&
        err.response?.data?.error === "No changes"
      ) {
        alert("No changes detected.");
      } else {
        alert("Failed to save changes. Please try again.");
      }
    } finally {
      setEditSaving(false);
    }
  };

  const renderEditField = (field) => {
    let extraStyle = {};
    if (field.type === "subheading") extraStyle = { paddingLeft: "15px" };
    if (field.type === "sub_child") extraStyle = { paddingLeft: "25px" };
    switch (field.type) {
      case "textarea":
        return (
          <InputTextarea
            rows={3}
            value={field.value || ""}
            onChange={(e) => handleEditChange(field.id, e.target.value)}
            placeholder={field.label}
            className="w-100"
            style={extraStyle}
          />
        );
      case "editor":
        return (
          <CustomEditor
            value={{
              htmlValue: field.value || "",
              checkboxConfig: field.checkboxConfig || {},
              commentConfig: field.commentConfig || {},
              variableDefaults: field.variableDefaults || {},
            }}
            onTextChange={(e) => handleEditChange(field.id, e)}
            style={{ width: "100%", ...extraStyle }}
            placeholder="Start typing your content..."
          />
        );
      case "checkbox":
        return (
          <div className="d-flex gap-3" style={extraStyle}>
            <div className="d-flex align-items-center gap-1">
              <Checkbox
                inputId={`edit-yes-${field.id}`}
                checked={(field.checkboxValue || []).includes("Yes")}
                onChange={() => handleEditCheckboxChange(field.id, "Yes")}
              />
              <label htmlFor={`edit-yes-${field.id}`}>Yes</label>
            </div>
            <div className="d-flex align-items-center gap-1">
              <Checkbox
                inputId={`edit-no-${field.id}`}
                checked={(field.checkboxValue || []).includes("No")}
                onChange={() => handleEditCheckboxChange(field.id, "No")}
              />
              <label htmlFor={`edit-no-${field.id}`}>No</label>
            </div>
          </div>
        );
      case "table":
        return (
          <div style={extraStyle}>
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th style={{ width: "50px" }}></th>
                  <th>Section</th>
                  <th>Description</th>
                  <th style={{ width: "50px" }}></th>
                </tr>
              </thead>
              <tbody>
                {(field.rows || []).map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Checkbox
                        checked={row.checked}
                        onChange={(e) =>
                          handleEditTableRowChange(
                            field.id,
                            row.id,
                            "checked",
                            e.checked,
                          )
                        }
                      />
                    </td>
                    <td>
                      <InputText
                        value={row.section || ""}
                        onChange={(e) =>
                          handleEditTableRowChange(
                            field.id,
                            row.id,
                            "section",
                            e.target.value,
                          )
                        }
                        className="w-100"
                      />
                    </td>
                    <td>
                      <InputTextarea
                        value={row.description || ""}
                        onChange={(e) =>
                          handleEditTableRowChange(
                            field.id,
                            row.id,
                            "description",
                            e.target.value,
                          )
                        }
                        rows={2}
                        className="w-100"
                      />
                    </td>
                    <td>
                      <Button
                        icon="pi pi-trash"
                        severity="danger"
                        className="p-0 border-0"
                        text
                        style={{
                          width: "30px",
                          height: "30px",
                          fontSize: "12px",
                        }}
                        onClick={() => deleteEditTableRow(field.id, row.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="d-flex justify-content-end">
              <Button
                label="Add Row"
                icon="pi pi-plus"
                severity="info"
                className="py-1 px-2 border-0"
                style={{ fontSize: "14px", borderRadius: "5px" }}
                text
                onClick={() => addEditTableRow(field.id)}
              />
            </div>
          </div>
        );
      default:
        return (
          <InputText
            value={field.value || ""}
            onChange={(e) => handleEditChange(field.id, e.target.value)}
            placeholder={field.label}
            className="w-100"
            style={extraStyle}
          />
        );
    }
  };

  // History: fetch and show what was changed
  const fetchEditHistory = async (submissionId) => {
    try {
      setHistoryLoading(true);
      const res = await api.get(
        `/api/client/annex-a-submissions/${submissionId}/history`,
      );
      setEditHistory(res.data?.data || []);
    } catch (err) {
      console.error("Error fetching edit history:", err);
      setEditHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistoryDialog = (submission) => {
    const el = document.activeElement;
    if (el) {
      el.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
      el.blur();
    }
    setHistorySubmission(submission);
    setHistoryDialogVisible(true);
    fetchEditHistory(submission.submission_id);
  };

  const renderChangesSummary = (changes) => {
    if (!changes) return <p className="text-muted mb-0">No changes recorded</p>;
    const { added = [], removed = [], modified = [] } = changes;
    const total = added.length + removed.length + modified.length;
    if (total === 0) return <p className="text-muted mb-0">No changes</p>;
    return (
      <div className="changes-summary">
        {added.length > 0 && (
          <div className="mb-2">
            <small className="fw-bold" style={{ color: "#22c55e" }}>
              <i className="pi pi-plus-circle me-1" />
              Added ({added.length})
            </small>
            {added.map((item, idx) => (
              <div
                key={idx}
                className="ms-3 mt-1 p-2 rounded"
                style={{
                  backgroundColor: "#dcfce7",
                  fontSize: "12px",
                  borderLeft: "3px solid #22c55e",
                }}
              >
                <div style={{ color: "#15803d", fontWeight: 600 }}>
                  {item.fieldLabel || item.key || "Field"}
                </div>
                {item.value &&
                  typeof item.value === "string" &&
                  item.value.length > 0 && (
                    <div
                      className="mt-1"
                      style={{ color: "#166534", fontSize: "11px" }}
                    >
                      Value: &quot;{item.value}&quot;
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}
        {removed.length > 0 && (
          <div className="mb-2">
            <small className="fw-bold" style={{ color: "#ef4444" }}>
              <i className="pi pi-minus-circle me-1" />
              Removed ({removed.length})
            </small>
            {removed.map((item, idx) => (
              <div
                key={idx}
                className="ms-3 mt-1 p-2 rounded"
                style={{
                  backgroundColor: "#fee2e2",
                  fontSize: "12px",
                  borderLeft: "3px solid #ef4444",
                }}
              >
                <div
                  style={{
                    color: "#b91c1c",
                    fontWeight: 600,
                    textDecoration: "line-through",
                  }}
                >
                  {item.fieldLabel || item.key || "Field"}
                </div>
              </div>
            ))}
          </div>
        )}
        {modified.length > 0 && (
          <div className="mb-2">
            <small className="fw-bold" style={{ color: "#f59e0b" }}>
              <i className="pi pi-pencil me-1" />
              Modified ({modified.length})
            </small>
            {modified.map((item, idx) => (
              <div
                key={idx}
                className="ms-3 mt-1 p-2 rounded"
                style={{
                  backgroundColor: "#fef3c7",
                  fontSize: "12px",
                  borderLeft: "3px solid #f59e0b",
                }}
              >
                <div
                  style={{
                    color: "#92400e",
                    fontWeight: 600,
                    marginBottom: "4px",
                  }}
                >
                  {item.fieldLabel || item.key || "Field"}
                </div>
                {item.details?.map((detail, dIdx) => (
                  <div
                    key={dIdx}
                    className="mt-1 ps-2"
                    style={{
                      fontSize: "11px",
                      borderLeft: "2px solid #fbbf24",
                    }}
                  >
                    <span style={{ color: "#78350f", fontWeight: 500 }}>
                      {detail.property}:{" "}
                    </span>
                    <div
                      style={{
                        marginTop: "4px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      {detail.from != null && (
                        <div
                          style={{
                            maxHeight: "200px",
                            overflowY: "auto",
                            padding: "6px 8px",
                            backgroundColor: "rgba(185,28,28,0.06)",
                            borderRadius: "4px",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            fontSize: "11px",
                            color: "#b91c1c",
                            textDecoration: "line-through",
                          }}
                        >
                          {String(detail.from)}
                        </div>
                      )}
                      <span
                        style={{ color: "#808080", alignSelf: "flex-start" }}
                      >
                        →
                      </span>
                      <div
                        style={{
                          maxHeight: "200px",
                          overflowY: "auto",
                          padding: "6px 8px",
                          backgroundColor: "rgba(21,128,61,0.06)",
                          borderRadius: "4px",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          fontSize: "11px",
                          color: "#15803d",
                          fontWeight: 500,
                        }}
                      >
                        {String(detail.to)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    try {
      const socket = getSocket();
      if (socket) {
        const handler = (data) => {
          if (
            historySubmission &&
            data.submission_id === historySubmission.submission_id
          )
            fetchEditHistory(historySubmission.submission_id);
        };
        socket.on("submission-edited", handler);
        return () => socket.off("submission-edited", handler);
      }
    } catch (e) {}
  }, [historySubmission]);

  // Fetch variables when a row is expanded
  const fetchVariables = useCallback(async (submissionId) => {
    try {
      setLoadingVariables((prev) => ({ ...prev, [submissionId]: true }));
      const response = await api.get(
        `/api/client/annex-a-submissions/${submissionId}/variables/template`,
      );

      if (response.data?.data) {
        setSubmissionVariables((prev) => ({
          ...prev,
          [submissionId]: response.data.data.variables || {},
        }));
        setTemplateVariables((prev) => ({
          ...prev,
          [submissionId]: response.data.data.templateVariables || [],
        }));
      }
    } catch (error) {
      console.error("Error fetching variables:", error);
      setSubmissionVariables((prev) => ({ ...prev, [submissionId]: {} }));
      setTemplateVariables((prev) => ({ ...prev, [submissionId]: [] }));
    } finally {
      setLoadingVariables((prev) => ({ ...prev, [submissionId]: false }));
    }
  }, []);

  // Status options for dropdown
  const statusOptions = useMemo(
    () => [
      { name: "Pending", code: "Pending" },
      { name: "In Progress", code: "In Progress" },
      { name: "Completed", code: "Completed" },
      { name: "Suspended", code: "Suspended" },
      { name: "Cancelled", code: "Cancelled" },
      { name: "Expired", code: "Expired" },
    ],
    [],
  );

  // Fetch variables when dialog opens and initialize dates
  useEffect(() => {
    // Only fetch when dialog is visible AND we have a submission
    if (!visible || !selectedSubmission) {
      // Clear variables when dialog closes
      if (!visible) {
        setDialogVariables({});
        setDialogTemplateVariables([]);
        setLoadingDialogVariables(false);
        setEffectiveStartDate(null);
        setEffectiveEndDate(null);
      }
      return;
    }

    // Initialize status from submission
    if (selectedSubmission.status) {
      const currentStatusOption = statusOptions.find(
        (option) => option.code === selectedSubmission.status,
      );
      if (currentStatusOption) {
        setSelectedStatus(currentStatusOption);
      }
    }

    // Initialize dates from submission
    if (selectedSubmission.effective_from) {
      setEffectiveStartDate(new Date(selectedSubmission.effective_from));
    } else {
      setEffectiveStartDate(null);
    }

    if (selectedSubmission.effective_to) {
      setEffectiveEndDate(new Date(selectedSubmission.effective_to));
    } else {
      setEffectiveEndDate(null);
    }

    const fetchDialogVariables = async () => {
      try {
        setLoadingDialogVariables(true);
        const response = await api.get(
          `/api/client/annex-a-submissions/${selectedSubmission.submission_id}/variables/template`,
        );

        console.log("Variables API Response:", response.data);

        if (response.data?.data) {
          const variables = response.data.data.variables || {};
          const templateVars = response.data.data.templateVariables || [];

          console.log("[Status Dialog] Variables API loaded", {
            variables,
            templateVariables: templateVars,
            templateVariablesCount: templateVars.length,
            submission_id: selectedSubmission.submission_id,
          });

          setDialogVariables(variables);
          setDialogTemplateVariables(templateVars);
        } else {
          console.warn("[Status Dialog] No data in response:", response.data);
          setDialogVariables({});
          setDialogTemplateVariables([]);
        }
      } catch (error) {
        console.error("Error fetching variables:", error);
        setDialogVariables({});
        setDialogTemplateVariables([]);
      } finally {
        setLoadingDialogVariables(false);
      }
    };

    fetchDialogVariables();
  }, [visible, selectedSubmission, statusOptions]);

  // Fetch template data when a row is expanded
  useEffect(() => {
    const fetchTemplateData = async () => {
      if (!expandedRow) {
        console.log(
          "=== TEMPLATE DATA: Row collapsed, clearing itemTextMap ===",
        );
        setItemTextMap({});
        setSectionTitles({});
        return;
      }

      // Fetch variables for this submission
      fetchVariables(expandedRow);

      console.log(
        "=== TEMPLATE DATA: Fetching template data for expanded row ===",
        expandedRow,
      );

      try {
        setLoadingTemplate(true);
        const response = await api.get(
          `/sgha_template_content/get/2025/Annex A/Section Template`,
        );

        console.log("=== TEMPLATE DATA: API Response ===", {
          hasData: !!response.data,
          hasContent: !!response.data?.data?.content,
          responseKeys: response.data ? Object.keys(response.data) : [],
          fullResponse: response.data,
        });

        if (response.data?.data?.content) {
          const content = response.data.data.content;
          console.log("=== TEMPLATE DATA: Raw content ===", {
            type: typeof content,
            isString: typeof content === "string",
            length: typeof content === "string" ? content.length : "N/A",
            preview:
              typeof content === "string" ? content.substring(0, 500) : content,
          });

          let parsedContent;
          try {
            parsedContent =
              typeof content === "string" ? JSON.parse(content) : content;
          } catch (parseError) {
            console.error(
              "=== TEMPLATE DATA: Error parsing content ===",
              parseError,
            );
            setItemTextMap({});
            return;
          }

          console.log("=== TEMPLATE DATA: Parsed content ===", {
            isArray: Array.isArray(parsedContent),
            length: Array.isArray(parsedContent) ? parsedContent.length : "N/A",
            firstFewItems: Array.isArray(parsedContent)
              ? parsedContent.slice(0, 5)
              : parsedContent,
            fieldTypes: Array.isArray(parsedContent)
              ? parsedContent
                  .slice(0, 20)
                  .map((f) => f?.type)
                  .filter(Boolean)
              : [],
          });

          // Parse template data to extract item text
          parseTemplateData(parsedContent);
        } else {
          console.warn("=== TEMPLATE DATA: No content found in response ===", {
            responseData: response.data,
            dataData: response.data?.data,
            content: response.data?.data?.content,
          });
        }
      } catch (error) {
        console.error(
          "=== TEMPLATE DATA: Error fetching template data ===",
          error,
        );
        setItemTextMap({});
      } finally {
        setLoadingTemplate(false);
      }
    };

    fetchTemplateData();
  }, [expandedRow, parseTemplateData, fetchVariables]);

  // Get text for an item number
  const getItemText = (itemNumber) => {
    if (!itemNumber) {
      console.log("=== GET ITEM TEXT: No item number provided ===");
      return null;
    }

    console.log(`=== GET ITEM TEXT: Looking for text for "${itemNumber}" ===`, {
      itemTextMapSize: Object.keys(itemTextMap).length,
      itemTextMapKeys: Object.keys(itemTextMap).slice(0, 10),
    });

    // Try direct match first
    if (itemTextMap[itemNumber]) {
      console.log(
        `=== GET ITEM TEXT: Found direct match for "${itemNumber}" ===`,
        itemTextMap[itemNumber].substring(0, 50),
      );
      return itemTextMap[itemNumber];
    }

    // Handle special cases like "1.1.1-main"
    const cleanNumber = itemNumber.replace("-main", "");
    if (itemTextMap[cleanNumber]) {
      console.log(
        `=== GET ITEM TEXT: Found match after removing "-main" for "${itemNumber}" ===`,
        itemTextMap[cleanNumber].substring(0, 50),
      );
      return itemTextMap[cleanNumber];
    }

    // For items with letter suffixes like "1.1.1.a", try to find parent and match
    const letterSuffixMatch = itemNumber.match(/^(\d+\.\d+\.\d+)\.([a-z]+)$/);
    if (letterSuffixMatch) {
      const parentNumber = letterSuffixMatch[1];
      const letter = letterSuffixMatch[2];
      console.log(
        `=== GET ITEM TEXT: Letter suffix match for "${itemNumber}", parent: "${parentNumber}", letter: "${letter}" ===`,
      );

      // Try to find parent item and look for sub-items
      if (itemTextMap[parentNumber]) {
        // The text might be in the parent item's sub-items
        // For now, return parent text with letter indicator
        console.log(
          `=== GET ITEM TEXT: Found parent "${parentNumber}", returning parent text with letter ===`,
        );
        return `${itemTextMap[parentNumber]} (${letter})`;
      } else {
        console.log(
          `=== GET ITEM TEXT: Parent "${parentNumber}" not found in itemTextMap ===`,
        );
      }
    }

    // For items with NUMERIC sub-item suffix like "1.1.1.1", try to find in textMap or parent
    const numericSuffixMatch = itemNumber.match(/^(\d+\.\d+\.\d+)\.(\d+)$/);
    if (numericSuffixMatch) {
      const parentNumber = numericSuffixMatch[1];
      const numericSuffix = numericSuffixMatch[2];
      console.log(
        `=== GET ITEM TEXT: Numeric suffix match for "${itemNumber}", parent: "${parentNumber}", suffix: "${numericSuffix}" ===`,
      );

      // Try direct match first (already mapped with numeric suffix)
      if (itemTextMap[itemNumber]) {
        return itemTextMap[itemNumber];
      }

      // Try to convert numeric to letter and find
      const letterIndex = parseInt(numericSuffix, 10);
      if (!isNaN(letterIndex) && letterIndex > 0) {
        const letter = String.fromCharCode(96 + letterIndex);
        const letterKey = `${parentNumber}.${letter}`;
        if (itemTextMap[letterKey]) {
          console.log(
            `=== GET ITEM TEXT: Found match using letter key "${letterKey}" ===`,
          );
          return itemTextMap[letterKey];
        }
      }

      // If parent exists, indicate it's a sub-item
      if (itemTextMap[parentNumber]) {
        console.log(
          `=== GET ITEM TEXT: Found parent "${parentNumber}", returning sub-item indicator ===`,
        );
        return `${itemTextMap[parentNumber]} (sub-item ${numericSuffix})`;
      }
    }

    // Try partial matches for items that might have different formatting
    const parts = itemNumber.split(".");
    if (parts.length >= 3) {
      const baseNumber = parts.slice(0, 3).join(".");
      if (itemTextMap[baseNumber]) {
        console.log(
          `=== GET ITEM TEXT: Found partial match for "${itemNumber}" using base "${baseNumber}" ===`,
          itemTextMap[baseNumber].substring(0, 50),
        );
        return itemTextMap[baseNumber];
      }
    }

    console.log(`=== GET ITEM TEXT: No match found for "${itemNumber}" ===`);
    return null;
  };

  // Fetch submissions from API
  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/client/annex-a-submissions-list", {
        params: {
          status: activeStatus,
          sortBy: sortOrder,
          limit: perPage,
        },
      });

      if (response.data && response.data.data) {
        setSubmissions(response.data.data);
        setFilteredSubmissions(response.data.data);
        if (response.data.counts) {
          setStatusCounts(response.data.counts);
        }
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
      setSubmissions([]);
      setFilteredSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [activeStatus, sortOrder, perPage]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Filter submissions by search
  useEffect(() => {
    if (!searchValue) {
      setFilteredSubmissions(submissions);
      return;
    }

    const filtered = submissions.filter((submission) => {
      const searchLower = searchValue.toLowerCase();
      return (
        submission.client_name?.toLowerCase().includes(searchLower) ||
        submission.contact_name?.toLowerCase().includes(searchLower) ||
        submission.contact_email?.toLowerCase().includes(searchLower) ||
        submission.contact_phone?.toLowerCase().includes(searchLower) ||
        submission.service_type?.toLowerCase().includes(searchLower)
      );
    });
    setFilteredSubmissions(filtered);
  }, [searchValue, submissions]);

  // Format date from YYYY-MM-DD to DD/MM/YYYY
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Format date and time for submission timestamps (DD/MM/YYYY, HH:MM)
  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year}, ${hours}:${minutes}`;
  };

  // Build one-line summary of Add New SGHA form_details for table column (same as client)
  const getSghaDetailsSummary = (submission) => {
    const fd = submission?.form_details;
    if (!fd || typeof fd !== "object") return "—";
    const parts = [];
    if (fd.company_name) parts.push(fd.company_name);
    if (fd.contact_person) parts.push(`Contact: ${fd.contact_person}`);
    if (fd.applicable_for) parts.push(fd.applicable_for);
    const services = [];
    if (fd.ramp) services.push("Ramp");
    if (fd.comp) services.push("COMP");
    if (fd.cargo) services.push("Cargo");
    if (services.length) parts.push(services.join(", "));
    if (fd.rate) parts.push(`Rate: ${fd.rate}`);
    return parts.length ? parts.join(" · ") : "—";
  };

  // Map statuses to badge colors
  const statusColors = {
    Cancelled: "bg-info text-white",
    Suspended: "bg-danger text-white",
    Completed: "bg-success text-white",
    Expired: "bg-danger text-white",
    Pending: "bg-warning text-dark",
    "In Progress": "bg-primary text-white",
  };

  const handleStatusUpdate = async () => {
    if (!selectedSubmission || !selectedStatus) return;

    // Debug: log state when Update is clicked so you can validate why validation runs or is skipped
    console.log("[Status Update] Update clicked", {
      submission_id: selectedSubmission.submission_id,
      selectedStatus: selectedStatus?.code,
      dialogTemplateVariables,
      dialogTemplateVariablesLength: dialogTemplateVariables.length,
      dialogVariables,
      hasCompanyPricingSection: dialogTemplateVariables.length > 0,
    });

    // Client-side validation: Company's Pricing vars must not be empty or "na"
    if (dialogTemplateVariables.length > 0) {
      const emptyOrNa = dialogTemplateVariables.filter((varName) => {
        const val = (dialogVariables[varName] ?? "")
          .toString()
          .trim()
          .toLowerCase();
        return !val || val === "na" || val === "n/a";
      });
      console.log("[Status Update] Company's Pricing validation", {
        emptyOrNa,
        wouldBlock: emptyOrNa.length > 0,
      });
      if (emptyOrNa.length > 0) {
        const labels = emptyOrNa
          .map((v) =>
            v.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          )
          .join(", ");
        alert(
          `Please enter valid values for Company's Pricing: ${labels}. They cannot be empty or "na".`,
        );
        return;
      }
    } else {
      console.log(
        "[Status Update] Skipping Company's Pricing validation (no template variables)",
      );
    }

    try {
      // Format dates for API (YYYY-MM-DD format)
      const formatDateForAPI = (date) => {
        if (!date) return null;
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      // Update status and effective dates
      await api.put(
        `/api/client/annex-a-submissions/${selectedSubmission.submission_id}/status`,
        {
          status: selectedStatus.code,
          effective_from: formatDateForAPI(effectiveStartDate),
          effective_to: formatDateForAPI(effectiveEndDate),
        },
      );

      // Update variables if there are template variables
      // Send all variables (including empty ones) so they can be saved
      if (dialogTemplateVariables.length > 0) {
        // Build variables object with all template variables
        const variablesToUpdate = {};
        dialogTemplateVariables.forEach((varName) => {
          // Use the value from dialogVariables if set, otherwise use empty string
          variablesToUpdate[varName] = dialogVariables[varName] || "";
        });

        console.log("Updating variables:", variablesToUpdate);

        await api.put(
          `/api/client/annex-a-submissions/${selectedSubmission.submission_id}/variables`,
          { variables: variablesToUpdate },
        );
      }

      // Close dialog
      closeDialog();
      const newStatus = selectedStatus.code;

      // If the updated submission's new status is different from current active status,
      // switch to that tab and refresh data
      if (newStatus !== activeStatus) {
        setActiveStatus(newStatus);
        setSearchValue(""); // Clear search when switching tabs
      } else {
        // If staying on same tab, just refresh the data
        await fetchSubmissions();
      }
    } catch (error) {
      console.error("Error updating status/variables:", error);
      console.error("Error details:", error.response?.data || error.message);
      // Show error message to user
      alert("Failed to update. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="loderDiv">
        <GifLoder />
      </div>
    );
  }

  // Render table content for a specific status
  const renderTableContent = () => (
    <Card className="border-0 shadow-0 p-0">
      <Card.Header className="border-0 shadow-0 pt-3 bg-white">
        <div className="d-flex align-items-center gap-1 justify-content-end filterDiv">
          <label className="me-2">Sort By</label>
          <Form.Select
            aria-label="Sort Order"
            style={{ width: "100px" }}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="ASC">ASC</option>
            <option value="DESC">DESC</option>
          </Form.Select>
          <Form.Select
            aria-label="Limit"
            style={{ width: "100px" }}
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value))}
          >
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </Form.Select>
          <IconField iconPosition="left">
            <InputIcon className="pi pi-search" />
            <InputText
              placeholder="Search"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </IconField>
        </div>
      </Card.Header>
      <Card.Body>
        <Table bordered>
          <thead>
            <tr>
              <th style={{ width: "60px" }}></th>
              <th>Client Name</th>
              <th>Contact Name</th>
              <th style={{ minWidth: "180px" }}>SGHA Details</th>
              <th>Effective To</th>
              <th>Effective From</th>
              <th>Service Type</th>
              <th style={{ width: "150px" }}>Price</th>
              <th style={{ width: "160px" }}>Submission Time</th>
              <th style={{ width: "340px", minWidth: "340px" }}>
                Status/Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredSubmissions.length === 0 ? (
              <tr>
                <td colSpan="10" className="text-center py-4">
                  No submissions found
                </td>
              </tr>
            ) : (
              filteredSubmissions.map((submission) => (
                <React.Fragment key={submission.submission_id}>
                  <tr>
                    <td>
                      <Button
                        icon={
                          expandedRow === submission.submission_id
                            ? "pi pi-minus-circle"
                            : "pi pi-plus-circle"
                        }
                        className="p-0 py-2"
                        text
                        severity="danger"
                        onClick={() => toggleRow(submission.submission_id)}
                      />
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <Avatar
                          className="me-2"
                          style={{
                            backgroundColor: "rgb(197 197 197 / 27%)",
                            color: "rgb(146 74 151)",
                            width: "31px",
                            height: "31px",
                          }}
                          shape="circle"
                        >
                          <MdFlight />
                        </Avatar>
                        <span className="d-flex flex-column gap-1">
                          <b>{submission.client_name}</b>
                        </span>
                      </div>
                    </td>
                    <td>
                      {submission.contact_name}
                      <small className="d-block mt-1 mb-0">
                        E: {submission.contact_email}
                      </small>
                      <small className="d-block mt-1 mb-0">
                        M: {submission.contact_phone}
                      </small>
                    </td>
                    <td>
                      <small
                        className="text-muted"
                        style={{ fontSize: "12px", lineHeight: 1.3 }}
                        title={getSghaDetailsSummary(submission)}
                      >
                        {getSghaDetailsSummary(submission)}
                      </small>
                    </td>
                    <td>{formatDate(submission.effective_to)}</td>
                    <td>{formatDate(submission.effective_from)}</td>
                    <td>{submission.service_type}</td>
                    <td>INR -</td>
                    <td className="small">
                      <span className="d-block">
                        {formatDateTime(submission.submission_timestamp)}
                      </span>
                      {submission.last_employee_edit_at && (
                        <span className="d-block mt-1 text-muted">
                          Employee:{" "}
                          {formatDateTime(submission.last_employee_edit_at)}
                        </span>
                      )}
                    </td>
                    <td>
                      <div
                        className="d-flex align-items-center gap-2 flex-wrap"
                        style={{ minWidth: 0 }}
                      >
                        <Badge
                          className={
                            statusColors[submission.status] ||
                            "bg-secondary text-white"
                          }
                          style={{
                            border: "none",
                            height: "17px",
                            flexShrink: 0,
                          }}
                        >
                          {submission.status}
                        </Badge>
                        <div
                          className="d-flex gap-1 flex-wrap"
                          style={{ minWidth: 0 }}
                        >
                          {role !== "Client" && (
                            <>
                              <Button
                                icon="pi pi-pencil"
                                className="p-0"
                                text
                                severity="danger"
                                style={{ fontSize: "10px", width: "28px" }}
                                tooltip="Update status"
                                tooltipOptions={{ position: "top" }}
                                onClick={() => {
                                  setSelectedSubmission(submission);
                                  setVisible(true);
                                }}
                              />
                              <Button
                                icon="pi pi-file-edit"
                                className="p-0"
                                text
                                severity="secondary"
                                style={{ fontSize: "10px", width: "28px" }}
                                tooltip="Edit agreement"
                                tooltipOptions={{ position: "top" }}
                                onClick={() => openEditDialog(submission)}
                              />
                              <Button
                                icon="pi pi-history"
                                className="p-0"
                                text
                                severity="secondary"
                                style={{
                                  fontSize: "10px",
                                  width: "28px",
                                  flexShrink: 0,
                                }}
                                tooltip="Edit history"
                                tooltipOptions={{
                                  position: "top",
                                  hideDelay: 0,
                                  showDelay: 200,
                                }}
                                onClick={() => openHistoryDialog(submission)}
                              />
                            </>
                          )}
                          <Button
                            icon="pi pi-eye"
                            className="p-0"
                            text
                            severity="help"
                            style={{ fontSize: "10px", width: "28px" }}
                            tooltip="Preview PDF"
                            tooltipOptions={{ position: "top" }}
                            onClick={async () => {
                              try {
                                await generateSubmissionPDF(
                                  submission,
                                  itemTextMap,
                                  sectionTitles,
                                  { openInNewTab: true },
                                );
                              } catch (error) {
                                console.error("Error generating PDF:", error);
                                alert(
                                  "Failed to generate PDF. Please try again.",
                                );
                              }
                            }}
                          />
                          <Button
                            icon="pi pi-file-pdf"
                            className="p-0"
                            text
                            severity="success"
                            style={{ fontSize: "10px", width: "28px" }}
                            tooltip="Download PDF"
                            tooltipOptions={{ position: "top" }}
                            onClick={async () => {
                              try {
                                await generateSubmissionPDF(
                                  submission,
                                  itemTextMap,
                                  sectionTitles,
                                  { openInNewTab: false },
                                );
                              } catch (error) {
                                console.error("Error generating PDF:", error);
                                alert(
                                  "Failed to generate PDF. Please try again.",
                                );
                              }
                            }}
                          />
                          <Button
                            icon="pi pi-comments"
                            className="p-0"
                            text
                            severity="info"
                            style={{ fontSize: "10px", width: "28px" }}
                            tooltip="Comments"
                            tooltipOptions={{ position: "top" }}
                            onClick={() => openCommentDialog(submission)}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>

                  {expandedRow === submission.submission_id && (
                    <tr>
                      <td colSpan="10" style={{ background: "#f3ebf43d" }}>
                        <div className="p-3">
                          {/* Service Type Name */}
                          {submission.checkbox_selections?.serviceTypes && (
                            <h6 className="mb-3">
                              {submission.checkbox_selections.serviceTypes
                                .comp && "COMP"}
                              {submission.checkbox_selections.serviceTypes
                                .ramp && "Ramp"}
                              {submission.checkbox_selections.serviceTypes
                                .cargo && "Cargo"}
                            </h6>
                          )}

                          {/* Scrollable container for sections */}
                          <div
                            style={{
                              overflowX: "auto",
                              overflowY: "visible",
                              width: "100%",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                minWidth: "max-content",
                                gap: "15px",
                              }}
                            >
                              {/* SGHA Details (Add New SGHA form data) - same as client */}
                              {submission.form_details &&
                                typeof submission.form_details === "object" && (
                                  <div
                                    style={{
                                      minWidth: "260px",
                                      maxWidth: "260px",
                                      flexShrink: 0,
                                    }}
                                  >
                                    <div
                                      className="border rounded p-3"
                                      style={{
                                        height: "100%",
                                        minHeight: "300px",
                                      }}
                                    >
                                      <h6 className="mb-3 fw-bold">
                                        SGHA Details
                                      </h6>
                                      <div className="adsbody small">
                                        <ul className="list-unstyled mb-0">
                                          {submission.form_details
                                            .company_name && (
                                            <li className="mb-1">
                                              <strong>Company:</strong>{" "}
                                              {
                                                submission.form_details
                                                  .company_name
                                              }
                                            </li>
                                          )}
                                          {submission.form_details
                                            .contact_person && (
                                            <li className="mb-1">
                                              <strong>Contact:</strong>{" "}
                                              {
                                                submission.form_details
                                                  .contact_person
                                              }
                                            </li>
                                          )}
                                          {submission.form_details.email && (
                                            <li className="mb-1">
                                              <strong>Email:</strong>{" "}
                                              {submission.form_details.email}
                                            </li>
                                          )}
                                          {submission.form_details
                                            .phone_number && (
                                            <li className="mb-1">
                                              <strong>Phone:</strong>{" "}
                                              {
                                                submission.form_details
                                                  .phone_number
                                              }
                                            </li>
                                          )}
                                          {(submission.form_details
                                            .address_line_1 ||
                                            submission.form_details.city) && (
                                            <li className="mb-1">
                                              <strong>Address:</strong>{" "}
                                              {[
                                                submission.form_details
                                                  .address_line_1,
                                                submission.form_details
                                                  .address_line_2,
                                                submission.form_details.city,
                                                submission.form_details
                                                  .post_code,
                                                submission.form_details.state,
                                                submission.form_details.country,
                                              ]
                                                .filter(Boolean)
                                                .join(", ")}
                                            </li>
                                          )}
                                          {(submission.form_details
                                            .pan_card_no ||
                                            submission.form_details.gstn) && (
                                            <li className="mb-1">
                                              <strong>PAN:</strong>{" "}
                                              {submission.form_details
                                                .pan_card_no || "—"}{" "}
                                              <strong>GSTN:</strong>{" "}
                                              {submission.form_details.gstn ||
                                                "—"}
                                            </li>
                                          )}
                                          {(submission.form_details.schedule ||
                                            submission.form_details
                                              .nonschedule) && (
                                            <li className="mb-1">
                                              <strong>Flight type:</strong>{" "}
                                              {[
                                                submission.form_details
                                                  .schedule && "Schedule",
                                                submission.form_details
                                                  .nonschedule &&
                                                  "Non Schedule",
                                              ]
                                                .filter(Boolean)
                                                .join(", ")}
                                            </li>
                                          )}
                                          {(submission.form_details.ramp ||
                                            submission.form_details.comp ||
                                            submission.form_details.cargo) && (
                                            <li className="mb-1">
                                              <strong>Services:</strong>{" "}
                                              {[
                                                submission.form_details.ramp &&
                                                  "Ramp",
                                                submission.form_details.comp &&
                                                  "COMP",
                                                submission.form_details.cargo &&
                                                  "Cargo",
                                              ]
                                                .filter(Boolean)
                                                .join(", ")}
                                            </li>
                                          )}
                                          {submission.form_details
                                            .applicable_for && (
                                            <li className="mb-1">
                                              <strong>Applicable for:</strong>{" "}
                                              {
                                                submission.form_details
                                                  .applicable_for
                                              }
                                            </li>
                                          )}
                                          {submission.form_details.rate && (
                                            <li className="mb-1">
                                              <strong>Rate:</strong>{" "}
                                              {submission.form_details.rate}
                                            </li>
                                          )}
                                          {submission.form_details
                                            .template_year && (
                                            <li className="mb-1">
                                              <strong>Template year:</strong>{" "}
                                              {
                                                submission.form_details
                                                  .template_year
                                              }
                                            </li>
                                          )}
                                          {submission.form_details
                                            .other_details && (
                                            <li className="mb-1">
                                              <strong>Other:</strong>{" "}
                                              {
                                                submission.form_details
                                                  .other_details
                                              }
                                            </li>
                                          )}
                                        </ul>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              {/* Submission Info Column */}
                              <div
                                style={{
                                  minWidth: "250px",
                                  maxWidth: "250px",
                                  flexShrink: 0,
                                }}
                              >
                                <div
                                  className="border rounded p-3"
                                  style={{ height: "100%", minHeight: "300px" }}
                                >
                                  <h6 className="mb-3 fw-bold">
                                    Submission Info
                                  </h6>
                                  <div className="commentbody">
                                    <ul>
                                      <li>
                                        <span className="d-block">
                                          Agreement Year:{" "}
                                          {submission.agreement_year}
                                        </span>
                                        <span className="d-block mt-1">
                                          Submitted (Client):{" "}
                                          {formatDateTime(
                                            submission.submission_timestamp,
                                          )}
                                        </span>
                                        {submission.last_employee_edit_at && (
                                          <span className="d-block mt-1">
                                            Last edited (Employee):{" "}
                                            {formatDateTime(
                                              submission.last_employee_edit_at,
                                            )}
                                          </span>
                                        )}
                                        <span className="d-block mt-1">
                                          <small>
                                            Last Updated:{" "}
                                            {formatDateTime(
                                              submission.updated_at,
                                            )}
                                          </small>
                                        </span>
                                      </li>
                                    </ul>
                                  </div>
                                </div>
                              </div>

                              {/* Company's Pricing Column */}
                              {templateVariables[submission.submission_id]
                                ?.length > 0 && (
                                <div
                                  style={{
                                    minWidth: "300px",
                                    maxWidth: "300px",
                                    flexShrink: 0,
                                  }}
                                >
                                  <div
                                    className="border rounded p-3"
                                    style={{
                                      height: "100%",
                                      minHeight: "300px",
                                    }}
                                  >
                                    <h6 className="mb-3 fw-bold">
                                      Company's Pricing
                                    </h6>
                                    {loadingVariables[
                                      submission.submission_id
                                    ] ? (
                                      <div className="text-center p-3">
                                        <i className="pi pi-spin pi-spinner me-2"></i>
                                        Loading company's pricing...
                                      </div>
                                    ) : (
                                      <div className="adsbody">
                                        <ul className="list-unstyled mb-0">
                                          {templateVariables[
                                            submission.submission_id
                                          ].map((varName) => {
                                            const varValue =
                                              submissionVariables[
                                                submission.submission_id
                                              ]?.[varName] || "";

                                            return (
                                              <li
                                                key={varName}
                                                className="mb-2"
                                              >
                                                <div className="d-flex flex-column gap-1">
                                                  <label className="small fw-semibold">
                                                    {varName
                                                      .replace(/_/g, " ")
                                                      .replace(/\b\w/g, (l) =>
                                                        l.toUpperCase(),
                                                      )}
                                                    :
                                                  </label>
                                                  <span className="small">
                                                    {typeof varValue ===
                                                    "object"
                                                      ? JSON.stringify(varValue)
                                                      : String(
                                                          varValue || "N/A",
                                                        )}
                                                  </span>
                                                </div>
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Status Column */}
                              <div
                                style={{
                                  minWidth: "250px",
                                  maxWidth: "250px",
                                  flexShrink: 0,
                                }}
                              >
                                <div
                                  className="border rounded p-3"
                                  style={{ height: "100%", minHeight: "300px" }}
                                >
                                  <h6 className="mb-3 fw-bold">Status</h6>
                                  <div className="adsbody">
                                    <ul>
                                      <li>
                                        <p className="mb-0">
                                          <b>
                                            Current Status: {submission.status}
                                          </b>
                                        </p>
                                        <p className="mb-0 mt-2">
                                          <small>
                                            Last Updated:{" "}
                                            {formatDateTime(
                                              submission.updated_at,
                                            )}
                                          </small>
                                        </p>
                                      </li>
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );

  return (
    <>
      <Row className="mb-4">
        <Col md={12} lg={4}>
          <Breadcrumb>
            <Breadcrumb.Item onClick={goBack}>
              <IoChevronBackOutline /> Back
            </Breadcrumb.Item>
            <Breadcrumb.Item active>
              Agreed Services and Charges
            </Breadcrumb.Item>
          </Breadcrumb>
        </Col>
      </Row>

      <TabView
        className="mx-0"
        activeIndex={[
          "Pending",
          "In Progress",
          "Completed",
          "Suspended",
          "Cancelled",
          "Expired",
        ].indexOf(activeStatus)}
        onTabChange={(e) => {
          const statuses = [
            "Pending",
            "In Progress",
            "Completed",
            "Suspended",
            "Cancelled",
            "Expired",
          ];
          setActiveStatus(statuses[e.index] || "Pending");
          setSearchValue(""); // Clear search when switching tabs
        }}
      >
        <TabPanel
          header={
            <span className="flex align-items-center gap-4">
              Pending <Badge bg="warning">{statusCounts.Pending}</Badge>
            </span>
          }
        >
          {renderTableContent()}
        </TabPanel>
        <TabPanel
          header={
            <span className="flex align-items-center gap-4">
              In Progress{" "}
              <Badge bg="primary">{statusCounts["In Progress"]}</Badge>
            </span>
          }
        >
          {renderTableContent()}
        </TabPanel>
        <TabPanel
          header={
            <span className="flex align-items-center gap-4">
              Completed <Badge bg="success">{statusCounts.Completed}</Badge>
            </span>
          }
        >
          {renderTableContent()}
        </TabPanel>
        <TabPanel
          header={
            <span className="flex align-items-center gap-2">
              Suspended <Badge bg="danger">{statusCounts.Suspended}</Badge>
            </span>
          }
        >
          {renderTableContent()}
        </TabPanel>
        <TabPanel
          header={
            <span className="flex align-items-center gap-4">
              Cancelled <Badge bg="info">{statusCounts.Cancelled}</Badge>
            </span>
          }
        >
          {renderTableContent()}
        </TabPanel>
        <TabPanel
          header={
            <span className="flex align-items-center gap-4">
              Expired <Badge bg="danger">{statusCounts.Expired}</Badge>
            </span>
          }
        >
          {renderTableContent()}
        </TabPanel>
      </TabView>

      <Dialog
        visible={visible}
        style={{ width: "500px", maxHeight: "80vh" }}
        onHide={closeDialog}
        dismissableMask={true}
        closable={true}
        modal={true}
      >
        <h6>
          {selectedSubmission?.client_name ||
            "Update Status & Company's Pricing"}
        </h6>
        <hr />

        {/* Status Section */}
        <div className="mb-4">
          <label className="mb-2 d-block fw-semibold">Status</label>
          <Dropdown
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.value)}
            options={statusOptions}
            optionLabel="name"
            placeholder="Select a Status"
            className="w-100"
          />
        </div>

        {/* Effective Start Date */}
        <div className="mb-4">
          <label className="mb-2 d-block fw-semibold">
            Effective Start Date
          </label>
          <Calendar
            value={effectiveStartDate}
            onChange={(e) => setEffectiveStartDate(e.value)}
            dateFormat="dd/mm/yy"
            showOnFocus
            className="w-100"
            placeholder="Select effective start date"
          />
        </div>

        {/* Effective End Date */}
        <div className="mb-4">
          <label className="mb-2 d-block fw-semibold">Effective End Date</label>
          <Calendar
            value={effectiveEndDate}
            onChange={(e) => setEffectiveEndDate(e.value)}
            dateFormat="dd/mm/yy"
            showOnFocus
            className="w-100"
            placeholder="Select effective end date"
          />
        </div>

        {/* Company's Pricing Section - Only show if variables exist or are loading */}
        {(loadingDialogVariables || dialogTemplateVariables.length > 0) && (
          <div className="mb-4">
            <label className="mb-2 d-block fw-semibold">
              Company's Pricing
            </label>
            {loadingDialogVariables ? (
              <div className="text-center p-3">
                <i className="pi pi-spin pi-spinner me-2"></i>
                Loading company's pricing...
              </div>
            ) : (
              <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                {dialogTemplateVariables.map((varName) => {
                  const varValue = dialogVariables[varName] || "";

                  return (
                    <div key={varName} className="mb-3">
                      <label className="small fw-semibold d-block mb-1">
                        {varName
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                        :
                      </label>
                      <InputText
                        value={
                          typeof varValue === "object"
                            ? JSON.stringify(varValue)
                            : String(varValue || "")
                        }
                        onChange={(e) => {
                          setDialogVariables((prev) => ({
                            ...prev,
                            [varName]: e.target.value,
                          }));
                        }}
                        className="w-100"
                        placeholder="Enter value"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="d-flex justify-content-end gap-2 mt-3">
          <Button
            label="Cancel"
            icon="pi pi-times"
            className="py-1"
            severity="secondary"
            onClick={closeDialog}
          />
          <Button
            label="Update"
            icon="pi pi-check"
            className="py-1 text-white"
            severity="warning"
            onClick={handleStatusUpdate}
            disabled={!selectedStatus}
          />
        </div>
      </Dialog>

      {/* Edit agreement Dialog - same format as createSGHATemplate (employee only) */}
      {role !== "Client" && (
        <Dialog
          visible={editDialogVisible}
          style={{ width: "95vw", maxWidth: "1100px", maxHeight: "90vh" }}
          header={
            <div className="d-flex align-items-center gap-2">
              <i
                className="pi pi-file-edit"
                style={{ fontSize: "1.1rem", color: "rgb(146 74 151)" }}
              ></i>
              <span>
                Edit agreement{" "}
                {editSubmission ? `- ${editSubmission.client_name}` : ""}
              </span>
            </div>
          }
          onHide={() => {
            setEditDialogVisible(false);
            setEditSubmission(null);
            setEditFields([]);
            setEditNote("");
          }}
          className="p-fluid"
        >
          {editLoading ? (
            <div className="text-center py-5">
              <i className="pi pi-spin pi-spinner me-2"></i>
              <span>Loading submission and template...</span>
            </div>
          ) : (
            <Row>
              <Col md={9} lg={10}>
                <div
                  style={{
                    maxHeight: "calc(80vh - 120px)",
                    overflowY: "auto",
                    overflowX: "hidden",
                  }}
                >
                  <Card className="mb-3 border-0">
                    <Card.Body>
                      {editFields.length === 0 ? (
                        <div className="text-center py-5">
                          <i
                            className="pi pi-inbox"
                            style={{ fontSize: "3rem", color: "#bdbdbd" }}
                          ></i>
                          <p className="mt-3 mb-0 text-muted">
                            No template fields yet. Use the sidebar to add items
                            or load from template.
                          </p>
                        </div>
                      ) : (
                        editFields.map((field, index) => {
                          const isHeadingNo =
                            field.type === "heading_no" &&
                            index + 1 < editFields.length &&
                            (editFields[index + 1].type === "heading" ||
                              editFields[index + 1].type === "subheading");
                          if (isHeadingNo) {
                            const nextField = editFields[index + 1];
                            return (
                              <div key={field.id} className="mb-3">
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                  <div className="d-flex gap-3 align-items-center">
                                    <label
                                      className="fw-bold mb-0"
                                      style={{ minWidth: "100px" }}
                                    >
                                      {field.label}:
                                    </label>
                                    <label
                                      className="fw-bold mb-0"
                                      style={{ flex: 1 }}
                                    >
                                      {nextField.label}:
                                    </label>
                                  </div>
                                  <Button
                                    icon="pi pi-times"
                                    severity="danger"
                                    className="p-0 border-0"
                                    text
                                    style={{
                                      width: "30px",
                                      height: "30px",
                                      fontSize: "12px",
                                    }}
                                    onClick={() => {
                                      deleteEditField(field.id);
                                      deleteEditField(nextField.id);
                                    }}
                                  />
                                </div>
                                <div className="d-flex gap-2 align-items-center">
                                  <div
                                    style={{ width: "150px", flexShrink: 0 }}
                                  >
                                    <InputText
                                      value={field.value}
                                      disabled
                                      className="w-100"
                                    />
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    {renderEditField(nextField)}
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          const wasRendered =
                            index > 0 &&
                            editFields[index - 1].type === "heading_no" &&
                            (field.type === "heading" ||
                              field.type === "subheading");
                          if (wasRendered) return null;
                          return (
                            <div key={field.id} className="mb-3">
                              <label className="fw-bold w-100 mt-2 d-flex align-items-center justify-content-between">
                                {field.label}
                                <Button
                                  icon="pi pi-times"
                                  severity="danger"
                                  className="p-0 border-0"
                                  text
                                  style={{
                                    width: "30px",
                                    height: "30px",
                                    fontSize: "12px",
                                  }}
                                  onClick={() => deleteEditField(field.id)}
                                />
                              </label>
                              <div className="w-100">
                                {renderEditField(field)}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </Card.Body>
                  </Card>
                </div>
              </Col>
              <Col md={3} lg={2}>
                <div className="sticky-top" style={{ top: "0px" }}>
                  <ul
                    className="ItemList"
                    style={{ listStyle: "none", padding: 0, margin: 0 }}
                  >
                    <li
                      onClick={() => addEditField("heading", "Heading")}
                      style={{
                        cursor: "pointer",
                        padding: "8px 12px",
                        border: "1px solid #eee",
                        borderRadius: "5px",
                        marginBottom: "4px",
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <FaHeading className="me-2" />
                      Heading
                    </li>
                    <li
                      onClick={() => addEditField("heading_no", "Heading No.")}
                      style={{
                        cursor: "pointer",
                        padding: "8px 12px",
                        border: "1px solid #eee",
                        borderRadius: "5px",
                        marginBottom: "4px",
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <MdFormatListNumbered className="me-2" />
                      Heading No.
                    </li>
                    <li
                      onClick={() => addEditField("subheading", "Subheading")}
                      style={{
                        cursor: "pointer",
                        padding: "8px 12px",
                        border: "1px solid #eee",
                        borderRadius: "5px",
                        marginBottom: "4px",
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <MdSubtitles className="me-2" />
                      Sub-heading
                    </li>
                    <li
                      onClick={() => addEditField("sub_child", "Sub Child")}
                      style={{
                        cursor: "pointer",
                        padding: "8px 12px",
                        border: "1px solid #eee",
                        borderRadius: "5px",
                        marginBottom: "4px",
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <MdOutlineSubdirectoryArrowRight className="me-2" />
                      Sub-child
                    </li>
                    <li
                      onClick={() => addEditField("input", "Input Box")}
                      style={{
                        cursor: "pointer",
                        padding: "8px 12px",
                        border: "1px solid #eee",
                        borderRadius: "5px",
                        marginBottom: "4px",
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <AiOutlineEdit className="me-2" />
                      Input Box
                    </li>
                    <li
                      onClick={() => addEditField("editor", "Text Editor")}
                      style={{
                        cursor: "pointer",
                        padding: "8px 12px",
                        border: "1px solid #eee",
                        borderRadius: "5px",
                        marginBottom: "4px",
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <AiOutlineForm className="me-2" />
                      Text editor
                    </li>
                    <li
                      onClick={() => addEditField("textarea", "Text Area")}
                      style={{
                        cursor: "pointer",
                        padding: "8px 12px",
                        border: "1px solid #eee",
                        borderRadius: "5px",
                        marginBottom: "4px",
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <BiText className="me-2" />
                      Text Area
                    </li>
                    <li
                      onClick={() => addEditField("table", "Table Field")}
                      style={{
                        cursor: "pointer",
                        padding: "8px 12px",
                        border: "1px solid #eee",
                        borderRadius: "5px",
                        marginBottom: "4px",
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <LuTable className="me-2" />
                      Table
                    </li>
                    <li
                      onClick={() => addEditField("checkbox", "Checkbox")}
                      style={{
                        cursor: "pointer",
                        padding: "8px 12px",
                        border: "1px solid #eee",
                        borderRadius: "5px",
                        marginBottom: "4px",
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <MdCheckBox className="me-2" />
                      Checkbox
                    </li>
                  </ul>
                  <div className="mt-3">
                    <label
                      className="fw-bold mb-1"
                      style={{ fontSize: "13px" }}
                    >
                      Edit note (optional)
                    </label>
                    <InputTextarea
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      rows={2}
                      className="w-100"
                      placeholder="Describe what you changed..."
                      style={{ fontSize: "12px" }}
                    />
                  </div>
                  <div className="mt-3">
                    <Button
                      label="Cancel"
                      severity="secondary"
                      style={{ fontSize: "14px", borderRadius: "5px" }}
                      className="py-1 w-100 d-block mb-2"
                      outlined
                      onClick={() => {
                        setEditDialogVisible(false);
                        setEditSubmission(null);
                        setEditFields([]);
                        setEditNote("");
                        initialEditFieldsRef.current = null;
                        submissionHadTemplateFieldsRef.current = false;
                      }}
                    />
                    <Button
                      label="Save Changes"
                      icon="pi pi-check"
                      severity="success"
                      style={{ fontSize: "14px", borderRadius: "5px" }}
                      className="py-1 w-100 d-block"
                      onClick={handleSaveEdit}
                      loading={editSaving}
                      disabled={editSaving}
                    />
                  </div>
                </div>
              </Col>
            </Row>
          )}
        </Dialog>
      )}

      {/* Edit History Dialog - what was changed (employee) */}
      {role !== "Client" && (
        <Dialog
          visible={historyDialogVisible}
          style={{ width: "600px", maxHeight: "85vh" }}
          header={
            <div className="d-flex align-items-center gap-2">
              <i
                className="pi pi-history"
                style={{ fontSize: "1.1rem", color: "rgb(146 74 151)" }}
              ></i>
              <span>
                Edit History{" "}
                {historySubmission ? `- ${historySubmission.client_name}` : ""}
              </span>
            </div>
          }
          onHide={() => {
            setHistoryDialogVisible(false);
            setHistorySubmission(null);
            setEditHistory([]);
          }}
        >
          {historyLoading ? (
            <div className="text-center py-4">
              <i
                className="pi pi-spin pi-spinner"
                style={{ fontSize: "1.5rem", color: "#808080" }}
              ></i>
              <p className="mt-2 mb-0" style={{ color: "#808080" }}>
                Loading edit history...
              </p>
            </div>
          ) : editHistory.length === 0 ? (
            <div className="text-center py-4">
              <i
                className="pi pi-clock"
                style={{ fontSize: "2.5rem", color: "#bdbdbd" }}
              ></i>
              <p className="mt-2 mb-0" style={{ color: "#808080" }}>
                No edit history yet.
              </p>
              <small className="text-muted">
                Changes will appear here when the agreement is edited.
              </small>
            </div>
          ) : (
            <div style={{ maxHeight: "65vh", overflowY: "auto" }}>
              {editHistory.map((item, idx) => (
                <div
                  key={item.edit_id}
                  className="p-3 mb-3 rounded"
                  style={{
                    border: "1px solid",
                    borderColor:
                      idx === 0 ? "rgba(146, 74, 151, 0.3)" : "#e5e7eb",
                    backgroundColor: idx === 0 ? "#f3f0ff" : "#fff",
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div className="d-flex align-items-center gap-2">
                      <Avatar
                        label={item.editor_name?.charAt(0)?.toUpperCase()}
                        shape="circle"
                        style={{
                          backgroundColor:
                            item.editor_type === "Client"
                              ? "#ff9832"
                              : "rgb(146 74 151)",
                          color: "#fff",
                          width: "32px",
                          height: "32px",
                          minWidth: "32px",
                          fontSize: "14px",
                        }}
                      />
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 600 }}>
                          {item.editor_name}{" "}
                          <Badge
                            className="ms-2"
                            style={{
                              fontSize: "10px",
                              fontWeight: 500,
                              backgroundColor:
                                item.editor_type === "Client"
                                  ? "#ff9832"
                                  : "rgb(146 74 151)",
                              color: "#fff",
                              border: "none",
                            }}
                          >
                            {item.editor_type}
                          </Badge>
                        </div>
                        {item.edit_note && (
                          <p
                            className="mb-0 mt-1"
                            style={{
                              fontSize: "12px",
                              color: "#6b7280",
                              fontStyle: "italic",
                            }}
                          >
                            &quot;{item.edit_note}&quot;
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-end">
                      <div style={{ fontSize: "11px", color: "#808080" }}>
                        {formatCommentTime(item.created_at)}
                      </div>
                      <Badge
                        bg="light"
                        text="dark"
                        className="mt-1"
                        style={{
                          fontSize: "10px",
                          border: "1px solid #e5e7eb",
                        }}
                      >
                        v{item.version}
                      </Badge>
                    </div>
                  </div>
                  {renderChangesSummary(item.changes_summary)}
                </div>
              ))}
            </div>
          )}
        </Dialog>
      )}

      {/* Comment Dialog */}
      <Dialog
        visible={commentVisible}
        style={{ width: "480px", maxHeight: "85vh" }}
        header={
          <div className="d-flex align-items-center gap-2">
            <i
              className="pi pi-comments"
              style={{ fontSize: "1.1rem", color: "rgb(146 74 151)" }}
            ></i>
            <span>
              Comments{" "}
              {commentSubmission ? `- ${commentSubmission.client_name}` : ""}
            </span>
          </div>
        }
        onHide={() => {
          if (!commentVisible) return;
          setCommentVisible(false);
          setCommentSubmission(null);
          setComments([]);
          setNewMessage("");
          setReplyingTo(null);
        }}
        className="p-fluid"
      >
        {/* Comments list */}
        <div
          style={{
            maxHeight: "400px",
            overflowY: "auto",
            minHeight: "200px",
            padding: "0.5rem 0",
          }}
        >
          {commentsLoading ? (
            <div className="text-center py-4">
              <i className="pi pi-spin pi-spinner me-2"></i>
              <p className="mt-2 mb-0" style={{ color: "#808080" }}>
                Loading comments...
              </p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-4">
              <i
                className="pi pi-inbox"
                style={{ fontSize: "2rem", color: "#bdbdbd" }}
              ></i>
              <p className="mt-2 mb-0" style={{ color: "#808080" }}>
                No comments yet.{" "}
                {senderType === "Client"
                  ? "Start a conversation!"
                  : "Waiting for client comments."}
              </p>
            </div>
          ) : (
            [...comments]
              .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
              .map((comment) => (
                <div key={comment.comment_id} className="mb-3">
                  {/* Top-level comment */}
                  <div
                    className="d-flex gap-2 p-2 rounded"
                    style={{
                      backgroundColor:
                        comment.sender_type === "Client"
                          ? "#ffead5"
                          : "#9e52a30f",
                      border: "1px solid",
                      borderColor:
                        comment.sender_type === "Client"
                          ? "#ff983347"
                          : "rgba(146, 74, 151, 0.25)",
                    }}
                  >
                    <Avatar
                      label={comment.sender_name?.charAt(0)?.toUpperCase()}
                      shape="circle"
                      style={{
                        backgroundColor:
                          comment.sender_type === "Client"
                            ? "#ff9832"
                            : "rgb(146 74 151)",
                        color: "#fff",
                        width: "32px",
                        height: "32px",
                        minWidth: "32px",
                        fontSize: "14px",
                      }}
                    />
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div className="d-flex justify-content-between align-items-center">
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: "13px",
                            color: "#2a2a2a",
                          }}
                        >
                          {comment.sender_name}
                          <Badge
                            className="ms-2"
                            style={{
                              fontSize: "10px",
                              fontWeight: 500,
                              backgroundColor:
                                comment.sender_type === "Client"
                                  ? "#ff9832"
                                  : "rgb(146 74 151)",
                              color: "#fff",
                              border: "none",
                            }}
                          >
                            {comment.sender_type}
                          </Badge>
                        </span>
                        <small
                          style={{
                            color: "#808080",
                            fontSize: "11px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatCommentTime(comment.created_at)}
                        </small>
                      </div>
                      <p
                        className="mb-1 mt-1"
                        style={{
                          fontSize: "13px",
                          wordBreak: "break-word",
                          color: "#424242",
                        }}
                      >
                        {comment.message}
                      </p>
                      <Button
                        label="Reply"
                        icon="pi pi-reply"
                        className="p-0"
                        text
                        style={{
                          fontSize: "11px",
                          height: "20px",
                          color: "#808080",
                        }}
                        onClick={() => setReplyingTo(comment)}
                      />
                    </div>
                  </div>

                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ms-4 mt-1">
                      {[...comment.replies]
                        .sort(
                          (a, b) =>
                            new Date(a.created_at) - new Date(b.created_at),
                        )
                        .map((reply) => (
                          <div
                            key={reply.comment_id}
                            className="d-flex gap-2 p-2 rounded mt-1"
                            style={{
                              backgroundColor:
                                reply.sender_type === "Client"
                                  ? "#ffead5"
                                  : "#9e52a30f",
                              border: "1px solid",
                              borderColor:
                                reply.sender_type === "Client"
                                  ? "#ff983347"
                                  : "rgba(146, 74, 151, 0.25)",
                              borderLeft: `3px solid ${reply.sender_type === "Client" ? "#ff9832" : "rgb(146 74 151)"}`,
                            }}
                          >
                            <Avatar
                              label={reply.sender_name
                                ?.charAt(0)
                                ?.toUpperCase()}
                              shape="circle"
                              style={{
                                backgroundColor:
                                  reply.sender_type === "Client"
                                    ? "#ff9832"
                                    : "rgb(146 74 151)",
                                color: "#fff",
                                width: "26px",
                                height: "26px",
                                minWidth: "26px",
                                fontSize: "12px",
                              }}
                            />
                            <div
                              className="flex-grow-1"
                              style={{ minWidth: 0 }}
                            >
                              <div className="d-flex justify-content-between align-items-center">
                                <span
                                  style={{
                                    fontWeight: 600,
                                    fontSize: "12px",
                                    color: "#2a2a2a",
                                  }}
                                >
                                  {reply.sender_name}
                                  <Badge
                                    className="ms-2"
                                    style={{
                                      fontSize: "9px",
                                      fontWeight: 500,
                                      backgroundColor:
                                        reply.sender_type === "Client"
                                          ? "#ff9832"
                                          : "rgb(146 74 151)",
                                      color: "#fff",
                                      border: "none",
                                    }}
                                  >
                                    {reply.sender_type}
                                  </Badge>
                                </span>
                                <small
                                  style={{
                                    color: "#808080",
                                    fontSize: "10px",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {formatCommentTime(reply.created_at)}
                                </small>
                              </div>
                              <p
                                className="mb-0 mt-1"
                                style={{
                                  fontSize: "12px",
                                  wordBreak: "break-word",
                                  color: "#424242",
                                }}
                              >
                                {reply.message}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* Reply indicator */}
        {replyingTo && (
          <div
            className="d-flex align-items-center gap-2 px-2 py-1 mt-2 rounded"
            style={{
              backgroundColor: "#9e52a30f",
              fontSize: "12px",
              color: "#424242",
              border: "1px solid rgba(146, 74, 151, 0.2)",
            }}
          >
            <i
              className="pi pi-reply"
              style={{ fontSize: "11px", color: "rgb(146 74 151)" }}
            ></i>
            <span>
              Replying to <b>{replyingTo.sender_name}</b>
            </span>
            <Button
              icon="pi pi-times"
              className="p-0 ms-auto"
              text
              style={{
                width: "20px",
                height: "20px",
                fontSize: "10px",
                color: "#808080",
              }}
              onClick={() => setReplyingTo(null)}
            />
          </div>
        )}

        {/* Message input */}
        <div className="d-flex gap-2 mt-2 align-items-end">
          <InputText
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendComment();
              }
            }}
            placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
            className="flex-grow-1"
            style={{ fontSize: "13px" }}
            disabled={sendingComment}
          />
          <Button
            icon={sendingComment ? "pi pi-spin pi-spinner" : "pi pi-send"}
            className="p-0"
            style={{
              width: "38px",
              height: "38px",
              backgroundColor: "rgb(146 74 151)",
              borderColor: "rgb(146 74 151)",
              color: "#fff",
            }}
            onClick={handleSendComment}
            disabled={!newMessage.trim() || sendingComment}
          />
        </div>
      </Dialog>
    </>
  );
};

export default AgreedServicesCharges;
