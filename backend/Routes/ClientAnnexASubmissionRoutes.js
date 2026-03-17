const express = require("express");
const router = express.Router();
const sequelize = require("../config/database");
const { Op } = require("sequelize");
const ClientAnnexASubmission = require("../NewModels/ClientAnnexASubmission");
const Client_Registration = require("../Models/Client_Registration");
const SubmissionVariables = require("../NewModels/SubmissionVariables");
const Template = require("../NewModels/Template");
const SubmissionComment = require("../NewModels/SubmissionComment");
const SubmissionEditHistory = require("../NewModels/SubmissionEditHistory");
const { submissionThrottle } = require("../middleware/submissionThrottle");
const { getIO } = require("../sockets/socketHandler");

/**
 * Utility: Truncate a string for display
 */
function truncate(str, maxLen = 120) {
  if (!str) return "";
  const s = String(str)
    .replace(/<[^>]*>/g, "")
    .trim();
  return s.length > maxLen ? s.substring(0, maxLen) + "..." : s;
}

/** Strip HTML tags for plain-text display; no length limit (used for full content in history). */
function stripHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/<[^>]*>/g, "")
    .trim();
}

/**
 * Get a human-readable label for a template field
 */
function getFieldLabel(field) {
  if (!field) return "Unknown field";
  const type = field.type || "field";
  const label = field.label || "";
  const value = field.value ? truncate(field.value, 60) : "";
  const typeLabels = {
    heading: "Heading",
    heading_no: "Heading No.",
    subheading: "Sub-heading",
    sub_child: "Sub-child",
    input: "Input Box",
    editor: "Text Editor",
    textarea: "Text Area",
    table: "Table",
    checkbox: "Checkbox",
  };
  const typeName = typeLabels[type] || type;
  if (value) return `${typeName}: "${value}"`;
  if (label && label !== typeName) return `${typeName} (${label})`;
  return typeName;
}

/**
 * Compare two _templateFields arrays and return { added, removed, modified }.
 * When previous has no _templateFields (e.g. client submission was section-based), we don't list every new field as "added"
 * but report a single summary so edit history shows something sensible.
 */
function compareTemplateFields(prevFields, newFields) {
  const changes = { added: [], removed: [], modified: [] };
  const prevArr = Array.isArray(prevFields) ? prevFields : [];
  const newArr = Array.isArray(newFields) ? newFields : [];

  // First edit after client submission: prev has no _templateFields, so we'd mark every field as "added".
  // Instead report one summary so history doesn't show dozens of wrong "Added" entries.
  if (prevArr.length === 0 && newArr.length > 0) {
    const modifiedCount = newArr.filter((f) => {
      const hasValue = f.value != null && String(f.value).trim() !== "";
      const hasCheckbox =
        Array.isArray(f.checkboxValue) && f.checkboxValue.length > 0;
      const hasRows =
        f.type === "table" && Array.isArray(f.rows) && f.rows.length > 0;
      return hasValue || hasCheckbox || hasRows;
    }).length;
    changes.modified.push({
      fieldLabel: "Agreement content",
      fieldType: "data",
      details: [
        {
          property: "summary",
          from: "—",
          to: `Agreement content updated (${modifiedCount} field(s) in this version)`,
        },
      ],
    });
    return changes;
  }

  const prevMap = new Map(prevArr.map((f, i) => [f.id, { ...f, _index: i }]));
  const newMap = new Map(newArr.map((f, i) => [f.id, { ...f, _index: i }]));

  for (const [id, field] of newMap) {
    if (!prevMap.has(id)) {
      changes.added.push({
        fieldLabel: getFieldLabel(field),
        fieldType: field.type,
        value: field.value || field.rows || field.checkboxValue || null,
      });
    }
  }
  for (const [id, field] of prevMap) {
    if (!newMap.has(id)) {
      changes.removed.push({
        fieldLabel: getFieldLabel(field),
        fieldType: field.type,
        value: field.value || field.rows || field.checkboxValue || null,
      });
    }
  }
  for (const [id, newField] of newMap) {
    if (prevMap.has(id)) {
      const prevField = prevMap.get(id);
      const fieldChanges = [];
      if (prevField.value !== newField.value) {
        fieldChanges.push({
          property: "content",
          from: stripHtml(prevField.value || ""),
          to: stripHtml(newField.value || ""),
        });
      }
      if (prevField.label !== newField.label) {
        fieldChanges.push({
          property: "label",
          from: prevField.label || "",
          to: newField.label || "",
        });
      }
      if (
        JSON.stringify(prevField.checkboxValue) !==
        JSON.stringify(newField.checkboxValue)
      ) {
        fieldChanges.push({
          property: "checkbox selection",
          from: (prevField.checkboxValue || []).join(", ") || "none",
          to: (newField.checkboxValue || []).join(", ") || "none",
        });
      }
      if (prevField.type === "table" && newField.type === "table") {
        const prevRows = prevField.rows || [];
        const newRows = newField.rows || [];
        if (JSON.stringify(prevRows) !== JSON.stringify(newRows)) {
          fieldChanges.push({
            property: "table rows",
            from: `${prevRows.length} row(s)`,
            to: `${newRows.length} row(s)`,
          });
        }
      }
      if (fieldChanges.length > 0) {
        changes.modified.push({
          fieldLabel: getFieldLabel(prevField),
          fieldType: prevField.type,
          details: fieldChanges,
        });
      }
    }
  }
  return changes;
}

