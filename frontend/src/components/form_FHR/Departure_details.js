import React, { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from '../../components/Layout';
import { Row, Col, Form } from 'react-bootstrap';
import { IoChevronBackOutline } from "react-icons/io5";
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { InputNumber } from 'primereact/inputnumber';
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
import { RequiredMark, collectRequiredErrors, departureRequiredChecks, shouldEnforceRequired } from '../../utils/fhrValidation';

const Departure_details = forwardRef(({ userId, fhr_id, page_name, parentStatus, notify }, ref) => {
    const socket = getSocket();
    const navigate = useNavigate();
    const { roleId } = useAuth();

    const getLS = (key) => localStorage.getItem(`${page_name}_departure_${key}`) || '';

    const [loading, setLoading] = useState(true);
    const [unauthorized, setUnauthorized] = useState(false);

    const [flightNo, setFlightNo] = useState(getLS("flight_no"));
    const [flightWeight, setFlightWeight] = useState(getLS("flight_weight"));
    const [flightRegion, setFlightRegion] = useState(getLS("flight_region"));
    const [flightType, setFlightType] = useState(getLS("flight_type"));
    const [operator, setOperator] = useState(getLS("operator"));
    const [bayNo, setBayNo] = useState(getLS("bay_no"));
    const [gateNo, setGateNo] = useState(getLS("gate_no"));
    const [airport, setAirport] = useState(getLS("airport"));
    const [std, setStd] = useState(getLS("std") ? new Date(getLS("std")) : null);
    const [atd, setAtd] = useState(getLS("atd") ? new Date(getLS("atd")) : null);
    const [crewCount, setCrewCount] = useState(getLS("crew_count") || null);
    const [paxMembers, setPaxMembers] = useState(getLS("pax_members") || null);
    const [loadingStart, setLoadingStart] = useState(getLS("loading_start") ? new Date(getLS("loading_start")) : null);
    const [loadingOver, setLoadingOver] = useState(getLS("loading_over") ? new Date(getLS("loading_over")) : null);
    const [status, setStatus] = useState(getLS("status") || "");
    const [editMode, setEditMode] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [lastEditedBy, setLastEditedBy] = useState(null);
    const [activeEditors, setActiveEditors] = useState([]);
    const [stdAtdDiff, setStdAtdDiff] = useState(null);

    // Lock only when the whole FHR is submitted/completed/cancelled.
    // Section Status "Submitted" marks the section ready — it must not freeze fields.
    const isLocked = ['Submitted', 'Completed', 'Cancelled'].includes(parentStatus);
    const isDisabled = !editMode || isLocked;

    // Save to localStorage
    useEffect(() => {
        localStorage.setItem(`${page_name}_departure_flight_no`, flightNo);
        localStorage.setItem(`${page_name}_departure_flight_weight`, flightWeight);
        localStorage.setItem(`${page_name}_departure_flight_region`, flightRegion);
        localStorage.setItem(`${page_name}_departure_flight_type`, flightType);
        localStorage.setItem(`${page_name}_departure_operator`, operator);
        localStorage.setItem(`${page_name}_departure_bay_no`, bayNo);
        localStorage.setItem(`${page_name}_departure_gate_no`, gateNo);
        localStorage.setItem(`${page_name}_departure_airport`, airport);
        localStorage.setItem(`${page_name}_departure_std`, std || "");
        localStorage.setItem(`${page_name}_departure_atd`, atd || "");
        localStorage.setItem(`${page_name}_departure_crew_count`, crewCount || "");
        localStorage.setItem(`${page_name}_departure_pax_members`, paxMembers || "");
        localStorage.setItem(`${page_name}_departure_loading_start`, loadingStart || "");
        localStorage.setItem(`${page_name}_departure_loading_over`, loadingOver || "");
        localStorage.setItem(`${page_name}_departure_status`, status);
    }, [flightNo, flightWeight, flightRegion, flightType, operator, bayNo, gateNo, airport, std, atd, crewCount, paxMembers, loadingStart, loadingOver, status]);

    useEffect(() => {
        if (std && atd) {
            const diffMs = new Date(atd) - new Date(std); // ATD - STD
            const diffMinutes = Math.abs(Math.round(diffMs / 60000));
            const label = diffMs > 0 ? 'Late' : 'Early';
            setStdAtdDiff(`${diffMinutes} min ${label}`);
        } else {
            setStdAtdDiff(null);
        }
    }, [std, atd]);



    useEffect(() => {
        if (!socket || !fhr_id) return;

        const fetchDepartureDetails = () => {
            socket.emit('fetch-departure-details', {
                role_id: roleId,
                page_name,
                fhr_id,
            });
        };

        const handleSuccess = (data) => {
            setFlightNo(data.flight_no || "");
            setFlightWeight(data.flight_weight || "");
            setFlightRegion(data.flight_region || "");
            setFlightType(data.flight_type || "");
            setOperator(data.operator || "");
            setBayNo(data.bay_no || "");
            setGateNo(data.gate_no || "");
            setAirport(data.airport || "");
            setStd(data.std ? new Date(data.std) : null);
            setAtd(data.atd ? new Date(data.atd) : null);
            setCrewCount(data.crew_count || "");
            setPaxMembers(data.pax_members || "");
            setLoadingStart(data.loading_start ? new Date(data.loading_start) : null);
            setLoadingOver(data.loading_over ? new Date(data.loading_over) : null);
            setStatus(data.status || "Draft");
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
                console.warn("FHR fetch error:", error.message);
            }

            setLoading(false);
        };

        const handleFhrUpdated = (payload) => {
            if (String(payload?.fhr_id) === String(fhr_id)) {
                fetchDepartureDetails();
            }
        };

        // Initial fetch
        fetchDepartureDetails();

        // Register listeners
        socket.on('fetch-departure-details-success', handleSuccess);
        socket.on('fetch-departure-details-error', handleError);
        socket.on('fhrUpdated', handleFhrUpdated);

        return () => {
            socket.off('fetch-departure-details-success', handleSuccess);
            socket.off('fetch-departure-details-error', handleError);
            socket.off('fhrUpdated', handleFhrUpdated);
        };
    }, [socket, roleId, fhr_id, page_name]);

    const handleEditToggle = async () => {
        setLoading(true); // Show spinner while action happens

        try {
            const action = editMode ? 'end' : 'start';

            const response = await api.post(`/edit_fhr/start-edit-session/${page_name}/${fhr_id}`, {
                section: 'Departure_Details',
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


    const clearLocalStorageForDeparture = () => {
        Object.keys(localStorage).forEach((key) => {
            if (key.startsWith(`${page_name}_departure_`)) {
                localStorage.removeItem(key);
            }
        });
    };



    useEffect(() => {
        if (!editMode) return;

        const interval = setInterval(async () => {
            try {
                setLoading(true);
                await api.put(`/edit_fhr/update-departure-details/${page_name}/${fhr_id}`, {
                    flight_no: flightNo,
                    flight_weight: flightWeight,
                    flight_region: flightRegion,
                    flight_type: flightType,
                    operator,
                    bay_no: bayNo,
                    gate_no: gateNo,
                    airport,
                    std,
                    atd,
                    std_atd_diff: stdAtdDiff,
                    crew_count: crewCount,
                    pax_members: paxMembers,
                    loading_start: loadingStart,
                    loading_over: loadingOver,
                    status
                });

                // Γ£à Clear local storage
                clearLocalStorageForDeparture();
            } catch (err) {
                console.error("Auto-save failed:", err.message);
            } finally {
                setLoading(false);
            }
        }, 2 * 60 * 1000);

        return () => clearInterval(interval);
    }, [editMode, flightNo, flightWeight, flightRegion, flightType, operator, bayNo, gateNo, airport, std, atd, stdAtdDiff, crewCount, paxMembers, loadingStart, loadingOver, status, page_name, fhr_id]);

    const validateDeparture = (action = 'saving') =>
        collectRequiredErrors(
            departureRequiredChecks({
                flight_no: flightNo,
                operator,
                bay_no: bayNo,
                gate_no: gateNo,
                atd,
                std_atd_diff: stdAtdDiff,
            }),
            action
        );

    const persistDeparture = async ({ notifyResult = false, action = 'saving' } = {}) => {
        if (shouldEnforceRequired(action)) {
            const result = validateDeparture(action);
            if (!result.ok) {
                setFieldErrors(result.fieldErrors);
                if (notifyResult) notify?.('error', result.message);
                return { ...result, section: 'Departure' };
            }
        }
        setFieldErrors({});
        if (isLocked) return { ok: true, missing: [], section: 'Departure' };
        await api.put(`/edit_fhr/update-departure-details/${page_name}/${fhr_id}`, {
            flight_no: flightNo,
            flight_weight: flightWeight,
            flight_region: flightRegion,
            flight_type: flightType,
            operator,
            bay_no: bayNo,
            gate_no: gateNo,
            airport,
            std,
            atd,
            std_atd_diff: stdAtdDiff,
            crew_count: crewCount,
            pax_members: paxMembers,
            loading_start: loadingStart,
            loading_over: loadingOver,
            status
        });
        clearLocalStorageForDeparture();
        try {
            await api.post(`/edit_fhr/start-edit-session/${page_name}/${fhr_id}`, {
                section: 'Departure_Details',
                action: 'end'
            });
        } catch (endErr) {
            console.warn("End edit session failed:", endErr.message);
        }
        setEditMode(false);
        return { ok: true, missing: [], section: 'Departure' };
    };

    useImperativeHandle(ref, () => ({
        validate: (action) => {
            const result = validateDeparture(action);
            if (!result.ok) setFieldErrors(result.fieldErrors);
            return { ...result, section: 'Departure' };
        },
        saveIfValid: (action) => persistDeparture({ action }),
    }));

    const handleInstantSave = async () => {
        if (!editMode) return;
        try {
            setLoading(true);
            const result = await persistDeparture({ notifyResult: true });
            if (result.ok) notify?.('success', 'Departure details saved');
        } catch (err) {
            console.error("Instant save failed:", err.message);
            notify?.('error', err.response?.data?.message || 'Failed to save Departure details');
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
                    <h5 className="rol-title">3. Departure Details</h5>
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
                        <Col lg={3} md={4} className="px-2">
                            <Form.Group className="mb-2">
                                <Form.Label>
                                    Flight No. <RequiredMark />
                                    <Button
                                        icon="pi pi-question-circle"
                                        text
                                        severity="help"
                                        tooltip="Require input for either Arrival flight no, Departure flight no, or both."
                                        tooltipOptions={{ position: "right" }}
                                        className="p-0 border-0"
                                        style={{ width: '30px' }}
                                    />
                                </Form.Label>
                                <Form.Control
                                    placeholder="Enter Flight No."
                                    className={`w-100${fieldErrors.flight_no ? ' is-invalid' : ''}`}
                                    value={flightNo}
                                    onChange={(e) => {
                                        setFlightNo(e.target.value);
                                        setFieldErrors((prev) => ({ ...prev, flight_no: false }));
                                    }}
                                    disabled={isDisabled}
                                />
                            </Form.Group>
                        </Col>
                        <Col lg={3} md={4} className="px-2">
                            <Form.Group className="mb-2">
                                <Form.Label>Flight Weight (MTOW) </Form.Label>
                                <Form.Control placeholder="Enter Flight Weight (MTOW)" className="w-100" value={flightWeight} onChange={(e) => setFlightWeight(e.target.value)} disabled={isDisabled} />
                            </Form.Group>
                        </Col>
                        <Col lg={3} md={4} className="px-2">
                            <Form.Group className="mb-2">
                                <Form.Label>Flight Regn</Form.Label>
                                <Form.Control placeholder="Enter Flight Regn" className="w-100" value={flightRegion} onChange={(e) => setFlightRegion(e.target.value)} disabled={isDisabled} />
                            </Form.Group>
                        </Col>
                        <Col lg={3} md={4} className="px-2">
                            <Form.Group className="mb-2">
                                <Form.Label>Flight Type</Form.Label>
                                <Form.Control placeholder="Enter Flight Type" className="w-100" value={flightType} onChange={(e) => setFlightType(e.target.value)} disabled={isDisabled} />
                            </Form.Group>
                        </Col>

                        <Col lg={3} md={4} className="px-2">
                            <Form.Group className="mb-2">
                                <Form.Label>Operator <RequiredMark /></Form.Label>
                                <Form.Control
                                    placeholder="Enter Operator"
                                    className={`w-100${fieldErrors.operator ? ' is-invalid' : ''}`}
                                    value={operator}
                                    onChange={(e) => {
                                        setOperator(e.target.value);
                                        setFieldErrors((prev) => ({ ...prev, operator: false }));
                                    }}
                                    disabled={isDisabled}
                                />
                            </Form.Group>
                        </Col>
                        <Col lg={3} md={4} className="px-2">
                            <Form.Group className="mb-2">
                                <Form.Label>Bay No. <RequiredMark /></Form.Label>
                                <Form.Control
                                    placeholder="Enter Bay No."
                                    className={`w-100${fieldErrors.bay_no ? ' is-invalid' : ''}`}
                                    value={bayNo}
                                    onChange={(e) => {
                                        setBayNo(e.target.value);
                                        setFieldErrors((prev) => ({ ...prev, bay_no: false }));
                                    }}
                                    disabled={isDisabled}
                                />
                            </Form.Group>
                        </Col>
                        <Col lg={3} md={4} className="px-2">
                            <Form.Group className="mb-2">
                                <Form.Label>Gate No. <RequiredMark /></Form.Label>
                                <Form.Control
                                    placeholder="Enter Gate No."
                                    className={`w-100${fieldErrors.gate_no ? ' is-invalid' : ''}`}
                                    value={gateNo}
                                    onChange={(e) => {
                                        setGateNo(e.target.value);
                                        setFieldErrors((prev) => ({ ...prev, gate_no: false }));
                                    }}
                                    disabled={isDisabled}
                                />
                            </Form.Group>
                        </Col>
                        <Col lg={3} md={4} className="px-2">
                            <Form.Group className="mb-2">
                                <Form.Label>Airport</Form.Label>
                                <Form.Control placeholder="Enter Airport" className="w-100" value={airport} onChange={(e) => setAirport(e.target.value)} disabled={isDisabled} />
                            </Form.Group>
                        </Col>


                        <Col lg={3} md={4} className="px-2">
                            <Form.Group className="mb-2">
                                <Form.Label>STD (24-hour Format)</Form.Label>
                                <Calendar
                                    value={std}
                                    onChange={(e) => setStd(e.value)}
                                    disabled={isDisabled}
                                    showTime
                                    hourFormat="24"
                                    dateFormat="dd/mm/yy"
                                    className="w-100"
                                />
                            </Form.Group>
                        </Col>
                        <Col lg={3} md={4} className="px-2">
                            <Form.Group className="mb-2">
                                <Form.Label>ATD (24-hour Format) <RequiredMark /></Form.Label>
                                <Calendar
                                    value={atd}
                                    onChange={(e) => {
                                        setAtd(e.value);
                                        setFieldErrors((prev) => ({ ...prev, atd: false, std_atd_diff: false }));
                                    }}
                                    disabled={isDisabled}
                                    showTime
                                    hourFormat="24"
                                    dateFormat="dd/mm/yy"
                                    className={`w-100${fieldErrors.atd ? ' p-invalid' : ''}`}
                                />
                            </Form.Group>
                        </Col>
                        <Col lg={3} md={4} className="px-2">
                            <Form.Group className="mb-2">
                                <Form.Label>STD ATD Diff (in mins) <RequiredMark /></Form.Label>
                                <Form.Control
                                    className={`w-100${fieldErrors.std_atd_diff ? ' is-invalid' : ''}`}
                                    disabled
                                    value={stdAtdDiff !== null ? stdAtdDiff : ""}
                                    readOnly
                                />
                            </Form.Group>
                        </Col>
                        <Col lg={3} md={4} className="px-2">
                            <Form.Group className="mb-2">
                                <Form.Label>Crew Members (in Numbers)</Form.Label>
                                <InputNumber inputId="withoutgrouping" value={crewCount} onValueChange={(e) => setCrewCount(e.value)} useGrouping={false} className="w-100" disabled={isDisabled} />
                            </Form.Group>
                        </Col>

                        <Col lg={3} md={4} className="px-2">
                            <Form.Group className="mb-2">
                                <Form.Label>Pax Members (in Numbers)</Form.Label>
                                <InputNumber inputId="withoutgrouping" value={paxMembers} onValueChange={(e) => setPaxMembers(e.value)} useGrouping={false} className="w-100" disabled={isDisabled} />
                            </Form.Group>
                        </Col>
                        <Col lg={3} md={4} className="px-2">
                            <Form.Group className="mb-2">
                                <Form.Label>Loading Start (24-hour Format)</Form.Label>
                                <Calendar
                                    value={loadingStart}
                                    onChange={(e) => setLoadingStart(e.value)}
                                    disabled={isDisabled}
                                    showTime
                                    hourFormat="24"
                                    dateFormat="dd/mm/yy"
                                    className="w-100"
                                />
                            </Form.Group>
                        </Col>
                        <Col lg={3} md={4} className="px-2">
                            <Form.Group className="mb-2">
                                <Form.Label>Loading Over (24-hour Format)</Form.Label>
                                <Calendar
                                    value={loadingOver}
                                    onChange={(e) => setLoadingOver(e.value)}
                                    disabled={isDisabled}
                                    showTime
                                    hourFormat="24"
                                    dateFormat="dd/mm/yy"
                                    className="w-100"
                                />
                            </Form.Group>
                        </Col>
                        <Col lg={3} md={4} className="px-2">
                            <Form.Group className="mb-2">
                                <Form.Label>Status</Form.Label>
                                <Form.Select value={status} onChange={(e) => setStatus(e.target.value)} disabled={isDisabled}>
                                    <option value="">--- Select Status ---</option>
                                    <option value="Draft">Draft</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Submitted">Submitted</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>

                    </Row>
                </div>
            </Col>
        </Row>
    );
});

export default Departure_details;
