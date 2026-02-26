import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from '../../components/Layout';
import { Row, Col, Breadcrumb, Form, Card, Table } from 'react-bootstrap';
import { IoChevronBackOutline } from "react-icons/io5";
import { Button } from 'primereact/button';
import { InputIcon } from "primereact/inputicon";
import { IconField } from "primereact/iconfield";
import { InputText } from "primereact/inputtext";
import { Badge } from 'primereact/badge';
import { MdFlight } from "react-icons/md";
import { Avatar } from 'primereact/avatar';
import { Sidebar } from 'primereact/sidebar';
import { Tooltip } from 'primereact/tooltip';
import { Link } from 'react-router-dom';
import AddAirlines from "../../components/AddAirlines";
import { getSocket } from '../../context/socket';
import GifLoder from '../../interfaces/GifLoder';
import { useDebounce } from 'use-debounce'; // First, install it via npm
import { useAuth } from "../../context/AuthContext.js";
import api from "../../api/axios.js";
import { Dialog } from "primereact/dialog";
import Edit_Airlines from "../../components/Edit_Airlines.js";
const Airlines = () => {
  const [visibleRight, setVisibleRight] = useState(false);
  const navigate = useNavigate();

  const { role, roleId, userId } = useAuth(); // Get roleId from the context
  const PAGE_NAME = "Airlines"; // Page name for permission checking
  const socket = getSocket();
  const [loading, setLoading] = useState(true);  // Block UI until all fetches succeed
  const [unauthorized, setUnauthorized] = useState(false); // Show Dialog if error
  const [airports, setAirports] = useState([]);
  const [sortOrder, setSortOrder] = useState('ASC');
  const [perPage, setPerPage] = useState(15);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch] = useDebounce(searchValue, 500); // 500ms debounce
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [visibleRight2, setVisibleRight2] = useState(false);
  const [selectedAirport, setSelectedAirport] = useState('');
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [airlines, setAirlines] = useState([]);
  const [selectedAirlineData, setSelectedAirlineData] = useState(null);
  const goBack = () => {
    navigate(-1); // This will take the user back to the previous page in history
  };

  useEffect(() => {
    if (socket) {
      socket.emit("fetch-airports", { role_id: roleId, page_name: PAGE_NAME, user_id: userId });

      socket.on("fetch-airports-success", (data) => {
        const formatted = data.map((a) => ({ name: `${a.name} (${a.iata})`, code: a.airport_id }));
        setAirports(formatted);
      });

      socket.on("fetch-airports-error", (error) => {
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
        socket.off("fetch-airports-success");
        socket.off("fetch-airports-error");
      };
    }
  }, [socket]);

  useEffect(() => {
    if (selectedAirport && socket) {
      socket.emit('fetch-clients-by-airport', {
        role_id: roleId,
        page_name: PAGE_NAME,
        airport_id: selectedAirport
      });

      socket.on('fetch-clients-by-airport-success', (data) => {
        const formatted = data.map(c => ({ name: c.name, code: c.client_id }));
        setClients(formatted);
      });

      socket.on('fetch-clients-by-airport-error', (error) => {
        const isPermissionError =
          error.message?.includes('Missing role_id') ||
          error.message?.includes('Page') ||
          error.message?.includes('Permission denied');

        if (isPermissionError) {
          setUnauthorized(true);
        } else {
          setClients([]);
          console.warn('Airport fetch error:', error.message);
        }

        setLoading(false);
      });


      return () => {
        socket.off('fetch-clients-by-airport-success');
        socket.off('fetch-clients-by-airport-error');
      };
    }
  }, [selectedAirport]);



  useEffect(() => {
    if (socket) {
      const fetchAirlines = () => {
        setLoading(true);
        socket.emit('view-airlines', {
          role_id: roleId,
          page_name: PAGE_NAME,
          sortOrder,
          limit: perPage,
          searchTerm: debouncedSearch,
          airport_id: selectedAirport || null,
          client_id: selectedClient || null
        });
      };

      fetchAirlines(); // initial fetch

      socket.on('view-airlines-success', (data) => {
        setAirlines(data);
        setLoading(false);
      });

      socket.on('view-airlines-error', (error) => {
        const isPermissionError =
          error.message?.includes('Missing role_id') ||
          error.message?.includes('Page') ||
          error.message?.includes('Permission denied');

        if (isPermissionError) {
          setUnauthorized(true);
        } else {
          setAirlines([]);
          console.warn('Airline fetch error:', error.message);
        }

        setLoading(false);
      });

      // 🔁 Re-fetch when backend emits 'airlines-updated'
      socket.on('airlines-updated', fetchAirlines);

      return () => {
        socket.off('view-airlines-success');
        socket.off('view-airlines-error');
        socket.off('airlines-updated', fetchAirlines);
      };
    }
  }, [socket, sortOrder, perPage, debouncedSearch, selectedAirport, selectedClient, roleId]);


  const handleDialogHide = () => navigate(-1);


  const handleDuplicate = async (airline_id) => {
    setLoading(true);
    try {
      const res = await api.post(`/airlines/duplicate_airline/${airline_id}/${PAGE_NAME}`);
      if (res.status === 201) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Duplicate airline error:', error);
      if (error.response?.status === 403) {
        setUnauthorized(true);
      }
    }
    finally {
      setLoading(false);
    }
  };


  const handleDeleteAirport = async (airline_id) => {
    setLoading(true);
    try {
      const res = await api.delete(`/airlines/delete_airline/${airline_id}/${PAGE_NAME}`);
      if (res.status === 200) {
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
            className="py-2 mt-3"
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

      <Row>
        <Col md={12} lg={6}>
          <Breadcrumb>
            <Breadcrumb.Item onClick={goBack}>
              <IoChevronBackOutline /> Back
            </Breadcrumb.Item>
            <Breadcrumb.Item active>Airlines</Breadcrumb.Item>
          </Breadcrumb>
        </Col>
        <Col md={12} lg={6} className="text-end">
          <Button
            label="Add New"
            icon="pi pi-plus"
            severity="help"
            className="py-2"
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

                <Form.Select
                  aria-label="Airport Filter"
                  style={{ width: '250px' }}
                  value={selectedAirport}
                  onChange={(e) => setSelectedAirport(e.target.value)}
                >
                  <option value="">-- Filter By Airport --</option>
                  {airports.map(airport => (
                    <option key={airport.code} value={airport.code}>
                      {airport.name}
                    </option>
                  ))}
                </Form.Select>

                <Form.Select
                  aria-label="Client Filter"
                  style={{ width: '250px' }}
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                >
                  <option value="">-- Filter By Client --</option>
                  {clients.map(client => (
                    <option key={client.code} value={client.code}>
                      {client.name}
                    </option>
                  ))}
                </Form.Select>
                <IconField iconPosition="left">
                  <InputIcon className="pi pi-search" />
                  <InputText
                    placeholder="Search"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                  />
                </IconField>
              </div>
            </Card.Header>
            <Card.Body>
              <div className="table-responsive">
                <Table bordered hover>
                  <thead>
                    <tr className="table-primary">
                      <th style={{ width: '300px' }}>Airline Name</th>
                      <th>IATA</th>
                      <th style={{ width: '120px' }}>ICAO</th>
                      <th style={{ width: '120px' }}>Type</th>
                      <th>Client</th>
                      <th style={{ width: '120px' }}>Airport</th>
                      <th>Aircraft Type</th>
                      <th style={{ width: '160px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {airlines.map((airline, index) => (
                      <tr key={index}>
                        <td data-label="Airline Name">
                          <div className="d-flex align-items-center gap-2">
                            <Avatar
                              className="me-2"
                              style={{ backgroundColor: 'rgb(197 197 197 / 27%)', color: 'rgb(146 74 151)' }}
                              shape="circle"
                            >
                              <MdFlight />
                            </Avatar>
                            <span className="d-flex flex-column gap-1">
                              <b>{airline.airline_name}</b>
                            </span>
                          </div>
                        </td>
                        <td>{airline.iata || '-'}</td>
                        <td>{airline.icao || '-'}</td>
                        <td>{airline.airline_type}</td>
                        <td><Link to="#">{airline.client?.name || '-'}</Link></td>
                        <td><Link to="#">{airline.airport?.iata || '-'}</Link></td>
                        <td><Link to={`/dashboard/aircraft-types/${airline.airline_id}`}>View Aircraft Types</Link></td>
                        <td data-label="Action">
                          <Button
                            tooltip="Edit"
                            icon="pi pi-pencil"
                            severity="info"
                            className="p-0 border-0"
                            tooltipOptions={{ position: "top" }}
                            style={{ width: '30px' }}
                            text
                            onClick={() => {
                              setSelectedAirlineData(airline); // Set data for editing
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
                            onClick={() => handleDuplicate(airline.airline_id)}
                          />
                          <Button
                            tooltip="View"
                            icon="pi pi-eye"
                            severity="help"
                            className="p-0 border-0"
                            tooltipOptions={{ position: "top" }}
                            style={{ width: '30px' }}
                            text
                          />
                          <Button
                            tooltip="Delete"
                            icon="pi pi-trash"
                            severity="danger"
                            className="p-0 border-0"
                            tooltipOptions={{ position: "top" }}
                            style={{ width: '30px' }}
                            text
                            onClick={() => handleDeleteAirport(airline.airline_id)} // ✅ Pass the airport ID
                          />


                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>


      <Sidebar visible={visibleRight} position="right" style={{ width: '450px' }} onHide={() => setVisibleRight(false)} dismissable={false}>
        <AddAirlines onClose={() => setVisibleRight(false)} page_name={PAGE_NAME} />
      </Sidebar>


      <Sidebar visible={visibleRight2} position="right" style={{ width: '450px' }} onHide={() => setVisibleRight2(false)} dismissable={false}>
        <Edit_Airlines onClose={() => setVisibleRight2(false)} page_name={PAGE_NAME} airlineData={selectedAirlineData} />
      </Sidebar>


    </>
  );
};

export default Airlines;