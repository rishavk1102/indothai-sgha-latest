import { AnimatePresence, motion } from "framer-motion";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Dialog } from "primereact/dialog";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { FileUpload } from "primereact/fileupload";
import React, { useState, useRef, useEffect } from "react";
import { Breadcrumb, Card, Col, Row } from "react-bootstrap";
import { AiOutlineEdit, AiOutlineForm } from "react-icons/ai";
import { BiText } from "react-icons/bi";
import { FaHeading } from "react-icons/fa";
import { FcOpenedFolder } from "react-icons/fc";
import { IoChevronBackOutline } from "react-icons/io5";
import { LuTable } from "react-icons/lu";
import {
    MdCheckBox,
    MdFormatListNumbered,
    MdOutlineSubdirectoryArrowRight,
    MdSubtitles,
} from "react-icons/md";
import { useLocation, useNavigate } from "react-router-dom";
import CustomEditor from "../../components/CustomEditor";
import api from "../../api/axios";
import axios from "axios";
import CustomToast from "../../components/CustomToast";
import { useAuth } from "../../context/AuthContext";

class FieldErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error("Field render error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="text-danger small p-2 border border-danger rounded mb-2">
          This field could not be rendered. Try deleting and re-adding it.
        </div>
      );
    }
    return this.props.children;
  }
}