/**
 * Generate a changes summary between previous and new checkbox_selections.
 * When _templateFields exist, uses compareTemplateFields for granular diff.
 * previousTemplateFieldsOverride: when submission had no _templateFields (e.g. section-based), frontend can send
 * the initial form state so we can compute a proper field-level diff instead of a generic summary.
 */
function generateChangesSummary(
  previousData,
  newData,
  previousTemplateFieldsOverride = null,
) {
  const prev = previousData || {};
  const next = newData || {};
  const changes = { added: [], removed: [], modified: [] };

  const prevTemplateFields =
    previousTemplateFieldsOverride ?? prev._templateFields;
  if (prevTemplateFields || next._templateFields) {
    const fieldChanges = compareTemplateFields(
      prevTemplateFields,
      next._templateFields,
    );
    changes.added = fieldChanges.added;
    changes.removed = fieldChanges.removed;
    changes.modified = fieldChanges.modified;
  }

  // When we have _templateFields, section keys (e.g. "1", "2") are reflected there; don't report them again as raw "modified" with JSON.
  const topLevelKeysToReport = new Set(["serviceTypes"]);
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const key of allKeys) {
    if (key === "_templateFields") continue;
    if (
      (prev._templateFields || next._templateFields) &&
      !topLevelKeysToReport.has(key)
    )
      continue;
    const prevVal = prev[key];
    const nextVal = next[key];

    if (prevVal === undefined && nextVal !== undefined) {
      if (key === "serviceTypes" && typeof nextVal === "object") {
        const activeTypes =
          Object.entries(nextVal)
            .filter(([, v]) => v)
            .map(([k]) => k)
            .join(", ") || "none";
        changes.added.push({
          fieldLabel: `Service Types: ${activeTypes}`,
          fieldType: "serviceTypes",
          value: activeTypes,
        });
      } else {
        changes.added.push({
          fieldLabel: key,
          fieldType: "data",
          value:
            typeof nextVal === "object" ? JSON.stringify(nextVal) : nextVal,
        });
      }
    } else if (prevVal !== undefined && nextVal === undefined) {
      changes.removed.push({
        fieldLabel: key,
        fieldType: "data",
        value: typeof prevVal === "object" ? JSON.stringify(prevVal) : prevVal,
      });
    } else if (JSON.stringify(prevVal) !== JSON.stringify(nextVal)) {
      if (
        key === "serviceTypes" &&
        typeof prevVal === "object" &&
        typeof nextVal === "object"
      ) {
        const prevTypes =
          Object.entries(prevVal)
            .filter(([, v]) => v)
            .map(([k]) => k)
            .join(", ") || "none";
        const nextTypes =
          Object.entries(nextVal)
            .filter(([, v]) => v)
            .map(([k]) => k)
            .join(", ") || "none";
        changes.modified.push({
          fieldLabel: "Service Types",
          fieldType: "serviceTypes",
          details: [{ property: "selection", from: prevTypes, to: nextTypes }],
        });
      } else {
        changes.modified.push({
          fieldLabel: key,
          fieldType: "data",
          details: [
            {
              property: "value",
              from: truncate(JSON.stringify(prevVal), 100),
              to: truncate(JSON.stringify(nextVal), 100),
            },
          ],
        });
      }
    }
  }

  return changes;
}

/**
 * POST /api/client/annex-a-submission
 * Save Annex A checkbox selections when client submits Annex B
 */
router.post("/annex-a-submission", submissionThrottle, async (req, res) => {
  try {
    // Log the incoming request for debugging
    console.log("=== BACKEND: ANNEX A SUBMISSION RECEIVED ===");
    console.log("1. Full request body:", JSON.stringify(req.body, null, 2));
    console.log("2. client_registration_id:", req.body.client_registration_id);
    console.log("3. agreement_year:", req.body.agreement_year);
    console.log(
      "4. checkbox_selections type:",
      typeof req.body.checkbox_selections,
    );
    console.log(
      "5. checkbox_selections keys:",
      req.body.checkbox_selections
        ? Object.keys(req.body.checkbox_selections)
        : "null",
    );
    console.log(
      "6. checkbox_selections.serviceTypes:",
      req.body.checkbox_selections?.serviceTypes,
    );
    console.log(
      "7. Full checkbox_selections:",
      JSON.stringify(req.body.checkbox_selections, null, 2),
    );
    console.log("=== END BACKEND DEBUG ===");

    // Get client_registration_id from request body (since auth is disabled)
    const {
      client_registration_id,
      agreement_year,
      checkbox_selections,
      form_details,
    } = req.body;

    if (!client_registration_id) {
      return res.status(400).json({
        message: "client_registration_id is required",
        error: "Validation error",
      });
    }

    // Validate required fields
    if (!checkbox_selections) {
      return res.status(400).json({
        message: "checkbox_selections is required",
        error: "Validation error",
      });
    }

    // Validate checkbox_selections is an object
    if (
      typeof checkbox_selections !== "object" ||
      Array.isArray(checkbox_selections)
    ) {
      return res.status(400).json({
        message: "checkbox_selections must be a valid object",
        error: "Validation error",
      });
    }

    // Use provided year or default to 2025 (accept number or string from client)
    const year =
      typeof agreement_year === "number"
        ? agreement_year
        : parseInt(agreement_year, 10) || 2025;

    // Validate year is in range
    if (year < 2000 || year > 2100) {
      return res.status(400).json({
        message: "agreement_year must be a valid year between 2000 and 2100",
        error: "Validation error",
      });
    }

    // Create submission record (include form_details from Add New SGHA when provided)
    const submission = await ClientAnnexASubmission.create({
      client_registration_id,
      agreement_year: year,
      checkbox_selections,
      form_details:
        form_details && typeof form_details === "object" ? form_details : null,
      submission_timestamp: new Date(),
    });

    console.log(
      `✅ Annex A submission saved for client ${client_registration_id}, year ${year}`,
    );

    return res.status(201).json({
      message: "Annex A selections saved successfully",
      data: {
        submission_id: submission.submission_id,
        agreement_year: submission.agreement_year,
        submission_timestamp: submission.submission_timestamp,
        status: submission.status,
      },
    });
  } catch (error) {
    console.error("❌ Failed to save Annex A submission:", error);
    return res.status(500).json({
      message: "Failed to save Annex A submission",
      error: error.message,
    });
  }
});

