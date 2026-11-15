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

const ClientFhrs = () => {
  const navigate = useNavigate();
  const { fhr_id: fhrIdParam } = useParams();
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fhrs, setFhrs] = useState([]);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (!userId || fhrIdParam) return undefined;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/api/client/portal/fhrs", {
          params: { client_registration_id: userId },
        });
        if (!cancelled) setFhrs(Array.isArray(res.data?.fhrs) ? res.data.fhrs : []);
      } catch (err) {
        if (!cancelled) {
          setFhrs([]);
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
  }, [userId, fhrIdParam]);

  useEffect(() => {
    if (!userId || !fhrIdParam) {
      setDetail(null);
      return undefined;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/api/client/portal/fhrs/${fhrIdParam}`, {
          params: { client_registration_id: userId },
        });
        if (!cancelled) setDetail(res.data?.fhr || null);
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
  }, [userId, fhrIdParam]);

  if (loading && !fhrs.length && !detail) return <GifLoder />;

  if (fhrIdParam && detail) {
    const rating = detail.rating;
    return (
      <div className="container-fluid py-3">
        <Row className="align-items-center mb-3">
          <Col>
            <Breadcrumb className="mb-1">
              <Breadcrumb.Item
                onClick={() => navigate(CLIENT_ROUTES.fhrs)}
                style={{ cursor: "pointer" }}
              >
                My FHRs
              </Breadcrumb.Item>
              <Breadcrumb.Item active>#{detail.fhr_id}</Breadcrumb.Item>
            </Breadcrumb>
            <h4 className="mb-0">
              FHR #{detail.fhr_id}{" "}
              <Badge bg="secondary">{detail.status}</Badge>
            </h4>
          </Col>
          <Col xs="auto">
            <Button
              className="p-button-outlined p-button-secondary"
              onClick={() => navigate(CLIENT_ROUTES.fhrs)}
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
                <div>{detail.airport?.iata || detail.airport?.name || "—"}</div>
              </Col>
              <Col md={3}>
                <div className="text-muted">Aircraft</div>
                <div>{detail.aircraft?.type_name || "—"}</div>
              </Col>
              <Col md={3}>
                <div className="text-muted">Type</div>
                <div>
                  {detail.type} / {detail.Fhr_type}
                </div>
              </Col>
              <Col md={3}>
                <div className="text-muted">Flight</div>
                <div>
                  {detail.arrival_details?.flight_no ||
                    detail.departure_details?.flight_no ||
                    "—"}
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        {rating ? (
          <Card>
            <Card.Header className="d-flex justify-content-between">
              <span>Charges</span>
              <Badge bg={rating.status === "Rated" ? "success" : "warning"}>
                {rating.status}
              </Badge>
            </Card.Header>
            {rating.reason ? (
              <div className="alert alert-warning m-3 py-2">{rating.reason}</div>
            ) : null}
            <Table responsive hover className="mb-0">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Type</th>
                  <th className="text-end">Qty</th>
                  <th className="text-end">Rate</th>
                  <th className="text-end">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(rating.lines || []).map((line) => (
                  <tr key={line.charge_line_id}>
                    <td>{line.description}</td>
                    <td>{line.line_type}</td>
                    <td className="text-end">{line.qty}</td>
                    <td className="text-end">
                      {money(line.unit_rate, rating.currency)}
                    </td>
                    <td className="text-end">
                      {money(line.amount, rating.currency)}
                    </td>
                  </tr>
                ))}
                {!rating.lines?.length ? (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-3">
                      No charge lines.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </Table>
          </Card>
        ) : (
          <div className="text-muted">No rating yet for this FHR.</div>
        )}
      </div>
    );
  }

  return (
    <div className="container-fluid py-3">
      <Breadcrumb className="mb-1">
        <Breadcrumb.Item active>My FHRs</Breadcrumb.Item>
      </Breadcrumb>
      <h4 className="mb-3">My FHRs</h4>
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <Card>
        <Table responsive hover className="mb-0">
          <thead>
            <tr>
              <th>ID</th>
              <th>Airport</th>
              <th>Aircraft</th>
              <th>Type</th>
              <th>Status</th>
              <th>Rating</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {fhrs.map((row) => (
              <tr key={row.fhr_id}>
                <td>#{row.fhr_id}</td>
                <td>{row.airport?.iata || "—"}</td>
                <td>{row.aircraft?.type_name || "—"}</td>
                <td>
                  {row.type} / {row.Fhr_type}
                </td>
                <td>
                  <Badge bg="secondary">{row.status}</Badge>
                </td>
                <td>
                  {row.rating?.status ? (
                    <Badge
                      bg={
                        row.rating.status === "Rated" ? "success" : "warning"
                      }
                    >
                      {row.rating.status}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="text-end">
                  <Button
                    label="View"
                    className="p-button-sm p-button-outlined"
                    onClick={() =>
                      navigate(`${CLIENT_ROUTES.fhrs}/${row.fhr_id}`)
                    }
                  />
                </td>
              </tr>
            ))}
            {!fhrs.length && !loading ? (
              <tr>
                <td colSpan={7} className="text-center text-muted py-4">
                  No FHRs for your account yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </Table>
      </Card>
    </div>
  );
};

export default ClientFhrs;
