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

/** MySQL JSON often arrives as a string; always normalize to [{start,end}, ...]. */
const normalizeTimeSlots = (slots) => {
    let value = slots;
    if (typeof value === 'string') {
        try {
            value = JSON.parse(value);
        } catch {
            value = null;
        }
    }
    if (!Array.isArray(value) || value.length === 0) {
        return [{ start: null, end: null }];
    }
    return value.map((slot) => ({
        start: slot?.start ?? null,
        end: slot?.end ?? null,
    }));
};

const normalizeEquipmentItem = (item) => ({
    ...item,
    time_slots: normalizeTimeSlots(item?.time_slots),
});

const Additional_equipment = ({ userId, fhr_id, page_name, aircraft_id, fhrStatus, notify }) => {
    const socket = getSocket();
    const navigate = useNavigate();
    const { roleId } = useAuth();

    const getLS = (key) => {
        const value = localStorage.getItem(`${page_name}_additional_${key}`);
        return value ? JSON.parse(value) : '';
    };


    const [loading, setLoading] = useState(true);
    const [unauthorized, setUnauthorized] = useState(false);
    const [creationStatus, setCreationStatus] = useState(null); // true / false
    const [activeEditors, setActiveEditors] = useState([]);
    const [lastEditedBy, setLastEditedBy] = useState(null);
    const [equipmentList, setEquipmentList] = useState(() => {
        const stored = getLS('equipment_data');
        return Array.isArray(stored) ? stored.map(normalizeEquipmentItem) : [];
    });
    const [editMode, setEditMode] = useState(false);
    const isLocked = ['Submitted', 'Completed', 'Cancelled'].includes(fhrStatus);

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


    // Step 2: If created, fetch editor details
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
            const equipment = (data.equipment_data || []).map(normalizeEquipmentItem);
            setLastEditedBy(data.last_edited_by || null);
            setActiveEditors(data.active_editors || []);
            setEquipmentList(equipment);
            setLS('equipment_data', equipment);
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
                processed = stored.map((item) => {
                    const normalized = normalizeEquipmentItem(item);
                    return {
                        ...normalized,
                        total_time: String(calculateTotalTime(normalized.time_slots)),
                    };
                });
            }

            setEquipmentList(processed);
        }
    }, [creationStatus]);


    useEffect(() => {
        if (isLocked && editMode) {
            setEditMode(false);
        }
    }, [isLocked, editMode]);

    const handleEditToggle = async () => {
        if (isLocked) return;
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


    const refreshCreationStatus = () => {
        if (!socket || !fhr_id) return;
        socket.emit('fetch-additional-equipment-status', { fhr_id, role_id: roleId, page_name });
    };

    const createAdditionalEquipment = async () => {
        try {
            setLoading(true);
            const response = await api.post(`/FHR/create-additional-equipment/${page_name}`, {
                fhr_id,
            });

            if (response.status === 201 || response.status === 200) {
                setCreationStatus(true);
                refreshCreationStatus();
                if (socket) {
                    socket.emit('fetch-additional-equipment-editors', {
                        role_id: roleId,
                        page_name,
                        fhr_id
                    });
                }
                window.alert(
                    response.data?.message ||
                        `Created ${response.data?.created_count || 0} equipment line(s) from tariff.`
                );
            }
        } catch (err) {
            console.error('Failed to create additional equipment:', err.message);
            if (err.response?.status === 403) {
                setUnauthorized(true);
            } else {
                window.alert(err.response?.data?.message || 'Failed to create additional equipment.');
            }
        } finally {
            setLoading(false);
        }
    };

    const resetAdditionalEquipment = async () => {
        try {
            setLoading(true);
            await api.post(`/FHR/reset-additional-equipment/${page_name}`, { fhr_id });
            setCreationStatus(false);
            setEquipmentList([]);
            setEditMode(false);
            setLS('equipment_data', []);
            refreshCreationStatus();
        } catch (err) {
            console.error('Failed to reset additional equipment:', err.message);
            window.alert(err.response?.data?.message || 'Failed to reset additional equipment.');
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
        updated[eqIndex] = normalizeEquipmentItem(updated[eqIndex]);
        updated[eqIndex].time_slots[slotIndex][field] = value;
        updated[eqIndex].total_time = String(calculateTotalTime(updated[eqIndex].time_slots));
        setEquipmentList(updated);
        setLS('equipment_data', updated);
    };

    const handleAddSlot = (eqIndex) => {
        const updated = [...equipmentList];
        updated[eqIndex] = normalizeEquipmentItem(updated[eqIndex]);
        updated[eqIndex].time_slots.push({ start: null, end: null });
        updated[eqIndex].total_time = String(calculateTotalTime(updated[eqIndex].time_slots));
        setEquipmentList(updated);
        setLS('equipment_data', updated);
    };

    const handleDeleteSlot = (eqIndex, slotIndex) => {
        const updated = [...equipmentList];
        updated[eqIndex] = normalizeEquipmentItem(updated[eqIndex]);
        updated[eqIndex].time_slots.splice(slotIndex, 1);
        if (!updated[eqIndex].time_slots.length) {
            updated[eqIndex].time_slots = [{ start: null, end: null }];
        }
        updated[eqIndex].total_time = String(calculateTotalTime(updated[eqIndex].time_slots));
        setEquipmentList(updated);
        setLS('equipment_data', updated);
    };

    const calculateTotalTime = (slots = []) => {
        slots = normalizeTimeSlots(slots);
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
        if (!editMode || isLocked || !fhr_id || !equipmentList.length) return;

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
        if (!editMode || isLocked) return;

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

            try {
                await api.post(`/edit_fhr/start-edit-session/${page_name}/${fhr_id}`, {
                    section: 'Additional_Equipment',
                    action: 'end'
                });
            } catch (endErr) {
                console.warn("End edit session failed:", endErr.message);
            }
            setEditMode(false);
            notify?.('success', 'Additional equipment saved');
        } catch (err) {
            console.error("Instant save failed:", err.message);
            notify?.('error', err.response?.data?.message || 'Failed to save additional equipment');
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
                        {creationStatus === false && !isLocked && (
                            <div className="d-flex align-items-center gap-2 justify-content-end w-100 my-3">
                                <small className="text-muted me-auto">
                                    Creates Additional lines from the Active SGHA / walk-up tariff for this FHR.
                                </small>
                                <Button
                                    disabled={loading}
                                    label="Create from tariff"
                                    onClick={createAdditionalEquipment}
                                    severity="warning"
                                    className="py-2 text-white"
                                    style={{ fontSize: "14px" }}
                                />
                            </div>
                        )}

                        {creationStatus === true && equipmentList.length === 0 && (
                            <div className="d-flex align-items-center justify-content-between w-100 my-3">
                                <small className="text-muted">
                                    No Additional tariff lines were found. Add them on the Active tariff, then Reset &amp; Retry.
                                </small>
                                {!isLocked && (
                                    <Button
                                        label="Reset & Retry"
                                        severity="secondary"
                                        className="py-2"
                                        style={{ fontSize: "14px" }}
                                        onClick={resetAdditionalEquipment}
                                        disabled={loading}
                                    />
                                )}
                            </div>
                        )}

                        {creationStatus === true && equipmentList.length > 0 && (
                            <>
                                <div className="d-flex align-items-center gap-2 justify-content-end w-100 my-3">
                                    <span className="d-flex align-items-end gap-3 mb-0">
                                        {!isLocked && (
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
                                        )}
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
                                                                disabled={!editMode || isLocked}
                                                                onChange={(e) => handleEquipmentChange(index, 'total_no_used', e.target.value)}
                                                            />
                                                        </Form.Group>
                                                    </Col>

                                                    {/* Time Slots */}
                                                    <Col lg={8} md={6} className="px-2 border-end border-start py-1">
                                                        <div className="d-flex flex-wrap gap-2 align-items-end">
                                                            {normalizeTimeSlots(item.time_slots).map((slot, slotIndex) => (
                                                                <div key={slotIndex} className="d-flex gap-2 timeslt p-2 position-relative">
                                                                    <Form.Group>
                                                                        <Form.Label>Start Time</Form.Label>
                                                                        <Calendar
                                                                            value={slot.start ? new Date(slot.start) : null}
                                                                            onChange={(e) => updateSlot(index, slotIndex, 'start', e.value)}
                                                                            showTime
                                                                            disabled={!editMode || isLocked}
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
                                                                            disabled={!editMode || isLocked}
                                                                            hourFormat="24"
                                                                            dateFormat="dd/mm/yy"
                                                                        />
                                                                    </Form.Group>

                                                                    {normalizeTimeSlots(item.time_slots).length > 1 && editMode && !isLocked && (
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

                                                            {editMode && !isLocked && (
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
                                                    disabled={!editMode || isLocked}
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
