import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Breadcrumb, Form, Card, Table, Label, InputGroup, Container } from 'react-bootstrap';
import { Accordion, AccordionTab } from 'primereact/accordion';
import { Button } from "primereact/button";
import { Sidebar } from 'primereact/sidebar';
import { Checkbox } from "primereact/checkbox";
import { Steps } from "primereact/steps";
import { Chip } from 'primereact/chip';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Editor } from 'primereact/editor';
import { motion, AnimatePresence } from 'framer-motion';
import { FcOpenedFolder } from 'react-icons/fc';
import { FaHeading } from 'react-icons/fa';
import { MdFormatListNumbered, MdSubtitles, MdOutlineSubdirectoryArrowRight, MdCheckBox } from 'react-icons/md';
import { AiOutlineEdit, AiOutlineForm } from 'react-icons/ai';
import { BiText } from 'react-icons/bi';
import { LuTable } from 'react-icons/lu';


const Testpage = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  // store dynamic fields by template key (year + title)
  // Structure: { "2025-Main Agreement": [...fields], "2025-Annex A": [...fields], ... }
  const [templateFields, setTemplateFields] = useState({});

  // Available years
  const availableYears = [2025, 2024, 2023, 2022, 2021, 2020];

  // Generate options for a specific year
  const getOptionsForYear = (year) => [
    { id: `${year}-1`, title: "Main Agreement", date: `Year-${year}`, year },
    { id: `${year}-2`, title: "Annex A", date: `Year-${year}`, year },
    { id: `${year}-3`, title: "Annex B", date: `Year-${year}`, year },
  ];

  // Get template key from selected template
  const getTemplateKey = (template) => {
    if (!template) return null;
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
    setTemplateFields((prev) => ({
      ...prev,
      [templateKey]: (prev[templateKey] || []).map((f) => (f.id === id ? { ...f, value } : f)),
    }));
  };

  // Handle checkbox yes/no
  const handleCheckboxChange = (id, option) => {
    if (!selected) return;
    const templateKey = getTemplateKey(selected);
    setTemplateFields((prev) => ({
      ...prev,
      [templateKey]: (prev[templateKey] || []).map((f) =>
        f.id === id
          ? {
              ...f,
              checkboxValue: f.checkboxValue.includes(option)
                ? f.checkboxValue.filter((o) => o !== option)
                : [...f.checkboxValue, option],
            }
          : f
      ),
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

  // Render field type
  const renderField = (field, isReadOnly = false) => {
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
          <Editor
            value={field.value}
            onTextChange={(e) => handleChange(field.id, e.htmlValue)}
            style={{ height: "150px", width: "100%", ...extraStyle }}
            readOnly={isReadOnly}
          />
        );
      case "checkbox":
        return (
          <div className="d-flex gap-3" style={extraStyle}>
            <div className="d-flex align-items-center gap-1">
              <Checkbox
                inputId={`yes-${field.id}`}
                checked={field.checkboxValue.includes("Yes")}
                onChange={() => handleCheckboxChange(field.id, "Yes")}
                disabled={isReadOnly}
              />
              <label htmlFor={`yes-${field.id}`}>Yes</label>
            </div>
            <div className="d-flex align-items-center gap-1">
              <Checkbox
                inputId={`no-${field.id}`}
                checked={field.checkboxValue.includes("No")}
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
                {field.rows.map((row) => (
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
    <Container>
      {/* Top Breadcrumb */}
      <Row className="mx-0 py-3 mb-5">
        <Col md={12} lg={6}>
          <Breadcrumb>
            <Breadcrumb.Item active>SGHA Template</Breadcrumb.Item>
          </Breadcrumb>
        </Col>
      </Row>

      <Row>
        <AnimatePresence mode="wait">
          {!selected ? (
            // All Years Sections
            <Col md={12} key="list">
              {availableYears.map((year) => {
                const yearOptions = getOptionsForYear(year);
                return (
                  <div key={year} className="p-4 border-top position-relative mb-4">
                    <div className="rol-title tempyear">{year}</div>
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
              })}
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
                    {availableYears.map((year) => {
                      const yearOptions = getOptionsForYear(year);
                      return (
                        <div key={year} className="mb-3">
                          <h6 className="text-muted mb-2">{year}</h6>
                          {yearOptions.map((opt) => (
                            <motion.li
                              key={opt.id}
                              onClick={() => setSelected(opt)}
                              className={`p-3 border mb-2 rounded d-flex align-items-center justify-content-between ${
                                selected.id === opt.id ? "bg-activetext" : ""
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
                    })}
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
                          <h6 className="mb-0">{selected.title} - {selected.year}</h6>
                        </Card.Header>
                        <Card.Body>
                          {/* Render dynamic fields */}
                          {fields.map((field, index) => {
                            // Check if this is a heading_no that should be paired with heading/subheading
                            const isHeadingNo = field.type === "heading_no" && 
                              index + 1 < fields.length && 
                              (fields[index + 1].type === "heading" || fields[index + 1].type === "subheading");
                            
                            // If this is a heading_no that will be paired, skip rendering it here
                            if (isHeadingNo) {
                              const nextField = fields[index + 1];
                              const isSubheading = nextField.type === "subheading";
                              
                              return (
                                <div key={field.id} className="mb-3">
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
                                    onClick={() => deleteField(field.id)}
                                  />
                                </label>
                                <div className="w-100">{renderField(field)}</div>
                              </div>
                            );
                          })}
                        </Card.Body>
                      </Card>
                    </Col>

                    {/* Right Item List */}
                    <Col md={12} lg={2}>
                      <ul className="ItemList sticky-top" style={{ top: "60px" }}>
                        <li onClick={() => addField("heading", "Heading")}>
                          <FaHeading className="me-2" /> Heading
                        </li>
                        <li onClick={() => addField("heading_no", "Heading No.")}>
                          <MdFormatListNumbered className="me-2" /> Heading No.
                        </li>
                        <li onClick={() => addField("subheading", "Subheading")}>
                          <MdSubtitles className="me-2" /> Sub-heading
                        </li>
                        <li onClick={() => addField("sub_child", "Sub Child")}>
                          <MdOutlineSubdirectoryArrowRight className="me-2" /> Sub-child
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
    </Container>
  );
};

export default Testpage;
