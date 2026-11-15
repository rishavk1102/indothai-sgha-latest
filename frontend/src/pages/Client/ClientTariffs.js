import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge, Breadcrumb, Card, Col, Row, Table } from "react-bootstrap";
import { Button } from "primereact/button";
import { IoChevronBackOutline } from "react-icons/io5";
import api from "../../api/axios";
import GifLoder from "../../interfaces/GifLoder";
import { useAuth } from "../../context/AuthContext";
import { CLIENT_ROUTES } from "../../utils/clientWorkspace";

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

const ClientTariffs = () => {
  const navigate = useNavigate();
  const { tariff_id: tariffIdParam } = useParams();
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tariffs, setTariffs] = useState([]);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (!userId || tariffIdParam) return undefined;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/api/client/portal/tariffs", {
          params: { client_registration_id: userId },
        });
        if (!cancelled) {
          setTariffs(Array.isArray(res.data?.tariffs) ? res.data.tariffs : []);
        }
      } catch (err) {
        if (!cancelled) {
          setTariffs([]);
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
  }, [userId, tariffIdParam]);

  useEffect(() => {
    if (!userId || !tariffIdParam) {
      setDetail(null);
      return undefined;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(
          `/api/client/portal/tariffs/${tariffIdParam}`,
          { params: { client_registration_id: userId } }
        );
        if (!cancelled) setDetail(res.data?.tariff || null);
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
  }, [userId, tariffIdParam]);

  if (loading && !tariffs.length && !detail) return <GifLoder />;

  if (tariffIdParam && detail) {
    return (
      <div className="container-fluid py-3">
        <Row className="align-items-center mb-3">
          <Col>
            <Breadcrumb className="mb-1">
              <Breadcrumb.Item
                onClick={() => navigate(CLIENT_ROUTES.tariffs)}
                style={{ cursor: "pointer" }}
              >
                My Tariffs
              </Breadcrumb.Item>
              <Breadcrumb.Item active>
                Tariff #{detail.tariff_id}
              </Breadcrumb.Item>
            </Breadcrumb>
            <h4 className="mb-0">
              Tariff v{detail.version}{" "}
              <Badge bg={detail.status === "Active" ? "success" : "secondary"}>
                {detail.status}
              </Badge>
            </h4>
          </Col>
          <Col xs="auto">
            <Button
              className="p-button-outlined p-button-secondary"
              onClick={() => navigate(CLIENT_ROUTES.tariffs)}
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
              <Col md={3}>
                <div className="text-muted">Airport</div>
                <div>{detail.airport?.iata || "—"}</div>
              </Col>
              <Col md={3}>
                <div className="text-muted">Currency</div>
                <div>{detail.currency}</div>
              </Col>
              <Col md={3}>
                <div className="text-muted">Effective from</div>
                <div>{detail.effective_from || "—"}</div>
              </Col>
              <Col md={3}>
                <div className="text-muted">Effective to</div>
                <div>{detail.effective_to || "—"}</div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        <Card>
          <Card.Header>Lines ({detail.lines?.length || 0})</Card.Header>
          <Table responsive hover className="mb-0">
            <thead>
              <tr>
                <th>Code</th>
                <th>Description</th>
                <th>Type</th>
                <th className="text-end">Rate</th>
              </tr>
            </thead>
            <tbody>
              {(detail.lines || []).map((line) => (
                <tr key={line.tariff_line_id}>
                  <td>{line.service_code}</td>
                  <td>{line.description}</td>
                  <td>{line.line_type}</td>
                  <td className="text-end">
                    {money(line.rate, detail.currency)}
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
        <Breadcrumb.Item active>My Tariffs</Breadcrumb.Item>
      </Breadcrumb>
      <h4 className="mb-3">My Tariffs</h4>
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <Card>
        <Table responsive hover className="mb-0">
          <thead>
            <tr>
              <th>ID</th>
              <th>Airport</th>
              <th>Version</th>
              <th>Currency</th>
              <th>Effective</th>
              <th>Status</th>
              <th>Lines</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tariffs.map((row) => (
              <tr key={row.tariff_id}>
                <td>{row.tariff_id}</td>
                <td>{row.airport?.iata || "—"}</td>
                <td>v{row.version}</td>
                <td>{row.currency}</td>
                <td>
                  {row.effective_from || "—"}
                  {row.effective_to ? ` → ${row.effective_to}` : ""}
                </td>
                <td>
                  <Badge bg={row.status === "Active" ? "success" : "secondary"}>
                    {row.status}
                  </Badge>
                </td>
                <td>{row.lines?.length || 0}</td>
                <td className="text-end">
                  <Button
                    label="View"
                    className="p-button-sm p-button-outlined"
                    onClick={() =>
                      navigate(`${CLIENT_ROUTES.tariffs}/${row.tariff_id}`)
                    }
                  />
                </td>
              </tr>
            ))}
            {!tariffs.length && !loading ? (
              <tr>
                <td colSpan={8} className="text-center text-muted py-4">
                  No frozen tariffs for your account yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </Table>
      </Card>
    </div>
  );
};

export default ClientTariffs;
