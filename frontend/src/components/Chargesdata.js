import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Table, Form, Card } from 'react-bootstrap';
import { Button } from "primereact/button";
import { Sidebar } from 'primereact/sidebar';
import Addcharge from '../components/Addcharge.js';
import { getSocket } from "../context/socket.js";
import GifLoder from '../interfaces/GifLoder';
import { useAuth } from "../context/AuthContext.js";
import { useDebounce } from 'use-debounce'; // If not already imported
import { Dialog } from "primereact/dialog";
import { InputIcon } from "primereact/inputicon";
import { IconField } from "primereact/iconfield";
import { InputText } from "primereact/inputtext";
import api from "../api/axios.js";
import EditCharge from "./EditCharge.js";
const Chargesdata = ({ aircraft_data, onClose, page_name }) => {
  const { role, roleId } = useAuth(); // Get roleId from the context
  const socket = getSocket();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);  // Block UI until all fetches succeed
  const [unauthorized, setUnauthorized] = useState(false); // Show Dialog if error
  const [charges, setCharges] = useState([]);
  const [sortOrder, setSortOrder] = useState('ASC');
  const [perPage, setPerPage] = useState(15);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch] = useDebounce(searchValue, 500); // 500ms debounce
  const [visibleRight2, setVisibleRight2] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState(null);
  const goBack = () => {
    navigate(-1); // This will take the user back to the previous page in history
  };
  const [visibleRight, setVisibleRight] = useState(false);
  const handleDialogHide = () => {
    setUnauthorized(false);
    onClose();
  };

  useEffect(() => {
    if (!socket || !aircraft_data?.aircraft_id) return;

    setLoading(true);
    socket.emit('view-aircraft-charges', {
      role_id: roleId,
      page_name,
      sortOrder,
      limit: perPage,
      searchTerm: debouncedSearch,
      aircraft_id: aircraft_data.aircraft_id
    });

    const handleSuccess = (data) => {
      setCharges(data);
      setLoading(false);
    };

    const handleError = (error) => {
      const isPermissionError =
        error.message?.includes('Missing role_id') ||
        error.message?.includes('Page') ||
        error.message?.includes('Permission denied');

      if (isPermissionError) {
        setUnauthorized(true);
      } else {
        setCharges([]);
        console.warn('Aircraft charges fetch error:', error.message);
      }

      setLoading(false);
    };

    const refetchOnUpdate = () => {
      socket.emit('view-aircraft-charges', {
        role_id: roleId,
        page_name,
        sortOrder,
        limit: perPage,
        searchTerm: debouncedSearch,
        aircraft_id: aircraft_data.aircraft_id
      });
    };

    socket.on('view-aircraft-charges-success', handleSuccess);
    socket.on('view-aircraft-charges-error', handleError);
    socket.on('AircraftChargesUpdated', refetchOnUpdate);

    return () => {
      socket.off('view-aircraft-charges-success', handleSuccess);
      socket.off('view-aircraft-charges-error', handleError);
      socket.off('AircraftChargesUpdated', refetchOnUpdate);
    };
  }, [socket, aircraft_data?.aircraft_id, debouncedSearch, sortOrder, perPage, roleId]);



  const handleDuplicate = async (charges_id) => {
    setLoading(true);
    try {
      const res = await api.post(`/charge-types/duplicate_charge/${charges_id}/${page_name}`);
      if (res.status === 201) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Duplicate charge error:', error);
      if (error.response?.status === 403) {
        setUnauthorized(true);
      }
    }
    finally {
      setLoading(false);
    }
  };


  const handleDelete = async (charges_id) => {
    setLoading(true);
    try {
      const res = await api.delete(`/charge-types/delete_charge/${charges_id}/${page_name}`);
      if (res.status === 200) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Duplicate charge error:', error);
      if (error.response?.status === 403) {
        setUnauthorized(true);
      }
    }
    finally {
      setLoading(false);
    }
  };

  const getCurrencySymbol = (code) => {
    const symbols = {
      INR: '₹',
      USD: '$',
      EUR: '€',
      GBP: '£',
      AED: 'د.إ',
      // Add more as needed
    };
    return symbols[code] || code || '';
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
    <>
      <Row className="mx-0 py-3 border-bottom mb-4">
        <Col md={8} lg={8} className="px-1 d-flex align-items-center justify-content-start gap-5">
          <h4 className="text-black mb-0">{aircraft_data?.type_name}</h4>
          <p className="m-0">
            <small className="me-2">Currency : </small>
            <span className="text-black"><b>{aircraft_data?.currency}</b></span>
          </p>
          <p className="m-0">
            <small className="me-2">AAI Levy (in %) :</small>
            <span className="text-black"><b>{aircraft_data?.AAI_levy}</b></span>
          </p>
        </Col>
        <Col md={4} lg={4} className="px-1 text-end">
          <Button
            label="New Charges"
            icon="pi pi-plus"
            severity="help"
            className="py-2"
            style={{ fontSize: '14px' }}
            onClick={() => setVisibleRight(true)}
          />
        </Col>
      </Row>
      <Row>
        <Col md={12} lg={12} className="airportDet">
          <div className="d-flex align-items-center gap-1 justify-content-end filterDiv mb-2">
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
        </Col>
      </Row>
      <Table bordered hover>
        <thead>
          <tr className="table-info">
            <th>Charge Type</th>
            <th>Service</th>
            <th>Unit</th>
            <th>Included Count</th>
            <th>Rate ({aircraft_data?.currency}) <small className="d-block">Incl. AAI Levy</small></th>
            <th>Overflow Rate ({aircraft_data?.currency}) <small className="d-block">Incl. AAI Levy</small></th>
            <th style={{ width: '150px' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {charges.length > 0 ? charges.map((charge) => (
            <tr key={charge.charges_id}>
              <td>
                <span className="d-flex align-items-center gap-2">
                  <span className="text-secondary">
                    {charge.chargeType?.name}</span>
                  <span className="text-black">{charge.category?.name}</span>

                </span></td>
              <td>{charge.service}</td>
              <td>{charge.unit}</td>
              <td>{charge.count}</td>
              <td>
                {charge.rate_type === 'Percentage'
                  ? `${(charge.total_rate || 0).toFixed(2)} % of ${charge.ReferencedChargeType?.name || ''}`
                  : `${getCurrencySymbol(aircraft_data?.currency)} ${(charge.total_rate || 0).toFixed(2)}`}
              </td>

              <td>
                {charge.rate_type === 'Percentage'
                  ? `${(charge.total_of_rate || 0).toFixed(2)} % of ${charge.ReferencedChargeType?.name || ''}`
                  : `${getCurrencySymbol(aircraft_data?.currency)} ${(charge.total_of_rate || 0).toFixed(2)}`}
              </td>

              <td>
                <Button
                  tooltip="Edit"
                  icon="pi pi-pencil"
                  severity="info"
                  className="p-0 border-0"
                  tooltipOptions={{ position: "top" }}
                  style={{ width: '30px' }}
                  text
                  onClick={() => {
                    setSelectedCharge(charge);     // ✅ save selected charge in state
                    setVisibleRight2(true);
                  }}
                />
                <Button
                  tooltip="Duplicate"
                  icon="pi pi-copy"
                  severity="warning"
                  className="p-0 border-0"
                  style={{ width: '30px' }}
                  text
                  tooltipOptions={{ position: "top" }}
                  onClick={() => handleDuplicate(charge.charges_id)} />
                <Button
                  tooltip="Delete"
                  icon="pi pi-trash"
                  severity="danger"
                  className="p-0 border-0"
                  tooltipOptions={{ position: "top" }}
                  style={{ width: '30px' }}
                  text
                  onClick={() => handleDelete(charge.charges_id)}
                />
              </td>
            </tr>
          )) : (
            <tr><td colSpan="7" className="text-center">No charges found.</td></tr>
          )}
        </tbody>
      </Table>
      <Sidebar visible={visibleRight} style={{ width: '25vw' }} position="right" onHide={() => setVisibleRight(false)}>
        <Addcharge aircraft_data={aircraft_data} onClose={() => setVisibleRight(false)} page_name={page_name} />
      </Sidebar>

      <Sidebar visible={visibleRight2} style={{ width: '25vw' }} position="right" onHide={() => {
        setVisibleRight2(false);
        setSelectedCharge(null); // ✅ Clear the selected charge
      }}>
        <EditCharge aircraft_data={aircraft_data} onClose={() => {
          setVisibleRight2(false);
          setSelectedCharge(null); // ✅ Also clear here in case of manual close from EditCharge
        }}
          chargeData={selectedCharge}   // ✅ passed here
          page_name={page_name} />
      </Sidebar>

    </>
  );
};

export default Chargesdata;