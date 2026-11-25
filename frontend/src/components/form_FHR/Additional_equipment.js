import React, { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { Row, Col, Card, Form, Badge } from 'react-bootstrap';
import { InputTextarea } from "primereact/inputtextarea";
import { InputText } from "primereact/inputtext";
import { Calendar } from 'primereact/calendar';
import { Button } from 'primereact/button';
import { getSocket } from "../../context/socket";
import { Dialog } from "primereact/dialog";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { ProgressSpinner } from 'primereact/progressspinner';
import { Avatar } from 'primereact/avatar';
import { AvatarGroup } from 'primereact/avatargroup';
import nouser from '../../assets/images/no_user.png';
import { useNavigate } from "react-router-dom";
import { RequiredMark, collectRequiredErrors, equipmentRequiredChecks, shouldEnforceRequired } from '../../utils/fhrValidation';

const emptyAdhocForm = () => ({
    service_name: '',
    unit: 'Per Hour',
    unit_rate: null,
    total_no_used: 1,
    remarks: '',
});

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
    is_adhoc: Boolean(item?.is_adhoc),
    unit_rate: item?.unit_rate != null && item.unit_rate !== '' ? Number(item.unit_rate) : item?.unit_rate ?? null,
    time_slots: normalizeTimeSlots(item?.time_slots),
});

