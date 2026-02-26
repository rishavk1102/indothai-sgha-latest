import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Sidebar } from "primereact/sidebar";
import { Accordion, AccordionTab } from "primereact/accordion";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Breadcrumb, Card, Col, Row, Spinner, Table } from "react-bootstrap";
import DOMPurify from "dompurify";
import axios from "axios";
import api from "../../api/axios";
import CustomToast from "../../components/CustomToast";
import logoImage from "../../assets/images/logo.png";
import "../../assets/css/dashboard.css";

const UPLOADS_API_URL = "https://indothai-ai.72.61.173.50.sslip.io/uploads";
const PAGE_NAME = "Section Template";
const SAVE_PAGE_NAME = "Section Template";

// Hints to find segregated file paths (MinIO object keys) in upload row JSON
const SEGREGATED_MAIN_HINTS = [
  "segregated_main_agreement",
  "segregatedMainAgreement",
  "segregated_main_agreement_path",
  "main_agreement_path",
  "main_agreement",
];
const SEGREGATED_ANNEX_A_HINTS = [
  "segregated_annex_a",
  "segregatedAnnexA",
  "segregated_annex_a_path",
  "annex_a_path",
  "annex_a",
];
const SEGREGATED_ANNEX_B_HINTS = [
  "segregated_annex_b",
  "segregatedAnnexB",
  "segregated_annex_b_path",
  "annex_b_path",
  "annex_b",
];

const getPathFromRow = (row, hints) => {
  const keys = Object.keys(row || {});
  const lower = (s) => (s || "").toLowerCase();
  for (const hint of hints) {
    const k = keys.find(
      (key) => lower(key) === lower(hint) || lower(key).includes(lower(hint))
    );
    if (k != null && row[k] != null) {
      const v = row[k];
      if (typeof v === "string" && v.trim()) return v.trim();
      if (typeof v === "object" && v.path) return v.path;
      if (typeof v === "object" && v.key) return v.key;
    }
  }
  return null;
};

const STATUS_COLUMNS = [
  {
    key: "upload_status",
    label: "Upload Status",
    hints: ["upload_status", "uploadStatus", "upload"],
  },
  {
    key: "extraction_status",
    label: "Extraction Status",
    hints: ["extraction_status", "extractionStatus", "extraction"],
  },
  {
    key: "segregation_status",
    label: "Segregation Status",
    hints: ["segregation_status", "segregationStatus", "segregation"],
  },
];

const FILE_NAME_HINTS = [
  "filename",
  "file_name",
  "name",
  "originalName",
  "original_name",
  "file",
];

const getFileName = (row) => {
  const keys = Object.keys(row || {});
  const lower = (s) => (s || "").toLowerCase();
  for (const hint of FILE_NAME_HINTS) {
    const k = keys.find(
      (key) => lower(key) === lower(hint) || lower(key).includes(lower(hint)),
    );
    if (k != null && row[k] != null) {
      const v = row[k];
      if (typeof v === "object") return v.name ?? v.filename ?? null;
      return v;
    }
  }
  return null;
};

const PROCESS_STARTED_HINTS = [
  "started_at",
  "start_date",
  "created_at",
  "created",
  "timestamp",
  "process_started",
  "started",
  "date",
];

const getProcessStartedDate = (row) => {
  const keys = Object.keys(row || {});
  const lower = (s) => (s || "").toLowerCase();
  for (const hint of PROCESS_STARTED_HINTS) {
    const k = keys.find(
      (key) => lower(key) === lower(hint) || lower(key).includes(lower(hint)),
    );
    if (k != null && row[k] != null) {
      const v = row[k];
      if (typeof v === "object" && v !== null) {
        const d = v.date ?? v.timestamp ?? v.started_at ?? v.created_at;
        if (d != null) return formatDate(d);
        return null;
      }
      return formatDate(v);
    }
  }
  return null;
};

