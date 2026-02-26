import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Breadcrumb, Form, Card, FormSelect } from "react-bootstrap";
import { IoChevronBackOutline } from "react-icons/io5";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Sidebar } from "primereact/sidebar";
import { FaArrowUp, FaArrowDown, FaTrash } from "react-icons/fa";
import { Editor } from "primereact/editor";
import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import { Checkbox } from "primereact/checkbox";
import { getSocket } from "../../context/socket";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import GifLoder from '../../interfaces/GifLoder';
import { Dialog } from "primereact/dialog";
import DOMPurify from 'dompurify';

const Add_template = () => {
  const { roleId } = useAuth(); // Get roleId from the context
  const PAGE_NAME = "Section Template"; // Page name for permission checking
  const [unauthorized, setUnauthorized] = useState(false); // Show Dialog if error
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const goBack = () => navigate(-1);
  const [sectionHeader, setSectionHeader] = useState("");

  const textareaRefs = useRef([]);

  const [sections, setSections] = useState([
    { id: Date.now(), checked: false, textType: "heading", sectionName: "" },
  ]);

  const handleAddSection = () => {
    setSections([
      ...sections,
      {
        id: Date.now(),
        checked: false,
        textType: "heading",
        sectionName: "",
      },
    ]);
  };

  const handleDelete = (id) => {
    if (sections.length > 1) {
      setSections(sections.filter((s) => s.id !== id));
    }
  };

  const handleChange = (index, field, value) => {
    const updated = [...sections];

    updated[index][field] = value;

    // If the textType is being changed and it's not 'text', uncheck 'checked'
    if (field === "textType" && value !== "text") {
      updated[index].checked = false;
    }

    setSections(updated);
  };


  useEffect(() => {
    if (textareaRefs.current.length > 0) {
      const lastRef = textareaRefs.current[textareaRefs.current.length - 1];
      if (lastRef) lastRef.focus();
    }
  }, [sections]);

  const handleSaveSection = async () => {
    // Create section fields
    const section_fields = sections.map((s, index) => ({
      section_field_name: DOMPurify.sanitize(s.sectionName || `Field ${index + 1}`), // Sanitize here
      section_field_type: s.textType || "heading",
      required: s.checked,
      value_amount: null, // Optional field
    }));


    const payload = {
      section_heading: sectionHeader,
      section_fields,
    };
    setLoading(true);
    try {
      const response = await api.post(`/AnnexureARoutes/add_section/${PAGE_NAME}`, payload);
      if (response.status === 201) {
        navigate('/dashboard/sectiontemplatelist');
      }

    } catch (error) {
      console.error("❌ Error adding section:", error);
      if (error.response?.status === 403) {
        setUnauthorized(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDialogHide = () => navigate(-1);


  // Unauthorized UI
  if (unauthorized) {
    return (
      <Dialog
        style={{ width: '360px' }}
        visible={unauthorized}
        onHide={handleDialogHide}
        closable={false}
        dismissableMask={false}
      >
        <div className="text-center">
          <img src="https://blackboxstorage.blr1.cdn.digitaloceanspaces.com/assetImages/protect.png" alt="symbol" width="100" className="mb-3" />
          <h5>Unauthorized</h5>
          <p>You are not authorized</p>
          <Button
            label="Go Back"
            icon="pi pi-arrow-left"
            className="py-2 mt-3 text-white"
            style={{ fontSize: '14px' }}
            severity='danger'
            onClick={handleDialogHide}
          />
        </div>
      </Dialog>
    );
  }

  // Loading UI
  if (loading) {
    return <div className='loderDiv'><GifLoder /></div>;
  }



  return (
    <>

      <Row className="mx-0 align-items-center d-fltx mb-5" >
        <Col md={12} lg={5}>
          <Breadcrumb className="mb-0">
            <Breadcrumb.Item onClick={goBack}>
              <IoChevronBackOutline /> Back
            </Breadcrumb.Item>
            <Breadcrumb.Item active>Add Section</Breadcrumb.Item>
          </Breadcrumb>
        </Col>
      </Row>

      <Row className="mx-0 mt-3">
        <Col md={12} lg={5}>
          <Card className="border-0 shadow-sm">
            <Card.Header
              className="py-3 border-0 h6 d-flex justify-content-between align-items-center"
              style={{ background: "#ffead5" }}
            >
              Add Section
              <Button
                icon="pi pi-save"
                label="Save"
                severity="success"
                className="py-0 px-0"
                text
                onClick={handleSaveSection}
              />
            </Card.Header>
            <Card.Body style={{ maxHeight: "61.5vh", overflow: "auto" }}>
              <div className="d-flex flex-column justify-content-start align-items-center gap-2">
                <label style={{ width: "150px" }}>
                  <b>Section Header</b>
                </label>
                <InputText
                  className="w-100"
                  value={sectionHeader}
                  onChange={(e) => setSectionHeader(e.target.value)}
                />
              </div>
              <hr />
              {sections.map((section, index) => (
                <div
                  className="formLoop mb-3 border p-3 rounded position-relative"
                  key={section.id}
                >
                  <div>
                    <label>Text Type</label>
                    <FormSelect
                      className="mt-2"
                      value={section.textType}
                      onChange={(e) =>
                        handleChange(index, "textType", e.target.value)
                      }
                    >
                      <option value="" disabled>
                        ---- Select Text Type ----
                      </option>
                      <option value="heading">Heading</option>
                      <option value="subheading">Sub-Heading</option>
                      <option value="text">Text</option>
                    </FormSelect>
                  </div>
                  <Row className="align-items-center mt-2">
                    <Col md={12} lg={12}>
                      <div>
                        <label>Section Name</label>
                        {/* <Form.Control
                          as="textarea"
                          rows={3}
                          className="mt-2"
                          value={section.sectionName}
                          onChange={(e) =>
                            handleChange(index, "sectionName", e.target.value)
                          }
                          ref={(el) => (textareaRefs.current[index] = el)}
                        /> */}
                        <Editor
                          value={section.sectionName}
                          onTextChange={(e) => handleChange(index, "sectionName", e.htmlValue)}
                          style={{ height: "200px", marginTop: "0.5rem" }}
                        />

                      </div>
                    </Col>

                    {section.textType !== "heading" && (
                      <Col md={12} lg={12}>
                        <div className="pt-4">
                          <label>
                            <Checkbox
                              onChange={(e) =>
                                handleChange(index, "checked", e.checked)
                              }
                              checked={section.checked}
                              className="me-2"
                            />
                            Required Checkbox
                          </label>
                        </div>
                      </Col>
                    )}
                  </Row>
                  {index !== 0 && (
                    <div className="text-end mt-2">
                      <Button
                        icon="pi pi-times"
                        severity="danger"
                        className="p-0 border-0"
                        onClick={() => handleDelete(section.id)}
                        style={{
                          width: "30px",
                          position: "absolute",
                          right: "-15px",
                          top: "-10px",
                        }}
                        text
                        tooltip="Delete"
                        tooltipOptions={{ position: "top" }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </Card.Body>
            <Card.Footer className="d-flex justify-content-end bg-white border-0">
              <Button
                icon="pi pi-plus"
                label="Section"
                severity="help"
                className="py-1"
                outlined
                onClick={handleAddSection}
              />
            </Card.Footer>
          </Card>
        </Col>
        <Col md={12} lg={7}>
          <Card
            className="border-0 shadow-sm"
            style={{ height: "75vh", overflow: "auto" }}
          >
            <Card.Header
              className="py-3 h6 border-0 text-white"
              style={{ background: "rgba(146, 74, 151, 0.85)" }}
            >
              Preview Template
            </Card.Header>
            <Card.Body className="priviewPart p-4">
              <h4>{sectionHeader}</h4>

              {/* {sections.map((section, index) => (
                <div key={section.id} className="mb-3">
                  {section.textType === "heading" && (
                    <h5>{section.sectionName}</h5>
                  )}
                  {section.textType === "subheading" && (
                    <h6>{section.sectionName}</h6>
                  )}
                  {section.textType === "text" && (
                    <ul>
                      <li className="d-flex justify-content-between align-items-start">
                        <span className="text-start">{section.sectionName}</span>
                        {section.checked && (
                          <Checkbox
                            checked={section.checked}

                          />
                        )}
                      </li>
                    </ul>
                  )}
                </div>
              ))} */}

              {sections.map((section, index) => (
                <div key={section.id} className="mb-3">
                  {section.textType === "heading" && (
                    <h5 dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(section.sectionName) }} />
                  )}
                  {section.textType === "subheading" && (
                    <>
                      <h6 dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(section.sectionName) }} />
                      {section.checked && (
                        <Checkbox checked={section.checked} />
                      )}
                    </>
                  )}
                  {section.textType === "text" && (
                    <ul>
                      <li className="d-flex justify-content-between align-items-start">
                        <span
                          className="text-start"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(section.sectionName) }}
                        />
                        {section.checked && (
                          <Checkbox checked={section.checked} />
                        )}
                      </li>
                    </ul>
                  )}
                </div>
              ))}

            </Card.Body>
          </Card>
        </Col>
      </Row>

    </>
  );
};

export default Add_template;
