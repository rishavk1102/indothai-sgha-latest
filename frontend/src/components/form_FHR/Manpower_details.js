import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from '../../components/Layout';
import { Row, Col, Form } from 'react-bootstrap';
import { IoChevronBackOutline } from "react-icons/io5";
import { InputNumber } from 'primereact/inputnumber';
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
const Manpower_details = ({ userId, fhr_id, page_name }) => {
    const { roleId } = useAuth();
    const socket = getSocket();
    const navigate = useNavigate();

    const getLocal = (key) => localStorage.getItem(`${page_name}_${key}`) || "";

    const [loading, setLoading] = useState(true);
    const [unauthorized, setUnauthorized] = useState(false);




    const [arrivalWheelChair, setArrivalWheelChair] = useState(localStorage.getItem(`${page_name}_arri_wheel_chair`) || "");
    const [departureWheelChair, setDepartureWheelChair] = useState(localStorage.getItem(`${page_name}_dep_wheel_chair`) || "");
    const [totalWheelChair, setTotalWheelChair] = useState(localStorage.getItem(`${page_name}_total_wheel_chair`) || "");
    const [maas, setMaas] = useState(localStorage.getItem(`${page_name}_maas`) || "");
    const [fhrStatus, setFhrStatus] = useState(localStorage.getItem(`${page_name}_fhrStatus`) || "Draft");
    const [editMode, setEditMode] = useState(false);
    const [lastEditedBy, setLastEditedBy] = useState(null);
    const [activeEditors, setActiveEditors] = useState([]);

    const isDisabled = !editMode || ['Draft', 'Submitted', 'Completed', 'Cancelled'].includes(fhrStatus);

    useEffect(() => localStorage.setItem(`${page_name}_arri_wheel_chair`, arrivalWheelChair), [arrivalWheelChair]);
    useEffect(() => localStorage.setItem(`${page_name}_dep_wheel_chair`, departureWheelChair), [departureWheelChair]);
    useEffect(() => localStorage.setItem(`${page_name}_total_wheel_chair`, totalWheelChair), [totalWheelChair]);
    useEffect(() => localStorage.setItem(`${page_name}_maas`, maas), [maas]);
    useEffect(() => localStorage.setItem(`${page_name}_fhrStatus`, fhrStatus), [fhrStatus]);

    useEffect(() => {
        if (!socket || !fhr_id) return;

        const fetchManpowerDetails = () => {
            socket.emit('fetch-manpower-details', {
                role_id: roleId,
                page_name,
                fhr_id,
            });
        };

        const handleSuccess = (data) => {
            setArrivalWheelChair(data.arrival_wheel_chair || "");
            setDepartureWheelChair(data.departure_wheel_chair || "");
            setTotalWheelChair(data.total_wheel_chair || "");
            setMaas(data.maas || "");
            setFhrStatus(data.status || "Draft");
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
                fetchManpowerDetails();
            }
        };

        // Initial fetch
        fetchManpowerDetails();

        // Register listeners
        socket.on('fetch-manpower-details-success', handleSuccess);
        socket.on('fetch-manpower-details-error', handleError);
        socket.on('fhrUpdated', handleFhrUpdated);

        return () => {
            socket.off('fetch-manpower-details-success', handleSuccess);
            socket.off('fetch-manpower-details-error', handleError);
            socket.off('fhrUpdated', handleFhrUpdated);
        };
    }, [socket, roleId, page_name, fhr_id]);


    const handleEditToggle = async () => {
        setLoading(true); // Show spinner while action happens

        try {
            const action = editMode ? 'end' : 'start';

            const response = await api.post(`/edit_fhr/start-edit-session/${page_name}/${fhr_id}`, {
                section: 'Man_Power_Details',
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


    const clearLocalStorageForManpower = () => {
        Object.keys(localStorage).forEach((key) => {
            if (key.startsWith(`${page_name}_`) &&
                (key.includes("arri_wheel_chair") ||
                    key.includes("dep_wheel_chair") ||
                    key.includes("total_wheel_chair") ||
                    key.includes("maas") ||
                    key.includes("fhrStatus"))) {
                localStorage.removeItem(key);
            }
        });
    };



    useEffect(() => {
        if (!editMode) return;

        const interval = setInterval(async () => {
            try {
                setLoading(true);
                await api.put(`/edit_fhr/update-manpower-details/${page_name}/${fhr_id}`, {
                    arrival_wheel_chair: arrivalWheelChair,
                    departure_wheel_chair: departureWheelChair,
                    total_wheel_chair: totalWheelChair,
                    maas,
                    status: fhrStatus
                });
                // Γ£à Clear local storage
                clearLocalStorageForManpower();
            } catch (err) {
                console.error("Auto-save failed:", err.message);
            } finally {
                setLoading(false);
            }
        }, 2 * 60 * 1000);

        return () => clearInterval(interval);
    }, [editMode, arrivalWheelChair, departureWheelChair, totalWheelChair, maas, fhrStatus, page_name, fhr_id]);

    const handleInstantSave = async () => {
        if (!editMode) return;
        try {
            setLoading(true);
            await api.put(`/edit_fhr/update-manpower-details/${page_name}/${fhr_id}`, {
                arrival_wheel_chair: arrivalWheelChair,
                departure_wheel_chair: departureWheelChair,
                total_wheel_chair: totalWheelChair,
                maas,
                status: fhrStatus
            });
            // Γ£à Clear on successful save
            clearLocalStorageForManpower();
        } catch (err) {
            console.error("Instant save failed:", err.message);
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
                    <h5 className="rol-title">4. Manpower Details (In Numbers)</h5>
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
                                {!['Draft', 'Completed', 'Cancelled'].includes(fhrStatus) && (
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
                                <Form.Label>Arrival Wheel Chair</Form.Label>
                                <InputNumber inputId="withoutgrouping" value={arrivalWheelChair} onValueChange={(e) => setArrivalWheelChair(e.value)} useGrouping={false} className="w-100" disabled={isDisabled} />
                            </Form.Group>
                        </Col>
                        <Col lg={3} md={4} className="px-2">
                            <Form.Group className="mb-2">
                                <Form.Label>Departure Wheel Chair</Form.Label>
                                <InputNumber inputId="withoutgrouping" value={departureWheelChair} onValueChange={(e) => setDepartureWheelChair(e.value)} useGrouping={false} className="w-100" disabled={isDisabled} />
                            </Form.Group>
                        </Col>
                        <Col lg={3} md={4} className="px-2">
                            <Form.Group className="mb-2">
                                <Form.Label>Total Wheel Chair</Form.Label>
                                <InputNumber inputId="withoutgrouping" value={totalWheelChair} onValueChange={(e) => setTotalWheelChair(e.value)} useGrouping={false} className="w-100" disabled={isDisabled} />
                            </Form.Group>
                        </Col>
                        <Col lg={3} md={4} className="px-2">
                            <Form.Group className="mb-2">
                                <Form.Label>MAAS</Form.Label>
                                <InputNumber inputId="withoutgrouping" value={maas} onValueChange={(e) => setMaas(e.value)} useGrouping={false} className="w-100" disabled={isDisabled} />
                            </Form.Group>
                        </Col>
                        <Col lg={3} md={4} className="px-2">
                            <Form.Group className="mb-2">
                                <Form.Label>Status</Form.Label>
                                <Form.Select
                                    value={fhrStatus}
                                    onChange={(e) => setFhrStatus(e.target.value)}
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

export default Manpower_details;
