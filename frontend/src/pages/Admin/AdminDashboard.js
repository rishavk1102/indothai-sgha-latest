import React, { useEffect, useState } from "react";
import { Card, Col, Row, Table } from "react-bootstrap";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import {
  EMPLOYEE_ROUTES,
} from "../../components/EmployeePageChrome";

const shortcutCards = [
  {
    title: "Templates",
    text: "Build or edit reusable SGHA templates, including PDF import.",
    icon: "pi pi-file-edit",
    to: EMPLOYEE_ROUTES.templates,
    label: "Open library",
  },
  {
    title: "Clients",
    text: "Client records and invite links for onboarding.",
    icon: "pi pi-users",
    to: EMPLOYEE_ROUTES.clients,
    label: "Open clients",
  },
  {
    title: "Pricing",
    text: "Services price and additional charges used on agreements.",
    icon: "pi pi-wallet",
    to: EMPLOYEE_ROUTES.servicesPrice,
    label: "Open pricing",
  },
  {
    title: "Network",
    text: "Headquarters, airports, airlines, and aircraft setup.",
    icon: "pi pi-globe",
    to: EMPLOYEE_ROUTES.headquarters,
    label: "Open network",
  },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { username } = useAuth();
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [pendingCount, setPendingCount] = useState(null);
  const [unverifiedCount, setUnverifiedCount] = useState(null);
  const [loadingWork, setLoadingWork] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadWork = async () => {
      setLoadingWork(true);
      try {
        const [submissionsRes, unverifiedRes] = await Promise.allSettled([
          api.get("/api/client/annex-a-submissions-list", {
            params: { status: "Pending", sortBy: "DESC", limit: 5 },
          }),
          api.get("/promotion/unverified_count/Verification"),
        ]);

        if (cancelled) return;

        if (submissionsRes.status === "fulfilled") {
          const data = submissionsRes.value.data;
          const rows = Array.isArray(data?.data) ? data.data : [];
          setPendingSubmissions(rows);
          const count =
            data?.counts?.Pending != null
              ? Number(data.counts.Pending)
              : rows.length;
          setPendingCount(count);
        } else {
          setPendingSubmissions([]);
          setPendingCount(null);
        }

        if (unverifiedRes.status === "fulfilled") {
          setUnverifiedCount(Number(unverifiedRes.value.data?.count) || 0);
        } else {
          setUnverifiedCount(null);
        }
      } finally {
        if (!cancelled) setLoadingWork(false);
      }
    };

    loadWork();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatWhen = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString();
  };

  return (
    <>
      <div className="client-hub-hero employee-hub-hero">
        <h2>Employee Hub</h2>
        <p>
          {username ? `Welcome back, ${username}. ` : ""}
          Review pending submissions, verify people, and jump into templates, clients, pricing, or the network.
        </p>
      </div>

      <Row className="mx-0 g-3 mb-3">
        <Col md={12} lg={6} className="mb-3">
          <Card className="client-hub-card">
            <Card.Body>
              <span className="client-hub-icon">
                <i className="pi pi-inbox" />
              </span>
              <h5>Pending submissions</h5>
              <p>
                {pendingCount == null
                  ? "Open the inbox to review client agreements, comments, and PDFs."
                  : pendingCount === 0
                    ? "No submissions are waiting. The inbox is still the place to review, comment, or export a PDF."
                    : `${pendingCount} submission${pendingCount === 1 ? "" : "s"} waiting for review.`}
              </p>
              <Button
                label="Open submission inbox"
                icon="pi pi-arrow-right"
                iconPos="right"
                className="py-2"
                severity="warning"
                onClick={() =>
                  navigate(`${EMPLOYEE_ROUTES.inbox}?status=Pending`)
                }
              />
            </Card.Body>
          </Card>
        </Col>
        <Col md={12} lg={6} className="mb-3">
          <Card className="client-hub-card">
            <Card.Body>
              <span className="client-hub-icon">
                <i className="pi pi-user-plus" />
              </span>
              <h5>People waiting to be verified</h5>
              <p>
                {unverifiedCount == null
                  ? "Open verification to approve staff accounts."
                  : unverifiedCount === 0
                    ? "No unverified employees right now."
                    : `${unverifiedCount} ${unverifiedCount === 1 ? "person is" : "people are"} waiting to be verified.`}
              </p>
              <Button
                label="Verify employees"
                icon="pi pi-arrow-right"
                iconPos="right"
                className="py-2"
                severity="warning"
                onClick={() => navigate(EMPLOYEE_ROUTES.verify)}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <h6 className="text-muted mb-3">Shortcuts</h6>
      <Row className="mx-0 g-3 mb-4">
        {shortcutCards.map((card) => (
          <Col md={6} lg={3} className="mb-3" key={card.title}>
            <Card className="client-hub-card">
              <Card.Body>
                <span className="client-hub-icon">
                  <i className={card.icon} />
                </span>
                <h5>{card.title}</h5>
                <p>{card.text}</p>
                <Button
                  label={card.label}
                  icon="pi pi-arrow-right"
                  iconPos="right"
                  className="py-2"
                  severity="secondary"
                  outlined
                  onClick={() => navigate(card.to)}
                />
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-transparent border-0 pt-3 d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Inbox preview</h6>
          <Button
            label="View all"
            className="p-0"
            text
            severity="help"
            onClick={() => navigate(EMPLOYEE_ROUTES.inbox)}
          />
        </Card.Header>
        <Card.Body className="p-0">
          {loadingWork ? (
            <p className="text-muted p-3 mb-0">Loading pending work…</p>
          ) : pendingSubmissions.length === 0 ? (
            <p className="text-muted p-3 mb-0">No pending submissions to preview.</p>
          ) : (
            <Table responsive hover className="mb-0 submission-inbox-table submission-inbox-table--compact">
              <thead>
                <tr className="table-primary">
                  <th className="col-client">Client</th>
                  <th className="col-contact">Contact</th>
                  <th className="col-service">Service</th>
                  <th className="col-submitted">Submitted</th>
                  <th style={{ width: "110px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {pendingSubmissions.map((row) => (
                  <tr
                    key={row.submission_id}
                    style={{ cursor: "pointer" }}
                    onClick={() =>
                      navigate(`${EMPLOYEE_ROUTES.inbox}?status=Pending`)
                    }
                  >
                    <td className="col-client" data-label="Client">
                      <span className="client-cell__name">{row.client_name || "—"}</span>
                    </td>
                    <td className="col-contact" data-label="Contact">{row.contact_name || "—"}</td>
                    <td className="col-service" data-label="Service">{row.service_type || "—"}</td>
                    <td className="col-submitted" data-label="Submitted">{formatWhen(row.submission_timestamp)}</td>
                    <td data-label="Status">
                      <Tag value={row.status || "Pending"} severity="warning" />
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

export default AdminDashboard;
