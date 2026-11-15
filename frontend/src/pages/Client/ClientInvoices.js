import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge, Breadcrumb, Card, Col, Row, Table } from "react-bootstrap";
import { Button } from "primereact/button";
import { IoChevronBackOutline } from "react-icons/io5";
import api from "../../api/axios";
import GifLoder from "../../interfaces/GifLoder";
import { useAuth } from "../../context/AuthContext";
import { CLIENT_ROUTES } from "../../utils/clientWorkspace";
import { downloadInvoicePdf } from "../../utils/invoicePdf";

const money = (value, currency = "INR") => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2)}`;
  }
};

const ClientInvoices = () => {
  const navigate = useNavigate();
  const { invoice_id: invoiceIdParam } = useParams();
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invoices, setInvoices] = useState([]);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (!userId || invoiceIdParam) return undefined;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/api/client/portal/invoices", {
          params: { client_registration_id: userId },
        });
        if (!cancelled) {
          setInvoices(
            Array.isArray(res.data?.invoices) ? res.data.invoices : []
          );
        }
      } catch (err) {
        if (!cancelled) {
          setInvoices([]);
          setError(err.response?.data?.message || err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [userId, invoiceIdParam]);

  useEffect(() => {
    if (!userId || !invoiceIdParam) {
      setDetail(null);
      return undefined;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(
          `/api/client/portal/invoices/${invoiceIdParam}`,
          { params: { client_registration_id: userId } }
        );
        if (!cancelled) setDetail(res.data?.invoice || null);
      } catch (err) {
        if (!cancelled) {
          setDetail(null);
          setError(err.response?.data?.message || err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [userId, invoiceIdParam]);

  if (loading && !invoices.length && !detail) return <GifLoder />;

  if (invoiceIdParam && detail) {
    return (
      <div className="container-fluid py-3">
        <Row className="align-items-center mb-3">
          <Col>
            <Breadcrumb className="mb-1">
              <Breadcrumb.Item
                onClick={() => navigate(CLIENT_ROUTES.invoices)}
                style={{ cursor: "pointer" }}
              >
                My Invoices
              </Breadcrumb.Item>
              <Breadcrumb.Item active>{detail.invoice_no}</Breadcrumb.Item>
            </Breadcrumb>
            <h4 className="mb-0">
              {detail.invoice_no}{" "}
              <Badge bg="success">{detail.status}</Badge>
            </h4>
          </Col>
          <Col xs="auto" className="d-flex gap-2">
            <Button
              label="Download PDF"
              className="p-button-outlined"
              onClick={() => downloadInvoicePdf(detail)}
            />
            <Button
              className="p-button-outlined p-button-secondary"
              onClick={() => navigate(CLIENT_ROUTES.invoices)}
            >
              <IoChevronBackOutline className="me-1" />
              Back
            </Button>
          </Col>
        </Row>
        {error ? <div className="alert alert-danger">{error}</div> : null}
        <Card className="mb-3">
          <Card.Body className="small">
            <Row className="g-3">
              <Col md={4}>
                <div className="text-muted">Airport</div>
                <div>{detail.airport?.iata || "—"}</div>
              </Col>
              <Col md={4}>
                <div className="text-muted">Period</div>
                <div>
                  {detail.period_from || "—"} → {detail.period_to || "—"}
                </div>
              </Col>
              <Col md={4}>
                <div className="text-muted">Total</div>
                <div>{money(detail.grand_total, detail.currency)}</div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        <Card>
          <Card.Header>Lines ({detail.lines?.length || 0})</Card.Header>
          <Table responsive hover className="mb-0">
            <thead>
              <tr>
                <th>FHR</th>
                <th>Description</th>
                <th>Type</th>
                <th className="text-end">Qty</th>
                <th className="text-end">Rate</th>
                <th className="text-end">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(detail.lines || []).map((line) => (
                <tr key={line.invoice_line_id}>
                  <td>#{line.fhr_id}</td>
                  <td>{line.description}</td>
                  <td>{line.line_type}</td>
                  <td className="text-end">{line.qty}</td>
                  <td className="text-end">
                    {money(line.unit_rate, detail.currency)}
                  </td>
                  <td className="text-end">
                    {money(line.amount, detail.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3">
      <Breadcrumb className="mb-1">
        <Breadcrumb.Item active>My Invoices</Breadcrumb.Item>
      </Breadcrumb>
      <h4 className="mb-3">My Invoices</h4>
      <div className="text-muted small mb-3">
        Only issued invoices are shown here.
      </div>
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <Card>
        <Table responsive hover className="mb-0">
          <thead>
            <tr>
              <th>No.</th>
              <th>Airport</th>
              <th>Issued</th>
              <th className="text-end">Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {invoices.map((row) => (
              <tr key={row.invoice_id}>
                <td>{row.invoice_no}</td>
                <td>{row.airport?.iata || "—"}</td>
                <td>
                  {row.issued_at
                    ? new Date(row.issued_at).toLocaleDateString()
                    : "—"}
                </td>
                <td className="text-end">
                  {money(row.grand_total, row.currency)}
                </td>
                <td className="text-end">
                  <Button
                    label="View"
                    className="p-button-sm p-button-outlined"
                    onClick={() =>
                      navigate(`${CLIENT_ROUTES.invoices}/${row.invoice_id}`)
                    }
                  />
                </td>
              </tr>
            ))}
            {!invoices.length && !loading ? (
              <tr>
                <td colSpan={5} className="text-center text-muted py-4">
                  No issued invoices yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </Table>
      </Card>
    </div>
  );
};

export default ClientInvoices;
