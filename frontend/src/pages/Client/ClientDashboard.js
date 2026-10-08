import React, { useEffect, useState } from "react";
import { Row, Col, Card } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Carousel } from "primereact/carousel";
import Marquee from "react-fast-marquee";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import ClientCatalogSections from "../../components/ClientCatalogSections";
import {
  CLIENT_ROUTES,
  getDraftContinuePath,
  getSelectedAirportLabel,
  hasClientDraft,
  isClientWizardComplete,
  loadClientDraft,
  clearClientDraft,
} from "../../utils/clientWorkspace";

const MARKETING_AIRPORTS = [
  {
    image: "https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/kolkata.svg",
    name: "Netaji Subhas Chandra Bose International Airport (CCU)",
    location: "Kolkata",
  },
  {
    image: "https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/Guwahati.svg",
    name: "Lokpriya Gopinath Bordoloi International Airport (GAU)",
    location: "Guwahati",
  },
  {
    image: "https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/Varanasi.svg",
    name: "Lal Bahadur Shastri International Airport (VNS)",
    location: "Varanasi",
  },
  {
    image: "https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/Amritsar.svg",
    name: "Sri Guru Ram Das Ji International Airport (ATQ)",
    location: "Amritsar",
  },
  {
    image: "https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/jaipur.svg",
    name: "Jaipur International Airport (JAI)",
    location: "Jaipur",
  },
  {
    image: "https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/calicut.svg",
    name: "Calicut International Airport (CCJ)",
    location: "Calicut",
  },
  {
    image: "https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/Bhubanaeshwar.svg",
    name: "Biju Patnaik Airport (BBI)",
    location: "Bhubaneswar",
  },
  {
    image: "https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/Gaya.svg",
    name: "Gaya International Airport (GAY)",
    location: "Gaya",
  },
  {
    image: "https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/Pune.svg",
    name: "Pune International Airport (PNQ)",
    location: "Pune",
  },
];