/**
 * GET /api/client/annex-a-submissions?year=2025&client_registration_id=123
 * Retrieve submissions for a client
 * Optional year query parameter to filter by agreement year
 * client_registration_id is required as query parameter
 */
router.get("/annex-a-submissions", async (req, res) => {
  try {
    const { client_registration_id, year } = req.query;

    if (!client_registration_id) {
      return res.status(400).json({
        message: "client_registration_id is required as query parameter",
        error: "Validation error",
      });
    }

    // Build where clause
    const whereClause = {
      client_registration_id,
    };

    if (year) {
      const yearInt = parseInt(year, 10);
      if (isNaN(yearInt) || yearInt < 2000 || yearInt > 2100) {
        return res.status(400).json({
          message: "Invalid year parameter",
          error: "Validation error",
        });
      }
      whereClause.agreement_year = yearInt;
    }

    // Fetch submissions
    const submissions = await ClientAnnexASubmission.findAll({
      where: whereClause,
      order: [["submission_timestamp", "DESC"]],
      attributes: [
        "submission_id",
        "agreement_year",
        "submission_timestamp",
        "status",
        "created_at",
        "updated_at",
      ],
    });

    return res.status(200).json({
      message: "Submissions retrieved successfully",
      data: submissions,
      count: submissions.length,
    });
  } catch (error) {
    console.error("❌ Failed to retrieve Annex A submissions:", error);
    return res.status(500).json({
      message: "Failed to retrieve Annex A submissions",
      error: error.message,
    });
  }
});

/**
 * GET /api/client/annex-a-submissions-list
 * Get all submissions with client details for employee view
 * Supports filtering by status, year, and client_registration_id
 */
