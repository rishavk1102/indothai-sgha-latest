import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Row, Col, Card, Table } from "react-bootstrap";
import { Button } from "primereact/button";
import { getSocket } from "../context/socket";
import GifLoder from "../interfaces/GifLoder";
import { Dialog } from "primereact/dialog";
import { Sidebar } from 'primereact/sidebar';
import Spinner from "react-bootstrap/Spinner";
import EditServicePriceSidebar from "./EditServicePriceSidebar";
const FlightTypeServices = ({ flightTypeId, business_id, airport_id, page_name }) => {

    const { roleId } = useAuth();
    const socket = getSocket();

    const navigate = useNavigate();
    const goBack = () => {
        navigate(-1); // This will take the user back to the previous page in history
    };
    const [loading, setLoading] = useState(true);
    const [unauthorized, setUnauthorized] = useState(false);
    const [visibleRight, setVisibleRight] = useState(false);
    const [visibleRight2, setVisibleRight2] = useState(false);
    const [visibleRight3, setVisibleRight3] = useState(false);
    const [aircraftData, setAircraftData] = useState([]); // ✅ fetched data
    const [selectedService, setSelectedService] = useState(null); // ✅ track row for edit/view
    const [sidebarVisible, setSidebarVisible] = useState(false);
    useEffect(() => {
        if (!socket || !flightTypeId || !business_id || !airport_id) {
            setLoading(false);
            return;
        }

        const fetchServicePrices = () => {
            setLoading(true);
            socket.emit("view-service-prices", {
                role_id: roleId,
                page_name,
                flight_type_id: flightTypeId,
                business_id,
                airport_id
            });
        };

        // ✅ Initial fetch
        fetchServicePrices();

        // ✅ Success handler
        socket.on("view-service-prices-success", (grouped) => {
            const formatted = Object.values(grouped).map(ac => ({
                aircraft_id: ac.aircraft_id,
                name: ac.aircraft_name,
                business_id: ac.business_id,
                airport_id: ac.airport_id,
                flight_type_id: ac.flight_type_id,
                services: ac.services // this is an array ✅
            }));
            setAircraftData(formatted);
            setLoading(false);
        });

        // ✅ Error handler
        socket.on("view-service-prices-error", (error) => {
            const isPermissionError =
                error.message?.includes("Missing role_id") ||
                error.message?.includes("Page") ||
                error.message?.includes("Permission denied");

            if (isPermissionError) {
                setUnauthorized(true);
            } else {
                setAircraftData([]);
                console.warn("Service prices fetch error:", error.message);
            }

            setLoading(false);
        });

        // ✅ No content case
        socket.on("view-service-prices-no-content", (msg) => {
            console.warn(msg.message);
            setAircraftData([]);
            setLoading(false);
        });

        // ✅ Listen for update event and refetch
        socket.on("service-prices-updated", () => {
            console.log("🔄 Service prices updated, refetching...");
            fetchServicePrices();
        });

        return () => {
            socket.off("view-service-prices-success");
            socket.off("view-service-prices-error");
            socket.off("view-service-prices-no-content");
            socket.off("service-prices-updated");
        };
    }, [socket, roleId, flightTypeId, business_id, airport_id, page_name]);


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

    // ✅ Loader
    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: "60vh" }}>
                <Spinner animation="border" role="status" variant="primary">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
            </div>
        );
    }

    // ✅ Require business + airport selection
    if (!business_id || !airport_id) {
        return (
            <div className="text-center mt-5">
                <h6>Please select a Business and an Airport to view services.</h6>
            </div>
        );
    }
    return (
        <>
            <Col md={12} lg={12}>
                <Card className="w-100 p-0 border-0 shadow-0">
                    <Card.Body className="p-0">
                        {aircraftData.length === 0 ? (
                            <div className="text-center py-5">
                                <h6>No data to display</h6>
                            </div>
                        ) : (
                            <Table striped>
                                <thead>
                                    <tr className="table-primary">
                                        <th>Aircraft Type</th>
                                        <th>Services</th>
                                        <th>Price in (INR)</th>
                                        <th style={{ width: "150px" }}>Charges</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {aircraftData.map((aircraft, aIndex) =>
                                        aircraft.services.map((service, sIndex) => (
                                            <tr key={`${aIndex}-${sIndex}`}>
                                                {sIndex === 0 && (
                                                    <td rowSpan={aircraft.services.length}>
                                                        {aircraft.name}
                                                    </td>
                                                )}
                                                <td>{service.service}</td>
                                                <td>{service.price}</td>
                                                <td>
                                                    <Button
                                                        label="Edit Charges"
                                                        severity="help"
                                                        className="p-1 border-0"
                                                        text
                                                    onClick={() => {
                                                        setSelectedService({
                                                            ...service,
                                                            aircraft_id: aircraft.aircraft_id,
                                                            business_id: aircraft.business_id,
                                                            airport_id: aircraft.airport_id,
                                                            flight_type_id: aircraft.flight_type_id,
                                                        });
                                                        setSidebarVisible(true);
                                                    }}
                                                    />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>
                        )}
                    </Card.Body>
                </Card>
            </Col>

            <Sidebar visible={sidebarVisible} position="right" onHide={() => setSidebarVisible(false)} style={{ width: '500px' }} dismissable={false}>
                <EditServicePriceSidebar
                    visible={sidebarVisible}
                    onHide={() => setSidebarVisible(false)}
                    pageName={page_name}
                    editData={selectedService}
                />
            </Sidebar>

            <Sidebar visible={visibleRight} position="right" onHide={() => setVisibleRight(false)} style={{ width: '70vw' }} dismissable={false}>
                <Card className="border-0 shadow-0 pt-3">
                    <Card.Header className="bg-white border-0 shadow-0 d-lg-flex align-items-center justify-content-between">
                        <h5>Boeing 737 Charges (INR) (AAI Levy - 15%)</h5>
                        <Button
                            label="New Charge"
                            icon="pi pi-plus"
                            severity="warning"
                            className="py-2 border-0"
                            style={{ fontSize: '14px' }}
                            onClick={() => setVisibleRight2(true)}
                        />
                    </Card.Header>
                    <Card.Body className="p-0 pt-3">
                        <Table bordered striped size="lg">
                            <thead>
                                <tr className="table-primary">
                                    <th>Charge Type</th>
                                    <th>Service</th>
                                    <th>Unit</th>
                                    <th>Included Count</th>
                                    <th>Rate (INR) <br />Incl. AAI Levy</th>
                                    <th>Overflow Rate (INR) <br />Incl. AAI Levy</th>
                                    <th style={{ width: "100px" }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td data-label="Charge Type">Additional</td>
                                    <td data-label="Service">GPU 90 KVA</td>
                                    <td data-label="Unit">Per Flight	</td>
                                    <td data-label="Included Count">1</td>
                                    <td data-label="Rate (INR)">0.000</td>
                                    <td data-label="Overflow Rate (INR)">98670.000</td>
                                    <td data-label="Action">
                                        <Button
                                            tooltip="Edit"
                                            icon="pi pi-pencil"
                                            severity="info"
                                            className="p-0 border-0"
                                            style={{ width: "30px" }}
                                            tooltipOptions={{ position: "left" }}
                                            text
                                            onClick={() => setVisibleRight3(true)}
                                        />
                                        <Button
                                            tooltip="Delete"
                                            icon="pi pi-trash"
                                            tooltipOptions={{ position: "left" }}
                                            severity="danger"
                                            className="p-0 border-0"
                                            style={{ width: "30px" }}
                                            text
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td data-label="Charge Type">Additional</td>
                                    <td data-label="Service">Push Back</td>
                                    <td data-label="Unit">Per Use	</td>
                                    <td data-label="Included Count">1</td>
                                    <td data-label="Rate (INR)">0.000</td>
                                    <td data-label="Overflow Rate (INR)">11212.500</td>
                                    <td data-label="Action">
                                        <Button
                                            tooltip="Edit"
                                            icon="pi pi-pencil"
                                            severity="info"
                                            className="p-0 border-0"
                                            style={{ width: "30px" }}
                                            text
                                            onClick={() => setVisibleRight3(true)}
                                        />
                                        <Button
                                            tooltip="Delete"
                                            icon="pi pi-trash"
                                            tooltipOptions={{ position: "left" }}
                                            severity="danger"
                                            className="p-0 border-0"
                                            style={{ width: "30px" }}
                                            text
                                        />
                                    </td>
                                </tr>
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            </Sidebar>
            <Sidebar visible={visibleRight2} position="right" onHide={() => setVisibleRight2(false)} style={{ width: '500px' }} dismissable={false}>
                <Card className="border-0 shadow-0 pt-3">
                    <Card.Header className="bg-white border-0 shadow-0">
                        <h5>Add New Charges</h5>
                    </Card.Header>
                    <Card.Body className="p-0 pt-3"></Card.Body>
                </Card>
            </Sidebar>

            <Sidebar visible={visibleRight3} position="right" onHide={() => setVisibleRight3(false)} style={{ width: '500px' }} dismissable={false}>
                <Card className="border-0 shadow-0 pt-3">
                    <Card.Header className="bg-white border-0 shadow-0">
                        <h5>Edit Charges</h5>
                    </Card.Header>
                    <Card.Body className="p-0 pt-3"></Card.Body>
                </Card>
            </Sidebar>
        </>
    )
}

export default FlightTypeServices