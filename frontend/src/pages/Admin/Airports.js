import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from '../../components/Layout';
import { Row, Col, Breadcrumb, Form, Card, Table, Image, InputGroup } from 'react-bootstrap';
import { IoChevronBackOutline } from "react-icons/io5";
import { Button } from 'primereact/button';
import { InputIcon } from "primereact/inputicon";
import { IconField } from "primereact/iconfield";
import { InputText } from "primereact/inputtext";
import { Avatar } from 'primereact/avatar';
import { Badge } from 'primereact/badge';
import { Sidebar } from 'primereact/sidebar';
import Addairports from '../../components/Addairports.js';
import { Dialog } from 'primereact/dialog';
import { Calendar } from 'primereact/calendar';
import { MdFlight } from "react-icons/md";
import { getSocket } from '../../context/socket';
import GifLoder from '../../interfaces/GifLoder';
import { useDebounce } from 'use-debounce'; // First, install it via npm
import { useAuth } from "../../context/AuthContext.js";
import api from "../../api/axios.js";
import EditAirport from "../../components/EditAirport.js";
const Airports = () => {
  const [visibleRight, setVisibleRight] = useState(false);
  const navigate = useNavigate();

  const { role, roleId, userId } = useAuth(); // Get roleId from the context
  const PAGE_NAME = "Airports"; // Page name for permission checking
  const socket = getSocket();
  const [loading, setLoading] = useState(true);  // Block UI until all fetches succeed
  const [unauthorized, setUnauthorized] = useState(false); // Show Dialog if error
  const [airports, setAirports] = useState([]);
  const [sortOrder, setSortOrder] = useState('ASC');
  const [perPage, setPerPage] = useState(15);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch] = useDebounce(searchValue, 500); // 500ms debounce
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [visibleRight2, setVisibleRight2] = useState(false);
  const [selectedAirportData, setSelectedAirportData] = useState(null);

  const goBack = () => {
    navigate(-1); // This will take the user back to the previous page in history
  };

  useEffect(() => {
    if (!socket) return;

    socket.emit('fetch-businesses', {
      role_id: roleId,
      page_name: PAGE_NAME,
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
  }, [socket]);

  const fetchAirports = () => {
    if (!socket) return;

    setLoading(true);

    socket.emit('view-airports', {
      role_id: roleId,
      page_name: PAGE_NAME,
      sortOrder,
      limit: perPage,
      searchTerm: debouncedSearch,
      business_id: selectedBusiness || undefined
    });
  };

  useEffect(() => {
    fetchAirports();

    socket.on('view-airports-success', (data) => {
      setAirports(data);
      setLoading(false);
    });

    socket.on('view-airports-error', (error) => {
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
      socket.off('view-airports-success');
      socket.off('view-airports-error');
    };
  }, [socket, sortOrder, perPage, debouncedSearch, selectedBusiness]);


  useEffect(() => {
    if (!socket) return;

    socket.on('airports-updated', () => {
      fetchAirports(); // 👈 trigger a refresh when socket says airports updated
    });

    return () => {
      socket.off('airports-updated');
    };
  }, [socket, sortOrder, perPage, debouncedSearch, selectedBusiness]);




  const handleDialogHide = () => navigate(-1);


  const handleDuplicate = async (airport_id) => {
    setLoading(true);
    try {
      const res = await api.post(`/airports/duplicate_airport/${airport_id}/${PAGE_NAME}`);
      if (res.status === 201) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Duplicate airport error:', error);
      if (error.response?.status === 403) {
        setUnauthorized(true);
      }
    }
    finally {
      setLoading(false);
    }
  };


  const handleDeleteAirport = async (airport_id) => {
    setLoading(true);
    try {
      const res = await api.delete(`/airports/delete_airport/${airport_id}/${PAGE_NAME}`);
      if (res.status === 20) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Duplicate airport error:', error);
      if (error.response?.status === 403) {
        setUnauthorized(true);
      }
    }
    finally {
      setLoading(false);
    }
  };




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

  if (loading) {
    return <div className='loderDiv'><GifLoder /></div>;
  }




  return (
    <>

      <Row className="mx-0">
        <Col md={12} lg={6}>
          <Breadcrumb>
            <Breadcrumb.Item onClick={goBack}>
              <IoChevronBackOutline /> Back
            </Breadcrumb.Item>
            <Breadcrumb.Item active>Airports</Breadcrumb.Item>
          </Breadcrumb>
        </Col>
        <Col md={12} lg={6} className="text-end">
          <Button
            label="Airport"
            icon="pi pi-plus"
            severity="help"
            className="py-1"
            onClick={() => setVisibleRight(true)}
          />
        </Col>
      </Row>
      <Row className="mx-0 mt-3">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="pt-3 pb-2 border-0 bg-transparent">
              <div className="d-flex align-items-center gap-1 justify-content-end filterDiv">
                <label className="me-2">Sort By</label>
                <Form.Select
                  aria-label="Sort Order"
                  style={{ width: '100px' }}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                >
                  <option value="ASC">ASC</option>
                  <option value="DESC">DESC</option>
                </Form.Select>
                <Form.Select
                  aria-label="Limit"
                  style={{ width: '100px' }}
                  value={perPage}
                  onChange={(e) => setPerPage(Number(e.target.value))}
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </Form.Select>
                <IconField iconPosition="left">
                  <InputIcon className="pi pi-search" />
                  <InputText
                    placeholder="Search"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                  />
                </IconField>
                <Form.Select
                  aria-label="Business Filter"
                  style={{ width: '340px' }}
                  value={selectedBusiness}
                  onChange={(e) => setSelectedBusiness(e.target.value)}
                >
                  <option value="">Filter By Handling Company</option>
                  {businesses.map((b) => (
                    <option key={b.business_id} value={b.business_id}>
                      {b.name}
                    </option>
                  ))}
                </Form.Select>

              </div>
            </Card.Header>
            <Card.Body>
              <Table responsive hover className="clTable">
                <thead>
                  <tr className="table-primary">
                    <th style={{ width: '280px' }}>Name</th>
                    <th>Handling Companies</th>
                    <th>IATA / ICAO</th>
                    <th>City, State</th>
                    <th className="text-center" style={{ width: '100px' }}>Clients</th>
                    <th className="text-center" style={{ width: '100px' }}>Airlines</th>
                    <th className="text-center" style={{ width: '160px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {airports.map((airport) => (
                    <tr key={airport.airport_id}>
                      <td data-label="Name">
                        <div className="d-flex align-items-center justify-content-lg-start justify-content-end gap-2">
                          {/* <Avatar className="me-2" style={{ backgroundColor: 'rgb(197 197 197 / 27%)', color: 'rgb(146 74 151)' }} shape="circle">
                            <MdFlight />
                          </Avatar> */}
                          <img
                            src={airport.icon}
                            alt={airport.name}
                            style={{ width: '50px', height: '50px', borderRadius: "5px", objectFit: "contain", background: '#f3f3f3' }}
                          />
                          <span>
                            <b>{airport.name}</b>
                          </span>
                        </div>
                      </td>
                      <td data-label="Handling Companies">{airport.business?.name}</td>
                      <td data-label="IATA / ICAO">{airport.iata} / {airport.icao}</td>
                      <td data-label="City, State">{airport.city}, {airport.state}</td>
                      <td data-label="Clients" className="text-lg-center text-end">
                        <span
                          onClick={() => navigate('/dashboard/clients')}
                          style={{ cursor: 'pointer' }}
                        >
                          <Badge value={airport.clients?.length || 0} severity="info" />
                        </span>
                      </td>

                      <td data-label="Airlines" className="text-lg-center text-end">
                        <span
                          onClick={() => navigate('/dashboard/airlines')}
                          style={{ cursor: 'pointer' }}
                        >
                          <Badge value={airport.airlines?.length || 0} severity="warning" />
                        </span>
                      </td>
                      <td data-label="Action" className="text-lg-center text-end">
                        <Button
                          tooltip="Edit"
                          icon="pi pi-pencil"
                          severity="info"
                          className="p-0 border-0"
                          tooltipOptions={{ position: "top" }}
                          style={{ width: '30px' }}
                          text
                          onClick={() => {
                            setSelectedAirportData(airport); // Set data for editing
                            setVisibleRight2(true);            // Open the sidebar
                          }}
                        />
                        <Button
                          tooltip="Duplicate"
                          icon="pi pi-copy"
                          severity="warning"
                          className="p-0 border-0"
                          tooltipOptions={{ position: "top" }}
                          style={{ width: '30px' }}
                          text
                          onClick={() => handleDuplicate(airport.airport_id)}
                        />
                        <Button
                          tooltip="Delete"
                          icon="pi pi-trash"
                          severity="danger"
                          className="p-0 border-0"
                          tooltipOptions={{ position: "top" }}
                          style={{ width: '30px' }}
                          text
                          onClick={() => handleDeleteAirport(airport.airport_id)} // ✅ Pass the airport ID
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Sidebar visible={visibleRight} position="right" style={{ width: '610px' }} onHide={() => setVisibleRight(false)} dismissable={false}>
        <Addairports onClose={() => setVisibleRight(false)} page_name={PAGE_NAME} />
      </Sidebar>
      <Sidebar
        visible={visibleRight2}
        position="right"
        style={{ width: '610px' }}
        onHide={() => {
          setVisibleRight2(false);
          setSelectedAirportData(null); // Clear on close
        }}
        dismissable={false}
      >
        <EditAirport
          onClose={() => {
            setVisibleRight2(false);
            setSelectedAirportData(null);
          }}
          page_name={PAGE_NAME}
          airportdata={selectedAirportData} // ✅ pass business to edit
        />
      </Sidebar>

    </>
  );
};

export default Airports;