router.get("/annex-a-submissions-list", async (req, res) => {
  try {
    const {
      status,
      year,
      sortBy = "DESC",
      limit,
      offset,
      client_registration_id,
    } = req.query;

    // Build where clause
    const whereClause = {};

    // If client_registration_id is provided, use client_status (or status for In Progress); otherwise use status (for employee view)
    if (status) {
      if (client_registration_id) {
        // Client view: Pending = only not yet in progress (status Pending); In Progress = internal status; Approved/Rejected = client_status
        const validClientStatuses = [
          "Pending",
          "In Progress",
          "Approved",
          "Rejected",
        ];
        if (validClientStatuses.includes(status)) {
          if (status === "In Progress") {
            whereClause.status = "In Progress";
          } else if (status === "Pending") {
            whereClause.client_status = "Pending";
            whereClause.status = "Pending"; // Exclude In Progress: only show truly pending (not yet picked up)
          } else {
            whereClause.client_status = status;
          }
        }
      } else {
        // Employee view: use status with values Pending, In Progress, Completed, Suspended, Cancelled, Expired
        const validStatuses = [
          "Pending",
          "In Progress",
          "Completed",
          "Suspended",
          "Cancelled",
          "Expired",
        ];
        if (validStatuses.includes(status)) {
          whereClause.status = status;
        }
      }
    }

    if (year) {
      const yearInt = parseInt(year, 10);
      if (!isNaN(yearInt) && yearInt >= 2000 && yearInt <= 2100) {
        whereClause.agreement_year = yearInt;
      }
    }

    // Filter by client_registration_id if provided (for client view)
    if (client_registration_id) {
      const clientId = parseInt(client_registration_id, 10);
      if (!isNaN(clientId) && clientId > 0) {
        whereClause.client_registration_id = clientId;
      }
    }

    // Calculate effective dates from agreement year
    // Typically: Effective From = August 1 of agreement_year, Effective To = July 31 of next year
    const getEffectiveDates = (agreementYear) => {
      const effectiveFrom = new Date(agreementYear, 7, 1); // August 1 (month 7 = August)
      const effectiveTo = new Date(agreementYear + 1, 6, 31); // July 31 of next year (month 6 = July)
      return {
        effectiveFrom: effectiveFrom.toISOString().split("T")[0],
        effectiveTo: effectiveTo.toISOString().split("T")[0],
      };
    };

    // Fetch submissions with client registration details and edit history (for last employee edit time)
    const submissions = await ClientAnnexASubmission.findAll({
      where: whereClause,
      include: [
        {
          model: Client_Registration,
          as: "clientRegistration",
          attributes: [
            "client_registration_id",
            "name",
            "email",
            "contact_person",
            "phone",
          ],
        },
        {
          model: SubmissionEditHistory,
          as: "editHistory",
          required: false,
          attributes: ["created_at", "editor_type"],
        },
      ],
      order: [["submission_timestamp", sortBy.toUpperCase()]],
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    // Format the response to match the frontend table structure
    const formattedSubmissions = submissions.map((submission) => {
      const client = submission.clientRegistration;
      const checkboxSelections = submission.checkbox_selections || {};
      const serviceTypes = checkboxSelections.serviceTypes || {};

      // Determine service type from checkbox selections
      let serviceType = "N/A";
      if (serviceTypes.comp) serviceType = "COMP";
      else if (serviceTypes.ramp) serviceType = "Ramp";
      else if (serviceTypes.cargo) serviceType = "Cargo";

      // Get effective dates - use database values if set, otherwise calculate from agreement_year
      let effectiveFrom, effectiveTo;

      // Check each date individually - use database value if available, otherwise calculate
      if (submission.effective_from) {
        // Use stored date from database
        effectiveFrom = submission.effective_from.toISOString().split("T")[0];
      } else {
        // Calculate from agreement year (fallback)
        const calculatedDates = getEffectiveDates(submission.agreement_year);
        effectiveFrom = calculatedDates.effectiveFrom;
      }

      if (submission.effective_to) {
        // Use stored date from database
        effectiveTo = submission.effective_to.toISOString().split("T")[0];
      } else {
        // Calculate from agreement year (fallback)
        const calculatedDates = getEffectiveDates(submission.agreement_year);
        effectiveTo = calculatedDates.effectiveTo;
      }

      // Last time an employee edited this submission (from edit history)
      const history = submission.editHistory || [];
      const sortedHistory = [...history].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );
      const lastEmployeeEdit = sortedHistory.find(
        (e) => e.editor_type === "Employee",
      );
      const last_employee_edit_at = lastEmployeeEdit
        ? lastEmployeeEdit.created_at
        : null;

      return {
        submission_id: submission.submission_id,
        client_name: client?.name || "N/A",
        contact_name: client?.contact_person || "N/A",
        contact_email: client?.email || "N/A",
        contact_phone: client?.phone || "N/A",
        effective_from: effectiveFrom,
        effective_to: effectiveTo,
        agreement_year: submission.agreement_year,
        service_type: serviceType,
        status: submission.status, // Employee status
        client_status: submission.client_status, // Client status
        submission_timestamp: submission.submission_timestamp,
        last_employee_edit_at,
        created_at: submission.created_at,
        updated_at: submission.updated_at,
        checkbox_selections: submission.checkbox_selections, // Include full data for details view
        form_details: submission.form_details || null, // Add New SGHA details (company, address, etc.)
      };
    });

    // Get counts by status for filter badges (with same filters applied)
    const countWhereClause = {};
    if (client_registration_id) {
      const clientId = parseInt(client_registration_id, 10);
      if (!isNaN(clientId) && clientId > 0) {
        countWhereClause.client_registration_id = clientId;
      }
    }
    if (year) {
      const yearInt = parseInt(year, 10);
      if (!isNaN(yearInt) && yearInt >= 2000 && yearInt <= 2100) {
        countWhereClause.agreement_year = yearInt;
      }
    }

    // Build counts: client view needs Pending (only status=Pending), In Progress, Approved, Rejected
    let counts;
    if (client_registration_id) {
      counts = { Pending: 0, "In Progress": 0, Approved: 0, Rejected: 0 };
      const pendingOnlyCount = await ClientAnnexASubmission.count({
        where: {
          ...countWhereClause,
          client_status: "Pending",
          status: "Pending",
        },
      });
      counts.Pending = pendingOnlyCount;
      const inProgressCount = await ClientAnnexASubmission.count({
        where: { ...countWhereClause, status: "In Progress" },
      });
      counts["In Progress"] = inProgressCount;
      const approvedCount = await ClientAnnexASubmission.count({
        where: { ...countWhereClause, client_status: "Approved" },
      });
      counts.Approved = approvedCount;
      const rejectedCount = await ClientAnnexASubmission.count({
        where: { ...countWhereClause, client_status: "Rejected" },
      });
      counts.Rejected = rejectedCount;
    } else {
      const statusCounts = await ClientAnnexASubmission.findAll({
        where: countWhereClause,
        attributes: [
          "status",
          [sequelize.fn("COUNT", sequelize.col("submission_id")), "count"],
        ],
        group: ["status"],
        raw: true,
      });
      counts = {
        Pending: 0,
        "In Progress": 0,
        Completed: 0,
        Suspended: 0,
        Cancelled: 0,
        Expired: 0,
      };
      statusCounts.forEach((item) => {
        const statusValue = item.status;
        if (counts.hasOwnProperty(statusValue)) {
          counts[statusValue] = parseInt(item.count, 10);
        }
      });
    }

    return res.status(200).json({
      message: "Submissions retrieved successfully",
      data: formattedSubmissions,
      counts,
      total: formattedSubmissions.length,
    });
  } catch (error) {
    console.error("❌ Failed to retrieve submissions list:", error);
    return res.status(500).json({
      message: "Failed to retrieve submissions list",
      error: error.message,
    });
  }
});

/**
 * PUT /api/client/annex-a-submissions/:submission_id/status
 * Update the status of a submission (employee status) or client_status (client status)
 * If client_status is provided, it updates client_status; otherwise updates status
 */
router.put("/annex-a-submissions/:submission_id/status", async (req, res) => {
  try {
    const { submission_id } = req.params;
    const { status, client_status, effective_from, effective_to } = req.body;

    // Validate submission_id
    const submissionIdInt = parseInt(submission_id, 10);
    if (isNaN(submissionIdInt) || submissionIdInt <= 0) {
      return res.status(400).json({
        message: "Invalid submission_id",
        error: "Validation error",
      });
    }

    // Validate status or client_status
    // If client_status is provided, validate it; otherwise validate status
    if (client_status !== undefined && client_status !== null) {
      // Client status update
      const validClientStatuses = ["Pending", "Approved", "Rejected"];
      if (!validClientStatuses.includes(client_status)) {
        return res.status(400).json({
          message:
            "Invalid client_status. Must be one of: Pending, Approved, Rejected",
          error: "Validation error",
        });
      }
    } else if (status !== undefined && status !== null) {
      // Employee status update
      const validStatuses = [
        "Pending",
        "In Progress",
        "Completed",
        "Suspended",
        "Cancelled",
        "Expired",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message:
            "Invalid status. Must be one of: Pending, In Progress, Completed, Suspended, Cancelled, Expired",
          error: "Validation error",
        });
      }
    } else {
      return res.status(400).json({
        message: "Either status or client_status must be provided",
        error: "Validation error",
      });
    }

    // Validate and process effective dates
    // Allow null values to clear dates, or valid date strings to set them
    let effectiveFromDate = null;
    let effectiveToDate = null;

    if (effective_from !== null && effective_from !== undefined) {
      effectiveFromDate = new Date(effective_from);
      if (isNaN(effectiveFromDate.getTime())) {
        return res.status(400).json({
          message: "Invalid effective_from date format",
          error: "Validation error",
        });
      }
    }
    // If effective_from is null, effectiveFromDate stays null (will clear the date)

    if (effective_to !== null && effective_to !== undefined) {
      effectiveToDate = new Date(effective_to);
      if (isNaN(effectiveToDate.getTime())) {
        return res.status(400).json({
          message: "Invalid effective_to date format",
          error: "Validation error",
        });
      }
    }
    // If effective_to is null, effectiveToDate stays null (will clear the date)

    // Find the submission
    const submission = await ClientAnnexASubmission.findByPk(submissionIdInt);

    if (!submission) {
      return res.status(404).json({
        message: "Submission not found",
        error: "Not found",
      });
    }

    // Build update object
    const updateData = {
      updated_at: new Date(),
    };

    // Add status or client_status based on what was provided
    if (client_status !== undefined && client_status !== null) {
      updateData.client_status = client_status;
    } else if (status !== undefined && status !== null) {
      updateData.status = status;
    }

    // Add effective dates if provided (null values will clear the dates)
    if (effective_from !== undefined) {
      updateData.effective_from = effectiveFromDate;
    }
    if (effective_to !== undefined) {
      updateData.effective_to = effectiveToDate;
    }

    // Update the submission
    await submission.update(updateData);

    const updatedField =
      client_status !== undefined
        ? `client_status: ${client_status}`
        : `status: ${status}`;
    console.log(
      `✅ ${updatedField} updated for submission ${submission_id}${effectiveFromDate ? `, effective_from: ${effectiveFromDate.toISOString()}` : ""}${effectiveToDate ? `, effective_to: ${effectiveToDate.toISOString()}` : ""}`,
    );

    return res.status(200).json({
      message: "Status updated successfully",
      data: {
        submission_id: submission.submission_id,
        status: submission.status,
        client_status: submission.client_status,
        effective_from: submission.effective_from,
        effective_to: submission.effective_to,
        updated_at: submission.updated_at,
      },
    });
  } catch (error) {
    console.error("❌ Failed to update submission status:", error);
    return res.status(500).json({
      message: "Failed to update submission status",
      error: error.message,
    });
  }
});

