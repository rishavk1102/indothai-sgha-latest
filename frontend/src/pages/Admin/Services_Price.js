import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Row, Col, Card, Form, InputGroup, Badge, Tab, Table, Breadcrumb } from "react-bootstrap";
import { Button } from "primereact/button";
import { Sidebar } from 'primereact/sidebar';
import { TabView, TabPanel } from 'primereact/tabview';
import { getSocket } from '../../context/socket';
import api from "../../api/axios.js";
import GifLoder from '../../interfaces/GifLoder';
import { useDebounce } from 'use-debounce'; // First, install it via npm
import { Dialog } from "primereact/dialog";
import FlightTypeServices from "../../components/FlightTypeServices.js";
import AddServicePriceSidebar from "../../components/AddServicePriceSidebar.js";
const Services_Price = () => {
    const { roleId, userId } = useAuth();
    const socket = getSocket();
    const PAGE_NAME = "Services Price"; // Page name for permission checking
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const navigate = useNavigate();
    const goBack = () => {
        navigate(-1); // This will take the user back to the previous page in history
    };

    const [flightTypes, setFlightTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [businesses, setBusinesses] = useState([]);
    const [selectedBusiness, setSelectedBusiness] = useState('');
    const [airports, setAirports] = useState([]);
    const [selectedAirport, setSelectedAirport] = useState('');
    const [unauthorized, setUnauthorized] = useState(false);

    useEffect(() => {
        if (!socket) return;

        socket.emit('fetch-businesses', {
            role_id: roleId,
            page_name: PAGE_NAME,
            user_id: userId
        });

        socket.on('fetch-businesses-success', (data) => {
            setBusinesses(data);
            setSelectedBusiness(data[0]?.business_id || '');
        });

        socket.on('fetch-businesses-error', (error) => {
            const isPermissionError =
                error.message?.includes('Missing role_id') ||
                error.message?.includes('Page') ||
                error.message?.includes('Permission denied');

            if (isPermissionError) {
                setUnauthorized(true);
            } else {
                setBusinesses([]);
                console.warn('Business fetch error:', error.message);
            }
        });

        return () => {
            socket.off('fetch-businesses-success');
            socket.off('fetch-businesses-error');
        };
    }, [socket, userId, roleId]);

    useEffect(() => {
        if (!socket || !selectedBusiness) return; // ✅ only run when we have businessId

        socket.emit("fetch-airports-by-business", {
            role_id: roleId,
            page_name: PAGE_NAME,
            business_id: selectedBusiness
        });

        socket.on("fetch-airports-by-business-success", (data) => {
            const formatted = data.map((a) => ({
                name: `${a.name} (${a.iata})`,
                code: a.airport_id
            }));
            setAirports(formatted);
            setSelectedAirport(formatted[0]?.code || '');
        });

        socket.on("fetch-airports-by-business-error", (error) => {
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
            socket.off("fetch-airports-by-business-success");
            socket.off("fetch-airports-by-business-error");
        };
    }, [socket, roleId, selectedBusiness]);

    useEffect(() => {
        if (!socket) return;

        // 🔹 Fetch flight types
        socket.emit("get-flight-types", { role_id: roleId, page_name: PAGE_NAME });

        const handleSuccess = (data) => {
            setFlightTypes(data);
            setLoading(false);
        };

        const handleError = (error) => {
            if (
                error.message?.includes("Missing role_id") ||
                error.message?.includes("Permission denied") ||
                error.message?.includes("Page")
            ) {
                setUnauthorized(true);
            } else {
                console.error("Error fetching flight types:", error.message);
            }
            setLoading(false);
        };

        socket.on("get-flight-types-success", handleSuccess);
        socket.on("get-flight-types-error", handleError);

        return () => {
            socket.off("get-flight-types-success", handleSuccess);
            socket.off("get-flight-types-error", handleError);
        };
    }, [roleId, socket]);


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
            <Row className="mb-4">
                <Col md={12} lg={4}>
                    <Breadcrumb>
                        <Breadcrumb.Item active>Service Charges</Breadcrumb.Item>
                    </Breadcrumb>
                </Col>
                <Col md={12} lg={8} className="text-end">
                    <div className="d-flex align-items-center gap-1 justify-content-end filterDiv">
                        <label className="me-2">Sort By</label>
                        <Form.Select
                            aria-label="Business Filter"
                            style={{ width: '340px' }}
                            value={selectedBusiness}
                            onChange={(e) => setSelectedBusiness(e.target.value)}
                        >
                            <option value="">Filter By Handling Company</option>
                            {businesses.map((b) => (
                                <option key={b.business_id} value={b.business_id}>
                                    {b.name}
                                </option>
                            ))}
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
                        <Button
                            label="Add Service"
                            icon="pi pi-plus"
                            className="py-2"
                            style={{ fontSize: '14px' }}
                            onClick={() => setSidebarVisible(true)}
                        />
                    </div>
                </Col>
            </Row>
            <Row className="justify-content-center">
                <TabView>
                    {flightTypes.map((ft) => (
                        <TabPanel key={ft.Flight_type_id} header={ft.Flight_type_name}>
                            {/* Pass the ID into a child component */}
                            <FlightTypeServices flightTypeId={ft.Flight_type_id} business_id={selectedBusiness} airport_id={selectedAirport} page_name={PAGE_NAME} />
                        </TabPanel>
                    ))}
                </TabView>
            </Row>
            <Sidebar visible={sidebarVisible} position="right" onHide={() => setSidebarVisible(false)} style={{ width: '500px' }} dismissable={false}>
                <AddServicePriceSidebar
                    visible={sidebarVisible}
                    onHide={() => setSidebarVisible(false)}
                    pageName={PAGE_NAME}
                />
            </Sidebar>
        </>
    );
};

export default Services_Price;