const Additional_equipment = forwardRef(({ userId, fhr_id, page_name, aircraft_id, fhrStatus, notify }, ref) => {
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
    const [adhocOpen, setAdhocOpen] = useState(false);
    const [adhocForm, setAdhocForm] = useState(() => emptyAdhocForm());
    const [adhocSaving, setAdhocSaving] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const isLocked = ['Submitted', 'Completed', 'Cancelled'].includes(fhrStatus);

    const setLS = (key, value) => {
        localStorage.setItem(`${page_name}_additional_${key}`, JSON.stringify(value));
    };

    const refreshEquipmentList = () => {
        if (!socket || !fhr_id) return;
        socket.emit('fetch-additional-equipment-editors', {
            role_id: roleId,
            page_name,
            fhr_id,
        });
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
                refreshEquipmentList();
                notify?.(
                    'success',
                    response.data?.message ||
                        `Created ${response.data?.created_count || 0} equipment line(s) from tariff.`
                );
            }
        } catch (err) {
            console.error('Failed to create additional equipment:', err.message);
            if (err.response?.status === 403) {
                setUnauthorized(true);
            } else {
                notify?.('error', err.response?.data?.message || 'Failed to create additional equipment.');
            }
        } finally {
            setLoading(false);
        }
    };

    const submitAdhocEquipment = async () => {
        const name = String(adhocForm.service_name || '').trim();
        if (!name) {
            notify?.('error', 'Service name is required.');
            return;
        }
        if (adhocForm.unit_rate == null || Number(adhocForm.unit_rate) < 0) {
            notify?.('error', 'Enter a unit rate (0 or more).');
            return;
        }
        try {
            setAdhocSaving(true);
            const res = await api.post(`/FHR/add-adhoc-equipment/${page_name}`, {
                fhr_id,
                service_name: name,
                unit: adhocForm.unit || null,
                unit_rate: adhocForm.unit_rate,
                total_no_used: adhocForm.total_no_used,
                remarks: adhocForm.remarks || null,
            });
            setCreationStatus(true);
            setAdhocOpen(false);
            setAdhocForm(emptyAdhocForm());
            refreshCreationStatus();
            refreshEquipmentList();
            notify?.('success', res.data?.message || 'Ad-hoc service added.');
        } catch (err) {
            console.error('Failed to add ad-hoc equipment:', err.message);
            if (err.response?.status === 403) setUnauthorized(true);
            else notify?.('error', err.response?.data?.message || 'Failed to add ad-hoc service.');
        } finally {
            setAdhocSaving(false);
        }
    };

    const deleteAdhocEquipment = async (item) => {
        if (!item?.is_adhoc || !item.additional_equipment_id) return;
        if (!window.confirm(`Remove ad-hoc service "${item.service_name}"?`)) return;
        try {
            setLoading(true);
            await api.delete(`/FHR/adhoc-equipment/${page_name}/${item.additional_equipment_id}`);
            refreshCreationStatus();
            refreshEquipmentList();
            notify?.('success', 'Ad-hoc service removed.');
        } catch (err) {
            console.error('Failed to delete ad-hoc equipment:', err.message);
            notify?.('error', err.response?.data?.message || 'Failed to remove ad-hoc service.');
        } finally {
            setLoading(false);
        }
    };

    const resetAdditionalEquipment = async () => {
        try {
            setLoading(true);
            const res = await api.post(`/FHR/reset-additional-equipment/${page_name}`, { fhr_id });
            setEditMode(false);
            refreshCreationStatus();
            refreshEquipmentList();
            notify?.('success', res.data?.message || 'Tariff equipment reset.');
        } catch (err) {
            console.error('Failed to reset additional equipment:', err.message);
            notify?.('error', err.response?.data?.message || 'Failed to reset additional equipment.');
        } finally {
            setLoading(false);
        }
    };

    const handleEquipmentChange = (eqIndex, field, value) => {
        const updated = [...equipmentList];
        updated[eqIndex][field] = value;
        setEquipmentList(updated);
        setLS('equipment_data', updated);
        setFieldErrors((prev) => ({
            ...prev,
            [`${eqIndex}_${field}`]: false,
            [`${eqIndex}_total_no_used`]: field === 'total_no_used' ? false : prev[`${eqIndex}_total_no_used`],
            [`${eqIndex}_unit_rate`]: field === 'unit_rate' ? false : prev[`${eqIndex}_unit_rate`],
            [`${eqIndex}_service_name`]: field === 'service_name' ? false : prev[`${eqIndex}_service_name`],
        }));
    };

    const updateSlot = (eqIndex, slotIndex, field, value) => {
        const updated = [...equipmentList];
        updated[eqIndex] = normalizeEquipmentItem(updated[eqIndex]);
        updated[eqIndex].time_slots[slotIndex][field] = value;
        updated[eqIndex].total_time = String(calculateTotalTime(updated[eqIndex].time_slots));
        setEquipmentList(updated);
        setLS('equipment_data', updated);
        if (slotIndex === 0) {
            setFieldErrors((prev) => ({
                ...prev,
                [`${eqIndex}_${field}`]: false,
            }));
        }
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
                    equipment_list: equipmentList.map((item) => ({
                        additional_equipment_id: item.additional_equipment_id,
                        ...(item.is_adhoc
                            ? {
                                  service_name: item.service_name,
                                  unit: item.unit,
                                  unit_rate: item.unit_rate,
                              }
                            : {}),
                        total_no_used: item.total_no_used,
                        time_slots: item.time_slots,
                        total_time: item.total_time,
                        remarks: item.remarks || '',
                    })),
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

    const validateEquipment = (action = 'saving') =>
        collectRequiredErrors(equipmentRequiredChecks(equipmentList), action);

    const persistEquipment = async ({ notifyResult = false, action = 'saving' } = {}) => {
        if (shouldEnforceRequired(action)) {
            const result = validateEquipment(action);
            if (!result.ok) {
                setFieldErrors(result.fieldErrors);
                if (notifyResult) notify?.('error', result.message);
                return { ...result, section: 'Additional equipment' };
            }
        }
        setFieldErrors({});
        if (isLocked) return { ok: true, missing: [], section: 'Additional equipment' };
        const payload = {
            equipment_list: equipmentList.map((item) => ({
                additional_equipment_id: item.additional_equipment_id,
                ...(item.is_adhoc
                    ? {
                          service_name: item.service_name,
                          unit: item.unit,
                          unit_rate: item.unit_rate,
                      }
                    : {}),
                total_no_used: item.total_no_used,
                time_slots: item.time_slots,
                total_time: item.total_time,
                remarks: item.remarks || '',
            })),
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
        return { ok: true, missing: [], section: 'Additional equipment' };
    };

    useImperativeHandle(ref, () => ({
        validate: (action) => {
            const result = validateEquipment(action);
            if (!result.ok) setFieldErrors(result.fieldErrors);
            return { ...result, section: 'Additional equipment' };
        },
        saveIfValid: (action) => persistEquipment({ action }),
    }));

    const handleInstantSave = async () => {
        if (!editMode || isLocked) return;
        try {
            setLoading(true);
            const result = await persistEquipment({ notifyResult: true });
            if (result.ok) notify?.('success', 'Additional equipment saved');
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
                        <div className="w-100 my-3">
                            {!isLocked && (
                                <small className="text-muted d-block mb-2">
                                    Tariff lines come from the Active SGHA / walk-up. Use <b>Ad-hoc</b> for urgent extras not on the agreement.
                                </small>
                            )}
                            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                    {!isLocked && creationStatus !== true && (
                                        <Button
                                            disabled={loading}
                                            label="Create from tariff"
                                            onClick={createAdditionalEquipment}
                                            severity="warning"
                                            className="py-2 text-white"
                                            style={{ fontSize: "14px" }}
                                        />
                                    )}
                                    {!isLocked && creationStatus === true && (
                                        <Button
                                            label="Reset tariff lines"
                                            severity="secondary"
                                            className="py-2"
                                            style={{ fontSize: "14px" }}
                                            onClick={resetAdditionalEquipment}
                                            disabled={loading}
                                            outlined
                                        />
                                    )}
                                    {!isLocked && (
                                        <Button
                                            disabled={loading || adhocSaving}
                                            label="Add ad-hoc service"
                                            icon="pi pi-plus"
                                            onClick={() => {
                                                setAdhocForm(emptyAdhocForm());
                                                setAdhocOpen(true);
                                            }}
                                            severity="help"
                                            className="py-2"
                                            style={{ fontSize: "14px" }}
                                        />
                                    )}
                                </div>
                                {creationStatus === true && equipmentList.length > 0 && !isLocked && (
                                    <div className="d-flex align-items-center gap-2">
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
                                    </div>
                                )}
                            </div>
                        </div>

                        {creationStatus === true && equipmentList.length === 0 && (
                            <div className="w-100 mb-3">
                                <small className="text-muted">
                                    No equipment rows yet. Create from tariff and/or add an ad-hoc service.
                                </small>
                            </div>
                        )}

                        {creationStatus === true && equipmentList.length > 0 && (
                            <div className="mt-1">
                                {equipmentList.map((item, index) => (
                                    <Card
                                        className={`AdsEnq mb-3${item.is_adhoc ? ' AdsEnq--adhoc' : ''}`}
                                        key={item.additional_equipment_id || index}
                                    >
                                        <Card.Header className="bg-transparent d-flex justify-content-between align-items-center py-2 px-3 gap-2 flex-wrap">
                                            <div className="d-flex align-items-center gap-2 flex-wrap min-w-0">
                                                {item.is_adhoc && editMode && !isLocked ? (
                                                    <InputText
                                                        value={item.service_name || ''}
                                                        onChange={(e) => handleEquipmentChange(index, 'service_name', e.target.value)}
                                                        className="AdsEnq-name-input"
                                                        placeholder="Service name"
                                                    />
                                                ) : (
                                                    <span className="AdsEnq-title text-truncate">
                                                        <span className="text-muted">Equipment Name: </span>
                                                        {item.service_name}
                                                    </span>
                                                )}
                                                {item.is_adhoc && (
                                                    <Badge bg="warning" text="dark" className="AdsEnq-badge">Ad-hoc</Badge>
                                                )}
                                            </div>
                                            {item.is_adhoc && editMode && !isLocked && (
                                                <Button
                                                    icon="pi pi-trash"
                                                    severity="danger"
                                                    text
                                                    className="p-0"
                                                    style={{ width: '30px', height: '30px' }}
                                                    title="Remove ad-hoc service"
                                                    onClick={() => deleteAdhocEquipment(item)}
                                                />
                                            )}
                                        </Card.Header>
                                        <Card.Body className="px-3 py-2">
                                            <Row className="g-2 align-items-end">
                                                {item.is_adhoc && (
                                                    <>
                                                        <Col xs={6} md={3} lg={2}>
                                                            <Form.Group className="mb-0">
                                                                <Form.Label>Unit</Form.Label>
                                                                <Form.Control
                                                                    className="w-100"
                                                                    value={item.unit || ''}
                                                                    disabled={!editMode || isLocked}
                                                                    onChange={(e) => handleEquipmentChange(index, 'unit', e.target.value)}
                                                                    placeholder="e.g. Per Hour"
                                                                />
                                                            </Form.Group>
                                                        </Col>
                                                        <Col xs={6} md={3} lg={2}>
                                                            <Form.Group className="mb-0">
                                                                <Form.Label>Unit rate <RequiredMark /></Form.Label>
                                                                <Form.Control
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.01"
                                                                    className={`w-100${fieldErrors[`${index}_unit_rate`] ? ' is-invalid' : ''}`}
                                                                    value={item.unit_rate ?? ''}
                                                                    disabled={!editMode || isLocked}
                                                                    onChange={(e) => handleEquipmentChange(index, 'unit_rate', e.target.value)}
                                                                />
                                                            </Form.Group>
                                                        </Col>
                                                    </>
                                                )}
                                                <Col xs={6} md={3} lg={2}>
                                                    <Form.Group className="mb-0">
                                                        <Form.Label>Total Used <RequiredMark /></Form.Label>
                                                        <Form.Control
                                                            className={`w-100${fieldErrors[`${index}_total_no_used`] ? ' is-invalid' : ''}`}
                                                            value={item.total_no_used || ''}
                                                            disabled={!editMode || isLocked}
                                                            onChange={(e) => handleEquipmentChange(index, 'total_no_used', e.target.value)}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col xs={6} md={3} lg={2}>
                                                    <Form.Group className="mb-0">
                                                        <Form.Label>Total Time (mins)</Form.Label>
                                                        <Form.Control
                                                            className="w-100"
                                                            value={calculateTotalTime(item.time_slots)}
                                                            disabled
                                                        />
                                                    </Form.Group>
                                                </Col>
                                            </Row>

                                            <div className="AdsEnq-times mt-2 pt-2">
                                                <div className="d-flex flex-wrap gap-2 align-items-end">
                                                    {normalizeTimeSlots(item.time_slots).map((slot, slotIndex) => (
                                                        <div key={slotIndex} className="d-flex gap-2 timeslt p-2 position-relative">
                                                            <Form.Group className="mb-0">
                                                                <Form.Label>
                                                                    Start Time{slotIndex === 0 ? <> <RequiredMark /></> : null}
                                                                </Form.Label>
                                                                <Calendar
                                                                    value={slot.start ? new Date(slot.start) : null}
                                                                    onChange={(e) => updateSlot(index, slotIndex, 'start', e.value)}
                                                                    showTime
                                                                    disabled={!editMode || isLocked}
                                                                    hourFormat="24"
                                                                    dateFormat="dd/mm/yy"
                                                                    className={slotIndex === 0 && fieldErrors[`${index}_start`] ? 'p-invalid' : undefined}
                                                                />
                                                            </Form.Group>
                                                            <Form.Group className="mb-0">
                                                                <Form.Label>
                                                                    End Time{slotIndex === 0 ? <> <RequiredMark /></> : null}
                                                                </Form.Label>
                                                                <Calendar
                                                                    value={slot.end ? new Date(slot.end) : null}
                                                                    onChange={(e) => updateSlot(index, slotIndex, 'end', e.value)}
                                                                    showTime
                                                                    disabled={!editMode || isLocked}
                                                                    hourFormat="24"
                                                                    dateFormat="dd/mm/yy"
                                                                    className={slotIndex === 0 && fieldErrors[`${index}_end`] ? 'p-invalid' : undefined}
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
                                            </div>
                                        </Card.Body>

                                        <Card.Footer className="bg-transparent border-0 pt-0 pb-2 px-3">
                                            <InputTextarea
                                                value={item.remarks || ''}
                                                onChange={(e) => handleEquipmentChange(index, 'remarks', e.target.value)}
                                                rows={2}
                                                placeholder="Enter remarks"
                                                className="w-100 h-auto AdsEnq-remarks"
                                                disabled={!editMode || isLocked}
                                            />
                                        </Card.Footer>
                                    </Card>
                                ))}
                            </div>
                        )}



                    </Row>
                </div>
            </Col>

            <Dialog
                header="Add ad-hoc service"
                visible={adhocOpen}
                style={{ width: 'min(520px, 95vw)' }}
                onHide={() => !adhocSaving && setAdhocOpen(false)}
                closable={!adhocSaving}
                className="AdsEnq-adhoc-dialog"
                footer={
                    <div className="d-flex justify-content-end gap-2">
                        <Button
                            label="Cancel"
                            severity="secondary"
                            outlined
                            disabled={adhocSaving}
                            onClick={() => setAdhocOpen(false)}
                        />
                        <Button
                            label={adhocSaving ? 'Saving…' : 'Add service'}
                            icon="pi pi-check"
                            loading={adhocSaving}
                            onClick={submitAdhocEquipment}
                        />
                    </div>
                }
            >
                <p className="text-muted small mb-3">
                    For urgent work not listed on the Active SGHA / walk-up tariff. Rate is entered here and billed as a Manual charge on Complete.
                </p>
                <Form.Group className="mb-3">
                    <Form.Label>Service name *</Form.Label>
                    <InputText
                        className="w-100"
                        value={adhocForm.service_name}
                        onChange={(e) => setAdhocForm((f) => ({ ...f, service_name: e.target.value }))}
                        placeholder="e.g. Urgent de-icing support"
                        autoFocus
                    />
                </Form.Group>
                <Row className="g-3">
                    <Col xs={12} sm={4}>
                        <Form.Group className="mb-0">
                            <Form.Label>Unit</Form.Label>
                            <Form.Control
                                value={adhocForm.unit}
                                onChange={(e) => setAdhocForm((f) => ({ ...f, unit: e.target.value }))}
                                placeholder="Per Hour"
                            />
                        </Form.Group>
                    </Col>
                    <Col xs={6} sm={4}>
                        <Form.Group className="mb-0">
                            <Form.Label>Unit rate *</Form.Label>
                            <Form.Control
                                type="number"
                                min="0"
                                step="0.01"
                                value={adhocForm.unit_rate ?? ''}
                                onChange={(e) =>
                                    setAdhocForm((f) => ({
                                        ...f,
                                        unit_rate: e.target.value === '' ? null : e.target.value,
                                    }))
                                }
                            />
                        </Form.Group>
                    </Col>
                    <Col xs={6} sm={4}>
                        <Form.Group className="mb-0">
                            <Form.Label>Qty used</Form.Label>
                            <Form.Control
                                type="number"
                                min="0"
                                step="1"
                                value={adhocForm.total_no_used ?? ''}
                                onChange={(e) =>
                                    setAdhocForm((f) => ({
                                        ...f,
                                        total_no_used: e.target.value === '' ? null : e.target.value,
                                    }))
                                }
                            />
                        </Form.Group>
                    </Col>
                </Row>
                <Form.Group className="mb-0 mt-3">
                    <Form.Label>Remarks</Form.Label>
                    <InputTextarea
                        className="w-100"
                        rows={2}
                        value={adhocForm.remarks}
                        onChange={(e) => setAdhocForm((f) => ({ ...f, remarks: e.target.value }))}
                        placeholder="Optional note"
                    />
                </Form.Group>
            </Dialog>
        </Row>
    );
});

export default Additional_equipment;
