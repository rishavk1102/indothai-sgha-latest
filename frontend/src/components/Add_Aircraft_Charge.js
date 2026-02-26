import React, { useEffect, useState } from "react";
import { Row, Col, Breadcrumb, Form, Label, Card } from "react-bootstrap";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import api from '../api/axios';
import GifLoder from '../interfaces/GifLoder';
import { Dialog } from 'primereact/dialog';
import { useDebounce } from 'use-debounce'; // First, install it via npm
import { getSocket } from "../context/socket";
import { useAuth } from "../context/AuthContext";
import { AutoComplete } from "primereact/autocomplete";

const Add_Aircraft_Charge = ({ onClose, page_name }) => {
  const socket = getSocket();
  const { userId, roleId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [airports, setAirports] = useState([]);
  const [selectedAirport, setSelectedAirport] = useState('');
  const handleDialogHide = () => {
    setUnauthorized(false);
    onClose();
  };

  // ✅ form fields
  const [serviceName, setServiceName] = useState("");
  const [remarks, setRemarks] = useState("");
  const [unit, setUnit] = useState("");
  const [rateInr, setRateInr] = useState("");
  const [rateUsd, setRateUsd] = useState("");
  const [chargeType, setChargeType] = useState("Domestic"); // default




  useEffect(() => {
    if (!socket) return;

    socket.emit('fetch-businesses', {
      role_id: roleId,
      page_name,
      user_id: userId
    });

    socket.on('fetch-businesses-success', (data) => {
      setBusinesses(data);
    });

    socket.on('fetch-businesses-error', (error) => {
      const isPermissionError =
        error.message?.includes('Missing role_id') ||
        error.message?.includes('Page') ||
        error.message?.includes('Permission denied');

      if (isPermissionError) {
        setUnauthorized(true);
      } else {
        setBusinesses([]);
        console.warn('Business fetch error:', error.message);
      }
    });

    return () => {
      socket.off('fetch-businesses-success');
      socket.off('fetch-businesses-error');
    };
  }, [socket, userId, roleId, page_name]);

  useEffect(() => {
    if (!socket || !selectedBusiness) return; // ✅ only run when we have businessId

    socket.emit("fetch-airports-by-business", {
      role_id: roleId,
      page_name,
      business_id: selectedBusiness
    });

    socket.on("fetch-airports-by-business-success", (data) => {
      const formatted = data.map((a) => ({
        name: `${a.name} (${a.iata})`,
        code: a.airport_id
      }));
      setAirports(formatted);
    });

    socket.on("fetch-airports-by-business-error", (error) => {
      const isPermissionError =
        error.message?.includes('Missing role_id') ||
        error.message?.includes('Page') ||
        error.message?.includes('Permission denied');

      if (isPermissionError) {
        setUnauthorized(true);
      } else {
        setAirports([]);
        console.warn('Airport fetch error:', error.message);
      }

      setLoading(false);
    });

    return () => {
      socket.off("fetch-airports-by-business-success");
      socket.off("fetch-airports-by-business-error");
    };
  }, [socket, roleId, selectedBusiness, page_name]);


  // 🔹 Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post(`/additional_charge/add_additional_charge/${page_name}`, {
        Business_id: selectedBusiness,
        Airport_id: selectedAirport,
        Service_name: serviceName,
        Remarks: remarks,
        unit_or_measure: unit,
        rate_inr: rateInr,
        rate_usd: rateUsd,
        Charge_type: chargeType,
      });

      if (res.status === 201) {
        onClose();
      }
    } catch (error) {
      console.error('Add Additional Charge Error:', error);
      if (error.res?.status === 403) {
        setUnauthorized(true);
      }
    } finally {
      setLoading(false);
    }
  };




  // Unauthorized UI
  if (unauthorized) {
    return (
      <Dialog
        style={{ width: '360px' }}
        visible={unauthorized}
        onHide={handleDialogHide}
        closable={false}
        dismissableMask={false}
      >
        <div className="text-center">
          <img src="https://blackboxstorage.blr1.cdn.digitaloceanspaces.com/assetImages/protect.png" alt="symbol" width="100" className="mb-3" />
          <h5>Unauthorized</h5>
          <p>You are not authorized</p>
          <Button
            label="Go Back"
            icon="pi pi-arrow-left"
            className="py-2 mt-3 text-white"
            style={{ fontSize: '14px' }}
            severity='danger'
            onClick={handleDialogHide}
          />
        </div>
      </Dialog>
    );
  }

  // Loading UI
  if (loading) {
    return <div className='loderDiv'><GifLoder /></div>;
  }


  return (
    <Card className="border-0 shadow-0 pt-3">
      <Card.Header className="bg-white border-0 shadow-0">
        <h5>Add Additional Charge</h5>
      </Card.Header>
      <Card.Body className="p-0 pt-3">
        <Form onSubmit={handleSubmit}>
          <Row className="mb-3">
            <Col>
              <Form.Label>Handling Company</Form.Label>
              <Form.Select
                value={selectedBusiness}
                onChange={(e) => setSelectedBusiness(e.target.value)}
                required
              >
                <option value="">Select Business</option>
                {businesses.map((b) => (
                  <option key={b.business_id} value={b.business_id}>
                    {b.name}
                  </option>
                ))}
              </Form.Select>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col>
              <Form.Label>Airport</Form.Label>
              <Form.Select
                value={selectedAirport}
                onChange={(e) => setSelectedAirport(e.target.value)}
                required
              >
                <option value="">Select Airport</option>
                {airports.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.name}
                  </option>
                ))}
              </Form.Select>
            </Col>
          </Row>
          <Row className="mb-3">
            <Col>
              <Form.Label>Charge Type</Form.Label>
              <Form.Select
                value={chargeType}
                onChange={(e) => setChargeType(e.target.value)}
              >
                <option value="Domestic">Domestic</option>
                <option value="International">International</option>
              </Form.Select>
            </Col>
          </Row>
          <Row className="mb-3">
            <Col>
              <Form.Label>Service Name</Form.Label>
              <Form.Control
                type="text"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                required
              />
            </Col>
          </Row>

          <Row className="mb-3">
            <Col>
              <Form.Label>Remarks</Form.Label>
              <Form.Control
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </Col>
          </Row>

          <Row className="mb-3">
            <Col>
              <Form.Label>Unit/Measure</Form.Label>
              <Form.Control
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </Col>
            <Col>
              <Form.Label>Rate (INR)</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                min="0"
                value={rateInr}
                onChange={(e) => setRateInr(e.target.value)}
                required
              />
            </Col>
            <Col>
              <Form.Label>Rate (USD)</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                min="0"
                value={rateUsd}
                onChange={(e) => setRateUsd(e.target.value)}
              />
            </Col>
          </Row>




          <div className="text-end">
            <Button
              label="Cancel"
              className="me-2 py-2"
              severity="secondary"
              onClick={onClose}
            />
            <Button label="Save" className="py-2" type="submit" severity="success" />
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default Add_Aircraft_Charge;