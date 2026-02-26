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
import { PiBuildingOfficeFill } from "react-icons/pi";
import { Avatar } from 'primereact/avatar';
import { Sidebar } from 'primereact/sidebar';
import Add_handling_companies from '../../components/Add_handling_companies.js';
import { Tooltip } from 'primereact/tooltip';
import { Link } from 'react-router-dom';
import { getSocket } from '../../context/socket';
import GifLoder from '../../interfaces/GifLoder';
import api from '../../api/axios';
import { Dialog } from "primereact/dialog";
import { useDebounce } from 'use-debounce'; // First, install it via npm
import { useAuth } from "../../context/AuthContext.js";
import Edit_handling_companies from "../../components/Edit_handling_companies.js";
const Headquarters = () => {
  const { role, roleId } = useAuth(); // Get roleId from the context
  const PAGE_NAME = "Headquarters"; // Page name for permission checking
  const socket = getSocket();
  const [loading, setLoading] = useState(true);  // Block UI until all fetches succeed
  const [unauthorized, setUnauthorized] = useState(false); // Show Dialog if error
  const [businesses, setBusinesses] = useState([]);
  const [sortOrder, setSortOrder] = useState('ASC');
  const [perPage, setPerPage] = useState(15);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch] = useDebounce(searchValue, 500); // 500ms debounce
  const navigate = useNavigate();
  const goBack = () => {
    navigate(-1); // This will take the user back to the previous page in history
  };
  const [visibleRight, setVisibleRight] = useState(false);
  const [visibleRight2, setVisibleRight2] = useState(false);
  const [selectedBusinessData, setSelectedBusinessData] = useState(null);
  useEffect(() => {
    if (!socket) return;

    const payload = {
      role_id: roleId,
      page_name: PAGE_NAME,
      sortOrder,
      limit: perPage,
      searchTerm: debouncedSearch.trim(),
    };

    const fetchBusinesses = () => {
      socket.emit('view-businesses', payload);
    };

    const handleSuccess = (data) => {
      setBusinesses(data);
      setLoading(false);
    };

    const handleError = (error) => {
      console.error('Business fetch error:', error.message);

      // Only set unauthorized if the error is from permission middleware
      const isPermissionError =
        error.message?.includes('Missing role_id') ||
        error.message?.includes('Page') ||
        error.message?.includes('Permission denied');

      if (isPermissionError) {
        setUnauthorized(true);
      } else {
        setBusinesses([]); // ❗ Optional: clear or preserve data
        console.warn('Server error, not unauthorized:', error.message);
      }

      setLoading(false);
    };

    // Initial fetch
    setLoading(true);
    fetchBusinesses();

    // Listen for results
    socket.on('view-businesses-success', handleSuccess);
    socket.on('view-businesses-error', handleError);

    // Listen for broadcast updates
    socket.on('businesses-updated', fetchBusinesses);

    return () => {
      socket.off('view-businesses-success', handleSuccess);
      socket.off('view-businesses-error', handleError);
      socket.off('businesses-updated', fetchBusinesses);
    };
  }, [socket, roleId, sortOrder, perPage, debouncedSearch]);


  const handleDuplicate = async (business_id) => {
    setLoading(true);
    try {
      const res = await api.post(`/business/duplicate_business/${business_id}/${PAGE_NAME}`);
      if (res.status === 201) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Duplicate business error:', error);
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

      <Row>
        <Col md={12} lg={6}>
          <Breadcrumb>
            <Breadcrumb.Item onClick={goBack}>
              <IoChevronBackOutline /> Back
            </Breadcrumb.Item>
            <Breadcrumb.Item active>Handling Companies</Breadcrumb.Item>
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
              <Table responsive hover>
                <thead>
                  <tr className="table-primary">
                    <th>Name</th>
                    <th>PoC</th>
                    <th>Email</th>
                    <th>Ph. No.</th>
                    <th>City, State</th>
                    <th style={{ width: '120px' }}>Airports</th>
                    <th style={{ width: '120px' }}>Clients</th>
                    <th style={{ width: '120px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {businesses.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center">No businesses found.</td>
                    </tr>
                  ) : (
                    businesses.map((business) => (
                      <tr key={business.business_id}>
                        <td data-label="Name">
                          <div className="d-flex align-items-center gap-2">
                            <Avatar className="me-2" style={{ backgroundColor: 'rgb(197 197 197 / 27%)', color: 'rgb(146 74 151)' }} shape="circle">
                              <PiBuildingOfficeFill />
                            </Avatar>
                            <span className="d-flex flex-column gap-1"><b>{business.name}</b></span>
                          </div>
                        </td>
                        <td data-label="PoC">{business.contact_person}</td>
                        <td data-label="Email">{business.email}</td>
                        <td data-label="Ph. No.">{business.phone}</td>
                        <td data-label="City, State">{`${business.city}, ${business.state}`}</td>
                        <td data-label="Airports">
                          <span
                            onClick={() => navigate('/dashboard/airports')}
                            style={{ cursor: 'pointer' }}
                          >
                            <Badge value={business.airports?.length || 0} severity="warning" className="custom-tooltip-btn"></Badge>
                          </span>
                        </td>
                        <td data-label="Clients">  <span
                          onClick={() => navigate('/dashboard/clients')}
                          style={{ cursor: 'pointer' }}
                        ><Badge value={business.clients?.length || 0} severity="info"></Badge> </span></td>
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
                              setSelectedBusinessData(business); // Set data for editing
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
                            onClick={() => handleDuplicate(business.business_id)}
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
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>


      <Sidebar visible={visibleRight} position="right" style={{ width: '610px' }} onHide={() => setVisibleRight(false)} dismissable={false}>
        <Add_handling_companies onClose={() => setVisibleRight(false)} page_name={PAGE_NAME} />
      </Sidebar>

      <Sidebar
        visible={visibleRight2}
        position="right"
        style={{ width: '610px' }}
        onHide={() => {
          setVisibleRight2(false);
          setSelectedBusinessData(null); // Clear on close
        }}
        dismissable={false}
      >
        <Edit_handling_companies
          onClose={() => {
            setVisibleRight2(false);
            setSelectedBusinessData(null);
          }}
          page_name={PAGE_NAME}
          businessData={selectedBusinessData} // ✅ pass business to edit
        />
      </Sidebar>

    </>
  );
};

export default Headquarters;