import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge, Card, Col, Form, Row, Table } from "react-bootstrap";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import api from "../../api/axios";
import GifLoder from "../../interfaces/GifLoder";
import {
  EmployeePageHeader,
  EmployeeRelatedLinks,
  EMPLOYEE_ROUTES,
  PAGE_PERMISSION_NAMES,
} from "../../components/EmployeePageChrome";

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
  const [kindFilter, setKindFilter] = useState("");
  const [search, setSearch] = useState("");
  const [walkupAirportId, setWalkupAirportId] = useState("");
  const [airports, setAirports] = useState([]);
  const [busyWalkup, setBusyWalkup] = useState(false);

  const encodedPage = encodeURIComponent(PAGE_NAME);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const params = {};
        if (statusFilter) params.status = statusFilter;
        if (kindFilter) params.kind = kindFilter;
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
  }, [encodedPage, statusFilter, kindFilter]);

  useEffect(() => {
    let cancelled = false;
    const loadAirports = async () => {
      try {
        const res = await api.get("/airports/get-airports");
        const rows = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.airports)
            ? res.data.airports
            : [];
        if (!cancelled) setAirports(rows);
      } catch {
        if (!cancelled) setAirports([]);
      }
    };
    loadAirports();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!tariffIdParam) {
      setSelected(null);
      return undefined;
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

  const refreshWalkup = async () => {
    if (!walkupAirportId) {
      setError("Select an airport to build the walk-up tariff");
      return;
    }
    setBusyWalkup(true);
    setError("");
    try {
      await api.post(`/sgha-tariffs/tariffs/${encodedPage}/walkup`, {
        airport_id: Number(walkupAirportId),
        currency: "INR",
      });
      setKindFilter("Walkup");
      setStatusFilter("Active");
      const res = await api.get(`/sgha-tariffs/tariffs/${encodedPage}`, {
        params: { status: "Active", kind: "Walkup" },
      });
      setTariffs(Array.isArray(res.data?.tariffs) ? res.data.tariffs : []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Could not create walk-up tariff"
      );
    } finally {
      setBusyWalkup(false);
    }
  };

  const relatedLinks = [
    { label: "Billing", to: EMPLOYEE_ROUTES.billing },
    { label: "Additional charges", to: EMPLOYEE_ROUTES.additionalCharges },
    { label: "Services price", to: EMPLOYEE_ROUTES.servicesPrice },
  ];

  if (loading && !tariffs.length && !selected) {
    return (
      <div className="loderDiv">
        <GifLoder />
      </div>
    );
  }

  if (tariffIdParam && selected) {
    const lines = Array.isArray(selected.lines) ? selected.lines : [];
    return (
      <>
        <EmployeePageHeader
          title={`Tariff v${selected.version}`}
          backTo={EMPLOYEE_ROUTES.sghaTariffs}
          backLabel="SGHA Tariffs"
          items={[{ label: `Tariff #${selected.tariff_id}` }]}
          extra={
            <Badge bg={statusTone(selected.status)} className="align-self-center">
              {selected.status}
            </Badge>
          }
        />
        <EmployeeRelatedLinks links={relatedLinks} />

        {error ? <div className="alert alert-danger">{error}</div> : null}

        <Card className="mb-3 border-0 shadow-sm">
          <Card.Body>
            <div className="text-muted small mb-3">
              Submission #{selected.submission_id}
              {selected.client?.name ? ` · ${selected.client.name}` : ""}
              {selected.airport?.iata
                ? ` · ${selected.airport.iata}`
                : selected.airport?.name
                  ? ` · ${selected.airport.name}`
                  : ""}
              {selected.currency ? ` · ${selected.currency}` : ""}
            </div>
            <Row className="g-3 small">
              <Col sm={6} md={3}>
                <div className="text-muted">Effective from</div>
                <div className="fw-semibold">{selected.effective_from || "—"}</div>
              </Col>
              <Col sm={6} md={3}>
                <div className="text-muted">Effective to</div>
                <div className="fw-semibold">{selected.effective_to || "—"}</div>
              </Col>
              <Col sm={6} md={3}>
                <div className="text-muted">Approved at</div>
                <div className="fw-semibold">
                  {selected.approved_at
                    ? new Date(selected.approved_at).toLocaleString()
                    : "—"}
                </div>
              </Col>
              <Col sm={6} md={3}>
                <div className="text-muted">Business</div>
                <div className="fw-semibold">{selected.business?.name || "—"}</div>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <div className="pricing-section-card">
          <div className="pricing-section-card__head">
            <h6>Line items ({lines.length})</h6>
            <Button
              type="button"
              label="Back to list"
              icon="pi pi-arrow-left"
              className="p-button-outlined p-button-secondary p-button-sm"
              onClick={closeDetail}
            />
          </div>
          <div className="pricing-section-card__body">
            <div className="table-responsive">
              <Table striped hover className="align-middle mb-0 pricing-data-table">
                <thead>
                  <tr>
                    <th className="col-code">Code</th>
                    <th>Description</th>
                    <th className="col-code">Type</th>
                    <th className="col-code">Unit</th>
                    <th className="col-money text-end">Rate</th>
                    <th className="col-money text-end">Included qty</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.tariff_line_id}>
                      <td className="col-code">{line.service_code}</td>
                      <td>{line.description}</td>
                      <td className="col-code">{line.line_type}</td>
                      <td className="col-code">{line.unit || "—"}</td>
                      <td className="col-money text-end">
                        {money(line.rate, selected.currency)}
                      </td>
                      <td className="col-money text-end">
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
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <EmployeePageHeader
        title="SGHA Tariffs"
        items={[{ label: "SGHA Tariffs" }]}
        backLabel="Home"
      />
      <EmployeeRelatedLinks links={relatedLinks} />

      <div className="pricing-toolbar">
        <Form.Select
          aria-label="Kind filter"
          style={{ width: 140 }}
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value)}
        >
          <option value="">All kinds</option>
          <option value="Sgha">SGHA</option>
          <option value="Walkup">Walk-up</option>
        </Form.Select>
        <Form.Select
          aria-label="Status filter"
          style={{ width: 160 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="Active">Active</option>
          <option value="Superseded">Superseded</option>
          <option value="Expired">Expired</option>
        </Form.Select>
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search" />
          <InputText
            placeholder="Search client, airport…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </IconField>
        <Form.Select
          aria-label="Walk-up airport"
          style={{ width: 180 }}
          value={walkupAirportId}
          onChange={(e) => setWalkupAirportId(e.target.value)}
        >
          <option value="">Walk-up airport…</option>
          {airports.map((a) => (
            <option
              key={a.airport_id || a.id}
              value={a.airport_id || a.id}
            >
              {a.iata || a.name} {a.name ? `· ${a.name}` : ""}
            </option>
          ))}
        </Form.Select>
        <Button
          type="button"
          label="Refresh walk-up"
          icon="pi pi-refresh"
          className="p-button-sm p-button-outlined"
          loading={busyWalkup}
          onClick={refreshWalkup}
        />
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <div className="pricing-section-card">
        <div className="pricing-section-card__head">
          <h6>
            Tariffs
            {!loading ? ` (${filtered.length})` : ""}
          </h6>
        </div>
        <div className="pricing-section-card__body">
          {loading ? (
            <div className="loderDiv py-4">
              <GifLoder />
            </div>
          ) : (
            <div className="table-responsive">
              <Table striped hover className="align-middle mb-0 pricing-data-table">
                <thead>
                  <tr>
                    <th className="col-num">ID</th>
                    <th className="col-code">Kind</th>
                    <th>Client</th>
                    <th className="col-code">Airport</th>
                    <th className="col-code">Submission</th>
                    <th className="col-code">Version</th>
                    <th className="col-code">Currency</th>
                    <th>Effective</th>
                    <th className="col-status">Status</th>
                    <th className="col-num">Lines</th>
                    <th className="col-actions" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.tariff_id}>
                      <td className="col-num">{row.tariff_id}</td>
                      <td className="col-code">{row.kind || "Sgha"}</td>
                      <td>
                        {row.kind === "Walkup"
                          ? "Walk-up / non-SGHA"
                          : row.client?.name ||
                            (row.client_registration_id
                              ? `Reg #${row.client_registration_id}`
                              : "—")}
                      </td>
                      <td className="col-code">
                        {row.airport?.iata || row.airport?.name || "—"}
                      </td>
                      <td className="col-code">
                        {row.submission_id ? `#${row.submission_id}` : "—"}
                      </td>
                      <td className="col-code">v{row.version}</td>
                      <td className="col-code">{row.currency}</td>
                      <td>
                        <div>{row.effective_from || "—"}</div>
                        {row.effective_to ? (
                          <div className="text-muted small">
                            to {row.effective_to}
                          </div>
                        ) : null}
                      </td>
                      <td className="col-status">
                        <Badge bg={statusTone(row.status)}>{row.status}</Badge>
                      </td>
                      <td className="col-num">
                        {Array.isArray(row.lines) ? row.lines.length : 0}
                      </td>
                      <td className="col-actions text-end">
                        <Button
                          type="button"
                          label="View"
                          className="p-button-sm p-button-outlined"
                          onClick={() => openTariff(row.tariff_id)}
                        />
                      </td>
                    </tr>
                  ))}
                  {!filtered.length && (
                    <tr>
                      <td colSpan={11} className="text-center text-muted py-4">
                        No tariffs yet. Complete an SGHA to freeze one, or
                        refresh a walk-up tariff for non-scheduled flights.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <Dialog
        header="Unable to load tariffs"
        visible={Boolean(error) && !filtered.length}
        onHide={() => setError("")}
        style={{ width: "28rem" }}
      >
        <p className="mb-0">{error}</p>
      </Dialog>
    </>
  );
};

export default SghaTariffs;