/**
 * GET /api/client/annex-a-submissions/:submission_id/variables
 * Get all variables for a submission
 */
router.get(
  "/annex-a-submissions/:submission_id/variables",
  async (req, res) => {
    try {
      const { submission_id } = req.params;

      // Validate submission_id
      const submissionIdInt = parseInt(submission_id, 10);
      if (isNaN(submissionIdInt) || submissionIdInt <= 0) {
        return res.status(400).json({
          message: "Invalid submission_id",
          error: "Validation error",
        });
      }

      // Verify submission exists
      const submission = await ClientAnnexASubmission.findByPk(submissionIdInt);
      if (!submission) {
        return res.status(404).json({
          message: "Submission not found",
          error: "Not found",
        });
      }

      // Get all variables for this submission
      const variables = await SubmissionVariables.findAll({
        where: { submission_id: submissionIdInt },
        order: [["variable_name", "ASC"]],
      });

      // Convert to object format for easier frontend use
      const variablesObj = {};
      variables.forEach((v) => {
        try {
          // Try to parse as JSON, if fails use as string
          variablesObj[v.variable_name] = JSON.parse(v.variable_value);
        } catch {
          variablesObj[v.variable_name] = v.variable_value;
        }
      });

      return res.status(200).json({
        message: "Variables retrieved successfully",
        data: variablesObj,
      });
    } catch (error) {
      console.error("❌ Failed to retrieve variables:", error);
      return res.status(500).json({
        message: "Failed to retrieve variables",
        error: error.message,
      });
    }
  },
);

/**
 * GET /api/client/annex-a-submissions/:submission_id/variables/template
 * Get available variables from Annex B template for a submission
 */
