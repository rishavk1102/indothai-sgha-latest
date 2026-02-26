import React, { useState, useEffect } from "react";
import { Row, Col, Breadcrumb, Card, Container, Table, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { Carousel } from "primereact/carousel";
import Marquee from "react-fast-marquee";

const ClientDashboard = () => {
  const navigate = useNavigate();
  
   const [airports] = useState([
      {
        image: "https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/kolkata.svg",
        name: "Netaji Subhas Chandra Bose International Airport (CCU)",
        location: "Kolkata"
      },
      {
        image: "https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/Guwahati.svg",
        name: "Lokpriya Gopinath Bordoloi International Airport (GAU)",
        location: "Guwahati"
      },
      {
        image: "https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/Varanasi.svg",
        name: "Lal Bahadur Shastri International Airport (VNS)",
        location: "Varanasi"
      },
      {
        image: "https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/Amritsar.svg",
        name: "Sri Guru Ram Das Ji International Airport (ATQ)",
        location: "Amritsar"
      },
      {
        image: "https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/jaipur.svg",
        name: "Jaipur International Airport (JAI)",
        location: "Jaipur"
      },
      {
        image: "https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/calicut.svg",
        name: "Calicat International Airport (CCJ)",
        location: "Calicat"
      },
      {
        image: "https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/Bhubanaeshwar.svg",
        name: "Biju Patnaik Airport (BBI)",
        location: "Bhubanaeshwar"
      },
      {
        image: "https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/Gaya.svg",
        name: "Gaya International Airport (GAY)",
        location: "Gaya"
      },
      
      {
        image: "https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/Pune.svg",
        name: "Pune International Airport (PNQ)",
        location: "Pune"
      }
    ]);
  
    const [chunkedItems, setChunkedItems] = useState([]);

  // 🔹 Responsive chunking logic
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      let chunkSize = 6;

      if (width <= 640) {
        chunkSize = 1; // mobile small
      } else if (width <= 768) {
        chunkSize = 2; // tablet
      } else {
        chunkSize = 6; // desktop
      }

      const chunks = [];
      for (let i = 0; i < airports.length; i += chunkSize) {
        chunks.push(airports.slice(i, i + chunkSize));
      }
      setChunkedItems(chunks);
    };

    handleResize(); // run at mount
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [airports]);

  const itemTemplate = (group) => {
    return (
      <Row className="mx-0">
        {group.map((airport, index) => (
          <Col
            lg={4}
            md={4}
            sm={6}
            xs={12}
            key={index}
            className="mb-3 px-2"
          >
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
  };
  return (
    <>
      <Row className="mx-0 mb-3">
        <Col md={12} lg={6}>
          <Breadcrumb>
            <Breadcrumb.Item active>Dashboard</Breadcrumb.Item>
          </Breadcrumb>
        </Col>
      </Row>
      <Row className="mx-0 airportcar">
        <Carousel
          value={chunkedItems}
          itemTemplate={itemTemplate}
          numVisible={1}   // show 1 "page" (8 items grid)
          numScroll={1}    // scroll 1 "page" at a time
          circular={false}
          showIndicators={false}
          showNavigators={true}
        />
      </Row>
      <Row className="mx-0" style={{ padding: '0 20px 0 47px'}}>
        <h6 className="pt-4 mb-4">Airlines</h6>
        <Marquee
          speed={40}             // speed in px/s
          delay={0}              // delay before animation starts
          loop={0}               // 0 = infinite, or any number of times
          gradient={true}        // enable gradient fade
          gradientColor={[248, 251, 253]} // gradient rgb
          gradientWidth={50}
          pauseOnHover={true}
        >
          <ul className="marqgroup">
            <li><img src="https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/air12.png" alt="Airlines" /></li>
            <li><img src="https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/air11.png" alt="Airlines" /></li>
            <li><img src="https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/air10.png" alt="Airlines" /></li>
            <li><img src="https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/air9.png" alt="Airlines" /></li>
            <li><img src="https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/air8.png" alt="Airlines" /></li>
            <li><img src="https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/air7.png" alt="Airlines" /></li>
            <li><img src="https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/air6.png" alt="Airlines" /></li>
            <li><img src="https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/air5.png" alt="Airlines" /></li>
            <li><img src="https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/air3.png" alt="Airlines" /></li>
            <li><img src="https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/air2.png" alt="Airlines" /></li>
            <li><img src="https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/air1.png" alt="Airlines" /></li>
          </ul>
        </Marquee>
        <Marquee
          speed={40}             // speed in px/s
          delay={0}              // delay before animation starts
          loop={0}               // 0 = infinite, or any number of times
          gradient={true}        // enable gradient fade
          gradientColor={[248, 251, 253]} // gradient rgb
          gradientWidth={50}
          pauseOnHover={true}
          direction="right"
          className="mt-3"
        >
          <ul className="marqgroup">
             <li><img src="https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/air1.png" alt="Airlines" /></li>
            <li><img src="https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/air2.png" alt="Airlines" /></li>
            <li><img src="https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/air3.png" alt="Airlines" /></li>
            <li><img src="https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/air5.png" alt="Airlines" /></li>
            <li><img src="https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/air6.png" alt="Airlines" /></li>
            <li><img src="https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/air7.png" alt="Airlines" /></li>
            <li><img src="https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/air8.png" alt="Airlines" /></li>
            <li><img src="https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/air9.png" alt="Airlines" /></li>
            <li><img src="https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/air10.png" alt="Airlines" /></li>
            <li><img src="https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/air11.png" alt="Airlines" /></li>
            <li><img src="https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/air12.png" alt="Airlines" /></li>
          </ul>
        </Marquee>
      </Row>
    </>
  )
}

export default ClientDashboard