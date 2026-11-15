import React, { useEffect, useState } from "react";
import { Row, Col, Card, Form, Table } from 'react-bootstrap';
import { InputTextarea } from "primereact/inputtextarea";
import { Calendar } from 'primereact/calendar';
import { Button } from 'primereact/button';
import { getSocket } from "../../context/socket";
import GifLoder from '../../interfaces/GifLoder';
import { useDebounce } from 'use-debounce'; // First, install it via npm
import { Dialog } from "primereact/dialog";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { ProgressSpinner } from 'primereact/progressspinner';
import { Avatar } from 'primereact/avatar';
import { AvatarGroup } from 'primereact/avatargroup';
import nouser from '../../assets/images/no_user.png';
import { useParams, useNavigate } from "react-router-dom";
const Additional_equipment_details = ({ userId, fhr_id, page_name, aircraft_id }) => {

  const socket = getSocket();
  const navigate = useNavigate();
  const { roleId } = useAuth();

  const getLS = (key) => {
    const value = localStorage.getItem(`${page_name}_additional_${key}`);
    return value ? JSON.parse(value) : '';
  };


  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [categories, setCategories] = useState([]);
  const [charges, setCharges] = useState([]);
  const [chargeDetails, setChargeDetails] = useState(getLS('equipment_details') || {});
  const [selectedCatagory, setSelectedCatagory] = useState(getLS('selected_category'));
  const [lastEditedBy, setLastEditedBy] = useState(null);
  const [activeEditors, setActiveEditors] = useState([]);
  const [editMode, setEditMode] = useState(false);

  const isDisabled = !editMode;

  const calculateTotalTime = (slots) => {
    let totalMinutes = 0;
    slots.forEach(slot => {
      if (slot.start && slot.end) {
        const start = new Date(slot.start);
        const end = new Date(slot.end);
        const diff = (end - start) / 60000;
        if (diff > 0) totalMinutes += diff;
      }
    });
    return Math.round(totalMinutes);
  };

  const updateChargeSlots = (charges_id, updatedSlots) => {
    const totalTime = calculateTotalTime(updatedSlots);
    const totalUsed = updatedSlots.length;
    setChargeDetails(prev => {
      const updated = {
        ...prev,
        [charges_id]: {
          ...prev[charges_id],
          timeSlots: updatedSlots,
          totalTime,
          totalUsed
        }
      };
      localStorage.setItem(`${page_name}_additional_equipment_details`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleChargeChange = (charges_id, field, value) => {
    setChargeDetails(prev => {
      const updated = {
        ...prev,
        [charges_id]: {
          ...prev[charges_id],
          [field]: value
        }
      };
      localStorage.setItem(`${page_name}_additional_equipment_details`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleSlotChange = (charges_id, index, slotField, value) => {
    const prevSlots = chargeDetails[charges_id]?.timeSlots || [{ start: null, end: null }];
    const updatedSlots = [...prevSlots];
    updatedSlots[index][slotField] = value;
    updateChargeSlots(charges_id, updatedSlots);
  };

  const addTimeSlot = (charges_id) => {
    const prevSlots = chargeDetails[charges_id]?.timeSlots || [{ start: null, end: null }];
    const updatedSlots = [...prevSlots, { start: null, end: null }];
    updateChargeSlots(charges_id, updatedSlots);
  };

  const deleteSlot = (charges_id, index) => {
    const prevSlots = chargeDetails[charges_id]?.timeSlots || [];
    if (prevSlots.length === 1) return;
    const updatedSlots = [...prevSlots];
    updatedSlots.splice(index, 1);
    updateChargeSlots(charges_id, updatedSlots);
  };

  const handleEditToggle = async () => {
    setLoading(true); // Show spinner while action happens

    try {
      const action = editMode ? 'end' : 'start';

      const response = await api.post(`/edit_fhr/start-edit-session/${page_name}/${fhr_id}`, {
        section: 'Additional_Equipment',
        action
      });

      if (action === 'start' && response.data?.session) {
        setEditMode(true); // Enable form
      } else if (action === 'end') {
        setEditMode(false); // Disable form
      } else {
        console.warn("Edit session action response invalid");
      }
    } catch (err) {
      console.error(`Failed to ${editMode ? 'end' : 'start'} edit session:`, err);
      if (err.response?.status === 403) {
        setUnauthorized(true);
      }
    } finally {
      setLoading(false); // Always stop spinner
    }
  };


  useEffect(() => {
    if (!socket || !fhr_id) return;

    const fetchAdditionalEquipmentEditors = () => {
      socket.emit('fetch-additional-equipment-editors', {
        role_id: roleId,
        page_name,
        fhr_id,
      });
    };

    const handleSuccess = (data) => {
      setLastEditedBy(data.last_edited_by || null);
      setActiveEditors(data.active_editors || []);
      setLoading(false);
    };

    const handleError = (error) => {
      const isPermissionError =
        error.message?.includes("Missing role_id") ||
        error.message?.includes("Page") ||
        error.message?.includes("Permission denied");

      if (isPermissionError) {
        setUnauthorized(true);
      } else {
        console.warn("Additional Equipment editor fetch error:", error.message);
      }

      setLoading(false);
    };

    const handleFhrUpdated = (payload) => {
      if (String(payload?.fhr_id) === String(fhr_id)) {
        fetchAdditionalEquipmentEditors();
      }
    };

    // Initial fetch
    fetchAdditionalEquipmentEditors();

    // Register listeners
    socket.on('fetch-additional-equipment-editors-success', handleSuccess);
    socket.on('fetch-additional-equipment-editors-error', handleError);
    socket.on('fhrUpdated', handleFhrUpdated);

    return () => {
      socket.off('fetch-additional-equipment-editors-success', handleSuccess);
      socket.off('fetch-additional-equipment-editors-error', handleError);
      socket.off('fhrUpdated', handleFhrUpdated);
    };
  }, [socket, roleId, fhr_id, page_name]);





  useEffect(() => {
    if (!socket) return;

    socket.emit('fetch-categories', { role_id: roleId, page_name });
    socket.on('fetch-categories-success', (data) => setCategories(data));
    socket.on('fetch-categories-error', (error) => {
      if (error.message?.includes('Permission')) setUnauthorized(true);
      else console.warn('Error fetching categories:', error.message);
      setLoading(false);
    });

    return () => {
      socket.off('fetch-categories-success');
      socket.off('fetch-categories-error');
    };
  }, [socket, roleId, page_name]);

  useEffect(() => {
    if (!socket || !selectedCatagory || !aircraft_id) return;

    socket.emit('fetch-aircraft-charges-by-category', {
      role_id: roleId,
      page_name,
      aircraft_id,
      category_id: selectedCatagory
    });

    socket.on('fetch-aircraft-charges-by-category-success', (data) => {
      setCharges(data);
      setLoading(false);
    });

    socket.on('fetch-aircraft-charges-by-category-error', (error) => {
      if (error.message?.includes('Permission')) setUnauthorized(true);
      else console.warn('Error fetching charges:', error.message);
      setLoading(false);
    });

    return () => {
      socket.off('fetch-aircraft-charges-by-category-success');
      socket.off('fetch-aircraft-charges-by-category-error');
    };
  }, [socket, selectedCatagory, aircraft_id, roleId, page_name]);

  useEffect(() => {
    localStorage.setItem(`${page_name}_additional_selected_category`, JSON.stringify(selectedCatagory));
  }, [selectedCatagory]);

  const chargeCards = charges.map(charge => {
    const chargeId = charge.charges_id;
    const details = chargeDetails[chargeId] || {
      totalUsed: 1,
      remarks: '',
      timeSlots: [{ start: null, end: null }]
    };

    return (
      <Card className="AdsEnq" key={chargeId}>
        <Card.Header className="bg-transparent d-flex justify-content-start align-items-center py-3 h6">
          <span>Service Name:</span> {charge?.service || 'Unknown'} / per {charge.unit}
        </Card.Header>
        <Card.Body className="p-0">
          <Row className="mx-0 align-items-center">
            <Col lg={2} md={3} className="px-2 py-2">
              <Form.Group className="mb-2">
                <Form.Label>Total Used (In Numbers)</Form.Label>
                <Form.Control
                  className="w-100"
                  value={details.totalUsed}
                  disabled
                />
              </Form.Group>
            </Col>
            <Col lg={8} md={6} className="px-2 border-end border-start py-1">
              <div className="d-flex flex-wrap gap-2 align-items-end">
                {details.timeSlots.map((slot, index) => (
                  <div key={index} className="d-flex gap-2 timeslt p-2 position-relative">
                    <Form.Group>
                      <Form.Label>Start Time</Form.Label>
                      <Calendar
                        value={slot.start}
                        onChange={(e) => handleSlotChange(chargeId, index, 'start', e.value)}
                        showTime hourFormat="24" dateFormat="dd/mm/yy"
                        disabled={isDisabled}
                      />
                    </Form.Group>
                    <Form.Group>
                      <Form.Label>End Time</Form.Label>
                      <Calendar
                        value={slot.end}
                        onChange={(e) => handleSlotChange(chargeId, index, 'end', e.value)}
                        showTime hourFormat="24" dateFormat="dd/mm/yy"
                        disabled={isDisabled}
                      />
                    </Form.Group>
                    {details.timeSlots.length > 1 && !isDisabled && (
                      <Button icon="pi pi-times" severity="danger" className="p-0 border-0" text
                        onClick={() => deleteSlot(chargeId, index)}
                        style={{ position: 'absolute', top: '-10px', right: '-15px', width: '30px' }} />
                    )}
                  </div>
                ))}
                {!isDisabled && (
                  <Button
                    label="Add Slot"
                    icon="pi pi-plus"
                    severity="danger"
                    className="p-0 border-0"
                    style={{ height: '30px', fontSize: '14px' }}
                    text
                    onClick={() => addTimeSlot(chargeId)}
                  />
                )}
              </div>
            </Col>
            <Col lg={2} md={3} className="px-2 py-2">
              <Form.Group className="mb-2">
                <Form.Label>Total Time (In Minutes)</Form.Label>
                <Form.Control className="w-100" disabled value={details.totalTime || ''} />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
        <Card.Footer className="bg-transparent border-0 p-0">
          <InputTextarea
            value={details.remarks}
            onChange={(e) => handleChargeChange(chargeId, 'remarks', e.target.value)}
            rows={2}
            placeholder="Enter remarks"
            className="w-100 h-auto"
            disabled={isDisabled}
          />
        </Card.Footer>
      </Card>
    );
  });




  const handleInstantSave = async () => {
    if (!editMode) return;

    try {
      setLoading(true);
      // await api.put(`/edit_fhr/update-arrival-details/${page_name}/${fhr_id}`, {
      //     flight_no: flightNo,
      //     flight_weight: flightWeight,
      //     flight_region: flightRegion,
      //     flight_type: flightType,
      //     operator,
      //     bay_no: bayNo,
      //     gate_no: gateNo,
      //     airport,
      //     sta,
      //     ata,
      //     sta_ata_diff: staAtaDiff,
      //     crew_count: crewCount,
      //     pax_members: paxMembers,
      //     loading_start: loadingStart,
      //     loading_over: loadingOver,
      //     status
      // });

      // clearLocalStorageForArrival(); // Γ£à Clear on success
    } catch (err) {
      console.error("Instant save failed:", err.message);
    } finally {
      setLoading(false);
    }
  };





  const handleDialogHide = () => navigate(-1);
  if (unauthorized) {
    return (
      <Dialog visible style={{ width: '360px' }} onHide={handleDialogHide} closable={false}>
        <div className="text-center">
          <img src="https://blackboxstorage.blr1.cdn.digitaloceanspaces.com/assetImages/protect.png" alt="symbol" width="100" className="mb-3" />
          <h5>Unauthorized</h5>
          <p>You are not authorized</p>
          <Button label="Go Back" icon="pi pi-arrow-left" severity="danger" onClick={handleDialogHide} />
        </div>
      </Dialog>
    );
  }


  return (
    <Row className="mx-0">
      <Col md={12} lg={12} className="mt-4 p-0">
        <div className="allempList fhr_form">
          <h5 className="rol-title">6. Additional Equipment Details</h5>

          <Row className="mx-0">
            <div className="d-flex align-items-center gap-2 justify-content-between w-100">
              <span className="d-flex align-items-center gap-3 mb-3">
                {loading && (<small><ProgressSpinner style={{ width: '25px', height: '25px' }} strokeWidth="2" fill="var(--surface-ground)" animationDuration=".5s" /></small>)}
                <small className="ms-2">
                  <AvatarGroup>
                    {activeEditors.length > 0 ? (
                      activeEditors.map((user) => (
                        <Avatar
                          key={user.user_id}
                          image={user.profileImage?.img_url || nouser}
                          shape="circle"
                          title={`${user.first_name} ${user.last_name}`}
                        />
                      ))
                    ) : (
                      <em className="text-muted" style={{ fontSize: '12px' }}>No Editors</em>
                    )}
                  </AvatarGroup>
                </small>
                {activeEditors.length > 0 && (
                  <small className="ms-2 text-success">Editing...</small>
                )}
              </span>

              <span className="d-flex align-items-center gap-3 mb-3">
                <small className="me-1 text-secondary">Last Edited by:</small>
                <small>
                  <AvatarGroup>
                    {lastEditedBy ? (
                      <Avatar
                        image={lastEditedBy.profileImage?.img_url || nouser}
                        shape="circle"
                        title={`${lastEditedBy.first_name} ${lastEditedBy.last_name}`}
                      />
                    ) : (
                      <span className="text-muted">Not Edited Yet</span>
                    )}
                  </AvatarGroup>
                </small>
              </span>
            </div>
            <div className="d-flex align-items-center gap-2 justify-content-end w-100 my-3">
              <span className="d-flex align-items-end gap-3 mb-0">

                <>
                  <Button
                    title={editMode ? "Cancel Edit" : "Edit"}
                    icon={editMode ? "pi pi-times" : "pi pi-pencil"}
                    onClick={handleEditToggle}
                    severity={editMode ? "success" : "warning"}
                    size="small"
                    className="p-0"
                    style={{ width: '30px', height: '30px' }}
                  />
                  {editMode && (
                    <Button
                      title="Validate & Save"
                      icon="pi pi-save"
                      onClick={handleInstantSave}
                      severity="info"
                      size="small"
                      className="p-0"
                      style={{ width: '30px', height: '30px' }}
                    />
                  )}
                </>

              </span>
            </div>
            <div className="d-flex align-items-center gap-2 justify-content-end w-100 my-3">
              <label>Category</label>
              <Form.Select
                value={selectedCatagory}
                onChange={(e) => setSelectedCatagory(e.target.value)}
                disabled={isDisabled}
              >
                <option value="">--- Select Category ---</option>
                {categories.map(cat => (
                  <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>
                ))}
              </Form.Select>
            </div>

            {chargeCards}

          </Row>
        </div>
      </Col>
    </Row>
  );
};

export default Additional_equipment_details;
