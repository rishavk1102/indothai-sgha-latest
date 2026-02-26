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
import Addclient from '../../components/Addclient.js';
import { Dialog } from 'primereact/dialog';
import { Calendar } from 'primereact/calendar';
import { getSocket } from '../../context/socket';
import GifLoder from '../../interfaces/GifLoder';
import api from '../../api/axios';
import { useDebounce } from 'use-debounce'; // First, install it via npm
import { useAuth } from "../../context/AuthContext.js";
import EditClient from "../../components/EditClient.js";
const Clients = () => {
  const { role, roleId, userId } = useAuth(); // Get roleId from the context
  const PAGE_NAME = "Clients"; // Page name for permission checking
  const [visibleRight, setVisibleRight] = useState(false);
  const [loading, setLoading] = useState(true);  // Block UI until all fetches succeed
  const [unauthorized, setUnauthorized] = useState(false); // Show Dialog if error
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [sortOrder, setSortOrder] = useState('ASC');
  const [perPage, setPerPage] = useState(15);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch] = useDebounce(searchValue, 500); // 500ms debounce
  const [clients, setClients] = useState([]);
  const [selectedClientData, setSelectedClientData] = useState(null);
  const [visibleRight2, setVisibleRight2] = useState(false);
  const navigate = useNavigate();
  const goBack = () => {
    navigate(-1); // This will take the user back to the previous page in history
  };
  const socket = getSocket();
  const [fileName, setFileName] = useState('');
  const [date, setDate] = useState('');
  const [visible, setVisible] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFileName(e.target.files[0].name);
    }
  };


  const fetchClients = () => {
    if (!socket) return;

    setLoading(true);
    socket.emit('view-clients', {
      role_id: roleId,
      page_name: PAGE_NAME,
      sortOrder,
      limit: perPage,
      searchTerm: debouncedSearch,
      business_id: selectedBusiness || undefined
    });
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


  useEffect(() => {
    fetchClients();
  }, [socket, roleId, debouncedSearch, sortOrder, perPage, selectedBusiness, userId]);

  useEffect(() => {
    if (!socket) return;

    const handleClientUpdate = () => {
      fetchClients();
    };

    socket.on('clients-updated', handleClientUpdate);

    return () => {
      socket.off('clients-updated', handleClientUpdate);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    socket.on('view-clients-success', (data) => {
      setClients(data);
      setLoading(false);
    });

    socket.on('view-clients-error', (error) => {
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
      socket.off('view-clients-success');
      socket.off('view-clients-error');
    };
  }, [socket]);

  const handleDuplicate = async (Client_id) => {
    setLoading(true);
    try {
      const res = await api.post(`/clients/duplicate_client/${Client_id}/${PAGE_NAME}`);
      if (res.status === 201) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Duplicate client error:', error);
      if (error.response?.status === 403) {
        setUnauthorized(true);
      }
    }
    finally {
      setLoading(false);
    }
  };


  const handleDelete = async (Client_id) => {
    setLoading(true);
    try {
      const res = await api.delete(`/clients/delete_client/${Client_id}/${PAGE_NAME}`);
      if (res.status === 20) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Duplicate client error:', error);
      if (error.response?.status === 403) {
        setUnauthorized(true);
      }
    }
    finally {
      setLoading(false);
    }
  };



  const handleDialogHide = () => navigate(-1);

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
            <Breadcrumb.Item active>Clients</Breadcrumb.Item>
          </Breadcrumb>
        </Col>
        <Col md={12} lg={6} className="text-end">
          <Button
            label="Add New"
            icon="pi pi-plus"
            severity="help"
            className="py-1"
            onClick={() => setVisibleRight(true)}
          />
          <Button
            label="Upload CSV"
            icon="pi pi-file-excel"
            severity="success"
            className="py-1 ms-2"
            onClick={() => setVisible(true)}
            outlined
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
                    <th>Operator</th>
                    <th>POC</th>
                    <th>State/Country</th>
                    <th className="text-center" style={{ width: '100px' }}>Airport</th>
                    <th className="text-center" style={{ width: '100px' }}>Airlines</th>
                    <th className="text-center" style={{ width: '160px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map(client => (
                    <tr key={client.client_id}>
                      <td data-label="Name">
                        <div className="d-flex align-items-center gap-2">
                          <Avatar label={client.name[0]} className="me-2" style={{ backgroundColor: '#843889', color: '#ffffff' }} shape="circle" />
                          <span className="d-flex flex-column gap-1">
                            <b>{client.name}</b>
                            <small><i className="pi pi-envelope"></i> {client.email}</small>
                            <small><i className="pi pi-phone"></i> {client.phone}</small>
                          </span>
                        </div>
                      </td>
                      <td data-label="Operator">{client.operator}</td>
                      <td data-label="POC">{client.contact_person}</td>
                      <td data-label="State/Country">{client.state}/{client.country}</td>
                      <td data-label="Airport" className="text-center">
                        <b className="text-info">{client.airport?.iata}</b>
                      </td>
                      <td data-label="Airlines" className="text-center">
                        <span
                          onClick={() => navigate('/dashboard/airlines')}
                          style={{ cursor: 'pointer' }}
                        >
                          <Badge value={client.airlines?.length || 0} severity="warning"></Badge>
                        </span>
                      </td>

                      <td className="text-center">
                        <Button
                          tooltip="Edit"
                          icon="pi pi-pencil"
                          severity="info"
                          className="p-0 border-0"
                          tooltipOptions={{ position: "top" }}
                          style={{ width: '30px' }}
                          text
                          onClick={() => {
                            setSelectedClientData(client); // Set data for editing
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
                          onClick={() => handleDuplicate(client.client_id)}
                        />
                        <Button
                          tooltip="Delete"
                          icon="pi pi-trash"
                          severity="danger"
                          className="p-0 border-0"
                          tooltipOptions={{ position: "top" }}
                          style={{ width: '30px' }}
                          text
                          onClick={() => handleDelete(client.client_id)}
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
        <Addclient onClose={() => setVisibleRight(false)} page_name={PAGE_NAME} />
      </Sidebar>

      <Sidebar visible={visibleRight2} position="right" style={{ width: '610px' }} onHide={() => setVisibleRight2(false)} dismissable={false}>
        <EditClient onClose={() => setVisibleRight2(false)} clientData={selectedClientData} page_name={PAGE_NAME} />
      </Sidebar>


      <Dialog visible={visible} style={{ width: '1152px' }} onHide={() => { if (!visible) return; setVisible(false); }} className="csvdilog">
        <Row className="mx-0 justify-content-between align-items-center">
          <Col md={6} lg={6} className="ltpart">
            <h6> Excel File Upload Instructions</h6>
            <ul>
              <li>
                Start by downloading the Excel File for CCU (👈 Click to download) of your current airport. You can change the airport by selecting it from the navigation bar drop-down list, which will only display airports assigned to you.
              </li>
              <li>
                The Excel file consists of multiple sheets, each dedicated to different airlines. Fill in the aircraft details in the respective sheets for each airline, following the format outlined in the NOTES section of the sample Excel file.
              </li>
              <li>
                Thoroughly read the NOTES in the Sample Excel file to ensure accurate data entry.
              </li>
              <li>
                Ensure that you only input data in the designated table columns of the Excel file, as all other cells are locked. This precaution is taken to avoid extracting unnecessary values when the system processes the data from the Excel file.
              </li>
              <li>
                Input arrival and departure flight information in the Excel file following the specified format in the NOTES section.
              </li>
              <li>
                Once you've completed the data entry, upload the Excel file here. Additionally, set the With Effect To Date (WET) and click on the upload button.
              </li>
              <li>
                Wait until the file status is updated to completed. The FHR generation will occur in the background, allowing you to navigate to other pages as needed.
              </li>
              <li>Congratulations! The FHRs are now ready, and you can view them in FHR draft page.</li>
            </ul>
          </Col>
          <Col md={6} lg={6} className="rtpart overflow-hidden px-5">
            <div className="ignore-container">
              <Form.Group controlId="fileupload" className="file-upload">
                <div className="file-wrap">
                  <Form.Control
                    type="file"
                    name="upload"
                    className="d-none"
                    onChange={handleFileChange}
                  />
                  <div
                    className="custom-upload-design"
                    onClick={() => document.getElementById("fileupload").click()}
                  >
                    <div className="upload-icon">
                      <Image
                        src="https://static-00.iconduck.com/assets.00/upload-icon-512x512-xrbu24a4.png"
                        alt="Upload Icon"
                        fluid
                      />
                    </div>
                    <div className="upload-text">
                      Upload excel file
                    </div>
                  </div>
                </div>

                {fileName && (
                  <div className="mt-2 text-success">
                    <strong>Selected File:</strong> {fileName}
                  </div>
                )}

                <div className="mt-4">
                  <label className="d-block mb-3">With Effect To Date</label>
                  <InputGroup className="mb-3">
                    <Form.Control
                      placeholder="DD/MM/YYYY"
                      type="date"
                      name="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </InputGroup>
                </div>

                <div className="d-flex justify-content-end">
                  <Button
                    label="Upload"
                    icon="pi pi-upload"
                    severity="warning"
                    className="py-2 mt-3"
                    onClick={() => setVisible(true)}
                  />
                </div>
              </Form.Group>
            </div>
          </Col>
        </Row>
      </Dialog>
    </>
  );
};

export default Clients;