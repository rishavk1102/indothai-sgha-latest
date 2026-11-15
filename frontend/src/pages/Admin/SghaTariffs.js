import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Badge,
  Breadcrumb,
  Card,
  Col,
  Form,
  Row,
  Table,
} from "react-bootstrap";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { IoChevronBackOutline } from "react-icons/io5";
import api from "../../api/axios";
import GifLoder from "../../interfaces/GifLoder";
import {
  EMPLOYEE_ROUTES,
  PAGE_PERMISSION_NAMES,
} from "../../utils/employeeWorkspace";

const PAGE_NAME = PAGE_PERMISSION_NAMES.sghaTariffs;
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
    return `${currency || ""} ${n.toFixed(2)}`.trim();
  }
};

const statusTone = (status) => {
  if (status === "Active") return "success";
  if (status === "Superseded") return "secondary";
  if (status === "Expired") return "warning";
  return "light";
};

const SghaTariffs = () => {
  const navigate = useNavigate();
  const { tariff_id: tariffIdParam } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tariffs, setTariffs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState("Active");
  const [search, setSearch] = useState("");

  const encodedPage = encodeURIComponent(PAGE_NAME);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const params = {};
        if (statusFilter) params.status = statusFilter;
        const res = await api.get(`/sgha-tariffs/tariffs/${encodedPage}`, {
          params,
        });
        if (cancelled) return;
        setTariffs(Array.isArray(res.data?.tariffs) ? res.data.tariffs : []);
      } catch (err) {
        if (cancelled) return;
        setTariffs([]);
        setError(
          err.response?.data?.message ||
            err.message ||
            "Could not load tariffs"
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [encodedPage, statusFilter]);

  useEffect(() => {
    if (!tariffIdParam) {
      setSelected(null);
      return;
    }
    let cancelled = false;
    const loadOne = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(
          `/sgha-tariffs/tariffs/${encodedPage}/${tariffIdParam}`
        );
        if (cancelled) return;
        setSelected(res.data?.tariff || null);
      } catch (err) {
        if (cancelled) return;
        setSelected(null);
        setError(
          err.response?.data?.message ||
            err.message ||
            "Could not load tariff"
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadOne();
    return () => {
      cancelled = true;
    };
  }, [encodedPage, tariffIdParam]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tariffs;
    return tariffs.filter((row) => {
      const hay = [
        row.tariff_id,
        row.submission_id,
        row.version,
        row.currency,
        row.status,
        row.client?.name,
        row.airport?.name,
        row.airport?.iata,
        row.business?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [tariffs, search]);

  const openTariff = (tariffId) => {
    navigate(`${EMPLOYEE_ROUTES.sghaTariffs}/${tariffId}`);
  };

  const closeDetail = () => {
    navigate(EMPLOYEE_ROUTES.sghaTariffs);
  };

  if (loading && !tariffs.length && !selected) {
    return <GifLoder />;
  }

  if (tariffIdParam && selected) {
    const lines = Array.isArray(selected.lines) ? selected.lines : [];
    return (
      <div className="container-fluid py-3">
        <Row className="align-items-center mb-3">
          <Col>
            <Breadcrumb className="mb-1">
              <Breadcrumb.Item onClick={closeDetail} style={{ cursor: "pointer" }}>
                SGHA Tariffs
              </Breadcrumb.Item>
              <Breadcrumb.Item active>
                Tariff #{selected.tariff_id}
              </Breadcrumb.Item>
            </Breadcrumb>
            <h4 className="mb-0">
              Frozen tariff v{selected.version}{" "}
              <Badge bg={statusTone(selected.status)}>{selected.status}</Badge>
            </h4>
            <div className="text-muted small mt-1">
              Submission #{selected.submission_id}
              {selected.client?.name ? ` · ${selected.client.name}` : ""}
              {selected.airport?.iata
                ? ` · ${selected.airport.iata}`
                : selected.airport?.name
                  ? ` · ${selected.airport.name}`
                  : ""}
              {selected.currency ? ` · ${selected.currency}` : ""}
            </div>
          </Col>
          <Col xs="auto">
            <Button
              type="button"
              className="p-button-outlined p-button-secondary"
              onClick={closeDetail}
            >
              <IoChevronBackOutline className="me-1" />
              Back to list
            </Button>
          </Col>
        </Row>

        <Card className="mb-3">
          <Card.Body>
            <Row className="g-3 small">
              <Col md={3}>
                <div className="text-muted">Effective from</div>
                <div>{selected.effective_from || "—"}</div>
              </Col>
              <Col md={3}>
                <div className="text-muted">Effective to</div>
                <div>{selected.effective_to || "—"}</div>
              </Col>
              <Col md={3}>
                <div className="text-muted">Approved at</div>
                <div>
                  {selected.approved_at
                    ? new Date(selected.approved_at).toLocaleString()
                    : "—"}
                </div>
              </Col>
              <Col md={3}>
                <div className="text-muted">Business</div>
                <div>{selected.business?.name || "—"}</div>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header>Line items ({lines.length})</Card.Header>
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Unit</th>
                  <th className="text-end">Rate</th>
                  <th className="text-end">Included qty</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.tariff_line_id}>
                    <td>{line.service_code}</td>
                    <td>{line.description}</td>
                    <td>{line.line_type}</td>
                    <td>{line.unit || "—"}</td>
                    <td className="text-end">
                      {money(line.rate, selected.currency)}
                    </td>
                    <td className="text-end">
                      {line.included_qty != null ? line.included_qty : "—"}
                    </td>
                  </tr>
                ))}
                {!lines.length && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">
                      No line items on this tariff.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3">
      <Row className="align-items-center mb-3">
        <Col>
          <Breadcrumb className="mb-1">
            <Breadcrumb.Item active>SGHA Tariffs</Breadcrumb.Item>
          </Breadcrumb>
          <h4 className="mb-0">SGHA Tariffs</h4>
          <div className="text-muted small">
            Prices frozen when an SGHA is marked Completed.
          </div>
        </Col>
      </Row>

      <Card className="mb-3">
        <Card.Body>
          <Row className="g-2 align-items-end">
            <Col md={4}>
              <Form.Label className="small text-muted mb-1">Search</Form.Label>
              <InputText
                className="w-100"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Client, airport, submission…"
              />
            </Col>
            <Col md={3}>
              <Form.Label className="small text-muted mb-1">Status</Form.Label>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="Active">Active</option>
                <option value="Superseded">Superseded</option>
                <option value="Expired">Expired</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {error ? (
        <div className="alert alert-danger">{error}</div>
      ) : null}

      <Card>
        <Card.Body className="p-0">
          {loading ? <GifLoder /> : null}
          <Table responsive hover className="mb-0 align-middle">
            <thead>
              <tr>
                <th>ID</th>
                <th>Client</th>
                <th>Airport</th>
                <th>Submission</th>
                <th>Version</th>
                <th>Currency</th>
                <th>Effective</th>
                <th>Status</th>
                <th>Lines</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.tariff_id}>
                  <td>{row.tariff_id}</td>
                  <td>{row.client?.name || `Reg #${row.client_registration_id}`}</td>
                  <td>
                    {row.airport?.iata || row.airport?.name || "—"}
                  </td>
                  <td>#{row.submission_id}</td>
                  <td>v{row.version}</td>
                  <td>{row.currency}</td>
                  <td>
                    {row.effective_from || "—"}
                    {row.effective_to ? ` → ${row.effective_to}` : ""}
                  </td>
                  <td>
                    <Badge bg={statusTone(row.status)}>{row.status}</Badge>
                  </td>
                  <td>{Array.isArray(row.lines) ? row.lines.length : 0}</td>
                  <td className="text-end">
                    <Button
                      type="button"
                      label="View"
                      className="p-button-sm p-button-outlined"
                      onClick={() => openTariff(row.tariff_id)}
                    />
                  </td>
                </tr>
              ))}
              {!filtered.length && !loading && (
                <tr>
                  <td colSpan={10} className="text-center text-muted py-4">
                    No tariffs yet. Complete an SGHA with priced aircraft options
                    or additional charges to freeze one.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Dialog
        header="Unable to load tariffs"
        visible={Boolean(error) && !filtered.length}
        onHide={() => setError("")}
        style={{ width: "28rem" }}
      >
        <p className="mb-0">{error}</p>
      </Dialog>
    </div>
  );
};

export default SghaTariffs;
