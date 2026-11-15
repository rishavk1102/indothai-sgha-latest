import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge, Breadcrumb, Card, Col, Form, Row, Table } from "react-bootstrap";
import { Button } from "primereact/button";
import { IoChevronBackOutline } from "react-icons/io5";
import api from "../../api/axios";
import GifLoder from "../../interfaces/GifLoder";
import {
  EMPLOYEE_ROUTES,
  PAGE_PERMISSION_NAMES,
} from "../../utils/employeeWorkspace";
import { downloadInvoicePdf } from "../../utils/invoicePdf";

const PAGE_NAME = PAGE_PERMISSION_NAMES.billing;
const encodedPage = encodeURIComponent(PAGE_NAME);

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

const Billing = () => {
  const navigate = useNavigate();
  const { invoice_id: invoiceIdParam } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [queue, setQueue] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selected, setSelected] = useState({});
  const [detail, setDetail] = useState(null);

  const loadLists = async () => {
    setLoading(true);
    setError("");
    try {
      const [queueRes, invRes] = await Promise.all([
        api.get(`/billing/queue/${encodedPage}`),
        api.get(`/billing/invoices/${encodedPage}`),
      ]);
      setQueue(Array.isArray(queueRes.data?.fhrs) ? queueRes.data.fhrs : []);
      setInvoices(
        Array.isArray(invRes.data?.invoices) ? invRes.data.invoices : []
      );
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceIdParam) return undefined;
    loadLists();
    return undefined;
  }, [invoiceIdParam]);

  useEffect(() => {
    if (!invoiceIdParam) {
      setDetail(null);
      return undefined;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(
          `/billing/invoices/${encodedPage}/${invoiceIdParam}`
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
  }, [invoiceIdParam]);

  const toggle = (fhrId) => {
    setSelected((prev) => ({ ...prev, [fhrId]: !prev[fhrId] }));
  };

  const selectedIds = Object.keys(selected)
    .filter((id) => selected[id])
    .map(Number);

  const createInvoice = async () => {
    if (!selectedIds.length) return;
    setLoading(true);
    try {
      const res = await api.post(`/billing/invoices/${encodedPage}`, {
        fhr_ids: selectedIds,
      });
      setSelected({});
      navigate(`${EMPLOYEE_ROUTES.billing}/${res.data.invoice.invoice_id}`);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setLoading(false);
    }
  };

  const issue = async () => {
    if (!detail?.invoice_id) return;
    setLoading(true);
    try {
      const res = await api.post(
        `/billing/invoices/${encodedPage}/${detail.invoice_id}/issue`
      );
      setDetail(res.data.invoice);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !queue.length && !detail) return <GifLoder />;

  if (invoiceIdParam && detail) {
    return (
      <div className="container-fluid py-3">
        <Row className="align-items-center mb-3">
          <Col>
            <Breadcrumb className="mb-1">
              <Breadcrumb.Item
                onClick={() => navigate(EMPLOYEE_ROUTES.billing)}
                style={{ cursor: "pointer" }}
              >
                Billing
              </Breadcrumb.Item>
              <Breadcrumb.Item active>{detail.invoice_no}</Breadcrumb.Item>
            </Breadcrumb>
            <h4 className="mb-0">
              {detail.invoice_no}{" "}
              <Badge bg={detail.status === "Issued" ? "success" : "secondary"}>
                {detail.status}
              </Badge>
            </h4>
          </Col>
          <Col xs="auto" className="d-flex gap-2">
            {detail.status === "Draft" ? (
              <Button label="Issue invoice" onClick={issue} />
            ) : null}
            <Button
              label="Download PDF"
              className="p-button-outlined"
              onClick={() => downloadInvoicePdf(detail)}
            />
            <Button
              className="p-button-outlined p-button-secondary"
              onClick={() => navigate(EMPLOYEE_ROUTES.billing)}
            >
              <IoChevronBackOutline className="me-1" />
              Back
            </Button>
          </Col>
        </Row>
        {error ? <div className="alert alert-danger">{error}</div> : null}
        <Card className="mb-3">
          <Card.Body>
            <Row className="small g-3">
              <Col md={4}>
                <div className="text-muted">Client</div>
                <div>{detail.client?.name || detail.bill_to?.name || "—"}</div>
              </Col>
              <Col md={4}>
                <div className="text-muted">Airport</div>
                <div>
                  {detail.airport?.iata || detail.bill_from?.iata || "—"}
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
          <Card.Header>Locked lines ({detail.lines?.length || 0})</Card.Header>
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
      <Row className="mb-3">
        <Col>
          <Breadcrumb className="mb-1">
            <Breadcrumb.Item active>Billing</Breadcrumb.Item>
          </Breadcrumb>
          <h4 className="mb-0">Billing review</h4>
          <div className="text-muted small">
            Rated completed FHRs can be grouped into a draft, then issued.
          </div>
        </Col>
      </Row>
      {error ? <div className="alert alert-danger">{error}</div> : null}

      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <span>Ready to invoice</span>
          <Button
            label={`Create draft (${selectedIds.length})`}
            disabled={!selectedIds.length || loading}
            onClick={createInvoice}
          />
        </Card.Header>
        <Table responsive hover className="mb-0">
          <thead>
            <tr>
              <th />
              <th>FHR</th>
              <th>Client</th>
              <th>Airport</th>
              <th>Aircraft</th>
              <th>Date</th>
              <th className="text-end">Amount</th>
            </tr>
          </thead>
          <tbody>
            {queue.map((row) => (
              <tr key={row.fhr_id}>
                <td>
                  <Form.Check
                    checked={Boolean(selected[row.fhr_id])}
                    onChange={() => toggle(row.fhr_id)}
                  />
                </td>
                <td>#{row.fhr_id}</td>
                <td>{row.client?.name || row.client_id}</td>
                <td>{row.airport?.iata || "—"}</td>
                <td>{row.aircraft?.type_name || "—"}</td>
                <td>{row.rating_date || "—"}</td>
                <td className="text-end">{money(row.total, row.currency)}</td>
              </tr>
            ))}
            {!queue.length && (
              <tr>
                <td colSpan={7} className="text-center text-muted py-4">
                  No rated FHRs waiting for invoice.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>

      <Card>
        <Card.Header>Invoices</Card.Header>
        <Table responsive hover className="mb-0">
          <thead>
            <tr>
              <th>No.</th>
              <th>Client</th>
              <th>Status</th>
              <th className="text-end">Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {invoices.map((row) => (
              <tr key={row.invoice_id}>
                <td>{row.invoice_no}</td>
                <td>{row.client?.name || row.bill_to?.name || "—"}</td>
                <td>
                  <Badge bg={row.status === "Issued" ? "success" : "secondary"}>
                    {row.status}
                  </Badge>
                </td>
                <td className="text-end">
                  {money(row.grand_total, row.currency)}
                </td>
                <td className="text-end">
                  <Button
                    label="View"
                    className="p-button-sm p-button-outlined"
                    onClick={() =>
                      navigate(`${EMPLOYEE_ROUTES.billing}/${row.invoice_id}`)
                    }
                  />
                </td>
              </tr>
            ))}
            {!invoices.length && (
              <tr>
                <td colSpan={5} className="text-center text-muted py-4">
                  No invoices yet.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
};

export default Billing;
