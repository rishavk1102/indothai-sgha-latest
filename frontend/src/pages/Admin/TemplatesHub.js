import React, { useEffect, useState } from "react";
import { Card, Col, Row, Table } from "react-bootstrap";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import GifLoder from "../../interfaces/GifLoder";
import {
  EmployeePageHeader,
  EmployeeRelatedLinks,
  EMPLOYEE_ROUTES,
} from "../../components/EmployeePageChrome";

const TemplatesHub = () => {
  const navigate = useNavigate();
  const [yearsWithStatus, setYearsWithStatus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const response = await api.get("/template_years/years-with-status", {
          params: { _t: Date.now() },
        });
        setYearsWithStatus(response.data?.data || []);
      } catch (error) {
        console.error("Error fetching templates:", error);
        setYearsWithStatus([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const rows = [];
  (yearsWithStatus || []).forEach((yearRecord) => {
    const year = yearRecord.year;
    const templates =
      yearRecord.templates && yearRecord.templates.length > 0
        ? yearRecord.templates
        : yearRecord.hasData
          ? [{ templateName: null, hasData: true }]
          : [];

    if (!templates.length) {
      rows.push({
        key: `${year}-empty`,
        year,
        templateName: null,
        label: `${year} (empty)`,
        hasData: false,
        sections: { main: false, annexA: false, annexB: false },
      });
      return;
    }

    templates.forEach((template) => {
      const name =
        template.templateName != null && String(template.templateName).trim() !== ""
          ? String(template.templateName).trim()
          : null;
      rows.push({
        key: name ? `${year}-${name}` : `${year}-default`,
        year,
        templateName: name,
        label: name || `${year} (Default)`,
        hasData: !!template.hasData,
        sections: {
          main: !!(template.hasMain || template.hasData),
          annexA: !!(template.hasAnnexA || template.hasData),
          annexB: !!(template.hasAnnexB || template.hasData),
        },
      });
    });
  });

  const openBuilder = (row) => {
    navigate(EMPLOYEE_ROUTES.builder, {
      state: {
        openTemplate: {
          year: row.year,
          templateName: row.templateName,
        },
      },
    });
  };

  if (loading) {
    return (
      <div className="loderDiv">
        <GifLoder />
      </div>
    );
  }

  return (
    <>
      <EmployeePageHeader
        title="Templates"
        items={[{ label: "Templates" }]}
        primaryLabel="Create template"
        primaryIcon="pi pi-plus"
        onPrimary={() => navigate(EMPLOYEE_ROUTES.builder)}
        extra={
          <Button
            label="Import PDF"
            icon="pi pi-upload"
            className="py-2"
            severity="secondary"
            outlined
            onClick={() => navigate(EMPLOYEE_ROUTES.pdfImport)}
          />
        }
      />

      <EmployeeRelatedLinks
        links={[
          { label: "Section library", to: EMPLOYEE_ROUTES.sections },
          { label: "Main Agreement letters", to: EMPLOYEE_ROUTES.mainAgreement },
          { label: "Submission inbox", to: EMPLOYEE_ROUTES.inbox },
        ]}
      />

      <p className="text-muted mb-3">
        One library for reusable SGHA templates. Import a PDF or start blank, then continue in the builder for Main Agreement, Annex A, and Annex B.
      </p>

      <Row className="g-3 mb-4">
        <Col md={6} lg={4}>
          <Card className="client-hub-card">
            <Card.Body>
              <span className="client-hub-icon">
                <i className="pi pi-file-edit" />
              </span>
              <h5>Start blank</h5>
              <p>Open the builder and add a year, then fill Main Agreement, Annex A, and Annex B.</p>
              <Button
                label="Open builder"
                icon="pi pi-arrow-right"
                iconPos="right"
                className="py-2"
                severity="warning"
                onClick={() => navigate(EMPLOYEE_ROUTES.builder)}
              />
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} lg={4}>
          <Card className="client-hub-card">
            <Card.Body>
              <span className="client-hub-icon">
                <i className="pi pi-upload" />
              </span>
              <h5>Import PDF</h5>
              <p>Upload an SGHA PDF, review the parsed sections, then continue in the builder.</p>
              <Button
                label="Upload PDF"
                icon="pi pi-arrow-right"
                iconPos="right"
                className="py-2"
                severity="warning"
                onClick={() => navigate(EMPLOYEE_ROUTES.pdfImport)}
              />
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} lg={4}>
          <Card className="client-hub-card">
            <Card.Body>
              <span className="client-hub-icon">
                <i className="pi pi-book" />
              </span>
              <h5>Supporting libraries</h5>
              <p>Section snippets and Main Agreement letters used alongside the template builder.</p>
              <Button
                label="Section library"
                icon="pi pi-arrow-right"
                iconPos="right"
                className="py-2"
                severity="secondary"
                outlined
                onClick={() => navigate(EMPLOYEE_ROUTES.sections)}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-transparent border-0 pt-3">
          <h6 className="mb-0">Template library</h6>
        </Card.Header>
        <Card.Body className="p-0">
          {rows.length === 0 ? (
            <div className="text-center py-5 px-3">
              <i className="pi pi-inbox mb-3" style={{ fontSize: "2rem", color: "#924a97" }} />
              <h5>No templates yet</h5>
              <p className="text-muted mb-3">Create a blank template or import a PDF to seed the library.</p>
              <Button
                label="Create template"
                icon="pi pi-plus"
                className="py-2"
                severity="warning"
                onClick={() => navigate(EMPLOYEE_ROUTES.builder)}
              />
            </div>
          ) : (
            <Table responsive hover className="mb-0">
              <thead>
                <tr className="table-primary">
                  <th>Year</th>
                  <th>Template</th>
                  <th>Main</th>
                  <th>Annex A</th>
                  <th>Annex B</th>
                  <th style={{ width: "160px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <td data-label="Year">{row.year}</td>
                    <td data-label="Template">
                      <strong>{row.label}</strong>
                    </td>
                    <td data-label="Main">
                      <Tag value={row.sections.main ? "Saved" : "Empty"} severity={row.sections.main ? "success" : "secondary"} />
                    </td>
                    <td data-label="Annex A">
                      <Tag value={row.sections.annexA ? "Saved" : "Empty"} severity={row.sections.annexA ? "success" : "secondary"} />
                    </td>
                    <td data-label="Annex B">
                      <Tag value={row.sections.annexB ? "Saved" : "Empty"} severity={row.sections.annexB ? "success" : "secondary"} />
                    </td>
                    <td data-label="Action">
                      <Button
                        label="Open in builder"
                        icon="pi pi-pencil"
                        className="p-0"
                        text
                        severity="help"
                        onClick={() => openBuilder(row)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </>
  );
};

export default TemplatesHub;
