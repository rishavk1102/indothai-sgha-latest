import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from '../../components/Layout';
import { Row, Col, Form } from 'react-bootstrap';
import { IoChevronBackOutline } from "react-icons/io5";
import { InputNumber } from 'primereact/inputnumber';
import { Calendar } from 'primereact/calendar';
import { getSocket } from "../../context/socket";
import GifLoder from '../../interfaces/GifLoder';
import { useDebounce } from 'use-debounce'; // First, install it via npm
import { Dialog } from "primereact/dialog";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Avatar } from 'primereact/avatar';
import { AvatarGroup } from 'primereact/avatargroup';
import nouser from '../../assets/images/no_user.png';
const Cargo_details = ({ userId, fhr_id, page_name, parentStatus, notify }) => {
    const { roleId } = useAuth();
    const socket = getSocket();
    const navigate = useNavigate();

    const getLocal = (key) => localStorage.getItem(`${page_name}_${key}`) || "";

    const [loading, setLoading] = useState(true);
    const [unauthorized, setUnauthorized] = useState(false);

    const [noOfTrips, setNoOfTrips] = useState(Number(getLocal("noOfTrips")) || null);
    const [startTime, setStartTime] = useState(getLocal("startTime") ? new Date(getLocal("startTime")) : null);
    const [endTime, setEndTime] = useState(getLocal("endTime") ? new Date(getLocal("endTime")) : null);
    const [totalTime, setTotalTime] = useState(getLocal("totalTime"));
    const [status, setStatus] = useState(getLocal("status") || "");
    const [editMode, setEditMode] = useState(false);
    const [lastEditedBy, setLastEditedBy] = useState(null);
    const [activeEditors, setActiveEditors] = useState([]);

    // Lock only when the whole FHR is submitted/completed/cancelled.
    const isLocked = ['Submitted', 'Completed', 'Cancelled'].includes(parentStatus);
    const isDisabled = !editMode || isLocked;

    useEffect(() => {
        localStorage.setItem(`${page_name}_noOfTrips`, noOfTrips ?? "");
    }, [noOfTrips]);

    useEffect(() => {
        localStorage.setItem(`${page_name}_startTime`, startTime ?? "");
    }, [startTime]);

    useEffect(() => {
        localStorage.setItem(`${page_name}_endTime`, endTime ?? "");
    }, [endTime]);

    useEffect(() => {
        localStorage.setItem(`${page_name}_totalTime`, totalTime ?? "");
    }, [totalTime]);

    useEffect(() => {
        localStorage.setItem(`${page_name}_status`, status ?? "");
    }, [status]);



    useEffect(() => {
        if (startTime && endTime) {
            const diffMs = new Date(endTime) - new Date(startTime);
            if (diffMs > 0) {
                const minutes = Math.floor(diffMs / 60000); // 1 minute = 60000 ms
                setTotalTime(minutes);
            } else {
                setTotalTime(0); // optional: prevent negative values
            }
        } else {
            setTotalTime("");
        }
    }, [startTime, endTime]);


    useEffect(() => {
        if (!socket || !fhr_id) return;

        const fetchCargoDetails = () => {
            socket.emit("fetch-cargo-details", {
                role_id: roleId,
                page_name,
                fhr_id,
            });
        };

        const handleSuccess = (data) => {
            setNoOfTrips(data.no_of_trips ?? noOfTrips);
            setStartTime(data.start_time ? new Date(data.start_time) : startTime);
            setEndTime(data.end_time ? new Date(data.end_time) : endTime);
            setTotalTime(data.total_time ?? totalTime);
            setStatus(data.status ?? status);
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
                fetchCargoDetails();
            }
        };

        fetchCargoDetails();

        socket.on("fetch-cargo-details-success", handleSuccess);
        socket.on("fetch-cargo-details-error", handleError);
        socket.on("fhrUpdated", handleFhrUpdated);

        return () => {
            socket.off("fetch-cargo-details-success", handleSuccess);
            socket.off("fetch-cargo-details-error", handleError);
            socket.off("fhrUpdated", handleFhrUpdated);
        };
    }, [socket, roleId, page_name, fhr_id]);

    const handleEditToggle = async () => {
        setLoading(true);

        try {
            const action = editMode ? 'end' : 'start';

            const response = await api.post(`/edit_fhr/start-edit-session/${page_name}/${fhr_id}`, {
                section: 'Cargo_Details',
                action
            });

            if (action === 'start' && response.data?.session) {
                setEditMode(true);
            } else if (action === 'end') {
                setEditMode(false);
            } else {
                console.warn("Edit session action response invalid");
            }
        } catch (err) {
            console.error(`Failed to ${editMode ? 'end' : 'start'} edit session:`, err);
            if (err.response?.status === 403) {
                setUnauthorized(true);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!editMode) return;

        const interval = setInterval(async () => {
            try {
                setLoading(true);
                await api.put(`/edit_fhr/update-cargo-details/${page_name}/${fhr_id}`, {
                    no_of_trips: noOfTrips,
                    start_time: startTime,
                    end_time: endTime,
                    total_time: totalTime,
                    status,
                });
                // Clear local storage on successful auto-save
                localStorage.removeItem(`${page_name}_noOfTrips`);
                localStorage.removeItem(`${page_name}_startTime`);
                localStorage.removeItem(`${page_name}_endTime`);
                localStorage.removeItem(`${page_name}_totalTime`);
                localStorage.removeItem(`${page_name}_status`);
            } catch (err) {
                console.error("Auto-save failed:", err.message);
            } finally {
                setLoading(false);
            }
        }, 2 * 60 * 1000);

        return () => clearInterval(interval);
    }, [editMode, noOfTrips, startTime, endTime, totalTime, status, page_name, fhr_id]);

    const handleInstantSave = async () => {
        if (!editMode) return;
        try {
            setLoading(true);
            await api.put(`/edit_fhr/update-cargo-details/${page_name}/${fhr_id}`, {
                no_of_trips: noOfTrips,
                start_time: startTime,
                end_time: endTime,
                total_time: totalTime,
                status,
            });
            // Clear local storage on success
            localStorage.removeItem(`${page_name}_noOfTrips`);
            localStorage.removeItem(`${page_name}_startTime`);
            localStorage.removeItem(`${page_name}_endTime`);
            localStorage.removeItem(`${page_name}_totalTime`);
            localStorage.removeItem(`${page_name}_status`);

            try {
                await api.post(`/edit_fhr/start-edit-session/${page_name}/${fhr_id}`, {
                    section: 'Cargo_Details',
                    action: 'end'
                });
            } catch (endErr) {
                console.warn("End edit session failed:", endErr.message);
            }
            setEditMode(false);
            notify?.('success', 'Cargo details saved');
        } catch (err) {
            console.error("Instant save failed:", err.message);
            notify?.('error', err.response?.data?.message || 'Failed to save Cargo details');
        } finally {
            setLoading(false);
        }
    };



    const handleDialogHide = () => navigate(-1);

    if (unauthorized) {
        return (
            <Dialog style={{ width: '360px' }} visible={unauthorized} onHide={handleDialogHide} closable={false}>
                <div className="text-center">
                    <img src="https://blackboxstorage.blr1.cdn.digitaloceanspaces.com/assetImages/protect.png" alt="unauthorized" width="100" className="mb-3" />
                    <h5>Unauthorized</h5>
                    <p>You are not authorized</p>
                    <Button label="Go Back" icon="pi pi-arrow-left" className="py-2 mt-3" style={{ fontSize: '14px' }} severity="danger" onClick={handleDialogHide} />
                </div>
            </Dialog>
        );
    }

    return (
        <Row className="mx-0">
            <Col md={12} lg={12} className="mt-4 p-0">
                <div className="allempList fhr_form">
                    <h5 className="rol-title">5. Cargo Details</h5>
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
                                <Form.Label>No. of Trips (In Numbers)</Form.Label>
                                <InputNumber value={noOfTrips} onValueChange={(e) => setNoOfTrips(e.value)} useGrouping={false} className="w-100" disabled={isDisabled} />
                            </Form.Group>
                        </Col>
                        <Col lg={3} md={4} className="px-2">
                            <Form.Group className="mb-2">
                                <Form.Label>Start Time (24-hour Format)</Form.Label>
                                <Calendar value={startTime} onChange={(e) => setStartTime(e.value)} showTime hourFormat="24" dateFormat="dd/mm/yy" className="w-100" disabled={isDisabled} />
                            </Form.Group>
                        </Col>
                        <Col lg={3} md={4} className="px-2">
                            <Form.Group className="mb-2">
                                <Form.Label>End Time (24-hour Format)</Form.Label>
                                <Calendar value={endTime} onChange={(e) => setEndTime(e.value)} showTime hourFormat="24" dateFormat="dd/mm/yy" className="w-100" disabled={isDisabled} />
                            </Form.Group>
                        </Col>
                        <Col lg={3} md={4} className="px-2">
                            <Form.Group className="mb-2">
                                <Form.Label>Total Time (In Minutes)</Form.Label>
                                <Form.Control value={totalTime} className="w-100" disabled />
                            </Form.Group>
                        </Col>
                        <Col lg={3} md={4} className="px-2">
                            <Form.Group className="mb-2">
                                <Form.Label>Status</Form.Label>
                                <Form.Select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    disabled={isDisabled}
                                >
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
};


export default Cargo_details;