router.get(
  "/annex-a-submissions/:submission_id/variables/template",
  async (req, res) => {
    try {
      const { submission_id } = req.params;

      // Validate submission_id
      const submissionIdInt = parseInt(submission_id, 10);
      if (isNaN(submissionIdInt) || submissionIdInt <= 0) {
        return res.status(400).json({
          message: "Invalid submission_id",
          error: "Validation error",
        });
      }

      // Verify submission exists
      const submission = await ClientAnnexASubmission.findByPk(submissionIdInt);
      if (!submission) {
        return res.status(404).json({
          message: "Submission not found",
          error: "Not found",
        });
      }

      // Get Annex B template for the agreement year (and specific template_name if stored in form_details)
      const templateNameVal =
        submission.form_details &&
        typeof submission.form_details === "object" &&
        submission.form_details.template_name &&
        String(submission.form_details.template_name).trim() !== ""
          ? String(submission.form_details.template_name).trim()
          : null;

      const template = await Template.findOne({
        where: {
          year: submission.agreement_year,
          type: "Annex B",
          template_name: templateNameVal,
        },
      });

      if (!template || !template.content) {
        return res.status(200).json({
          message: "No template found",
          data: {
            variables: [],
            templateVariables: [],
          },
        });
      }

      // Parse template content
      let templateContent;
      try {
        templateContent =
          typeof template.content === "string"
            ? JSON.parse(template.content)
            : template.content;
      } catch (e) {
        return res.status(200).json({
          message: "Template content is invalid",
          data: {
            variables: [],
            templateVariables: [],
          },
        });
      }

      // Extract variables from template
      const variables = [];
      const variableRegex = /\{\{([^}]+)\}\}/g;

      // Reserved variables that should not be shown/editable
      const reservedVariables = [
        "annex_a_selection",
        "aircraft_options",
        "additional_charges",
      ];

      console.log(
        "🔍 Extracting variables from template for submission:",
        submissionIdInt,
      );
      console.log(
        "📋 Template content type:",
        Array.isArray(templateContent) ? "Array" : typeof templateContent,
      );

      // Helper function to extract variables from text (handles HTML content)
      const extractVariablesFromText = (text) => {
        if (!text || typeof text !== "string") return [];
        const found = [];
        // Reset regex lastIndex to ensure fresh search
        variableRegex.lastIndex = 0;
        let match;
        while ((match = variableRegex.exec(text)) !== null) {
          const varName = match[1] ? match[1].trim() : "";
          // Exclude reserved variables
          if (
            varName &&
            !reservedVariables.includes(varName) &&
            !found.includes(varName)
          ) {
            found.push(varName);
          }
        }
        return found;
      };

      // Extract from editor fields
      if (Array.isArray(templateContent)) {
        templateContent.forEach((field, index) => {
          // Extract from editor field value (can be HTML)
          if (field.type === "editor" && field.value) {
            const htmlContent =
              typeof field.value === "string" ? field.value : "";
            console.log(
              `  📝 Checking editor field ${index}, content length: ${htmlContent.length}`,
            );

            // Extract variables from the HTML content
            const foundVars = extractVariablesFromText(htmlContent);
            foundVars.forEach((varName) => {
              if (!variables.includes(varName)) {
                variables.push(varName);
                console.log(
                  `  ✅ Found variable in editor field ${index}: ${varName}`,
                );
              }
            });
          }

          // Also check variableDefaults (custom variables defined in the template)
          // But exclude reserved variables
          if (
            field.variableDefaults &&
            typeof field.variableDefaults === "object"
          ) {
            Object.keys(field.variableDefaults).forEach((varName) => {
              if (
                varName &&
                !reservedVariables.includes(varName) &&
                !variables.includes(varName)
              ) {
                variables.push(varName);
                console.log(
                  `  ✅ Found variable in variableDefaults: ${varName}`,
                );
              }
            });
          }
        });
      }

      console.log(
        `📊 Total variables found (excluding reserved): ${variables.length}`,
        variables,
      );

      // Get existing variable values for this submission
      const existingVariables = await SubmissionVariables.findAll({
        where: { submission_id: submissionIdInt },
      });

      const existingVarsObj = {};
      existingVariables.forEach((v) => {
        try {
          existingVarsObj[v.variable_name] = JSON.parse(v.variable_value);
        } catch {
          existingVarsObj[v.variable_name] = v.variable_value;
        }
      });

      return res.status(200).json({
        message: "Template variables retrieved successfully",
        data: {
          variables: existingVarsObj,
          templateVariables: variables,
        },
      });
    } catch (error) {
      console.error("❌ Failed to retrieve template variables:", error);
      return res.status(500).json({
        message: "Failed to retrieve template variables",
        error: error.message,
      });
    }
  },
);

/**
 * PUT /api/client/annex-a-submissions/:submission_id/variables
 * Update variables for a submission
 */
router.put(
  "/annex-a-submissions/:submission_id/variables",
  async (req, res) => {
    try {
      const { submission_id } = req.params;
      const { variables } = req.body;

      // Validate submission_id
      const submissionIdInt = parseInt(submission_id, 10);
      if (isNaN(submissionIdInt) || submissionIdInt <= 0) {
        return res.status(400).json({
          message: "Invalid submission_id",
          error: "Validation error",
        });
      }

      // Validate variables
      if (!variables || typeof variables !== "object") {
        return res.status(400).json({
          message: "Variables must be an object",
          error: "Validation error",
        });
      }

      // Verify submission exists
      const submission = await ClientAnnexASubmission.findByPk(submissionIdInt);
      if (!submission) {
        return res.status(404).json({
          message: "Submission not found",
          error: "Not found",
        });
      }

      // Update or create variables
      const updatedVariables = {};
      for (const [varName, varValue] of Object.entries(variables)) {
        // Convert value to string (JSON if object/array)
        const valueStr =
          typeof varValue === "object" && varValue !== null
            ? JSON.stringify(varValue)
            : String(varValue || "");

        // Use upsert to update or create
        const [variable, created] = await SubmissionVariables.upsert(
          {
            submission_id: submissionIdInt,
            variable_name: varName,
            variable_value: valueStr,
          },
          {
            returning: true,
          },
        );

        try {
          updatedVariables[varName] = JSON.parse(variable.variable_value);
        } catch {
          updatedVariables[varName] = variable.variable_value;
        }
      }

      console.log(`✅ Variables updated for submission ${submission_id}`);

      return res.status(200).json({
        message: "Variables updated successfully",
        data: updatedVariables,
      });
    } catch (error) {
      console.error("❌ Failed to update variables:", error);
      return res.status(500).json({
        message: "Failed to update variables",
        error: error.message,
      });
    }
  },
);