const SGHA_Add = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { roleId, role } = useAuth();
  const toastRef = useRef(null);
  const fromPdfUploadKeysRef = useRef(/** @type {Set<string>} */ (new Set()));
  const fromPdfUploadYearRef = useRef(/** @type {number | null} */ (null));
  const goBack = () => navigate(-1);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const PAGE_NAME = "Section Template"; // Using existing page name from database (used by other Annex A pages)

  // store dynamic fields by template key (year + title)
  // Structure: { "2025-Main Agreement": [...fields], "2025-Annex A": [...fields], ... }
  const [templateFields, setTemplateFields] = useState({});

  // Available years - fetched from database
  const [availableYears, setAvailableYears] = useState([]);
  const [yearsWithStatus, setYearsWithStatus] = useState([]); // Years with hasData flag
  const [yearsLoading, setYearsLoading] = useState(true);
  
  // Add year dialog state
  const [addYearDialogVisible, setAddYearDialogVisible] = useState(false);
  const [newYear, setNewYear] = useState('');
  const [addingYear, setAddingYear] = useState(false);
  
  // Delete year state
  const [deletingYear, setDeletingYear] = useState(false);
  
  // Custom template name and year when opened from PdfUploads "Open in editor"
  const [pdfUploadTemplateName, setPdfUploadTemplateName] = useState("");
  const [pdfUploadYear, setPdfUploadYear] = useState(/** @type {number | null} */ (null));
  
  // PDF upload dialog state
  const [pdfDialogVisible, setPdfDialogVisible] = useState(false);
  const [selectedPdfFile, setSelectedPdfFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  // Generate options for a specific year (default template; templateName null)
  const getOptionsForYear = (year) => [
    { id: `${year}-1`, title: "Main Agreement", date: `Year-${year}`, year, templateKey: `${year}-Main Agreement`, templateName: null },
    { id: `${year}-2`, title: "Annex A", date: `Year-${year}`, year, templateKey: `${year}-Annex A`, templateName: null },
    { id: `${year}-3`, title: "Annex B", date: `Year-${year}`, year, templateKey: `${year}-Annex B`, templateName: null },
  ];

  // Generate options for a named template (same year can have multiple templates)
  const getOptionsForTemplateName = (templateName, year) => [
    { id: `${templateName}-1`, title: "Main Agreement", date: `Year-${year}`, year, templateKey: `${templateName}-Main Agreement`, templateName },
    { id: `${templateName}-2`, title: "Annex A", date: `Year-${year}`, year, templateKey: `${templateName}-Annex A`, templateName },
    { id: `${templateName}-3`, title: "Annex B", date: `Year-${year}`, year, templateKey: `${templateName}-Annex B`, templateName },
  ];

  // Options for a year + template name (for API that returns templates[] per year)
  const getOptionsForYearAndTemplate = (year, templateName) =>
    templateName != null && String(templateName).trim() !== ''
      ? getOptionsForTemplateName(String(templateName).trim(), year)
      : getOptionsForYear(year);

  // Get template key from selected template
  const getTemplateKey = (template) => {
    if (!template) return null;
    if (template.templateKey) return template.templateKey;
    return `${template.year}-${template.title}`;
  };

  // Get current template's fields
  const fields = selected ? (templateFields[getTemplateKey(selected)] || []) : [];

  // Helper function to get the next heading number
  const getNextHeadingNumber = (currentFields) => {
    // Count existing heading_no fields that are for headings (not subheadings)
    // Subheading numbers have decimal points (like 1.1, 1.2), heading numbers don't
    let maxNumber = 0;
    currentFields.forEach((field, index) => {
      if (field.type === "heading_no" && field.value) {
        // Only count if it's a whole number (not a decimal like 1.1) and followed by a heading
        if (!field.value.includes('.') && 
            index + 1 < currentFields.length && 
            currentFields[index + 1].type === "heading") {
          const num = parseInt(field.value, 10);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    });
    return maxNumber + 1;
  };

  // Helper function to get the next subheading number
  const getNextSubheadingNumber = (currentFields) => {
    // Find the last heading number (associated with a heading, not a subheading)
    let lastHeadingNumber = 0;
    let lastHeadingIndex = -1;
    
    // Find the last heading_no that's followed by a heading (not subheading)
    for (let i = 0; i < currentFields.length; i++) {
      if (currentFields[i].type === "heading_no" && currentFields[i].value) {
        // Check if this heading_no is followed by a heading (not subheading)
        if (i + 1 < currentFields.length && currentFields[i + 1].type === "heading") {
          const num = parseInt(currentFields[i].value, 10);
          if (!isNaN(num) && !currentFields[i].value.includes('.')) {
            // Only count if it's a whole number (not a decimal like 1.1)
            lastHeadingNumber = num;
            lastHeadingIndex = i;
          }
        }
      }
    }

    // If no heading found, default to 1
    if (lastHeadingIndex === -1) {
      lastHeadingNumber = 1;
    }

    // Count subheadings after the last heading
    // Only count heading_no fields with decimal values (like 1.1, 1.2) to avoid double-counting
    // since we add both heading_no and subheading fields as a pair
    let subheadingCount = 0;
    if (lastHeadingIndex >= 0) {
      for (let i = lastHeadingIndex + 1; i < currentFields.length; i++) {
        if (currentFields[i].type === "heading_no") {
          // Check if this heading_no is for a heading (not subheading)
          if (i + 1 < currentFields.length && currentFields[i + 1].type === "heading") {
            // If we encounter another heading, stop counting
            break;
          }
          // If it's a subheading number (has decimal), use its number
          if (currentFields[i].value && currentFields[i].value.includes('.')) {
            const parts = currentFields[i].value.split('.');
            if (parts.length === 2 && parseInt(parts[0], 10) === lastHeadingNumber) {
              const subNum = parseInt(parts[1], 10);
              if (!isNaN(subNum) && subNum > subheadingCount) {
                subheadingCount = subNum;
              }
            }
          }
        }
      }
    } else {
      // If no heading found, count all existing subheading number fields (heading_no with decimals)
      const subheadingNumbers = currentFields
        .filter((f) => f.type === "heading_no" && f.value && f.value.includes('.'))
        .map((f) => {
          const parts = f.value.split('.');
          return parts.length === 2 ? parseInt(parts[1], 10) : 0;
        })
        .filter((n) => !isNaN(n));
      subheadingCount = subheadingNumbers.length > 0 ? Math.max(...subheadingNumbers) : 0;
    }

    return `${lastHeadingNumber}.${subheadingCount + 1}`;
  };

  // Add field dynamically
  const addField = (type, label) => {
    if (!selected) return;
    const templateKey = getTemplateKey(selected);
    const currentFields = templateFields[templateKey] || [];
    
    let newFields = [];

    // If adding a heading, automatically add heading_no first
    if (type === "heading") {
      const nextHeadingNumber = getNextHeadingNumber(currentFields);
      const headingNoField = {
        id: Date.now(),
        type: "heading_no",
        label: "Heading No.",
        value: nextHeadingNumber.toString(),
        checkboxValue: [],
      };
      newFields.push(headingNoField);
    }

    // If adding a subheading, automatically add subheading number first
    if (type === "subheading") {
      const nextSubheadingNumber = getNextSubheadingNumber(currentFields);
      const subheadingNoField = {
        id: Date.now(),
        type: "heading_no",
        label: "Subheading No.",
        value: nextSubheadingNumber,
        checkboxValue: [],
      };
      newFields.push(subheadingNoField);
    }

    // Create the main field
    const newField = type === "table" 
      ? {
          id: Date.now() + (newFields.length * 1000),
          type,
          label,
          rows: [
            {
              id: Date.now() + (newFields.length * 1000) + 1,
              checked: false,
              section: "",
              description: "",
            },
          ],
        }
      : type === "editor"
      ? { 
          id: Date.now() + (newFields.length * 1000), 
          type, 
          label, 
          value: "", 
          checkboxValue: [],
          checkboxConfig: {},
          commentConfig: {},
          variableDefaults: {}
        }
      : { id: Date.now() + (newFields.length * 1000), type, label, value: "", checkboxValue: [] };

    newFields.push(newField);

    setTemplateFields((prev) => ({
      ...prev,
      [templateKey]: [...(prev[templateKey] || []), ...newFields],
    }));
  };

  // Handle text inputs
  const handleChange = (id, value) => {
    if (!selected) return;
    const templateKey = getTemplateKey(selected);
    if (typeof value === 'object' && value !== null) {
      console.log('[SGHA_Add handleChange] id:', id, 'htmlValue length:', value.htmlValue?.length, 'preview:', value.htmlValue?.substring(0, 200));
    }
    setTemplateFields((prev) => ({
      ...prev,
      [templateKey]: (prev[templateKey] || []).map((f) => {
        if (f.id === id) {
          // If value is an object (from CustomEditor), merge it properly
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            return { 
              ...f, 
              value: value.htmlValue || f.value || '',
              checkboxConfig: value.checkboxConfig || f.checkboxConfig || {},
              commentConfig: value.commentConfig || f.commentConfig || {},
              variableDefaults: value.variableDefaults || f.variableDefaults || {}
            };
          }
          // Otherwise, just update the value
          return { ...f, value };
        }
        return f;
      }),
    }));
  };

  // Handle checkbox yes/no
  const handleCheckboxChange = (id, option) => {
    if (!selected) return;
    const templateKey = getTemplateKey(selected);
    setTemplateFields((prev) => ({
      ...prev,
      [templateKey]: (prev[templateKey] || []).map((f) => {
        if (f.id !== id) return f;
        const cbValue = f.checkboxValue || [];
        return {
          ...f,
          checkboxValue: cbValue.includes(option)
            ? cbValue.filter((o) => o !== option)
            : [...cbValue, option],
        };
      }),
    }));
  };

  // Handle table row add
  const addTableRow = (fieldId) => {
    if (!selected) return;
    const templateKey = getTemplateKey(selected);
    setTemplateFields((prev) => ({
      ...prev,
      [templateKey]: (prev[templateKey] || []).map((f) =>
        f.id === fieldId
          ? {
              ...f,
              rows: [
                ...f.rows,
                {
                  id: Date.now(),
                  checked: false,
                  section: "",
                  description: "",
                },
              ],
            }
          : f
      ),
    }));
  };

  // Handle table row delete
  const deleteTableRow = (fieldId, rowId) => {
    if (!selected) return;
    const templateKey = getTemplateKey(selected);
    setTemplateFields((prev) => ({
      ...prev,
      [templateKey]: (prev[templateKey] || []).map((f) =>
        f.id === fieldId
          ? { ...f, rows: f.rows.filter((r) => r.id !== rowId) }
          : f
      ),
    }));
  };

  // Handle table row change
  const handleTableRowChange = (fieldId, rowId, key, value) => {
    if (!selected) return;
    const templateKey = getTemplateKey(selected);
    setTemplateFields((prev) => ({
      ...prev,
      [templateKey]: (prev[templateKey] || []).map((f) =>
        f.id === fieldId
          ? {
              ...f,
              rows: f.rows.map((r) =>
                r.id === rowId ? { ...r, [key]: value } : r
              ),
            }
          : f
      ),
    }));
  };

  // Delete field
  const deleteField = (id) => {
    if (!selected) return;
    const templateKey = getTemplateKey(selected);
    setTemplateFields((prev) => ({
      ...prev,
      [templateKey]: (prev[templateKey] || []).filter((f) => f.id !== id),
    }));
  };

  // Show toast message
  const showMessage = (severity, detail) => {
    const summary = severity.charAt(0).toUpperCase() + severity.slice(1);
    toastRef.current?.show(severity, summary, detail);
  };

  // Fetch available years from database
  const fetchYears = async () => {
    try {
      setYearsLoading(true);
      // Fetch years with status; use cache-buster so we get fresh list after saving a new year
      const response = await api.get('/template_years/years-with-status', {
        params: { _t: Date.now() },
      });
      
      if (response.data?.data) {
        const yearsData = response.data.data;
        setYearsWithStatus(yearsData);
        // Extract just the year values for backward compatibility; merge year from PdfUpload if present
        let yearValues = yearsData.map(item => item.year);
        const extraYear = fromPdfUploadYearRef.current;
        if (extraYear != null && !yearValues.includes(extraYear)) {
          yearValues = [...yearValues, extraYear].sort((a, b) => b - a);
        }
        setAvailableYears(yearValues);
      } else {
        // Fallback: keep year from PdfUpload if any
        const extraYear = fromPdfUploadYearRef.current;
        setAvailableYears(extraYear != null ? [extraYear] : []);
        setYearsWithStatus([]);
      }
    } catch (error) {
      console.error("Error fetching template years:", error);
      // Fallback: keep year from PdfUpload if any
      const extraYear = fromPdfUploadYearRef.current;
      setAvailableYears(extraYear != null ? [extraYear] : []);
      setYearsWithStatus([]);
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        showMessage("error", "Failed to load template years. Please refresh the page.");
      }
    } finally {
      setYearsLoading(false);
    }
  };

  // Fetch available years from database on component mount
  useEffect(() => {
    fetchYears();
  }, []);

  // Apply state when opened from PdfUploads "Open in editor"
  useEffect(() => {
    const state = location.state;
    if (!state?.fromPdfUpload || !state.templateFields) return;

    const year = state.year;
    const initialSelected = state.initialSelected;
    const fields = state.templateFields;

    if (year != null) {
      fromPdfUploadYearRef.current = year;
      setAvailableYears((prev) => {
        if (prev.includes(year)) return prev;
        return [...prev, year].sort((a, b) => b - a);
      });
    }
    setTemplateFields(fields || {});
    if (initialSelected) setSelected(initialSelected);
    if (state.templateName && typeof state.templateName === "string") {
      setPdfUploadTemplateName(state.templateName.trim());
    }
    if (year != null) setPdfUploadYear(year);

    Object.keys(fields || {}).forEach((key) => fromPdfUploadKeysRef.current.add(key));
    if (state.templateName && typeof state.templateName === "string") {
      const tn = state.templateName.trim();
      ["Main Agreement", "Annex A", "Annex B"].forEach((t) => fromPdfUploadKeysRef.current.add(`${tn}-${t}`));
    }
    navigate(location.pathname, { replace: true, state: {} });
  }, []);

  // When landed after "Save as template" from PDF Uploads: ensure saved year is in the list and refresh
  useEffect(() => {
    const state = location.state;
    if (!state?.savedFromPdfUpload || state.savedYear == null) return;

    const year = Number(state.savedYear);
    if (!Number.isInteger(year)) return;

    fromPdfUploadYearRef.current = year;
    setAvailableYears((prev) => {
      if (prev.includes(year)) return prev;
      return [...prev, year].sort((a, b) => b - a);
    });
    fetchYears();
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when landing after Save as template from PDF Uploads
  }, [location.state?.savedFromPdfUpload, location.state?.savedYear]);

  // Handle deleting a year
  const handleDeleteYear = (yearId, year) => {
    confirmDialog({
      message: `Are you sure you want to delete year ${year}? This action cannot be undone.`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        setDeletingYear(true);
        try {
          const response = await api.delete(`/template_years/delete/${yearId}`);
          
          if (response.status === 200) {
            showMessage("success", "Year deleted successfully!");
            // Refresh the years list
            await fetchYears();
          }
        } catch (error) {
          console.error("Error deleting year:", error);
          if (error.response?.status === 400) {
            showMessage("error", error.response.data?.message || "Cannot delete year with existing template data");
          } else if (error.response?.status === 401) {
            showMessage("error", "Please log in again to continue");
            setTimeout(() => navigate("/login"), 2000);
          } else if (error.response?.status === 403) {
            showMessage("error", "You don't have permission to delete years");
          } else {
            showMessage("error", error.response?.data?.message || "Failed to delete year");
          }
        } finally {
          setDeletingYear(false);
        }
      },
      reject: () => {
        // User cancelled, do nothing
      }
    });
  };

  // Handle PDF upload
  const handlePdfUpload = async () => {
    if (!selectedPdfFile) {
      showMessage("warn", "Please select a PDF file");
      return;
    }

    setUploadingPdf(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedPdfFile);

      const response = await axios.post(
        'https://indothai-ai.72.61.173.50.sslip.io/upload-pdf',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Success
      showMessage("success", "PDF uploaded successfully!");
      setPdfDialogVisible(false);
      setSelectedPdfFile(null);
      setIsDragging(false);
    } catch (error) {
      console.error("Error uploading PDF:", error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          "Failed to upload PDF. Please try again.";
      showMessage("error", errorMessage);
    } finally {
      setUploadingPdf(false);
    }
  };

  // Handle adding a new year
  const handleAddYear = async () => {
    if (!newYear || isNaN(newYear) || parseInt(newYear) <= 0) {
      showMessage("warn", "Please enter a valid year");
      return;
    }

    const yearInt = parseInt(newYear);
    if (availableYears.includes(yearInt)) {
      showMessage("warn", "This year already exists");
      return;
    }

    setAddingYear(true);
    try {
      const response = await api.post('/template_years/create', {
        year: yearInt,
      });

      if (response.status === 201) {
        showMessage("success", "Year added successfully!");
        setAddYearDialogVisible(false);
        setNewYear('');
        // Refresh the years list
        await fetchYears();
      }
    } catch (error) {
      console.error("Error adding year:", error);
      if (error.response?.status === 400) {
        showMessage("error", error.response.data?.message || "This year already exists");
      } else if (error.response?.status === 401) {
        showMessage("error", "Please log in again to continue");
        setTimeout(() => navigate("/login"), 2000);
      } else if (error.response?.status === 403) {
        showMessage("error", "You don't have permission to add years");
      } else {
        showMessage("error", error.response?.data?.message || "Failed to add year");
      }
    } finally {
      setAddingYear(false);
    }
  };

  // Ensure every field loaded from DB has the properties the UI expects
  const normalizeFields = (fields) => {
    if (!Array.isArray(fields)) return [];
    return fields.map((f) => {
      if (!f || typeof f !== 'object') return f;
      const base = { ...f };
      if (base.type === 'table') {
        if (!Array.isArray(base.rows)) base.rows = [];
      } else if (base.type === 'editor') {
        if (base.value === undefined || base.value === null) base.value = '';
        if (!base.checkboxConfig) base.checkboxConfig = {};
        if (!base.commentConfig) base.commentConfig = {};
        if (!base.variableDefaults) base.variableDefaults = {};
        if (!Array.isArray(base.checkboxValue)) base.checkboxValue = [];
      } else if (base.type === 'checkbox') {
        if (!Array.isArray(base.checkboxValue)) base.checkboxValue = [];
      } else {
        if (base.value === undefined || base.value === null) base.value = '';
        if (!Array.isArray(base.checkboxValue)) base.checkboxValue = [];
      }
      return base;
    });
  };

  // Load existing content when a template is selected (skip when content came from PdfUpload)
  useEffect(() => {
    const loadExistingContent = async () => {
      if (!selected) return;

      const templateKey = getTemplateKey(selected);
      if (fromPdfUploadKeysRef.current.has(templateKey)) return;

      console.log('[SGHA_Add] Loading content for:', templateKey);
      try {
        const params = {};
        if (selected.templateName != null && String(selected.templateName).trim() !== '') {
          params.template_name = selected.templateName;
        }
        const response = await api.get(
          `/sgha_template_content/get/${selected.year}/${encodeURIComponent(selected.title)}/${PAGE_NAME}`,
          { params }
        );

        console.log('[SGHA_Add] API response:', response.data);
        if (response.data?.data?.content) {
          try {
            const content = response.data.data.content;
            const parsedContent = typeof content === 'string' 
              ? JSON.parse(content) 
              : content;
            
            const normalized = normalizeFields(parsedContent);
            console.log('[SGHA_Add] Loaded fields count:', normalized.length);
            console.log('[SGHA_Add] Field types:', normalized.map(f => `${f.type}(id:${f.id})`));
            
            setTemplateFields((prev) => ({
              ...prev,
              [templateKey]: normalized,
            }));
          } catch (e) {
            console.log("Content is not in expected format, starting fresh", e);
          }
        } else {
          console.log('[SGHA_Add] No content in response');
        }
      } catch (error) {
        console.error('[SGHA_Add] Error loading content:', error.response?.status, error.message);
        if (error.response?.status !== 404) {
          console.error("Error loading existing content:", error);
        }
      }
    };

    loadExistingContent();
  }, [selected]);

  // Handle save
  const handleSave = async () => {
    if (!selected) {
      showMessage("warn", "Please select a template first");
      return;
    }

    setLoading(true);
    try {
      const templateKey = getTemplateKey(selected);
      const fields = templateFields[templateKey] || [];

      // Convert fields array to JSON string for storage
      const content = JSON.stringify(fields);

      const payload = {
        year: selected.year,
        type: selected.title,
        content: content,
      };
      if (selected.templateName != null && String(selected.templateName).trim() !== '') {
        payload.template_name = selected.templateName;
      }
      const response = await api.post(`/sgha_template_content/save/${PAGE_NAME}`, payload);

      if (response.status === 200) {
        showMessage("success", "Template content saved successfully!");
        // Refresh years list so new year (if any) appears on the page without reload
        await fetchYears();
      }
    } catch (error) {
      console.error("Error saving template:", error);
      console.error("Error response:", error.response?.data);
      
      if (error.response?.status === 401) {
        showMessage("error", "Please log in again to continue");
        // Optionally redirect to login
        setTimeout(() => navigate("/login"), 2000);
      } else if (error.response?.status === 403) {
        if (error.response?.data?.message?.includes("refresh token")) {
          showMessage("error", "Session expired. Please log in again.");
          setTimeout(() => navigate("/login"), 2000);
        } else {
          showMessage("error", error.response?.data?.message || "You don't have permission to save templates");
        }
      } else if (error.response?.status === 404) {
        showMessage("error", error.response?.data?.message || `Page not found. Please check if '${PAGE_NAME}' page exists in the database.`);
      } else {
        const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || "Failed to save template content";
        showMessage("error", errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Render field type
  const renderField = (field, isReadOnly = false) => {
    console.log('[SGHA_Add renderField] Rendering field:', field.id, 'type:', field.type, 'label:', field.label?.substring(0, 50));
    let extraStyle = {};
    if (field.type === "subheading") {
      extraStyle = { paddingLeft: "15px" };
    }
    if (field.type === "sub_child") {
      extraStyle = { paddingLeft: "25px" };
    }

    switch (field.type) {
      case "textarea":
        return (
          <InputTextarea
            rows={3}
            value={field.value}
            onChange={(e) => handleChange(field.id, e.target.value)}
            placeholder={field.label}
            className="w-100"
            style={extraStyle}
            disabled={isReadOnly}
          />
        );
      case "editor":
        return (
          <CustomEditor
            value={{
              htmlValue: field.value || "",
              checkboxConfig: field.checkboxConfig || {},
              commentConfig: field.commentConfig || {},
              variableDefaults: field.variableDefaults || {}
            }}
            onTextChange={(e) => handleChange(field.id, e)}
            style={{ width: "100%", ...extraStyle }}
            placeholder="Start typing your content..."
            showVariablePreview={role !== 'Client' && selected?.title === 'Annex B'}
          />
        );
      case "checkbox":
        return (
          <div className="d-flex gap-3" style={extraStyle}>
            <div className="d-flex align-items-center gap-1">
              <Checkbox
                inputId={`yes-${field.id}`}
                checked={(field.checkboxValue || []).includes("Yes")}
                onChange={() => handleCheckboxChange(field.id, "Yes")}
                disabled={isReadOnly}
              />
              <label htmlFor={`yes-${field.id}`}>Yes</label>
            </div>
            <div className="d-flex align-items-center gap-1">
              <Checkbox
                inputId={`no-${field.id}`}
                checked={(field.checkboxValue || []).includes("No")}
                onChange={() => handleCheckboxChange(field.id, "No")}
                disabled={isReadOnly}
              />
              <label htmlFor={`no-${field.id}`}>No</label>
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
                          handleTableRowChange(
                            field.id,
                            row.id,
                            "checked",
                            e.checked
                          )
                        }
                      />
                    </td>
                    <td>
                      <InputText
                        value={row.section}
                        onChange={(e) =>
                          handleTableRowChange(
                            field.id,
                            row.id,
                            "section",
                            e.target.value
                          )
                        }
                        className="w-100"
                      />
                    </td>
                    <td>
                      <InputTextarea
                        value={row.description}
                        onChange={(e) =>
                          handleTableRowChange(
                            field.id,
                            row.id,
                            "description",
                            e.target.value
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
                        onClick={() => deleteTableRow(field.id, row.id)}
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
                onClick={() => addTableRow(field.id)}
              />
            </div>
          </div>
        );
      default:
        return (
          <InputText
            value={field.value}
            onChange={(e) => handleChange(field.id, e.target.value)}
            placeholder={field.label}
            className="w-100"
            style={extraStyle}
            disabled={isReadOnly}
          />
        );
    }
  };

  return (
    <>
      <style>{`
        .indothai-theme-button {
          background: #ff8104 !important;
          border: 1px solid #ff8104 !important;
          color: #fff !important;
        }
        .indothai-theme-button:hover {
          background: #000 !important;
          border: 1px solid #000 !important;
        }
        
        .indothai-drag-drop-area {
          border: 2px dashed #d1d5db;
          border-radius: 12px;
          padding: 40px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background-color: #fff;
          min-height: 200px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        
        .indothai-drag-drop-area:hover {
          border-color: #ff8104;
          background-color: #fff8f0;
        }
        
        .indothai-drag-drop-area.dragging {
          border-color: #ff8104;
          background-color: #fff8f0;
          transform: scale(1.02);
          box-shadow: 0 4px 12px rgba(255, 129, 4, 0.2);
        }
        
        .indothai-drag-drop-area.has-file {
          border-color: #ff8104;
          background-color: #fff8f0;
        }
        
        .indothai-upload-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #ffe2c6;
          margin-bottom: 20px;
          color: #ff8104;
          transition: all 0.3s ease;
        }
        
        .indothai-drag-drop-area.dragging .indothai-upload-icon {
          background-color: #ff8104;
          color: #fff;
          transform: scale(1.1);
        }
        
        .indothai-upload-text {
          color: #333;
        }
        
        .indothai-upload-text strong {
          color: #ff8104;
          font-size: 16px;
        }
        
        .indothai-file-preview {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #333;
        }
        
        .indothai-file-preview p {
          margin: 0;
          word-break: break-word;
          max-width: 100%;
        }
      `}</style>
      <CustomToast ref={toastRef} />
      <ConfirmDialog />
      <Row className="mx-0 align-items-center d-flex mb-5">
        <Col md={12} lg={5}>
          <Breadcrumb className="mb-0">
            <Breadcrumb.Item onClick={goBack}>
              <IoChevronBackOutline /> Back
            </Breadcrumb.Item>
            <Breadcrumb.Item active>Add SGHA Template</Breadcrumb.Item>
          </Breadcrumb>
        </Col>
        <Col md={12} lg={7} className="d-flex justify-content-end gap-2">
          {!selected && (
            <>
              <Button
                label="Create template from PDF"
                icon="pi pi-file-pdf"
                onClick={() => setPdfDialogVisible(true)}
                className="indothai-theme-button"
              />
              <Button
                label="Add Year"
                icon="pi pi-plus"
                severity="success"
                onClick={() => setAddYearDialogVisible(true)}
              />
            </>
          )}
        </Col>
      </Row>

      <Row>
        <AnimatePresence>
          {!selected ? (
            // All Years Sections
            <Col md={12} key="list">
              {yearsLoading ? (
                <div className="text-center p-5">
                  <p>Loading years...</p>
                </div>
              ) : availableYears.length === 0 ? (
                <div className="text-center p-5">
                  <p>No template years found. Please add years to the database.</p>
                </div>
              ) : (
                yearsWithStatus.map((yearData) => {
                const year = yearData.year;
                const yearOptions = getOptionsForYear(year);
                const hasData = yearData.hasData;
                const yearId = yearData.id;
                return (
                  <div key={year} className="p-4 border-top position-relative mb-4">
                    <div className="rol-title tempyear">{year}</div>
                    {!hasData && (
                      <Button
                        icon="pi pi-trash"
                        severity="danger"
                        className="p-button-text p-button-rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteYear(yearId, year);
                        }}
                        disabled={deletingYear}
                        tooltip={`Delete template for the year ${year}`}
                        tooltipOptions={{ position: 'top' }}
                        style={{
                          position: 'absolute',
                          right: '20px',
                          top: '20px',
                        }}
                      />
                    )}
                    <motion.ul
                      className="list-unstyled firstlist_style text-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      {yearOptions.map((opt) => (
                        <motion.li
                          key={opt.id}
                          onClick={() => setSelected(opt)}
                          className="border"
                          style={{ cursor: "pointer" }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <div className="d-flex flex-column align-items-center gap-2 text-center">
                            <FcOpenedFolder size={62} />
                            <h5 className="fw-bold mb-0">{opt.title}</h5>
                          </div>
                          <div className="d-flex align-items-center text-secondary small gap-1 justify-content-center">
                            <span>{opt.date}</span>
                          </div>
                        </motion.li>
                      ))}
                    </motion.ul>
                  </div>
                );
                })
              )}
            </Col>
          ) : (
            <>
              {/* Sidebar */}
              <Col md={3} key="sidebar">
                <div 
                  className="sticky-top" 
                  style={{ 
                    top: "15px",
                    maxHeight: "calc(100vh - 100px)",
                    overflowY: "auto",
                    overflowX: "hidden"
                  }}
                >
                  <motion.ul
                    className="list-unstyled"
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -50, opacity: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    {yearsLoading ? (
                      <div className="text-center p-3">
                        <p className="small text-muted">Loading...</p>
                      </div>
                    ) : (
                      <>
                        {/* Custom template name as its own group with Main Agreement, Annex A, Annex B (when opened from PdfUpload) */}
                        {pdfUploadTemplateName && pdfUploadYear != null && availableYears.includes(pdfUploadYear) && (
                          <div key={`pdf-${pdfUploadTemplateName}`} className="mb-4">
                            <h6 className="text-muted mb-2">{pdfUploadTemplateName}</h6>
                            {getOptionsForTemplateName(pdfUploadTemplateName, pdfUploadYear).map((opt) => (
                              <motion.li
                                key={opt.id}
                                onClick={() => setSelected(opt)}
                                className={`p-3 border mb-2 rounded d-flex align-items-center justify-content-between list-unstyled ${
                                  selected?.id === opt.id ? "bg-activetext" : ""
                                }`}
                                style={{ cursor: "pointer" }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <div className="d-flex align-items-center gap-2">
                                  <FcOpenedFolder size={28} />
                                  <span className="fw-bold">
                                    {opt.title}
                                    <span className="small fw-normal d-block">
                                      {opt.date}
                                    </span>
                                  </span>
                                </div>
                              </motion.li>
                            ))}
                          </div>
                        )}
                                        {/* Each year with its template groups (multiple templates per year) – hidden when opened from PdfUpload */}
                        {!(pdfUploadTemplateName && pdfUploadYear != null) &&
                          (yearsWithStatus.length > 0
                            ? yearsWithStatus.map((yearRecord) => {
                                const year = yearRecord.year;
                                const templates = yearRecord.templates && yearRecord.templates.length > 0
                                  ? yearRecord.templates
                                  : [{ templateName: null, hasData: yearRecord.hasData }];
                                return templates.map((t) => {
                                  const templateName = t.templateName;
                                  const label = templateName != null && String(templateName).trim() !== ''
                                    ? templateName
                                    : year;
                                  const yearOptions = getOptionsForYearAndTemplate(year, templateName);
                                  return (
                                    <div key={templateName != null ? `${year}-${templateName}` : `${year}-default`} className="mb-3">
                                      <h6 className="text-muted mb-2">{label}</h6>
                                      {yearOptions.map((opt) => (
                                        <motion.li
                                          key={opt.id}
                                          onClick={() => setSelected(opt)}
                                          className={`p-3 border mb-2 rounded d-flex align-items-center justify-content-between list-unstyled ${
                                            selected?.id === opt.id ? "bg-activetext" : ""
                                          }`}
                                          style={{ cursor: "pointer" }}
                                          whileHover={{ scale: 1.02 }}
                                          whileTap={{ scale: 0.95 }}
                                        >
                                          <div className="d-flex align-items-center gap-2">
                                            <FcOpenedFolder size={28} />
                                            <span className="fw-bold">
                                              {opt.title}
                                              <span className="small fw-normal d-block">
                                                {opt.date}
                                              </span>
                                            </span>
                                          </div>
                                        </motion.li>
                                      ))}
                                    </div>
                                  );
                                });
                              })
                            : availableYears.map((year) => {
                                const yearOptions = getOptionsForYear(year);
                                return (
                                  <div key={year} className="mb-3">
                                    <h6 className="text-muted mb-2">{year}</h6>
                                    {yearOptions.map((opt) => (
                                      <motion.li
                                        key={opt.id}
                                        onClick={() => setSelected(opt)}
                                        className={`p-3 border mb-2 rounded d-flex align-items-center justify-content-between list-unstyled ${
                                          selected?.id === opt.id ? "bg-activetext" : ""
                                        }`}
                                        style={{ cursor: "pointer" }}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.95 }}
                                      >
                                        <div className="d-flex align-items-center gap-2">
                                          <FcOpenedFolder size={28} />
                                          <span className="fw-bold">
                                            {opt.title}
                                            <span className="small fw-normal d-block">
                                              {opt.date}
                                            </span>
                                          </span>
                                        </div>
                                      </motion.li>
                                    ))}
                                  </div>
                                );
                              }))}
                      </>
                    )}
                  </motion.ul>
                </div>
              </Col>

              {/* Content */}
              <Col md={9} key="content">
                <motion.div
                  className="p-0 border-0 rounded"
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 50, opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  style={{
                    maxHeight: "calc(100vh - 100px)",
                    overflowY: "auto",
                    overflowX: "hidden"
                  }}
                >
                  <Row>
                    <Col md={12} lg={10} className="pe-lg-5">
                      <Card className="mb-3 border-0">
                        <Card.Header className="bg-transparent py-3">
                          <h6 className="mb-0">
                            {pdfUploadTemplateName && selected?.templateKey
                              ? `${pdfUploadTemplateName} (${selected.title} - ${selected.year})`
                              : `${selected.title} - ${selected.year}`}
                          </h6>
                        </Card.Header>
                        <Card.Body>
                          {/* Render dynamic fields */}
                          {console.log('[SGHA_Add] Rendering fields:', fields.length, fields.map(f => f?.type))}
                          {fields.map((field, index) => {
                            if (!field || !field.type) {
                              console.warn('[SGHA_Add] Skipping null/typeless field at index:', index, field);
                              return null;
                            }

                            // Check if this is a heading_no that should be paired with heading/subheading
                            const isHeadingNo = field.type === "heading_no" && 
                              index + 1 < fields.length && 
                              (fields[index + 1].type === "heading" || fields[index + 1].type === "subheading");
                            
                            // If this is a heading_no that will be paired, skip rendering it here
                            if (isHeadingNo) {
                              const nextField = fields[index + 1];
                              
                              return (
                                <FieldErrorBoundary key={field.id}>
                                  <div className="mb-3">
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                      <div className="d-flex gap-3 align-items-center">
                                        <label className="fw-bold mb-0" style={{ minWidth: "100px" }}>
                                          {field.label}:
                                        </label>
                                        <label className="fw-bold mb-0" style={{ flex: 1 }}>
                                          {nextField.label}:
                                        </label>
                                      </div>
                                      <div className="d-flex gap-2">
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
                                            deleteField(field.id);
                                            deleteField(nextField.id);
                                          }}
                                          tooltip="Delete both fields"
                                        />
                                      </div>
                                    </div>
                                    <div className="d-flex gap-2 align-items-center">
                                      <div style={{ width: "150px", flexShrink: 0 }}>
                                        {renderField(field, true)}
                                      </div>
                                      <div style={{ flex: 1 }}>
                                        {renderField(nextField)}
                                      </div>
                                    </div>
                                  </div>
                                </FieldErrorBoundary>
                              );
                            }
                            
                            // Check if this field was already rendered as part of a pair
                            const wasRendered = index > 0 && 
                              fields[index - 1].type === "heading_no" && 
                              (field.type === "heading" || field.type === "subheading");
                            
                            if (wasRendered) {
                              return null;
                            }
                            
                            // Render regular fields
                            return (
                              <FieldErrorBoundary key={field.id}>
                                <div className="mb-3">
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
                                      onClick={() => deleteField(field.id)}
                                    />
                                  </label>
                                  <div className="w-100">{renderField(field)}</div>
                                </div>
                              </FieldErrorBoundary>
                            );
                          })}
                        </Card.Body>
                      </Card>
                    </Col>

                    {/* Right Item List */}
                    <Col md={12} lg={2}>
                      <ul
                        className="ItemList sticky-top"
                        style={{ top: "15px" }}
                      >
                        <li onClick={() => addField("heading", "Heading")}>
                          <FaHeading className="me-2" /> Heading
                        </li>
                        <li
                          onClick={() => addField("heading_no", "Heading No.")}
                        >
                          <MdFormatListNumbered className="me-2" /> Heading No.
                        </li>
                        <li
                          onClick={() => addField("subheading", "Subheading")}
                        >
                          <MdSubtitles className="me-2" /> Sub-heading
                        </li>
                        <li onClick={() => addField("sub_child", "Sub Child")}>
                          <MdOutlineSubdirectoryArrowRight className="me-2" />{" "}
                          Sub-child
                        </li>
                        <li onClick={() => addField("input", "Input Box")}>
                          <AiOutlineEdit className="me-2" /> Input Box
                        </li>
                        <li onClick={() => addField("editor", "Text Editor")}>
                          <AiOutlineForm className="me-2" /> Text editor
                        </li>
                        <li onClick={() => addField("textarea", "Text Area")}>
                          <BiText className="me-2" /> Text Area
                        </li>
                        <li onClick={() => addField("table", "Table Field")}>
                          <LuTable className="me-2" /> Table
                        </li>
                        <li onClick={() => addField("checkbox", "Checkbox")}>
                          <MdCheckBox className="me-2" /> Checkbox
                        </li>
                        <li className="bg-transparent border-0 p-0 mt-4">
                          <Button
                            label="Cancel"
                            severity="secondary"
                            style={{ fontSize: "15px", borderRadius: "5px" }}
                            className="py-1 w-100 d-block mb-2"
                            outlined
                            onClick={() => setSelected(null)}
                          />
                          <Button
                            label="Save"
                            severity="success"
                            style={{ fontSize: "15px", borderRadius: "5px" }}
                            className="py-1 w-100 d-block"
                            onClick={handleSave}
                            loading={loading}
                            disabled={loading}
                          />
                        </li>
                      </ul>
                    </Col>
                  </Row>
                </motion.div>
              </Col>
            </>
          )}
        </AnimatePresence>
      </Row>

      {/* Add Year Dialog */}
      <Dialog
        visible={addYearDialogVisible}
        onHide={() => {
          setAddYearDialogVisible(false);
          setNewYear('');
        }}
        header="Add New Year"
        style={{ width: '400px' }}
        footer={
          <div className="d-flex justify-content-end gap-2">
            <Button
              label="Cancel"
              icon="pi pi-times"
              severity="secondary"
              onClick={() => {
                setAddYearDialogVisible(false);
                setNewYear('');
              }}
              disabled={addingYear}
            />
            <Button
              label="Add"
              icon="pi pi-check"
              severity="success"
              onClick={handleAddYear}
              loading={addingYear}
              disabled={addingYear || !newYear || isNaN(newYear) || parseInt(newYear) <= 0}
            />
          </div>
        }
      >
        <div className="p-fluid">
          <div className="field mt-3">
            <label htmlFor="newYear" className="mb-2">Year</label>
            <InputText
              id="newYear"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              placeholder="Enter year (e.g., 2026)"
              type="number"
              min="1900"
              max="2100"
              className="w-100"
              disabled={addingYear}
            />
            <small className="text-muted">Enter a valid year (e.g., 2026)</small>
          </div>
        </div>
      </Dialog>

      {/* PDF Upload Dialog */}
      <Dialog
        visible={pdfDialogVisible}
        onHide={() => {
          setPdfDialogVisible(false);
          setSelectedPdfFile(null);
          setIsDragging(false);
        }}
        header="Create Template from PDF"
        style={{ width: '500px' }}
        footer={
          <div className="d-flex justify-content-end gap-2">
            <Button
              label="Cancel"
              icon="pi pi-times"
              severity="secondary"
              onClick={() => {
                setPdfDialogVisible(false);
                setSelectedPdfFile(null);
                setIsDragging(false);
              }}
            />
            <Button
              label="Upload"
              icon="pi pi-upload"
              severity="success"
              onClick={handlePdfUpload}
              disabled={!selectedPdfFile || uploadingPdf}
              loading={uploadingPdf}
            />
          </div>
        }
      >
        <div className="p-fluid">
          <div className="field mt-3">
            <label className="mb-2">Upload PDF File</label>
            
            {/* Drag and Drop Area */}
            <div
              className={`indothai-drag-drop-area ${isDragging ? 'dragging' : ''} ${selectedPdfFile ? 'has-file' : ''}`}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                  const file = files[0];
                  if (file.type === 'application/pdf') {
                    setSelectedPdfFile(file);
                  } else {
                    showMessage("error", "Please upload a PDF file only");
                  }
                }
              }}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf';
                input.onchange = (e) => {
                  const file = e.target.files[0];
                  if (file) {
                    if (file.type === 'application/pdf') {
                      setSelectedPdfFile(file);
                    } else {
                      showMessage("error", "Please upload a PDF file only");
                    }
                  }
                };
                input.click();
              }}
            >
              {!selectedPdfFile ? (
                <>
                  <div className="indothai-upload-icon">
                    <i className="pi pi-cloud-upload" style={{ fontSize: '3rem' }}></i>
                  </div>
                  <div className="indothai-upload-text">
                    <p className="mb-1">
                      <strong>Drag and drop your PDF file here</strong>
                    </p>
                    <p className="mb-0 text-muted">or click to browse</p>
                  </div>
                </>
              ) : (
                <div className="indothai-file-preview">
                  <i className="pi pi-file-pdf" style={{ fontSize: '3rem', color: '#ff8104' }}></i>
                  <p className="mb-1 fw-bold mt-2">{selectedPdfFile.name}</p>
                  <small className="text-muted">
                    {(selectedPdfFile.size / 1024 / 1024).toFixed(2)} MB
                  </small>
                  <Button
                    icon="pi pi-times"
                    severity="danger"
                    className="p-button-rounded p-button-text mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPdfFile(null);
                    }}
                    tooltip="Remove file"
                  />
                </div>
              )}
            </div>
            
            <small className="text-muted d-block mt-2">
              Only PDF files are accepted.
            </small>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default SGHA_Add;