const formatDate = (value) => {
  if (value == null) return null;
  const d =
    typeof value === "string" || typeof value === "number"
      ? new Date(value)
      : value;
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const getStatusValue = (row, col) => {
  for (const hint of col.hints) {
    const keys = Object.keys(row || {});
    const k = keys.find(
      (key) =>
        key.toLowerCase() === hint.toLowerCase() ||
        key.toLowerCase().includes(hint.toLowerCase()),
    );
    if (k != null && row[k] != null) {
      const v = row[k];
      if (typeof v === "object" && v !== null && "status" in v) return v.status;
      return v;
    }
  }
  return null;
};

// Status values that mean process is still running / in progress (disable actions)
const IN_PROGRESS_STATUSES = new Set([
  "running",
  "in progress",
  "in_progress",
  "pending",
  "processing",
  "uploading",
  "extracting",
  "segregating",
  "upload",
  "extraction",
  "segregation",
  "queued",
  "started",
]);

const COMPLETED_STATUSES = new Set([
  "completed",
  "complete",
  "success",
  "done",
  "finished",
  "extracted",
  "segregated",
  "uploaded",
  "successful",
]);

// Categorize status for progress bar color: 'not_started' (red) | 'in_progress' (yellow) | 'completed' (green)
const getStatusCategory = (value) => {
  if (value == null || String(value).trim() === "" || String(value).toLowerCase() === "—") return "not_started";
  const normalized = String(value).toLowerCase().trim();
  if (COMPLETED_STATUSES.has(normalized)) return "completed";
  if (normalized.includes("success") || normalized.includes("complete") || normalized.includes("done")) return "completed";
  if (IN_PROGRESS_STATUSES.has(normalized)) return "in_progress";
  if (normalized.includes("progress") || normalized.includes("running") || normalized.includes("pending")) return "in_progress";
  return "not_started";
};

const isStatusValueInProgress = (value) => getStatusCategory(value) === "in_progress";

const isRowProcessInProgress = (row) => {
  if (!row) return false;
  for (const col of STATUS_COLUMNS) {
    const value = getStatusValue(row, col);
    if (isStatusValueInProgress(value)) return true;
  }
  return false;
};

const TEMPLATE_HINTS = [
  "template_id",
  "template_created",
  "has_template",
  "template",
];

const hasTemplateForRow = (row) => {
  const keys = Object.keys(row || {});
  const lower = (s) => (s || "").toLowerCase();
  for (const hint of TEMPLATE_HINTS) {
    const k = keys.find(
      (key) => lower(key) === lower(hint) || lower(key).includes(lower(hint)),
    );
    if (k != null && row[k] != null) {
      const v = row[k];
      if (typeof v === "object") return !!(v.id ?? v.template_id ?? v.created);
      if (typeof v === "boolean") return v;
      if (typeof v === "string" && v.trim() !== "") return true;
      if (typeof v === "number") return true;
    }
  }
  return false;
};

const tableStyles = {
  table: { borderColor: "#dee2e6" },
  thead: { backgroundColor: "#f0f0f0", color: "#000", fontWeight: 600 },
  th: { borderColor: "#dee2e6", padding: "12px 14px", whiteSpace: "nowrap" },
  td: { borderColor: "#dee2e6", padding: "12px 14px", verticalAlign: "middle" },
  trEven: { backgroundColor: "#fafafa" },
  trOdd: { backgroundColor: "#fff" },
  actionsCell: { textAlign: "center" },
};

const getRowId = (row, index) =>
  row?.id ?? row?.upload_id ?? row?.uploadId ?? index;

// Parse plain-text SGHA files (Main Agreement, Annex A, Annex B) into sections
// Handles ARTICLE X., SECTION X, PARAGRAPH X., and numbered subsections (1.1, 1.1.1, etc.)
function parsePlainTextToSections(text) {
  if (typeof text !== "string" || !text.trim()) return [];
  const lines = text.split(/\r?\n/);
  const sections = [];
  let current = { title: "", content: [] };
  const flush = () => {
    const content = current.content.join("\n").trim();
    if (current.title || content) {
      sections.push({ title: current.title, content });
    }
    current = { title: "", content: [] };
  };
  const isPageBreak = (line) => {
    const t = line.trim();
    return (
      /^=+$/.test(t) ||
      /^PAGE\s+\d+/i.test(t) ||
      /^Page\s+\|\s*\d+/.test(t) ||
      /^\d{4}\s*$/.test(t)
    );
  };
  const isSectionHeader = (line) => {
    const t = line.trim();
    if (!t) return false;
    if (/^(ARTICLE|SECTION|PARAGRAPH)\s+\d+/i.test(t)) return true;
    // Subheading: only X.X (e.g. 1.1, 1.2). X.X.X stays in content for table display.
    if (/^\d+\.\d+\.?(?=\s|$)/.test(t)) return true;
    // Definition-style: short line, all caps (e.g. "HOLD BAGGAGE", "ICAO", "IATA")
    if (t.length > 2 && t.length < 120 && /^[A-Z][A-Z0-9\s\-().'/&]+$/.test(t) && (t.length < 50 || /\s/.test(t))) return true;
    return false;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isPageBreak(line)) continue;
    if (isSectionHeader(line)) {
      flush();
      current.title = line.trim();
      continue;
    }
    current.content.push(line);
  }
  flush();
  return sections;
}

// Format content so bullet pointers (•) become proper HTML lists with indentation.
function formatContentWithBulletLists(text) {
  if (!text || typeof text !== "string") return text || "";
  const escape = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  // Put each bullet on its own line: " • " or " • " in middle of text
  let s = text.replace(/\s+•\s+/g, "\n• ");
  const lines = s.split(/\r?\n/);
  const out = [];
  let listItems = [];
  let para = [];
  const flushList = () => {
    if (listItems.length > 0) {
      out.push('<ul style="margin-left: 1.5em; margin-top: 0.25em; margin-bottom: 0.5em;">');
      listItems.forEach((item) => {
        out.push("<li>" + escape(item) + "</li>");
      });
      out.push("</ul>");
      listItems = [];
    }
  };
  const flushPara = (raw) => {
    const t = raw.trim();
    if (!t) return;
    out.push('<p style="margin: 0.25em 0;">' + escape(t).replace(/\n/g, "<br>") + "</p>");
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^•\s*/.test(trimmed)) {
      if (para.length > 0) {
        flushPara(para.join("\n"));
        para = [];
      }
      listItems.push(trimmed.replace(/^•\s*/, "").trim());
    } else {
      flushList();
      if (trimmed) para.push(line);
      else if (para.length) para.push("");
    }
  }
  flushList();
  if (para.length > 0) flushPara(para.join("\n"));
  return out.length > 0 ? out.join("") : escape(text).replace(/\n/g, "<br>");
}

// Convert plain-text sections into SGHA_Add field array: heading_no + heading, heading_no + subheading, editor.
function plainTextToStructuredFields(text, baseId = 0) {
  const sections = parsePlainTextToSections(text);
  if (sections.length === 0) return [];
  const emptyField = (type, label, value) => ({
    id: 0,
    type,
    label: label || (type === "heading_no" ? "Heading No." : type === "heading" ? "Heading" : type === "subheading" ? "Sub-heading" : "Content"),
    value: value ?? "",
    checkboxValue: [],
    checkboxConfig: {},
    commentConfig: {},
    variableDefaults: {},
  });
  const fields = [];
  let id = baseId || Date.now();
  const nextId = () => (id += 1);
  const push = (type, label, value) => {
    const f = emptyField(type, label, value);
    f.id = nextId();
    fields.push(f);
  };
  for (const { title, content } of sections) {
    const t = title.trim();
    const contentTrimmed = (content || "").trim();
    // Main heading: ARTICLE 1., SECTION 1., PARAGRAPH 1. or "1. DEFINITIONS"
    const articleMatch = t.match(/^(ARTICLE|SECTION|PARAGRAPH)\s+(\d+)[.\s]*(.*)$/i);
    if (articleMatch) {
      const num = articleMatch[2];
      const rest = (articleMatch[3] || "").trim();
      push("heading_no", "Heading No.", num);
      push("heading", "Heading", rest || t);
      if (contentTrimmed) push("editor", "Content", formatContentWithBulletLists(contentTrimmed));
      continue;
    }
    // Subheading: only X.X (e.g. 1.1, 1.2). X.X.X stays in content (e.g. table) — do not match 1.1.1.
    const subMatch = !/^\d+\.\d+\.\d+/.test(t) && t.match(/^(\d+\.\d+)(?:\s|\.\s|\.?$)\s*(.*)$/);
    if (subMatch) {
      const num = subMatch[1];
      const rest = (subMatch[2] || "").trim();
      push("heading_no", "Subheading No.", num);
      push("subheading", "Sub-heading", rest || num);
      if (contentTrimmed) push("editor", "Content", formatContentWithBulletLists(contentTrimmed));
      continue;
    }
    // X.X.X and deeper: keep in content (e.g. for table display), not as subheading
    if (/^\d+\.\d+\.\d+/.test(t)) {
      const body = contentTrimmed ? `${t}\n\n${contentTrimmed}` : t;
      push("editor", "Content", formatContentWithBulletLists(body));
      continue;
    }
    // Definition-style or other title (e.g. "HOLD BAGGAGE"): treat as subheading + body
    if (t) {
      push("heading_no", "Subheading No.", "");
      push("subheading", "Sub-heading", t);
      if (contentTrimmed) push("editor", "Content", formatContentWithBulletLists(contentTrimmed));
    } else if (contentTrimmed) {
      push("editor", "Content", formatContentWithBulletLists(contentTrimmed));
    }
  }
  return fields;
}

// Normalize a single field so it has .type and .value (handles fieldType/field_type, text/val etc.)
function normalizeField(field) {
  if (!field || typeof field !== "object") return field;
  const type =
    field.type ?? field.fieldType ?? field.field_type ?? field.kind;
  const value =
    field.value ?? field.text ?? field.val ?? field.content ?? field.body;
  if (type !== undefined || value !== undefined)
    return { ...field, type, value };
  return field;
}

// Parse Main Agreement or Annex A/B section template content (array of { type, value })
function parseSectionTemplateContent(templateData) {
  if (!templateData || !Array.isArray(templateData)) return [];
  const sections = [];
  let currentArticle = null;
  let currentSection = null;
  let currentMainSection = null;
  const list = templateData.map(normalizeField);

  list.forEach((field, index) => {
    if (field.type === "heading_no") {
      const sectionNum = String(field.value ?? "");
      if (
        !sectionNum.includes(".") &&
        ["1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(sectionNum)
      ) {
        if (
          index + 1 < list.length &&
          list[index + 1].type === "heading"
        ) {
          currentMainSection = sectionNum;
          const mainSectionHeading = list[index + 1].value ?? "";
          currentArticle = {
            articleNumber: sectionNum,
            articleTitle: mainSectionHeading,
            sections: [],
          };
          sections.push(currentArticle);
          return;
        }
      }
      if (sectionNum.includes(".") && currentMainSection) {
        const nextField = index + 1 < list.length ? list[index + 1] : null;
        if (nextField && nextField.type === "subheading") {
          currentSection = {
            sectionNumber: sectionNum,
            sectionTitle: nextField.value ?? "",
            content: null,
          };
          if (currentArticle) currentArticle.sections.push(currentSection);
          return;
        }
      }
    }
    if (field.type === "subheading_no" && currentMainSection) {
      const headingNo = String(field.value ?? "");
      if (headingNo.includes(".")) {
        const nextField = index + 1 < list.length ? list[index + 1] : null;
        const subheadingText =
          nextField && nextField.type === "subheading" ? nextField.value ?? "" : "";
        currentSection = {
          sectionNumber: headingNo,
          sectionTitle: subheadingText,
          content: null,
        };
        if (currentArticle) currentArticle.sections.push(currentSection);
        return;
      }
    }
    if (field.type === "editor" && currentArticle) {
      const html = field.value ?? field.content ?? field.text ?? "";
      if (currentSection) {
        currentSection.content = html;
      } else {
        currentArticle.sections.push({
          sectionNumber: null,
          sectionTitle: null,
          content: html,
        });
      }
    }
  });
  return sections;
}

const PdfUploads = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [createdTemplateIds, setCreatedTemplateIds] = useState(new Set());

  // Template name dialog and details
  const [nameDialogVisible, setNameDialogVisible] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateYear, setTemplateYear] = useState(2025);
  const [templateDetailsVisible, setTemplateDetailsVisible] = useState(false);
  const [templateDetails, setTemplateDetails] = useState({
    main: null,
    annexA: null,
    annexB: null,
  });
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const toastRef = useRef(null);

  // PDF upload dialog (create template from PDF – same as createSGHATemplate)
  const [pdfDialogVisible, setPdfDialogVisible] = useState(false);
  const [selectedPdfFile, setSelectedPdfFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const showMessage = useCallback((severity, detail) => {
    const summary = severity.charAt(0).toUpperCase() + severity.slice(1);
    toastRef.current?.show(severity, summary, detail);
  }, []);

  const handlePdfUpload = useCallback(async () => {
    if (!selectedPdfFile) {
      showMessage("warn", "Please select a PDF file");
      return;
    }
    setUploadingPdf(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedPdfFile);
      await axios.post(
        "https://indothai-ai.72.61.173.50.sslip.io/upload-pdf",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      showMessage("success", "PDF uploaded successfully!");
      setPdfDialogVisible(false);
      setSelectedPdfFile(null);
      setIsDragging(false);
      // Refresh uploads list
      const response = await fetch(UPLOADS_API_URL);
      if (response.ok) {
        const json = await response.json();
        setData(json);
      }
    } catch (err) {
      console.error("Error uploading PDF:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to upload PDF. Please try again.";
      showMessage("error", errorMessage);
    } finally {
      setUploadingPdf(false);
    }
  }, [selectedPdfFile, showMessage]);

  useEffect(() => {
    const fetchUploads = async () => {
      setLoading(true);
      setError(null);
      setStatus(null);
      setData(null);
      try {
        const response = await fetch(UPLOADS_API_URL);
        setStatus(response.status);
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || `HTTP ${response.status}`);
        }
        const json = await response.json();
        setData(json);
      } catch (err) {
        setError(err.message || "Failed to fetch uploads");
      } finally {
        setLoading(false);
      }
    };
    fetchUploads();
  }, []);

  const handleEdit = (row, index) => {
    console.log("Edit", row, index);
    // TODO: open edit modal or navigate
  };

  const handleDelete = (row, index) => {
    console.log("Delete", row, index);
    // TODO: confirm and call delete API
  };

  const hasTemplate = (row, index) =>
    hasTemplateForRow(row) || createdTemplateIds.has(getRowId(row, index));

  const handleCreateTemplate = (row) => {
    setSelectedRow(row || null);
    setTemplateName("");
    setTemplateYear(2025);
    setDetailsError(null);
    setNameDialogVisible(true);
  };

  const handleNameDialogSubmit = async () => {
    const name = (templateName || "").trim();
    if (!name) return;
    setNameDialogVisible(false);
    setTemplateDetailsVisible(true);
    setLoadingDetails(true);
    setDetailsError(null);
    setTemplateDetails({ main: null, annexA: null, annexB: null });

    const row = selectedRow;
    const pathMain = row ? getPathFromRow(row, SEGREGATED_MAIN_HINTS) : null;
    const pathAnnexA = row ? getPathFromRow(row, SEGREGATED_ANNEX_A_HINTS) : null;
    const pathAnnexB = row ? getPathFromRow(row, SEGREGATED_ANNEX_B_HINTS) : null;

    try {
      if (!pathMain && !pathAnnexA && !pathAnnexB) {
        setDetailsError(
          "No segregated file paths found for this upload. Expected keys (e.g. segregated_main_agreement, segregated_annex_a, segregated_annex_b) in the row data."
        );
        setLoadingDetails(false);
        return;
      }

      const normalizeTemplateContent = (data) => {
        if (data == null) return null;
        if (typeof data === "string") return data;
        if (data && data.type === "text" && typeof data.content === "string")
          return data;
        if (Array.isArray(data)) return data;
        if (data && typeof data === "object") {
          const arr =
            data.content ??
            data.fields ??
            data.items ??
            data.data ??
            data.sections;
          if (Array.isArray(arr)) return arr;
        }
        return null;
      };

      const fetchFromMinIO = async (path) => {
        if (!path) return null;
        const res = await api.get("/api/pdf-uploads/file-content", {
          params: { path },
        });
        const data = res?.data;
        return normalizeTemplateContent(data);
      };

      const [main, annexA, annexB] = await Promise.all([
        fetchFromMinIO(pathMain),
        fetchFromMinIO(pathAnnexA),
        fetchFromMinIO(pathAnnexB),
      ]);

      setTemplateDetails({ main, annexA, annexB });
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      const detail = err.response?.data?.error;
      setDetailsError(
        detail ? `${msg}: ${detail}` : msg || "Failed to load template data from MinIO"
      );
    } finally {
      setLoadingDetails(false);
    }
  };

  // Prepare content for save API: backend expects JSON array. Plain text is wrapped in one editor block.
  const contentToSavePayload = useCallback((content) => {
    if (content == null) return null;
    if (Array.isArray(content)) return content;
    const text =
      typeof content === "string"
        ? content
        : content.type === "text" && typeof content.content === "string"
          ? content.content
          : null;
    if (text != null) return [{ type: "editor", id: Date.now(), value: text }];
    return null;
  }, []);

  // Convert section content to SGHA_Add templateFields format (array of { id, type, label, value, ... }).
  // For plain text, parses into heading_no + heading, heading_no + subheading, and editor (body) components.
  const contentToEditorFields = useCallback((content, baseId = 0) => {
    if (content == null) return [];
    const rawText =
      typeof content === "string"
        ? content
        : content.type === "text" && typeof content.content === "string"
          ? content.content
          : null;
    if (rawText != null) {
      const structured = plainTextToStructuredFields(rawText, baseId);
      if (structured.length > 0) return structured;
      return [
        {
          id: baseId || Date.now(),
          type: "editor",
          label: "Content",
          value: rawText,
          checkboxValue: [],
          checkboxConfig: {},
          commentConfig: {},
          variableDefaults: {},
        },
      ];
    }
    if (!Array.isArray(content)) return [];
    return content.map((item, index) => {
      const id = item.id != null ? item.id : baseId + index + 1;
      const type = item.type || item.fieldType || "editor";
      const label = item.label || (type === "heading_no" ? "Heading No." : type === "heading" ? "Heading" : type === "subheading" ? "Sub-heading" : "Content");
      return {
        id,
        type,
        label,
        value: item.value ?? "",
        checkboxValue: item.checkboxValue ?? [],
        checkboxConfig: item.checkboxConfig ?? {},
        commentConfig: item.commentConfig ?? {},
        variableDefaults: item.variableDefaults ?? {},
        rows: item.rows,
      };
    });
  }, []);

  const handleOpenInEditor = useCallback(() => {
    const year = templateYear || 2025;
    const name = (templateName || "").trim() || getFileName(selectedRow) || "Template";
    const baseId = Date.now();
    const mainFields = contentToEditorFields(templateDetails.main, baseId);
    const annexAFields = contentToEditorFields(templateDetails.annexA, baseId + 10000);
    const annexBFields = contentToEditorFields(templateDetails.annexB, baseId + 20000);
    const copyFields = (arr) => (Array.isArray(arr) ? JSON.parse(JSON.stringify(arr)) : []);
    const templateFields = {
      [`${year}-Main Agreement`]: mainFields,
      [`${year}-Annex A`]: annexAFields,
      [`${year}-Annex B`]: annexBFields,
      [`${name}-Main Agreement`]: copyFields(mainFields),
      [`${name}-Annex A`]: copyFields(annexAFields),
      [`${name}-Annex B`]: copyFields(annexBFields),
    };
    const initialSelected = {
      id: `${name}-1`,
      title: "Main Agreement",
      date: `Year-${year}`,
      year,
      templateKey: `${name}-Main Agreement`,
    };
    setTemplateDetailsVisible(false);
    navigate("/dashboard/createSGHATemplate", {
      state: {
        fromPdfUpload: true,
        templateName: name,
        year,
        templateFields,
        initialSelected,
      },
    });
  }, [templateYear, templateName, selectedRow, templateDetails.main, templateDetails.annexA, templateDetails.annexB, contentToEditorFields, navigate]);

  const handleSaveAsTemplate = useCallback(async () => {
    const name = (templateName || "").trim() || getFileName(selectedRow) || "Template";
    const year = templateYear || 2025;
    const mainPayload = contentToSavePayload(templateDetails.main);
    const annexAPayload = contentToSavePayload(templateDetails.annexA);
    const annexBPayload = contentToSavePayload(templateDetails.annexB);
    if (!mainPayload && !annexAPayload && !annexBPayload) {
      showMessage("warn", "No content to save.");
      return;
    }
    setSavingTemplate(true);
    try {
      const types = [
        { type: "Main Agreement", payload: mainPayload },
        { type: "Annex A", payload: annexAPayload },
        { type: "Annex B", payload: annexBPayload },
      ];
      for (const { type, payload } of types) {
        if (!payload) continue;
        await api.post(`/sgha_template_content/save/${SAVE_PAGE_NAME}`, {
          year,
          type,
          template_name: name,
          content: JSON.stringify(payload),
        });
      }
      showMessage("success", `"${name}" saved as SGHA template for year ${year}.`);
      setTemplateDetailsVisible(false);
      navigate("/dashboard/createSGHATemplate", {
        state: { savedFromPdfUpload: true, savedYear: year, savedTemplateName: name },
      });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to save template.";
      showMessage("error", msg);
    } finally {
      setSavingTemplate(false);
    }
  }, [
    templateName,
    templateYear,
    selectedRow,
    templateDetails.main,
    templateDetails.annexA,
    templateDetails.annexB,
    contentToSavePayload,
    showMessage,
    navigate,
  ]);

  const renderHTMLContent = useCallback((htmlString) => {
    if (!htmlString) return null;
    const sanitized = DOMPurify.sanitize(htmlString, {
      ALLOWED_TAGS: [
        "p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li",
        "strong", "em", "b", "i", "br", "div", "span",
      ],
      ALLOWED_ATTR: [],
    });
    return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
  }, []);

  const renderSectionContent = (content) => {
    if (content == null) return <p className="text-muted">No content available.</p>;

    const isPlainText =
      typeof content === "string" ||
      (content && content.type === "text" && typeof content.content === "string");
    const plainText = isPlainText
      ? typeof content === "string"
        ? content
        : content.content
      : null;

    if (plainText !== null) {
      const sections = parsePlainTextToSections(plainText);
      if (sections.length === 0)
        return (
          <pre className="bg-light p-3 rounded small mb-0" style={{ whiteSpace: "pre-wrap" }}>
            {plainText.slice(0, 2000)}
            {plainText.length > 2000 ? "\n\n..." : ""}
          </pre>
        );
      return (
        <div className="plain-text-sections">
          {sections.map((sec, idx) => (
            <div key={idx} className="mb-4">
              {sec.title && (
                <h6 className="text-primary mb-2 border-bottom pb-1">{sec.title}</h6>
              )}
              <div
                className="small text-body"
                style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}
              >
                {sec.content}
              </div>
            </div>
          ))}
        </div>
      );
    }

    const arr = Array.isArray(content)
      ? content
      : content?.content ?? content?.fields ?? content?.items ?? content?.data ?? content?.sections;
    const sections = parseSectionTemplateContent(arr);
    if (!Array.isArray(arr) || sections.length === 0)
      return <p className="text-muted">No sections in this template.</p>;
    return (
      <Table borderless className="mb-0">
        <tbody>
          {sections.map((article, articleIndex) => (
            <tr key={`article-${articleIndex}`}>
              <td colSpan={2}>
                <h6 className="mb-2">
                  Article {article.articleNumber}: {article.articleTitle}
                </h6>
                {article.sections.map((section, sectionIndex) => (
                  <div key={`s-${sectionIndex}`} className="mb-3">
                    {section.sectionNumber && section.sectionTitle && (
                      <h6 className="small">
                        {section.sectionNumber} {section.sectionTitle}
                      </h6>
                    )}
                    {section.content && renderHTMLContent(section.content)}
                  </div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  // Normalize API response so every upload = 1 row (array, or object with uploads/data/items)
  const getUploadRows = (raw) => {
    if (raw == null) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "object") {
      const list =
        raw.uploads ?? raw.data ?? raw.items ?? raw.results ?? raw.records;
      if (Array.isArray(list)) return list;
      return [raw];
    }
    return [];
  };

  const toProperCase = (str) => {
    if (str == null || typeof str !== "string") return str;
    return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Cell background colors: red = not started, yellow = in progress, green = completed
  const STATUS_CELL_COLORS = {
    not_started: "#f8d7da",
    in_progress: "#fff3cd",
    completed: "#d1e7dd",
  };

  const renderStatusCell = (value) => {
    const raw =
      value == null
        ? "—"
        : typeof value === "object"
          ? value.status != null
            ? String(value.status)
            : "—"
          : String(value);
    const label = raw === "—" ? "—" : toProperCase(raw);
    return <span className="small text-nowrap">{label}</span>;
  };

  const renderResults = () => {
    if (data === null) return null;
    const rows = getUploadRows(data);
    if (rows.length === 0)
      return <p className="text-muted mb-0">No uploads found.</p>;
    return (
      <Card className="border-0 shadow-0 p-0">
        <Card.Body className="p-0">
          <Table bordered responsive className="mb-0" style={tableStyles.table}>
            <thead style={tableStyles.thead}>
              <tr>
                <th style={tableStyles.th}>Serial No.</th>
                <th style={tableStyles.th}>File Name</th>
                <th style={tableStyles.th}>Process Started</th>
                {STATUS_COLUMNS.map((col) => (
                  <th key={col.key} style={tableStyles.th}>
                    {col.label}
                  </th>
                ))}
                <th style={{ ...tableStyles.th, ...tableStyles.actionsCell }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  style={i % 2 === 0 ? tableStyles.trEven : tableStyles.trOdd}
                >
                  <td style={tableStyles.td}>{i + 1}</td>
                  <td style={tableStyles.td}>{getFileName(row) ?? "—"}</td>
                  <td style={tableStyles.td}>
                    {getProcessStartedDate(row) ?? "—"}
                  </td>
                  {STATUS_COLUMNS.map((col) => {
                    const value = getStatusValue(row, col);
                    const raw =
                      value == null
                        ? "—"
                        : typeof value === "object"
                          ? value.status != null
                            ? String(value.status)
                            : "—"
                          : String(value);
                    const category = getStatusCategory(raw);
                    const bgColor = STATUS_CELL_COLORS[category] || STATUS_CELL_COLORS.not_started;
                    return (
                      <td key={col.key} style={{ ...tableStyles.td, backgroundColor: bgColor }}>
                        {renderStatusCell(value)}
                      </td>
                    );
                  })}
                  <td style={{ ...tableStyles.td, ...tableStyles.actionsCell }}>
                    {(() => {
                      const inProgress = isRowProcessInProgress(row);
                      const disabledBtnClass = inProgress ? "opacity-50 pe-none" : "";
                      return (
                        <>
                          <Button
                            tooltip={inProgress ? "Process in progress – actions disabled" : "Open template (Main Agg, Annex A, Annex B)"}
                            icon="pi pi-plus"
                            severity="secondary"
                            className={`p-0 border-0 me-1 ${disabledBtnClass}`}
                            style={{ width: "30px" }}
                            tooltipOptions={{ position: "left" }}
                            text
                            disabled={inProgress}
                            onClick={() => handleCreateTemplate(row)}
                          />
                          <Button
                            tooltip={inProgress ? "Process in progress – actions disabled" : "Edit"}
                            icon="pi pi-pencil"
                            severity="info"
                            className={`p-0 border-0 me-1 ${disabledBtnClass}`}
                            style={{ width: "30px" }}
                            tooltipOptions={{ position: "left" }}
                            text
                            disabled={inProgress}
                            onClick={() => handleEdit(row, i)}
                          />
                          <Button
                            tooltip={inProgress ? "Process in progress – actions disabled" : "Delete"}
                            icon="pi pi-trash"
                            tooltipOptions={{ position: "left" }}
                            severity="danger"
                            className={`p-0 border-0 ${disabledBtnClass}`}
                            style={{ width: "30px" }}
                            text
                            disabled={inProgress}
                            onClick={() => handleDelete(row, i)}
                          />
                        </>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    );
  };

  return (
    <>
      <style>{`
        .indothai-drag-drop-area {
          border: 2px dashed #ff8104;
          border-radius: 12px;
          padding: 40px 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          background-color: #fffaf5;
        }
        .indothai-drag-drop-area:hover, .indothai-drag-drop-area.dragging {
          border-color: #e66a00;
          background-color: #fff0e0;
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
          margin: 0 auto 20px;
          color: #ff8104;
        }
        .indothai-drag-drop-area.dragging .indothai-upload-icon {
          background-color: #ff8104;
          color: #fff;
          transform: scale(1.1);
        }
        .indothai-upload-text { color: #333; }
        .indothai-upload-text strong { color: #ff8104; font-size: 16px; }
        .indothai-file-preview {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #333;
        }
        .indothai-file-preview p { margin: 0; word-break: break-word; max-width: 100%; }
      `}</style>
      <CustomToast ref={toastRef} />
      <Row>
        <Col md={12} lg={6}>
          <Breadcrumb>
            <Breadcrumb.Item active>PDF Uploads</Breadcrumb.Item>
          </Breadcrumb>
        </Col>
        <Col md={12} lg={6} className="d-flex justify-content-end align-items-center">
          <Button
            label="Create template from PDF"
            icon="pi pi-file-pdf"
            onClick={() => setPdfDialogVisible(true)}
            className="p-button-warning"
          />
        </Col>
      </Row>
      <Row>
        <Col>
          <Card className="border-0 shadow-0">
            <Card.Body>
              {loading && (
                <div className="d-flex align-items-center gap-2 py-4">
                  <Spinner animation="border" size="sm" />
                  <span>Loading...</span>
                </div>
              )}
              {error && !loading && (
                <div className="alert alert-danger py-2 mb-0" role="alert">
                  {error}
                </div>
              )}
              {!loading && !error && renderResults()}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Template name dialog */}
      <Dialog
        visible={nameDialogVisible}
        onHide={() => setNameDialogVisible(false)}
        header="Open template"
        style={{ width: "400px" }}
        footer={
          <div className="d-flex justify-content-end gap-2">
            <Button
              label="Cancel"
              severity="secondary"
              onClick={() => setNameDialogVisible(false)}
            />
            <Button
              label="Open"
              onClick={handleNameDialogSubmit}
              disabled={!templateName?.trim()}
            />
          </div>
        }
      >
        <div className="flex flex-column gap-3">
          <label htmlFor="template-name" className="fw-semibold">
            Template name
          </label>
          <InputText
            id="template-name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="e.g. 2025 SGHA Template"
            className="w-100"
          />
          <label htmlFor="template-year" className="fw-semibold">
            Year
          </label>
          <InputText
            id="template-year"
            type="number"
            value={templateYear}
            onChange={(e) =>
              setTemplateYear(parseInt(e.target.value, 10) || 2025)
            }
            placeholder="2025"
            className="w-100"
          />
        </div>
      </Dialog>

      {/* Template details dialog: Main Agg, Annex A, Annex B */}
      <Dialog
        visible={templateDetailsVisible}
        onHide={() => setTemplateDetailsVisible(false)}
        header={templateName?.trim() || "Template details"}
        style={{ width: "90vw", maxWidth: "900px" }}
        maximizable
        className="template-details-dialog"
      >
        {loadingDetails ? (
          <div className="d-flex align-items-center gap-2 py-5 justify-content-center">
            <Spinner animation="border" size="sm" />
            <span>Loading Main Agreement, Annex A and Annex B...</span>
          </div>
        ) : detailsError ? (
          <div className="alert alert-danger mb-0">{detailsError}</div>
        ) : (
          <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              {selectedRow && (
                <p className="text-muted small mb-0">
                  Content loaded from MinIO for this upload
                  {getFileName(selectedRow) ? `: ${getFileName(selectedRow)}` : ""}
                </p>
              )}
              <div className="d-flex gap-2 ms-auto">
                {(() => {
                  const inProgress = isRowProcessInProgress(selectedRow);
                  const disabledBtnClass = inProgress ? "opacity-50 pe-none" : "";
                  return (
                    <>
                      <Button
                        label="Preview"
                        icon="pi pi-eye"
                        severity="help"
                        outlined
                        className={disabledBtnClass}
                        disabled={inProgress}
                        tooltip={inProgress ? "Process in progress – wait for completion" : null}
                        onClick={() => setPreviewVisible(true)}
                      />
                      <Button
                        label="Open in editor"
                        icon="pi pi-pencil"
                        severity="secondary"
                        outlined
                        className={disabledBtnClass}
                        disabled={inProgress}
                        tooltip={inProgress ? "Process in progress – wait for completion" : null}
                        onClick={handleOpenInEditor}
                      />
                      <Button
                        label="Save as template"
                        icon="pi pi-save"
                        severity="success"
                        loading={savingTemplate}
                        className={disabledBtnClass}
                        disabled={savingTemplate || inProgress}
                        tooltip={inProgress ? "Process in progress – wait for completion" : null}
                        onClick={handleSaveAsTemplate}
                      />
                    </>
                  );
                })()}
              </div>
            </div>
            <Accordion multiple activeIndex={[0, 1, 2]}>
              <AccordionTab header="Main Agreement">
                {renderSectionContent(templateDetails.main)}
              </AccordionTab>
              <AccordionTab header="Annex A">
                {renderSectionContent(templateDetails.annexA)}
              </AccordionTab>
              <AccordionTab header="Annex B">
                {renderSectionContent(templateDetails.annexB)}
              </AccordionTab>
            </Accordion>
          </div>
        )}
      </Dialog>

      {/* Preview in same UI as other SGHA templates (Sidebar + letterTable) */}
      <Sidebar
        position="right"
        visible={previewVisible}
        onHide={() => setPreviewVisible(false)}
        style={{ width: "70vw" }}
        breakpoints={{ "960px": "95vw" }}
        className="p-0"
      >
        <div className="p-2">
          <div className="letterTable">
            <div className="d-flex justify-content-between align-items-center py-3 mb-3">
              <h4 className="text-black mb-0">
                {templateName?.trim() || getFileName(selectedRow) || "Template preview"}
              </h4>
              <img
                src={logoImage}
                alt="brand-logo"
                style={{ width: "80px" }}
              />
            </div>
            <Table borderless>
              <tbody>
                <tr>
                  <td colSpan={2} className="d-flex align-items-center gap-2">
                    <span>An Agreement made between :</span>
                    <b className="mb-0" style={{ borderBottom: "1px solid #ccc", paddingBottom: "5px" }}>—</b>
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} className="d-flex align-items-center gap-2">
                    <span>having its principal office at·</span>
                    <b className="mb-0" style={{ borderBottom: "1px solid #ccc", paddingBottom: "5px" }}>—</b>
                  </td>
                </tr>
                <tr>
                  <td colSpan={2}>hereinafter referred to as the &apos;Carrier&apos; or the &apos;Handling Company&apos; as the case may be,</td>
                </tr>
                <tr>
                  <td colSpan={2} className="d-flex align-items-center gap-2">
                    <span>and:</span>
                    <b className="mb-0" style={{ borderBottom: "1px solid #ccc", paddingBottom: "5px" }}>—</b>
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} className="d-flex align-items-center gap-2">
                    <span>having its principal office at·</span>
                    <b className="mb-0" style={{ borderBottom: "1px solid #ccc", paddingBottom: "5px" }}>—</b>
                  </td>
                </tr>
                <tr>
                  <td colSpan={2}>
                    hereinafter referred to as the &apos;Handling Company&apos; or the &apos;Carrier&apos;, as the case may be,
                    the Carrier and/or the Handling Company may hereinafter be referred to as the &quot;Party(ies)&quot; Whereby all the parties agree as follows:
                  </td>
                </tr>
                <tr>
                  <td colSpan={2}>
                    <h6 className="mt-3 mb-2">Main Agreement</h6>
                    {renderSectionContent(templateDetails.main)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={2}>
                    <h6 className="mt-4 mb-2">Annex A</h6>
                    {renderSectionContent(templateDetails.annexA)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={2}>
                    <h6 className="mt-4 mb-2">Annex B</h6>
                    {renderSectionContent(templateDetails.annexB)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <span>Signed the</span> <span style={{ borderBottom: "1px solid #ccc", width: "calc(100% - 80px)" }} />
                    </div>
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <span>Signed the</span> <span style={{ borderBottom: "1px solid #ccc", width: "calc(100% - 80px)" }} />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <span>at</span> <span style={{ borderBottom: "1px solid #ccc", width: "calc(100% - 20px)" }} />
                    </div>
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <span>at</span> <span style={{ borderBottom: "1px solid #ccc", width: "calc(100% - 20px)" }} />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <span>for and on behalf of</span> <span style={{ borderBottom: "1px solid #ccc", width: "calc(100% - 130px)" }} />
                    </div>
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <span>for and on behalf of</span> <span style={{ borderBottom: "1px solid #ccc", width: "calc(100% - 130px)" }} />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <span>by</span> <span style={{ borderBottom: "1px solid #ccc", width: "calc(100% - 20px)" }} />
                    </div>
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <span>by</span> <span style={{ borderBottom: "1px solid #ccc", width: "calc(100% - 20px)" }} />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="text-end" colSpan={2}>
                    <small className="mt-4">People. Passion. Pride. Since 1833</small>
                  </td>
                </tr>
              </tfoot>
            </Table>
          </div>
        </div>
      </Sidebar>

      {/* Create template from PDF – same as createSGHATemplate */}
      <Dialog
        visible={pdfDialogVisible}
        onHide={() => {
          setPdfDialogVisible(false);
          setSelectedPdfFile(null);
          setIsDragging(false);
        }}
        header="Create Template from PDF"
        style={{ width: "500px" }}
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
            <div
              className={`indothai-drag-drop-area ${isDragging ? "dragging" : ""} ${selectedPdfFile ? "has-file" : ""}`}
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
                  if (file.type === "application/pdf") {
                    setSelectedPdfFile(file);
                  } else {
                    showMessage("error", "Please upload a PDF file only");
                  }
                }
              }}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".pdf";
                input.onchange = (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.type === "application/pdf") {
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
                    <i className="pi pi-cloud-upload" style={{ fontSize: "3rem" }} />
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
                  <i className="pi pi-file-pdf" style={{ fontSize: "3rem", color: "#ff8104" }} />
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
            <small className="text-muted d-block mt-2">Only PDF files are accepted.</small>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default PdfUploads;