/**
 * GET /api/client/annex-a-submissions/:submission_id/client-details
 * Get full client registration details for a submission
 */
router.get(
  "/annex-a-submissions/:submission_id/client-details",
  async (req, res) => {
    try {
      const { submission_id } = req.params;

      // Validate submission_id
      const submissionIdInt = parseInt(submission_id, 10);
      if (isNaN(submissionIdInt) || submissionIdInt <= 0) {
        return res.status(400).json({
          message: "Invalid submission_id",
          error: "Validation error",
        });
      }

      // Verify submission exists and get client registration details
      const submission = await ClientAnnexASubmission.findByPk(
        submissionIdInt,
        {
          include: [
            {
              model: Client_Registration,
              as: "clientRegistration",
              attributes: [
                "client_registration_id",
                "name",
                "email",
                "contact_person",
                "phone",
                "address1",
                "address2",
                "city",
                "state",
                "country",
                "pincode",
              ],
            },
          ],
        },
      );

      if (!submission) {
        return res.status(404).json({
          message: "Submission not found",
          error: "Not found",
        });
      }

      const client = submission.clientRegistration;
      if (!client) {
        return res.status(404).json({
          message: "Client details not found",
          error: "Not found",
        });
      }

      return res.status(200).json({
        message: "Client details retrieved successfully",
        data: {
          name: client.name,
          email: client.email,
          contact_person: client.contact_person,
          phone: client.phone,
          address1: client.address1,
          address2: client.address2,
          city: client.city,
          state: client.state,
          country: client.country,
          pincode: client.pincode,
        },
      });
    } catch (error) {
      console.error("❌ Failed to retrieve client details:", error);
      return res.status(500).json({
        message: "Failed to retrieve client details",
        error: error.message,
      });
    }
  },
);

/**
 * POST /api/client/submissions/:submission_id/comments
 * Add a comment or reply to a submission
 * Body: { sender_type, sender_id, sender_name, message, parent_comment_id? }
 */
router.post("/submissions/:submission_id/comments", async (req, res) => {
  try {
    const { submission_id } = req.params;
    const { sender_type, sender_id, sender_name, message, parent_comment_id } =
      req.body;

    if (!sender_type || !sender_id || !sender_name || !message) {
      return res.status(400).json({
        message:
          "sender_type, sender_id, sender_name, and message are required",
        error: "Validation error",
      });
    }

    if (!["Client", "Employee"].includes(sender_type)) {
      return res.status(400).json({
        message: "sender_type must be Client or Employee",
        error: "Validation error",
      });
    }

    const submission = await ClientAnnexASubmission.findByPk(submission_id);
    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    if (parent_comment_id) {
      const parentComment = await SubmissionComment.findOne({
        where: { comment_id: parent_comment_id, submission_id },
      });
      if (!parentComment) {
        return res
          .status(404)
          .json({ message: "Parent comment not found for this submission" });
      }
    }

    const comment = await SubmissionComment.create({
      submission_id: parseInt(submission_id, 10),
      parent_comment_id: parent_comment_id || null,
      sender_type,
      sender_id,
      sender_name,
      message,
    });

    const io = getIO();
    if (io) {
      io.emit("submission-comment-added", {
        submission_id: parseInt(submission_id, 10),
        comment_id: comment.comment_id,
        sender_type,
        sender_name,
      });
    }

    return res.status(201).json({
      message: "Comment added successfully",
      data: comment,
    });
  } catch (error) {
    console.error("Failed to add comment:", error);
    return res.status(500).json({
      message: "Failed to add comment",
      error: error.message,
    });
  }
});

/**
 * GET /api/client/submissions/:submission_id/comments
 * Get all comments for a submission (threaded: top-level + replies)
 */
router.get("/submissions/:submission_id/comments", async (req, res) => {
  try {
    const { submission_id } = req.params;

    const comments = await SubmissionComment.findAll({
      where: {
        submission_id,
        parent_comment_id: null,
      },
      include: [
        {
          model: SubmissionComment,
          as: "replies",
          separate: true,
          order: [["created_at", "ASC"]],
        },
      ],
      order: [["created_at", "ASC"]],
    });

    const totalCount = await SubmissionComment.count({
      where: { submission_id },
    });

    return res.status(200).json({
      message: "Comments retrieved successfully",
      data: comments,
      total: totalCount,
    });
  } catch (error) {
    console.error("Failed to retrieve comments:", error);
    return res.status(500).json({
      message: "Failed to retrieve comments",
      error: error.message,
    });
  }
});

/**
 * PUT /api/client/annex-a-submissions/:submission_id/edit
 * Edit an existing submission's checkbox_selections (employee). Records edit history.
 * Body: { checkbox_selections, editor_type, editor_id, editor_name, edit_note? }
 */