const ClientDashboard = () => {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [draft, setDraft] = useState(null);
  const [submissionTotal, setSubmissionTotal] = useState(null);
  const [chunkedItems, setChunkedItems] = useState([]);

  useEffect(() => {
    setDraft(loadClientDraft());
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchCounts = async () => {
      try {
        const response = await api.get("/api/client/annex-a-submissions-list", {
          params: {
            status: "Pending",
            sortBy: "DESC",
            limit: 1,
            client_registration_id: userId,
          },
        });
        const counts = response.data?.counts;
        if (counts && typeof counts === "object") {
          const total = Object.values(counts).reduce(
            (sum, value) => sum + (Number(value) || 0),
            0,
          );
          setSubmissionTotal(total);
        }
      } catch (error) {
        setSubmissionTotal(null);
      }
    };

    fetchCounts();
  }, [userId]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      let chunkSize = 6;
      if (width <= 640) chunkSize = 1;
      else if (width <= 768) chunkSize = 2;

      const chunks = [];
      for (let i = 0; i < MARKETING_AIRPORTS.length; i += chunkSize) {
        chunks.push(MARKETING_AIRPORTS.slice(i, i + chunkSize));
      }
      setChunkedItems(chunks);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const draftExists = hasClientDraft(draft);
  const draftComplete = isClientWizardComplete(draft);
  const draftAirport = draftExists ? getSelectedAirportLabel(draft.selectedCities) : "";

  const startNewSgha = () => {
    clearClientDraft({ clearAnnexA: true });
    navigate(CLIENT_ROUTES.newSgha, { state: { startFresh: true } });
  };

  const continueDraft = () => {
    navigate(getDraftContinuePath(draft));
  };

  const itemTemplate = (group) => (
    <Row className="mx-0">
      {group.map((airport, index) => (
        <Col lg={4} md={4} sm={6} xs={12} key={index} className="mb-3 px-2">
          <Card className="h-100">
            <Card.Body className="text-center">
              <img
                src={airport.image}
                alt={airport.name}
                className="mb-3"
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "5px",
                  objectFit: "contain",
                }}
              />
              <h6>{airport.location}</h6>
              <p className="mb-0">
                <small>{airport.name}</small>
              </p>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  );

  return (
    <>
      <div className="client-hub-hero">
        <h2>Client Workspace</h2>
        <p>
          Start a new agreement, pick up an unfinished draft, or check the status,
          comments, and PDF of what you have already submitted.
        </p>
      </div>

      <Row className="mx-0 g-3">
        <Col md={12} lg={4} className="mb-3">
          <Card className="client-hub-card">
            <Card.Body>
              <span className="client-hub-icon">
                <i className="pi pi-plus" />
              </span>
              <h5>Start a new SGHA</h5>
              <p>Choose an airport and company details, then complete Main Agreement, Annex A, and Annex B.</p>
              <Button
                label="New SGHA"
                icon="pi pi-arrow-right"
                iconPos="right"
                className="py-2"
                severity="warning"
                onClick={startNewSgha}
              />
            </Card.Body>
          </Card>
        </Col>

        <Col md={12} lg={4} className="mb-3">
          <Card className="client-hub-card">
            <Card.Body>
              <span className="client-hub-icon">
                <i className="pi pi-replay" />
              </span>
              <h5>Continue unfinished work</h5>
              {draftExists ? (
                <>
                  <p>
                    You have a draft{draftAirport ? ` for ${draftAirport}` : ""}.
                    {draftComplete
                      ? " You can pick up in the agreement."
                      : " You can pick up in the New SGHA wizard."}
                  </p>
                  <Button
                    label="Continue draft"
                    icon="pi pi-arrow-right"
                    iconPos="right"
                    className="py-2"
                    severity="warning"
                    onClick={continueDraft}
                  />
                </>
              ) : (
                <>
                  <p>No unfinished draft is saved in this browser session. Start a new SGHA when you are ready.</p>
                  <Button
                    label="Go to New SGHA"
                    icon="pi pi-arrow-right"
                    iconPos="right"
                    className="py-2"
                    severity="secondary"
                    outlined
                    onClick={() => navigate(CLIENT_ROUTES.newSgha)}
                  />
                </>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={12} lg={4} className="mb-3">
          <Card className="client-hub-card">
            <Card.Body>
              <span className="client-hub-icon">
                <i className="pi pi-inbox" />
              </span>
              <h5>My submissions</h5>
              <p>
                Check status, comments, and PDFs.
              </p>
              <Button
                label="View submissions"
                icon="pi pi-arrow-right"
                iconPos="right"
                className="py-2"
                severity="warning"
                onClick={() => navigate(CLIENT_ROUTES.submissions)}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <div className="mb-4">
        <Button
          label="Agreements sent to me"
          icon="pi pi-file"
          className="p-0"
          text
          severity="secondary"
          onClick={() => navigate(CLIENT_ROUTES.agreements)}
        />
      </div>

      <ClientCatalogSections />

      <div className="client-hub-secondary">
        <h6 className="mb-3">Airports we serve</h6>
        <Row className="mx-0 airportcar">
          <Carousel
            value={chunkedItems}
            itemTemplate={itemTemplate}
            numVisible={1}
            numScroll={1}
            circular={false}
            showIndicators={false}
            showNavigators={true}
          />
        </Row>
        <h6 className="pt-4 mb-4">Airlines</h6>
        <Marquee
          speed={40}
          delay={0}
          loop={0}
          gradient={true}
          gradientColor={[248, 251, 253]}
          gradientWidth={50}
          pauseOnHover={true}
        >
          <ul className="marqgroup">
            {[12, 11, 10, 9, 8, 7, 6, 5, 3, 2, 1].map((n) => (
              <li key={`air-a-${n}`}>
                <img
                  src={`https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/air${n}.png`}
                  alt=""
                />
              </li>
            ))}
          </ul>
        </Marquee>
        <Marquee
          speed={40}
          delay={0}
          loop={0}
          gradient={true}
          gradientColor={[248, 251, 253]}
          gradientWidth={50}
          pauseOnHover={true}
          direction="right"
          className="mt-3"
        >
          <ul className="marqgroup">
            {[1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
              <li key={`air-b-${n}`}>
                <img
                  src={`https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/air${n}.png`}
                  alt=""
                />
              </li>
            ))}
          </ul>
        </Marquee>
      </div>
    </>
  );
};

export default ClientDashboard;
