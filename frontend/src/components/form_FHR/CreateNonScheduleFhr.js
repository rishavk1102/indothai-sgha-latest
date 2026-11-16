import React, { useEffect, useRef, useState } from "react";
import { Row, Col, Form, Card } from "react-bootstrap";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Calendar } from "primereact/calendar";
import { Dialog } from "primereact/dialog";
import { Sidebar } from "primereact/sidebar";
import { Toast } from "primereact/toast";
import { useAuth } from "../../context/AuthContext";
import { getSocket } from "../../context/socket";
import api from "../../api/axios";
import Add_handling_companies from "../Add_handling_companies";
import Addairports from "../Addairports";
import Addclient from "../Addclient";
import AddAirlines from "../AddAirlines";
import Add_Aircraft from "../Add_Aircraft";

const PAGE_NAME = "Non Schedule FHR";

function Field({ label, required, children, hint }) {
  return (
    <Form.Group className="mb-3">
      <Form.Label className="mb-1">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </Form.Label>
      {children}
      {hint ? <small className="text-muted d-block mt-1">{hint}</small> : null}
    </Form.Group>
  );
}

/**
 * Shared create form for Non-Schedule / Add FHR.
 * onCreated({ fhr_id }) after a successful create.
 */
export default function CreateNonScheduleFhr({
  onCreated,
  onCancel,
  compact = false,
}) {
  const toast = useRef(null);
  const { roleId, userId } = useAuth();
  const socket = getSocket();

  const [bootLoading, setBootLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState("");
  const [airports, setAirports] = useState([]);
  const [selectedAirport, setSelectedAirport] = useState("");
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [airlines, setAirlines] = useState([]);
  const [airlineId, setAirlineId] = useState("");
  const [aircrafts, setAircrafts] = useState([]);
  const [selectedAircraft, setSelectedAircraft] = useState("");

  const [dateOfFlight, setDateOfFlight] = useState(new Date());
  const [arrivalFlightNo, setArrivalFlightNo] = useState("");
  const [departureFlightNo, setDepartureFlightNo] = useState("");
  const [fromIata, setFromIata] = useState("");
  const [toIata, setToIata] = useState("");
  const [sta, setSta] = useState(null);
  const [std, setStd] = useState(null);
  const [remarks, setRemarks] = useState("");

  const [addBusinessOpen, setAddBusinessOpen] = useState(false);
  const [addAirportOpen, setAddAirportOpen] = useState(false);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [addAirlineOpen, setAddAirlineOpen] = useState(false);
  const [addAircraftOpen, setAddAircraftOpen] = useState(false);

  const showToast = (severity, summary, detail) => {
    toast.current?.show({ severity, summary, detail, life: 3500 });
  };

  const markPermissionError = (error) => {
    const msg = error?.message || "";
    if (
      msg.includes("Missing role_id") ||
      msg.includes("Page") ||
      msg.includes("Permission denied")
    ) {
      setUnauthorized(true);
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (!socket || !roleId) return undefined;

    const onOk = (data) => {
      setBusinesses(Array.isArray(data) ? data : []);
      setBootLoading(false);
    };
    const onErr = (error) => {
      if (!markPermissionError(error)) {
        setBusinesses([]);
        showToast("warn", "Businesses", error?.message || "Could not load businesses");
      }
      setBootLoading(false);
    };

    socket.emit("fetch-businesses", {
      role_id: roleId,
      page_name: PAGE_NAME,
      user_id: userId,
    });
    socket.on("fetch-businesses-success", onOk);
    socket.on("fetch-businesses-error", onErr);
    return () => {
      socket.off("fetch-businesses-success", onOk);
      socket.off("fetch-businesses-error", onErr);
    };
  }, [socket, roleId, userId]);

  useEffect(() => {
    if (!socket || !roleId || !selectedBusiness) {
      setAirports([]);
      return undefined;
    }
    const onOk = (data) => setAirports(Array.isArray(data) ? data : []);
    const onErr = (error) => {
      if (!markPermissionError(error)) setAirports([]);
    };
    socket.emit("fetch-airports-by-business", {
      role_id: roleId,
      page_name: PAGE_NAME,
      business_id: selectedBusiness,
    });
    socket.on("fetch-airports-by-business-success", onOk);
    socket.on("fetch-airports-by-business-error", onErr);
    return () => {
      socket.off("fetch-airports-by-business-success", onOk);
      socket.off("fetch-airports-by-business-error", onErr);
    };
  }, [socket, roleId, selectedBusiness]);

  useEffect(() => {
    if (!socket || !roleId || !selectedAirport) {
      setClients([]);
      return undefined;
    }
    const onOk = (data) =>
      setClients(
        (Array.isArray(data) ? data : []).map((c) => ({
          name: c.name,
          code: c.client_id,
        }))
      );
    const onErr = (error) => {
      if (!markPermissionError(error)) setClients([]);
    };
    socket.emit("fetch-clients-by-airport", {
      role_id: roleId,
      page_name: PAGE_NAME,
      airport_id: selectedAirport,
    });
    socket.on("fetch-clients-by-airport-success", onOk);
    socket.on("fetch-clients-by-airport-error", onErr);
    return () => {
      socket.off("fetch-clients-by-airport-success", onOk);
      socket.off("fetch-clients-by-airport-error", onErr);
    };
  }, [socket, roleId, selectedAirport]);

  useEffect(() => {
    const hasWalkupName = Boolean(newClientName.trim());
    if (
      !socket ||
      !roleId ||
      !selectedAirport ||
      !selectedBusiness ||
      (!selectedClient && !hasWalkupName)
    ) {
      setAirlines([]);
      return undefined;
    }

    const mapAirlines = (data) =>
      (Array.isArray(data) ? data : []).map((a) => ({
        name: `${a.airline_name} (${a.iata})`,
        code: a.airline_id,
      }));

    if (selectedClient) {
      const onOk = (data) => setAirlines(mapAirlines(data));
      const onErr = (error) => {
        if (!markPermissionError(error)) setAirlines([]);
      };
      socket.emit("fetch-airlines-by-params", {
        role_id: roleId,
        page_name: PAGE_NAME,
        client_id: selectedClient,
        airport_id: selectedAirport,
        business_id: selectedBusiness,
      });
      socket.on("fetch-airlines-by-params-success", onOk);
      socket.on("fetch-airlines-by-params-error", onErr);
      return () => {
        socket.off("fetch-airlines-by-params-success", onOk);
        socket.off("fetch-airlines-by-params-error", onErr);
      };
    }

    const onOk = (data) => setAirlines(mapAirlines(data));
    const onErr = (error) => {
      if (!markPermissionError(error)) setAirlines([]);
    };
    socket.emit("fetch-airlines", { role_id: roleId, page_name: PAGE_NAME });
    socket.on("fetch-airlines-success", onOk);
    socket.on("fetch-airlines-error", onErr);
    return () => {
      socket.off("fetch-airlines-success", onOk);
      socket.off("fetch-airlines-error", onErr);
    };
  }, [
    socket,
    roleId,
    selectedClient,
    newClientName,
    selectedAirport,
    selectedBusiness,
  ]);

  useEffect(() => {
    if (!socket || !roleId || !airlineId) {
      setAircrafts([]);
      return undefined;
    }
    const onOk = (data) =>
      setAircrafts(
        (Array.isArray(data) ? data : []).map((ac) => ({
          name: ac.type_name,
          code: ac.aircraft_id,
        }))
      );
    const onErr = (error) => {
      if (!markPermissionError(error)) setAircrafts([]);
    };
    socket.emit("fetch-aircrafts", {
      role_id: roleId,
      page_name: PAGE_NAME,
      airline_id: airlineId,
    });
    socket.on("fetch-aircrafts-success", onOk);
    socket.on("fetch-aircrafts-error", onErr);
    return () => {
      socket.off("fetch-aircrafts-success", onOk);
      socket.off("fetch-aircrafts-error", onErr);
    };
  }, [socket, roleId, airlineId]);

  const resetFromBusiness = () => {
    setSelectedAirport("");
    setSelectedClient("");
    setNewClientName("");
    setAirlineId("");
    setSelectedAircraft("");
    setAirports([]);
    setClients([]);
    setAirlines([]);
    setAircrafts([]);
  };

  const hasArrival = Boolean(arrivalFlightNo.trim());
  const hasDeparture = Boolean(departureFlightNo.trim());
  const fromOk = !hasArrival || fromIata.trim().length === 3;
  const toOk = !hasDeparture || toIata.trim().length === 3;
  const canSubmit =
    selectedBusiness &&
    selectedAirport &&
    (selectedClient || newClientName.trim()) &&
    airlineId &&
    selectedAircraft &&
    dateOfFlight &&
    (hasArrival || hasDeparture) &&
    fromOk &&
    toOk;

  const handleSubmit = async () => {
    if (!canSubmit) {
      showToast(
        "warn",
        "Missing details",
        hasArrival && !fromOk
          ? "Enter a 3-letter From (IATA) for the arrival flight."
          : hasDeparture && !toOk
            ? "Enter a 3-letter To (IATA) for the departure flight."
            : "Select station details and at least one arrival or departure flight number."
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        business_id: selectedBusiness,
        client_id: selectedClient || null,
        client_name: selectedClient ? null : newClientName.trim() || null,
        airport_id: selectedAirport,
        airline_id: airlineId,
        aircraft_id: selectedAircraft,
        arrival_flight_no: arrivalFlightNo.trim() || null,
        departure_flight_no: departureFlightNo.trim() || null,
        from_iata: fromIata.trim().toUpperCase() || null,
        to_iata: toIata.trim().toUpperCase() || null,
        sta: sta ? new Date(sta).toTimeString().slice(0, 5) : null,
        std: std ? new Date(std).toTimeString().slice(0, 5) : null,
        remarks: remarks.trim(),
        date_of_flight: new Date(dateOfFlight).toLocaleDateString("en-CA"),
      };

      const res = await api.post(`/FHR/generate-single-fhr/${PAGE_NAME}`, payload);
      const fhrId = res?.data?.fhr_id || res?.data?.fhr?.fhr_id || res?.data?.id;
      showToast("success", "FHR created", "Draft Non-Schedule FHR is ready.");
      if (typeof onCreated === "function") {
        onCreated({ fhr_id: fhrId, response: res.data });
      }
    } catch (error) {
      console.error("Generate Single FHR error:", error);
      if (error.response?.status === 403) {
        setUnauthorized(true);
      } else {
        showToast(
          "error",
          "Create failed",
          error.response?.data?.message || error.message || "Could not create FHR"
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (unauthorized) {
    return (
      <Dialog visible style={{ width: "360px" }} closable={false} onHide={() => {}}>
        <div className="text-center">
          <h5>Unauthorized</h5>
          <p>You do not have permission to create a Non-Schedule FHR.</p>
          {onCancel ? (
            <Button label="Close" className="mt-2" onClick={onCancel} />
          ) : null}
        </div>
      </Dialog>
    );
  }

  return (
    <div className={`create-nonschedule-fhr ${compact ? "is-compact" : ""}`}>
      <Toast ref={toast} position="top-right" />

      <Card className="border-0 shadow-sm mb-3">
        <Card.Body>
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h6 className="mb-0">1. Station</h6>
            <small className="text-muted">Handling company → airport → client → aircraft</small>
          </div>
          <Row>
            <Col lg={6} md={6}>
              <Field label="Handling company" required>
                <div className="d-flex gap-2">
                  <Form.Select
                    value={selectedBusiness}
                    disabled={bootLoading}
                    onChange={(e) => {
                      setSelectedBusiness(e.target.value);
                      resetFromBusiness();
                    }}
                  >
                    <option value="">Select handling company</option>
                    {businesses.map((b) => (
                      <option key={b.business_id} value={b.business_id}>
                        {b.name}
                      </option>
                    ))}
                  </Form.Select>
                  <Button
                    type="button"
                    icon="pi pi-plus"
                    outlined
                    severity="secondary"
                    onClick={() => setAddBusinessOpen(true)}
                    aria-label="Add business"
                  />
                </div>
              </Field>
            </Col>
            <Col lg={6} md={6}>
              <Field label="Airport" required>
                <div className="d-flex gap-2">
                  <Form.Select
                    value={selectedAirport}
                    disabled={!selectedBusiness}
                    onChange={(e) => {
                      setSelectedAirport(e.target.value);
                      setSelectedClient("");
                      setAirlineId("");
                      setSelectedAircraft("");
                      setClients([]);
                      setAirlines([]);
                      setAircrafts([]);
                    }}
                  >
                    <option value="">Select airport</option>
                    {airports.map((a) => (
                      <option key={a.airport_id} value={a.airport_id}>
                        {a.name} ({a.iata})
                      </option>
                    ))}
                  </Form.Select>
                  <Button
                    type="button"
                    icon="pi pi-plus"
                    outlined
                    severity="secondary"
                    disabled={!selectedBusiness}
                    onClick={() => setAddAirportOpen(true)}
                    aria-label="Add airport"
                  />
                </div>
              </Field>
            </Col>
            <Col lg={6} md={6}>
              <Field
                label="Client"
                required
                hint="Pick an existing client, or type a new name to auto-create one"
              >
                <div className="d-flex gap-2 mb-2">
                  <Form.Select
                    value={selectedClient}
                    disabled={!selectedAirport}
                    onChange={(e) => {
                      setSelectedClient(e.target.value);
                      if (e.target.value) setNewClientName("");
                      setAirlineId("");
                      setSelectedAircraft("");
                      setAirlines([]);
                      setAircrafts([]);
                    }}
                  >
                    <option value="">Select client</option>
                    {clients.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </Form.Select>
                  <Button
                    type="button"
                    icon="pi pi-plus"
                    outlined
                    severity="secondary"
                    disabled={!selectedAirport}
                    onClick={() => setAddClientOpen(true)}
                    aria-label="Add client"
                  />
                </div>
                <InputText
                  value={newClientName}
                  disabled={!selectedAirport || Boolean(selectedClient)}
                  onChange={(e) => {
                    setNewClientName(e.target.value);
                    if (e.target.value) setSelectedClient("");
                  }}
                  className="w-100"
                  placeholder="Or type new client name (auto-create)"
                />
              </Field>
            </Col>
            <Col lg={6} md={6}>
              <Field label="Airline" required>
                <div className="d-flex gap-2">
                  <Form.Select
                    value={airlineId}
                    disabled={!selectedClient && !newClientName.trim()}
                    onChange={(e) => {
                      setAirlineId(e.target.value);
                      setSelectedAircraft("");
                      setAircrafts([]);
                    }}
                  >
                    <option value="">Select airline</option>
                    {airlines.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.name}
                      </option>
                    ))}
                  </Form.Select>
                  <Button
                    type="button"
                    icon="pi pi-plus"
                    outlined
                    severity="secondary"
                    disabled={!selectedClient && !newClientName.trim()}
                    onClick={() => setAddAirlineOpen(true)}
                    aria-label="Add airline"
                  />
                </div>
              </Field>
            </Col>
            <Col lg={6} md={6}>
              <Field label="Aircraft type" required>
                <div className="d-flex gap-2">
                  <Form.Select
                    value={selectedAircraft}
                    disabled={!airlineId}
                    onChange={(e) => setSelectedAircraft(e.target.value)}
                  >
                    <option value="">Select aircraft</option>
                    {aircrafts.map((ac) => (
                      <option key={ac.code} value={ac.code}>
                        {ac.name}
                      </option>
                    ))}
                  </Form.Select>
                  <Button
                    type="button"
                    icon="pi pi-plus"
                    outlined
                    severity="secondary"
                    disabled={!airlineId}
                    onClick={() => setAddAircraftOpen(true)}
                    aria-label="Add aircraft"
                  />
                </div>
              </Field>
            </Col>
            <Col lg={6} md={6}>
              <Field label="Date of flight" required>
                <Calendar
                  value={dateOfFlight}
                  onChange={(e) => setDateOfFlight(e.value)}
                  dateFormat="dd-mm-yy"
                  className="w-100"
                  showIcon
                />
              </Field>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm mb-3">
        <Card.Body>
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h6 className="mb-0">2. Flight details</h6>
            <small className="text-muted">Enter arrival, departure, or both</small>
          </div>
          <Row>
            <Col lg={4} md={6}>
              <Field label="Arrival flight no.">
                <InputText
                  value={arrivalFlightNo}
                  onChange={(e) => setArrivalFlightNo(e.target.value)}
                  className="w-100"
                  placeholder="e.g. AI123"
                />
              </Field>
            </Col>
            <Col lg={4} md={6}>
              <Field label="From (IATA)" required={hasArrival}>
                <InputText
                  value={fromIata}
                  onChange={(e) => setFromIata(e.target.value.toUpperCase())}
                  className="w-100"
                  maxLength={3}
                  placeholder="DEL"
                />
              </Field>
            </Col>
            <Col lg={4} md={6}>
              <Field label="STA">
                <Calendar
                  value={sta}
                  onChange={(e) => setSta(e.value)}
                  timeOnly
                  hourFormat="24"
                  className="w-100"
                  placeholder="Scheduled arrival"
                />
              </Field>
            </Col>
            <Col lg={4} md={6}>
              <Field label="Departure flight no.">
                <InputText
                  value={departureFlightNo}
                  onChange={(e) => setDepartureFlightNo(e.target.value)}
                  className="w-100"
                  placeholder="e.g. AI124"
                />
              </Field>
            </Col>
            <Col lg={4} md={6}>
              <Field label="To (IATA)" required={hasDeparture}>
                <InputText
                  value={toIata}
                  onChange={(e) => setToIata(e.target.value.toUpperCase())}
                  className="w-100"
                  maxLength={3}
                  placeholder="BOM"
                />
              </Field>
            </Col>
            <Col lg={4} md={6}>
              <Field label="STD">
                <Calendar
                  value={std}
                  onChange={(e) => setStd(e.value)}
                  timeOnly
                  hourFormat="24"
                  className="w-100"
                  placeholder="Scheduled departure"
                />
              </Field>
            </Col>
            <Col lg={12}>
              <Field label="Remarks" hint="Optional notes for ops / billing">
                <InputTextarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                  className="w-100"
                  autoResize
                />
              </Field>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <div className="d-flex flex-wrap gap-2 justify-content-end">
        {onCancel ? (
          <Button
            type="button"
            label="Cancel"
            severity="secondary"
            outlined
            onClick={onCancel}
            disabled={submitting}
          />
        ) : null}
        <Button
          type="button"
          label={submitting ? "Creating…" : "Create draft FHR"}
          icon="pi pi-check"
          className="p-button-success"
          onClick={handleSubmit}
          disabled={submitting || !canSubmit}
          loading={submitting}
        />
      </div>

      <Sidebar
        visible={addBusinessOpen}
        position="right"
        style={{ width: "610px" }}
        onHide={() => setAddBusinessOpen(false)}
        dismissable={false}
      >
        <Add_handling_companies
          onClose={() => setAddBusinessOpen(false)}
          page_name={PAGE_NAME}
        />
      </Sidebar>
      <Sidebar
        visible={addAirportOpen}
        position="right"
        style={{ width: "610px" }}
        onHide={() => setAddAirportOpen(false)}
        dismissable={false}
      >
        <Addairports onClose={() => setAddAirportOpen(false)} page_name={PAGE_NAME} />
      </Sidebar>
      <Sidebar
        visible={addClientOpen}
        position="right"
        style={{ width: "610px" }}
        onHide={() => setAddClientOpen(false)}
        dismissable={false}
      >
        <Addclient onClose={() => setAddClientOpen(false)} page_name={PAGE_NAME} />
      </Sidebar>
      <Sidebar
        visible={addAirlineOpen}
        position="right"
        style={{ width: "450px" }}
        onHide={() => setAddAirlineOpen(false)}
        dismissable={false}
      >
        <AddAirlines onClose={() => setAddAirlineOpen(false)} page_name={PAGE_NAME} />
      </Sidebar>
      <Dialog
        header="Add aircraft type"
        visible={addAircraftOpen}
        style={{ width: "420px" }}
        onHide={() => setAddAircraftOpen(false)}
      >
        <Add_Aircraft
          onClose={() => setAddAircraftOpen(false)}
          airline_id={airlineId}
          page_name={PAGE_NAME}
        />
      </Dialog>
    </div>
  );
}
