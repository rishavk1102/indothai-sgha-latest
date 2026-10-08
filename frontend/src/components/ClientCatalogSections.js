import { useCallback, useEffect, useState } from "react";
import { Card, Col, Row } from "react-bootstrap";
import { Button } from "primereact/button";
import { MdFlight } from "react-icons/md";
import { fetchAircraftTypes, fetchServices } from "../api/clientCatalog";

function useCatalog(loader) {
  const [status, setStatus] = useState("loading");
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setStatus("loading");
    setError("");
    try {
      const next = await loader();
      setItems(Array.isArray(next) ? next : []);
      setStatus("ready");
    } catch (err) {
      const signedOut = err.response?.status === 403;
      setItems([]);
      setError(
        signedOut
          ? "Sign in again to view this list."
          : "Could not load this list. Try again.",
      );
      setStatus("error");
    }
  }, [loader]);

  useEffect(() => {
    load();
  }, [load]);

  return { status, items, error, reload: load };
}

function CatalogState({ status, error, empty, isEmpty, onRetry, children }) {
  if (status === "loading") {
    return (
      <p className="client-catalog-state" role="status">
        <i className="pi pi-spin pi-spinner me-2" aria-hidden="true" />
        Loading...
      </p>
    );
  }

  if (status === "error") {
    return (
      <div className="client-catalog-state" role="alert">
        <p className="mb-2">{error}</p>
        <Button
          label="Try again"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          onClick={onRetry}
        />
      </div>
    );
  }

  if (isEmpty) {
    return <p className="client-catalog-state">{empty}</p>;
  }

  return children;
}

function AircraftCard({ aircraft }) {
  const airline = [aircraft.airline_name, aircraft.airline_iata]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card className="client-catalog-card h-100">
      <Card.Body>
        <span className="client-catalog-icon" aria-hidden="true">
          <MdFlight />
        </span>
        <h6>{aircraft.type_name}</h6>
        <p>{aircraft.category_name || "No category"}</p>
        <ul className="client-catalog-meta">
          {airline ? <li>{airline}</li> : null}
          {aircraft.currency ? <li>Currency {aircraft.currency}</li> : null}
          {aircraft.AAI_levy != null ? <li>AAI levy {aircraft.AAI_levy}%</li> : null}
        </ul>
      </Card.Body>
    </Card>
  );
}

function ServiceCard({ service }) {
  const initial = (service.name || "?").trim().charAt(0).toUpperCase();
  return (
    <Card className="client-catalog-card h-100">
      <Card.Body>
        <span className="client-catalog-icon" aria-hidden="true">
          {initial}
        </span>
        <h6>{service.name}</h6>
        <p>{service.description || "No description"}</p>
      </Card.Body>
    </Card>
  );
}

const ClientCatalogSections = () => {
  const aircraft = useCatalog(fetchAircraftTypes);
  const services = useCatalog(fetchServices);

  return (
    <div className="client-catalog">
      <section className="mb-4" aria-labelledby="client-aircraft-types">
        <div className="client-catalog-heading">
          <h5 id="client-aircraft-types">Aircraft types</h5>
          <p>Types used for handling charges, from the same records as the admin aircraft list.</p>
        </div>
        <CatalogState
          status={aircraft.status}
          error={aircraft.error}
          empty="No aircraft types have been added yet."
          isEmpty={aircraft.items.length === 0}
          onRetry={aircraft.reload}
        >
          <Row className="g-3">
            {aircraft.items.map((item) => (
              <Col key={item.aircraft_id} xs={12} sm={6} lg={4}>
                <AircraftCard aircraft={item} />
              </Col>
            ))}
          </Row>
        </CatalogState>
      </section>

      <section className="mb-4" aria-labelledby="client-services">
        <div className="client-catalog-heading">
          <h5 id="client-services">Services</h5>
          <p>Service categories maintained in the admin panel, including name and description.</p>
        </div>
        <CatalogState
          status={services.status}
          error={services.error}
          empty="No services have been added yet."
          isEmpty={services.items.length === 0}
          onRetry={services.reload}
        >
          <Row className="g-3">
            {services.items.map((item) => (
              <Col key={item.category_id} xs={12} sm={6} lg={4}>
                <ServiceCard service={item} />
              </Col>
            ))}
          </Row>
        </CatalogState>
      </section>
    </div>
  );
};

export default ClientCatalogSections;
