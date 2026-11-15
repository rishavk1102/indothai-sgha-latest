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

const Additional_equipment = ({ userId, fhr_id, page_name, aircraft_id }) => {
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
    const [creationStatus, setCreationStatus] = useState(null); // true / false
    const [activeEditors, setActiveEditors] = useState([]);
    const [lastEditedBy, setLastEditedBy] = useState(null);
    const [selectedCatagory, setSelectedCatagory] = useState(null);
    const [equipmentList, setEquipmentList] = useState(() => getLS('equipment_data') || []);
    const [editMode, setEditMode] = useState(false);

    const setLS = (key, value) => {
        localStorage.setItem(`${page_name}_additional_${key}`, JSON.stringify(value));
    };


    // ≡ƒöü Step 1: Check creation status
    useEffect(() => {
        if (!socket || !fhr_id) return;

        socket.emit('fetch-additional-equipment-status', { fhr_id, role_id: roleId, page_name });

        socket.on('fetch-additional-equipment-status-success', (status) => {
            setCreationStatus(status);
            setLoading(false);
        });

        socket.on('fetch-additional-equipment-status-error', (error) => {
            const isPermissionError =
                error.message?.includes("Missing role_id") ||
                error.message?.includes("Page") ||
                error.message?.includes("Permission denied");

            if (isPermissionError) {
                setUnauthorized(true);
            } else {
                console.warn("Additional Equipment editor fetch error:", error.message);
            }
            setCreationStatus(false); // fallback: treat as not created
            setLoading(false);
        });

        return () => {
            socket.off('fetch-additional-equipment-status-success');
            socket.off('fetch-additional-equipment-status-error');
        };
    }, [socket, roleId, fhr_id, page_name]);


    // ≡ƒôñ Step 2: If not created, fetch categories
    useEffect(() => {
        if (!socket || creationStatus !== false) return;

        socket.emit('fetch-categories', { role_id: roleId, page_name });

        socket.on('fetch-categories-success', (data) => setCategories(data));
        socket.on('fetch-categories-error', (error) => {
            const isPermissionError =
                error.message?.includes("Missing role_id") ||
                error.message?.includes("Page") ||
                error.message?.includes("Permission denied");

            if (isPermissionError) {
                setUnauthorized(true);
            } else {
                console.warn("Additional Equipment editor fetch error:", error.message);
            }
            setCategories([]);
        });

        return () => {
            socket.off('fetch-categories-success');
            socket.off('fetch-categories-error');
        };
    }, [socket, roleId, page_name, creationStatus]);

    // ≡ƒºá Step 3: If created, fetch editor details
    useEffect(() => {
        if (!socket || creationStatus !== true) return;

        const fetchEditors = () => {
            socket.emit('fetch-additional-equipment-editors', {
                role_id: roleId,
                page_name,
                fhr_id
            });
        };

        const handleSuccess = (data) => {
            setLastEditedBy(data.last_edited_by || null);
            setActiveEditors(data.active_editors || []);
            setEquipmentList(data.equipment_data || []);
            setLS('equipment_data', data.equipment_data || []);
        };

        const handleError = (error) => {
            const isPermissionError =
                error.message?.includes("Missing role_id") ||
                error.message?.includes("Page") ||
                error.message?.includes("Permission denied");

            if (isPermissionError) setUnauthorized(true);
            else console.warn("Editor fetch error:", error.message);
        };

        const handleFhrUpdated = (payload) => {
            if (String(payload?.fhr_id) === String(fhr_id)) fetchEditors();
        };

        fetchEditors();

        socket.on('fetch-additional-equipment-editors-success', handleSuccess);
        socket.on('fetch-additional-equipment-editors-error', handleError);
        socket.on('fhrUpdated', handleFhrUpdated);

        return () => {
            socket.off('fetch-additional-equipment-editors-success', handleSuccess);
            socket.off('fetch-additional-equipment-editors-error', handleError);
            socket.off('fhrUpdated', handleFhrUpdated);
        };
    }, [socket, roleId, fhr_id, page_name, creationStatus]);


    useEffect(() => {
        if (creationStatus === true) {
            const stored = getLS('equipment_data');
            let processed = [];

            if (stored && Array.isArray(stored)) {
                processed = stored.map(item => ({
                    ...item,
                    time_slots: item.time_slots?.length ? item.time_slots : [{ start: null, end: null }],
                    total_time: String(calculateTotalTime(item.time_slots || [])),
                }));
            }

            setEquipmentList(processed);
        }
    }, [creationStatus]);


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


    // ≡ƒ¢á∩╕Å Step 4: Trigger create-additional-equipment API
    const createAdditionalEquipment = async () => {
        if (!selectedCatagory) {
            console.warn("Category ID is required.");
            return; // Γ¢ö Prevent API call
        }

        try {
            setLoading(true);
            const response = await api.post(`/FHR/create-additional-equipment/${page_name}`, {
                fhr_id,
                aircraft_id,
                category_id: parseInt(selectedCatagory)  // ensure it's sent as a number
            });

            if (response.status === 201) {
                setCreationStatus(true); // Γ£à Switch to editor mode
            }
        } catch (err) {
            console.error('Γ¥î Failed to create additional equipment:', err.message);
            if (err.response?.status === 403) {
                setUnauthorized(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEquipmentChange = (eqIndex, field, value) => {
        const updated = [...equipmentList];
        updated[eqIndex][field] = value;
        setEquipmentList(updated);
        setLS('equipment_data', updated);
    };

    const updateSlot = (eqIndex, slotIndex, field, value) => {
        const updated = [...equipmentList];
        updated[eqIndex].time_slots[slotIndex][field] = value;

        // ≡ƒöü Recalculate total_time
        updated[eqIndex].total_time = String(calculateTotalTime(updated[eqIndex].time_slots));

        setEquipmentList(updated);
        setLS('equipment_data', updated);
    };

    const handleAddSlot = (eqIndex) => {
        const updated = [...equipmentList];
        if (!updated[eqIndex].time_slots) updated[eqIndex].time_slots = [];
        updated[eqIndex].time_slots.push({ start: null, end: null });

        // ≡ƒöü Update total time
        updated[eqIndex].total_time = String(calculateTotalTime(updated[eqIndex].time_slots));

        setEquipmentList(updated);
        setLS('equipment_data', updated);
    };

    const handleDeleteSlot = (eqIndex, slotIndex) => {
        const updated = [...equipmentList];
        updated[eqIndex].time_slots.splice(slotIndex, 1);

        // ≡ƒöü Update total time
        updated[eqIndex].total_time = String(calculateTotalTime(updated[eqIndex].time_slots));

        setEquipmentList(updated);
        setLS('equipment_data', updated);
    };

    const calculateTotalTime = (slots = []) => {
        return slots.reduce((total, slot) => {
            const start = new Date(slot.start);
            const end = new Date(slot.end);
            if (start && end && !isNaN(start) && !isNaN(end)) {
                const diff = (end - start) / 60000; // in minutes
                return total + (diff > 0 ? diff : 0);
            }
            return total;
        }, 0);
    };


    useEffect(() => {
        if (!editMode || !fhr_id || !equipmentList.length) return;

        const interval = setInterval(async () => {
            try {
                setLoading(true);

                const payload = {
                    equipment_list: equipmentList.map(item => ({
                        additional_equipment_id: item.additional_equipment_id,
                        total_no_used: item.total_no_used,
                        time_slots: item.time_slots,
                        total_time: item.total_time,
                        remarks: item.remarks || ''
                    }))
                };

                await api.put(`/edit_fhr/update-additional-equipment/${page_name}/${fhr_id}`, payload);
            } catch (err) {
                console.error("Auto-save (Additional Equipment) failed:", err.message);
            } finally {
                setLoading(false);
            }
        }, 2 * 60 * 1000); // every 2 minutes

        return () => clearInterval(interval);
    }, [editMode, equipmentList, page_name, fhr_id]);

    const handleInstantSave = async () => {
        if (!editMode) return;

        try {
            setLoading(true);

            const payload = {
                equipment_list: equipmentList.map(item => ({
                    additional_equipment_id: item.additional_equipment_id,
                    total_no_used: item.total_no_used,
                    time_slots: item.time_slots,
                    total_time: item.total_time,
                    remarks: item.remarks || ''
                }))
            };

            await api.put(`/edit_fhr/update-additional-equipment/${page_name}/${fhr_id}`, payload);
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
                        {creationStatus === false && (
                            <div className="d-flex align-items-center gap-2 justify-content-end w-100 my-3">
                                <label>Category</label>
                                <Form.Select
                                    value={selectedCatagory}
                                    onChange={(e) => setSelectedCatagory(e.target.value)}
                                    disabled={loading}
                                >
                                    <option value="">--- Select Category ---</option>
                                    {categories.map(cat => (
                                        <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>
                                    ))}
                                </Form.Select>

                                <Button
                                    disabled={!selectedCatagory || loading}
                                    label="Create"
                                    onClick={createAdditionalEquipment}
                                    severity="warning"
                                    className="py-2 text-white"
                                    style={{ fontSize: "14px" }}
                                />
                            </div>
                        )}

                        {creationStatus === true && equipmentList.length > 0 && (
                            <>
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
                                <div className="mt-3">
                                    {equipmentList.map((item, index) => (
                                        <Card className="AdsEnq mb-3" key={item.additional_equipment_id || index}>
                                            <Card.Header className="bg-transparent d-flex justify-content-start align-items-center py-3 h6">
                                                <span>Equipment Name: </span>&nbsp;{item.service_name}
                                            </Card.Header>
                                            <Card.Body className="p-0">
                                                <Row className="mx-0 align-items-center">
                                                    {/* Total Used */}
                                                    <Col lg={2} md={3} className="px-2 py-2">
                                                        <Form.Group className="mb-2">
                                                            <Form.Label>Total Used (In Numbers)</Form.Label>
                                                            <Form.Control
                                                                className="w-100"
                                                                value={item.total_no_used || ''}
                                                                disabled={!editMode}
                                                                onChange={(e) => handleEquipmentChange(index, 'total_no_used', e.target.value)}
                                                            />
                                                        </Form.Group>
                                                    </Col>

                                                    {/* Time Slots */}
                                                    <Col lg={8} md={6} className="px-2 border-end border-start py-1">
                                                        <div className="d-flex flex-wrap gap-2 align-items-end">
                                                            {(item.time_slots || []).map((slot, slotIndex) => (
                                                                <div key={slotIndex} className="d-flex gap-2 timeslt p-2 position-relative">
                                                                    <Form.Group>
                                                                        <Form.Label>Start Time</Form.Label>
                                                                        <Calendar
                                                                            value={slot.start ? new Date(slot.start) : null}
                                                                            onChange={(e) => updateSlot(index, slotIndex, 'start', e.value)}
                                                                            showTime
                                                                            disabled={!editMode}
                                                                            hourFormat="24"
                                                                            dateFormat="dd/mm/yy"
                                                                        />
                                                                    </Form.Group>
                                                                    <Form.Group>
                                                                        <Form.Label>End Time</Form.Label>
                                                                        <Calendar
                                                                            value={slot.end ? new Date(slot.end) : null}
                                                                            onChange={(e) => updateSlot(index, slotIndex, 'end', e.value)}
                                                                            showTime
                                                                            disabled={!editMode}
                                                                            hourFormat="24"
                                                                            dateFormat="dd/mm/yy"
                                                                        />
                                                                    </Form.Group>

                                                                    {item.time_slots.length > 1 && editMode && (
                                                                        <Button
                                                                            icon="pi pi-times"
                                                                            severity="danger"
                                                                            className="p-0 border-0"
                                                                            text
                                                                            onClick={() => handleDeleteSlot(index, slotIndex)}
                                                                            style={{ position: 'absolute', top: '-10px', right: '-15px', width: '30px' }}
                                                                        />
                                                                    )}
                                                                </div>
                                                            ))}

                                                            {editMode && (
                                                                <Button
                                                                    label="Add Slot"
                                                                    icon="pi pi-plus"
                                                                    severity="danger"
                                                                    className="p-0 border-0"
                                                                    style={{ height: '30px', fontSize: '14px' }}
                                                                    text
                                                                    onClick={() => handleAddSlot(index)}
                                                                />
                                                            )}
                                                        </div>
                                                    </Col>

                                                    {/* Total Time */}
                                                    <Col lg={2} md={3} className="px-2 py-2">
                                                        <Form.Group className="mb-2">
                                                            <Form.Label>Total Time (In Minutes)</Form.Label>
                                                            <Form.Control className="w-100" value={calculateTotalTime(item.time_slots)} disabled />
                                                        </Form.Group>
                                                    </Col>
                                                </Row>
                                            </Card.Body>

                                            <Card.Footer className="bg-transparent border-0 py-0 px-1">
                                                <InputTextarea
                                                    value={item.remarks || ''}
                                                    onChange={(e) => handleEquipmentChange(index, 'remarks', e.target.value)}
                                                    rows={2}
                                                    placeholder="Enter remarks"
                                                    className="w-100 h-auto"
                                                    disabled={!editMode}
                                                />
                                            </Card.Footer>
                                        </Card>
                                    ))}
                                </div>
                            </>
                        )}



                    </Row>
                </div>
            </Col>
        </Row>
    );
};

export default Additional_equipment
