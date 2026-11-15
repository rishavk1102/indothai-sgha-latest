import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Breadcrumb, Card, Form, Badge } from 'react-bootstrap';
import { IoChevronBackOutline } from "react-icons/io5";
import { MdFlight } from "react-icons/md";
import { Avatar } from 'primereact/avatar';
import { GiAirplaneDeparture, GiAirplaneArrival } from "react-icons/gi";
import { Link } from 'react-router-dom';
import { Button } from 'primereact/button';
import { PiAirplaneLanding, PiAirplaneTakeoff } from "react-icons/pi";
import { InputIcon } from "primereact/inputicon";
import { IconField } from "primereact/iconfield";
import { InputText } from "primereact/inputtext";
import Newfhr_add from '../../components/Newfhr_add';
import { Dialog } from 'primereact/dialog';
import '../../assets/css/common_style.css';
import { useAuth } from "../../context/AuthContext.js";
import { getSocket } from "../../context/socket.js";
import GifLoder from '../../interfaces/GifLoder';
import { AvatarGroup } from 'primereact/avatargroup';
import { Tooltip } from 'primereact/tooltip';
import api from "../../api/axios.js";
import CustomToast from "../../components/CustomToast.js";
import { useDebounce } from 'use-debounce'; // First, install it via npm
import nouser from '../../assets/images/no_user.png';
const Upcoming_flights = () => {
    const { role, roleId, userId } = useAuth(); // Get roleId from the context
    const PAGE_NAME = "FHR List"; // Page name for permission checking
    const [loading, setLoading] = useState(true);  // Block UI until all fetches succeed
    const [unauthorized, setUnauthorized] = useState(false); // Show Dialog if error
    const toastRef = useRef(null);
    const socket = getSocket();
    const navigate = useNavigate();
    const goBack = () => {
        navigate(-1); // This will take the user back to the previous page in history
    };
    const [visible, setVisible] = useState(false);
    const [fhrListings, setFhrListings] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [limit, setLimit] = useState(50); // Or make it dynamic
    const [debouncedSearch] = useDebounce(searchTerm, 500); // 500ms debounce
    const [airports, setAirports] = useState([]);
    const [selectedAirport, setSelectedAirport] = useState(null);
    const [cancelDialogVisible, setCancelDialogVisible] = useState(false);
    const [cancellation_reason, setCancellation_reason] = useState('');
    const [selectedFhrId, setSelectedFhrId] = useState(null);

    const showMessage = (severity, detail) => {
        const summary = severity.charAt(0).toUpperCase() + severity.slice(1);
        toastRef.current.show(severity, summary, detail);
    };

    useEffect(() => {
        if (!socket || !roleId) return;

        const fetchListings = () => {
            socket.emit('view-fhr-listings', {
                role_id: roleId,
                page_name: PAGE_NAME,
                limit,
                searchTerm: debouncedSearch,
                airport_id: selectedAirport, // update if needed
            });
        };

        fetchListings();

        socket.on('view-fhr-listings-success', (data) => {
            setFhrListings(data);
            setLoading(false);
        });

        socket.on('view-fhr-listings-error', (error) => {
            const isPermissionError =
                error.message?.includes('Missing role_id') ||
                error.message?.includes('Page') ||
                error.message?.includes('Permission denied');

            if (isPermissionError) {
                setUnauthorized(true);
            } else {
                setFhrListings([]);
                console.warn('Airport fetch error:', error.message);
            }

            setLoading(false);
        });


        // Î“Â£Ã  Only refetch listings when emitted airport_id matches selectedAirport
        const handleFhrUpdated = ({ airport_id }) => {
            if (!selectedAirport || airport_id === selectedAirport) {
                fetchListings();
            }
        };

        socket.on("fhrUpdated", handleFhrUpdated);

        return () => {
            socket.off('view-fhr-listings-success');
            socket.off('view-fhr-listings-error');
            socket.off("fhrUpdated", handleFhrUpdated);
        };
    }, [socket, roleId, PAGE_NAME, debouncedSearch, limit, selectedAirport]);


    useEffect(() => {
        if (socket) {
            socket.emit("fetch-airports", { role_id: roleId, page_name: PAGE_NAME, user_id: userId });

            socket.on("fetch-airports-success", (data) => {
                const formatted = data.map((a) => ({ name: `${a.name} (${a.iata})`, code: a.airport_id }));
                setAirports(formatted);

                // Î“Â£Ã  Automatically select the first airport
                if (formatted.length > 0) {
                    setSelectedAirport(formatted[0].code);
                }

                setLoading(false);
            });



            socket.on("fetch-airports-error", (error) => {
                const isPermissionError =
                    error.message?.includes('Missing role_id') ||
                    error.message?.includes('Page') ||
                    error.message?.includes('Permission denied');

                if (isPermissionError) {
                    setUnauthorized(true);
                } else {
                    setAirports([]);
                    console.warn('Airport fetch error:', error.message);
                }

                setLoading(false);
            });

            return () => {
                socket.off("fetch-airports-success");
                socket.off("fetch-airports-error");
            };
        }
    }, [socket]);


    const handleCancelFHR = async () => {
        const newStatus = 'Cancelled';
        setLoading(true);
        try {
            const res = await api.put(`/edit_fhr/update-fhr-status/${PAGE_NAME}/${selectedFhrId}`, {
                newStatus,
                cancellation_reason
            });

            showMessage('success', `Flight #${selectedFhrId} cancelled successfully.`);
            // refresh or remove from list here
        } catch (err) {
            console.error('FHR status update error:', err);
            const message = err.response?.data?.message || 'Failed to cancel FHR.';
            showMessage('error', message);
            if (err.response?.status === 403) setUnauthorized(true);
        } finally {
            setLoading(false);
            setCancelDialogVisible(false);
            setSelectedFhrId(null);
            setCancellation_reason('');
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

    if (loading) {
        return <div className='loderDiv'><GifLoder /></div>;
    }


    return (
        <>

            <Row>
                <Col md={6} lg={6} xs={6} className="mb-4">
                    <Breadcrumb>
                        <Breadcrumb.Item onClick={goBack}>
                            <IoChevronBackOutline /> Back
                        </Breadcrumb.Item>
                        <Breadcrumb.Item active>Upcoming Flights</Breadcrumb.Item>
                    </Breadcrumb>
                </Col>
                <Col md={6} lg={6} xs={12} className="mb-4 filterDiv d-flex align-items-center justify-content-end gap-2">

                    <Form.Select
                        aria-label="Limit"
                        style={{ width: '100px' }}
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value))}
                    >
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={200}>200</option>
                        <option value={500}>500</option>
                    </Form.Select>
                    <Form.Select
                        aria-label="Airport Filter"
                        style={{ width: '250px' }}
                        value={selectedAirport}
                        onChange={(e) => setSelectedAirport(e.target.value)}
                    >
                        <option value="">-- Filter By Airport --</option>
                        {airports.map(airport => (
                            <option key={airport.code} value={airport.code}>
                                {airport.name}
                            </option>
                        ))}
                    </Form.Select>

                    <IconField iconPosition="left">
                        <InputIcon className="pi pi-search "> </InputIcon>
                        <InputText
                            placeholder="Search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </IconField>
                </Col>
                <Col md={12} lg={12}>
                    <Row className="mx-0 flightcard">
                        <ul>
                            {fhrListings.length === 0 ? (
                                <p className="text-center mt-4">No Upcoming Flights Found</p>
                            ) : (
                                fhrListings.map((flight) => (
                                    <li key={flight.fhr_listing_id}>
                                        <Card>
                                            <Card.Header className="d-flex align-items-center justify-content-between bg-transparent border-0 p-0">
                                                <div className="d-flex align-items-center gap-2 justify-content-between">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <Avatar className="me-2" style={{ backgroundColor: 'rgb(255 255 255 / 85%)', color: '#000' }} shape="circle" size="large">
                                                            {flight.type === 'Arrival' ? <GiAirplaneArrival /> : <GiAirplaneDeparture />}
                                                        </Avatar>
                                                        <h5>
                                                            {flight.airline_name || 'Unknown Airline'}
                                                            <small className="d-block">{flight.aircraft_type || 'Aircraft Type'}</small>
                                                        </h5>
                                                    </div>
                                                    <div className="ps-4">
                                                        <AvatarGroup>
                                                            {flight.active_editors?.length > 0 ? (
                                                                flight.active_editors.map((editor, idx) => (
                                                                    <React.Fragment key={editor.user_id}>
                                                                        <Avatar
                                                                            id={`avatar-${flight.fhr_listing_id}-${idx}`}
                                                                            image={editor.profileImage?.img_url || nouser}
                                                                            shape="circle"
                                                                            size="normal"
                                                                        />
                                                                        <Tooltip
                                                                            target={`#avatar-${flight.fhr_listing_id}-${idx}`}
                                                                            content={`${editor.first_name} ${editor.last_name}`}
                                                                        />
                                                                    </React.Fragment>
                                                                ))
                                                            ) : (
                                                                <span className="text-muted small">No Editors</span>
                                                            )}
                                                        </AvatarGroup>
                                                    </div>
                                                </div>

                                                <Badge>{flight.Fhr_type}</Badge>
                                            </Card.Header>

                                            <Card.Body className="px-0 pt-4 pb-2 position-relative">
                                                <div className="d-flex align-items-center gap-5 justify-content-start">
                                                    <p><small className="d-block text-secondary">Location</small><b>{flight.station}</b></p>
                                                    <p><small className="d-block text-secondary">Flight No.</small><b>{flight.flight_no}</b></p>
                                                    <p><b>{flight.type}</b></p>
                                                </div>
                                                <div className="flighticon">
                                                    {flight.type === 'Arrival' ? <PiAirplaneLanding /> : <PiAirplaneTakeoff />}
                                                </div>
                                            </Card.Body>

                                            <Card.Footer className="px-0 pb-0 border-0 bg-transparent d-flex align-items-center justify-content-between">
                                                <p className="m-0 text-muted" style={{ fontSize: '14px' }}>
                                                    <span><i className="pi pi-calendar" style={{ fontSize: '13px' }}></i> {new Date(flight.date_of_flight).toLocaleDateString('en-GB')}</span>
                                                    &nbsp; | &nbsp;
                                                    <span><i className="pi pi-clock" style={{ fontSize: '13px' }}></i> {flight.st}</span>
                                                </p>
                                                <div>
                                                    <Button
                                                        tooltip="Cancel Flight"
                                                        label="Cancel"
                                                        severity="danger"
                                                        className="px-2 py-1 border-0 me-2"
                                                        tooltipOptions={{ position: "bottom" }}
                                                        style={{ fontSize: '13px', letterSpacing: '0.5px' }}
                                                        onClick={() => {
                                                            setSelectedFhrId(flight.fhr_id); // store the selected ID
                                                            setCancelDialogVisible(true);  // open dialog
                                                        }}
                                                    />
                                                    <Button
                                                        tooltip="FHR"
                                                        label="FHR"
                                                        severity="warning"
                                                        className="px-3 py-1 border-0"
                                                        tooltipOptions={{ position: "bottom" }}
                                                        style={{ fontSize: '13px', letterSpacing: '0.5px' }}
                                                        onClick={() => navigate(`/dashboard/edit_fhr/${flight.fhr_id}`)}
                                                    />
                                                </div>
                                            </Card.Footer>
                                        </Card>
                                    </li>
                                ))
                            )}
                        </ul>
                    </Row>
                </Col>
            </Row>
            <Dialog
                header="Cancel Flight"
                visible={cancelDialogVisible}
                style={{ width: '400px' }}
                onHide={() => {
                    setCancelDialogVisible(false);
                    setSelectedFhrId(null);
                    setCancellation_reason('');
                }}
                closable
                footer={
                    <div className="d-flex justify-content-end gap-2">
                        <Button label="Cancel" className="p-button-text" onClick={() => {
                            setCancelDialogVisible(false);
                            setSelectedFhrId(null);
                            setCancellation_reason('');
                        }} />
                        <Button
                            label="Confirm Cancellation"
                            severity="danger"
                            onClick={handleCancelFHR}
                            disabled={!cancellation_reason.trim()}
                        />
                    </div>
                }
            >
                <p>This action is <strong>irreversible</strong>. Are you sure you want to cancel this flight?</p>
                <div className="mb-3">
                    <label htmlFor="cancelReason" className="form-label">Reason for Cancellation:</label>
                    <InputText
                        id="cancelReason"
                        value={cancellation_reason}
                        onChange={(e) => setCancellation_reason(e.target.value)}
                        className="w-100"
                    />
                </div>
            </Dialog>
            <CustomToast ref={toastRef} />
        </>
    );
};

export default Upcoming_flights;