router.put("/annex-a-submissions/:submission_id/edit", async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { submission_id } = req.params;
    const {
      checkbox_selections,
      editor_type,
      editor_id,
      editor_name,
      edit_note,
      previous_template_fields: previousTemplateFieldsOverride,
    } = req.body;

    if (!checkbox_selections || !editor_type || !editor_id || !editor_name) {
      await transaction.rollback();
      return res.status(400).json({
        message:
          "checkbox_selections, editor_type, editor_id, and editor_name are required",
        error: "Validation error",
      });
    }

    if (!["Client", "Employee"].includes(editor_type)) {
      await transaction.rollback();
      return res.status(400).json({
        message: "editor_type must be Client or Employee",
        error: "Validation error",
      });
    }

    const submission = await ClientAnnexASubmission.findByPk(submission_id, {
      transaction,
    });
    if (!submission) {
      await transaction.rollback();
      return res.status(404).json({ message: "Submission not found" });
    }

    const previousData = submission.checkbox_selections || {};
    const changesSummary = generateChangesSummary(
      previousData,
      checkbox_selections,
      previousTemplateFieldsOverride,
    );

    const hasChanges =
      changesSummary.added.length > 0 ||
      changesSummary.removed.length > 0 ||
      changesSummary.modified.length > 0;

    if (!hasChanges) {
      await transaction.rollback();
      return res.status(400).json({
        message: "No changes detected in the submission",
        error: "No changes",
      });
    }

    const lastEdit = await SubmissionEditHistory.findOne({
      where: { submission_id },
      order: [["version", "DESC"]],
      transaction,
    });
    const nextVersion = lastEdit ? lastEdit.version + 1 : 1;

    await SubmissionEditHistory.create(
      {
        submission_id: parseInt(submission_id, 10),
        editor_type,
        editor_id,
        editor_name,
        previous_data: previousData,
        new_data: checkbox_selections,
        changes_summary: changesSummary,
        edit_note: edit_note || null,
        version: nextVersion,
      },
      { transaction },
    );

    // When employee edits, move Pending → In Progress
    const updatePayload = { checkbox_selections };
    if (submission.status === "Pending" && editor_type === "Employee") {
      updatePayload.status = "In Progress";
    }
    await submission.update(updatePayload, { transaction });

    await transaction.commit();

    console.log(
      `Submission ${submission_id} edited by ${editor_name} (v${nextVersion})`,
    );

    const io = getIO();
    if (io) {
      io.emit("submission-edited", {
        submission_id: parseInt(submission_id, 10),
        editor_type,
        editor_name,
        version: nextVersion,
      });
    }

    return res.status(200).json({
      message: "Submission updated successfully",
      data: {
        submission_id: submission.submission_id,
        version: nextVersion,
        changes_summary: changesSummary,
        status: submission.status,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Failed to edit submission:", error);
    return res.status(500).json({
      message: "Failed to edit submission",
      error: error.message,
    });
  }
});

/**
 * GET /api/client/annex-a-submissions/:submission_id/history
 * Get edit history for a submission (for client to see what was updated)
 */
router.get("/annex-a-submissions/:submission_id/history", async (req, res) => {
  try {
    const { submission_id } = req.params;

    const submission = await ClientAnnexASubmission.findByPk(submission_id);
    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    const history = await SubmissionEditHistory.findAll({
      where: { submission_id },
      order: [["version", "DESC"]],
      attributes: [
        "edit_id",
        "submission_id",
        "editor_type",
        "editor_id",
        "editor_name",
        "changes_summary",
        "edit_note",
        "version",
        "created_at",
      ],
    });

    return res.status(200).json({
      message: "Edit history retrieved successfully",
      data: history,
      total: history.length,
      current_version: history.length > 0 ? history[0].version : 0,
    });
  } catch (error) {
    console.error("Failed to retrieve edit history:", error);
    return res.status(500).json({
      message: "Failed to retrieve edit history",
      error: error.message,
    });
  }
});

/**
 * GET /api/client/annex-a-submissions/:submission_id/history/:edit_id
 * Get a specific edit record with full previous and new data (for diff view)
 */
router.get(
  "/annex-a-submissions/:submission_id/history/:edit_id",
  async (req, res) => {
    try {
      const { submission_id, edit_id } = req.params;

      const editRecord = await SubmissionEditHistory.findOne({
        where: { edit_id, submission_id },
      });

      if (!editRecord) {
        return res.status(404).json({ message: "Edit record not found" });
      }

      return res.status(200).json({
        message: "Edit record retrieved successfully",
        data: editRecord,
      });
    } catch (error) {
      console.error("Failed to retrieve edit record:", error);
      return res.status(500).json({
        message: "Failed to retrieve edit record",
        error: error.message,
      });
    }
  },
);

/**
 * GET /api/client/annex-a-submissions/:submission_id/details
 * Get full submission including checkbox_selections (for employee edit form)
 */
router.get("/annex-a-submissions/:submission_id/details", async (req, res) => {
  try {
    const { submission_id } = req.params;

    const submission = await ClientAnnexASubmission.findByPk(submission_id, {
      include: [
        {
          model: Client_Registration,
          as: "clientRegistration",
          attributes: [
            "client_registration_id",
            "name",
            "email",
            "contact_person",
            "phone",
          ],
        },
      ],
    });

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    return res.status(200).json({
      message: "Submission details retrieved successfully",
      data: submission,
    });
  } catch (error) {
    console.error("Failed to retrieve submission details:", error);
    return res.status(500).json({
      message: "Failed to retrieve submission details",
      error: error.message,
    });
  }
});

module.exports = router;
