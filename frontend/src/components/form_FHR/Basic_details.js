import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from '../../components/Layout';
import { Row, Col, Form } from 'react-bootstrap';
import { IoChevronBackOutline } from "react-icons/io5";
import { getSocket } from "../../context/socket";
import GifLoder from '../../interfaces/GifLoder';
import { useDebounce } from 'use-debounce'; // First, install it via npm
import { Dialog } from "primereact/dialog";
import { Button } from 'primereact/button';
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { ProgressSpinner } from 'primereact/progressspinner';
import { Avatar } from 'primereact/avatar';
import { AvatarGroup } from 'primereact/avatargroup';
import nouser from '../../assets/images/no_user.png';


const Basic_details = ({ userId, fhr_id, page_name, parentStatus, notify }) => {
    const { role, roleId } = useAuth(); // Get roleId from the context
    const [loading, setLoading] = useState(true);  // Block UI until all fetches succeed
    const [unauthorized, setUnauthorized] = useState(false); // Show Dialog if error
    const socket = getSocket();
    const navigate = useNavigate();
    const [iec, setIec] = useState(localStorage.getItem(`${page_name}_basic_details_iec`) || "");
    const [epcg, setEpcg] = useState(localStorage.getItem(`${page_name}_basic_details_epcg`) || "");
    const [originCountry, setOriginCountry] = useState(localStorage.getItem(`${page_name}_basic_details_originCountry`) || "");
    const [deliveryPlace, setDeliveryPlace] = useState(localStorage.getItem(`${page_name}_basic_details_deliveryPlace`) || "");
    const [fhrStatus, setFhrStatus] = useState(localStorage.getItem(`${page_name}_basic_details_fhrStatus`) || "");
    const [lastEditedBy, setLastEditedBy] = useState(null);
    const [activeEditors, setActiveEditors] = useState([]);
    const [editMode, setEditMode] = useState(false);


    // Lock only when the whole FHR is submitted/completed/cancelled.
    // Section Status "Submitted" marks the section ready — it must not freeze fields.
    const isLocked = ['Submitted', 'Completed', 'Cancelled'].includes(parentStatus);
    const isDisabled = !editMode || isLocked;



    // Save to localStorage
    useEffect(() => localStorage.setItem(`${page_name}_basic_details_iec`, iec), [iec]);
    useEffect(() => localStorage.setItem(`${page_name}_basic_details_epcg`, epcg), [epcg]);
    useEffect(() => localStorage.setItem(`${page_name}_basic_details_originCountry`, originCountry), [originCountry]);
    useEffect(() => localStorage.setItem(`${page_name}_basic_details_deliveryPlace`, deliveryPlace), [deliveryPlace]);
    useEffect(() => localStorage.setItem(`${page_name}_basic_details_fhrStatus`, fhrStatus), [fhrStatus]);





    useEffect(() => {
        if (!socket || !fhr_id) return;

        const fetchBasicDetails = () => {
            socket.emit("fetch-basic-details", {
                role_id: roleId,
                page_name,
                fhr_id,
            });
        };

        const handleSuccess = (data) => {
            setIec(data.ice_no || "");
            setEpcg(data.epcg_no || "");
            setOriginCountry(data.country_of_origin_of_service || "");
            setDeliveryPlace(data.place_of_delivery_of_service || "");
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
                fetchBasicDetails();
            }
        };

        fetchBasicDetails(); // Initial fetch

        socket.on("fetch-basic-details-success", handleSuccess);
        socket.on("fetch-basic-details-error", handleError);
        socket.on("fhrUpdated", handleFhrUpdated);

        return () => {
            socket.off("fetch-basic-details-success", handleSuccess);
            socket.off("fetch-basic-details-error", handleError);
            socket.off("fhrUpdated", handleFhrUpdated);
        };
    }, [socket, roleId, page_name, fhr_id]);


    const handleEditToggle = async () => {
        setLoading(true); // Show spinner while action happens

        try {
            const action = editMode ? 'end' : 'start';

            const response = await api.post(`/edit_fhr/start-edit-session/${page_name}/${fhr_id}`, {
                section: 'Basic_Details',
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
        if (!editMode) return;

        const interval = setInterval(async () => {
            try {
                setLoading(true); // Start spinner
                await api.put(`/edit_fhr/update-basic-details/${page_name}/${fhr_id}`, {
                    ice_no: iec,
                    epcg_no: epcg,
                    country_of_origin_of_service: originCountry,
                    place_of_delivery_of_service: deliveryPlace,
                    status: fhrStatus // Γ£à Include status
                });

                // Clear local storage keys after success
                localStorage.removeItem(`${page_name}_basic_details_iec`);
                localStorage.removeItem(`${page_name}_basic_details_epcg`);
                localStorage.removeItem(`${page_name}_basic_details_originCountry`);
                localStorage.removeItem(`${page_name}_basic_details_deliveryPlace`);
                localStorage.removeItem(`${page_name}_basic_details_fhrStatus`);
            } catch (err) {
                console.error("Auto-save failed:", err.message);
            } finally {
                setLoading(false); // Stop spinner
            }
        }, 2 * 60 * 1000); // Every 2 minutes

        return () => clearInterval(interval); // Cleanup on editMode toggle
    }, [editMode, iec, epcg, originCountry, deliveryPlace, fhrStatus, page_name, fhr_id]);



    const handleInstantSave = async () => {
        if (!editMode) return;
        try {
            setLoading(true);
            await api.put(`/edit_fhr/update-basic-details/${page_name}/${fhr_id}`, {
                ice_no: iec,
                epcg_no: epcg,
                country_of_origin_of_service: originCountry,
                place_of_delivery_of_service: deliveryPlace,
                status: fhrStatus // Γ£à Include status
            });
            // Clear local storage keys after success
            localStorage.removeItem(`${page_name}_basic_details_iec`);
            localStorage.removeItem(`${page_name}_basic_details_epcg`);
            localStorage.removeItem(`${page_name}_basic_details_originCountry`);
            localStorage.removeItem(`${page_name}_basic_details_deliveryPlace`);
            localStorage.removeItem(`${page_name}_basic_details_fhrStatus`);

            // Close the edit session + leave edit mode so the Save button goes away
            try {
                await api.post(`/edit_fhr/start-edit-session/${page_name}/${fhr_id}`, {
                    section: 'Basic_Details',
                    action: 'end'
                });
            } catch (endErr) {
                console.warn("End edit session failed:", endErr.message);
            }
            setEditMode(false);
            notify?.('success', 'Basic details saved');
        } catch (err) {
            console.error("Instant save failed:", err.message);
            notify?.('error', err.response?.data?.message || 'Failed to save Basic details');
        } finally {
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
                        className="py-2 mt-3"
                        style={{ fontSize: '14px' }}
                        severity='danger'
                        onClick={handleDialogHide}
                    />
                </div>
            </Dialog>
        );
    }

    return (
        <Row className="mx-0">
            <Col md={12} lg={12} className="mt-4 p-0">
                <div className="allempList fhr_form">
                    <h5 className="rol-title">1. Basic Details</h5>
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
                        <span className="d-flex align-items-end gap-2 mb-0">
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

                    <Row className="mx-0">
                        <Col lg={3} md={4} className="px-2">
                            <Form.Group className="mb-2">
                                <Form.Label>IEC No.</Form.Label>
                                <Form.Control value={iec} onChange={(e) => setIec(e.target.value)} placeholder="Enter IEC No." disabled={isDisabled} />
                            </Form.Group>
                        </Col>
                        <Col lg={3} md={4} className="px-2">
                            <Form.Group className="mb-2">
                                <Form.Label>EPCG No.</Form.Label>
                                <Form.Control value={epcg} onChange={(e) => setEpcg(e.target.value)} placeholder="Enter EPCG No." disabled={isDisabled} />
                            </Form.Group>
                        </Col>
                        <Col lg={3} md={4} className="px-2">
                            <Form.Group className="mb-2">
                                <Form.Label>Country of Origin of Service</Form.Label>
                                <Form.Control value={originCountry} onChange={(e) => setOriginCountry(e.target.value)} placeholder="Enter Origin Country" disabled={isDisabled} />
                            </Form.Group>
                        </Col>
                        <Col lg={3} md={4} className="px-2">
                            <Form.Group className="mb-2">
                                <Form.Label>Place of Delivery of Service</Form.Label>
                                <Form.Control value={deliveryPlace} onChange={(e) => setDeliveryPlace(e.target.value)} placeholder="Enter Delivery of Service" disabled={isDisabled} />
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

export default Basic_details;
