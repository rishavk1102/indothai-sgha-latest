import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Breadcrumb, Form, Card, Table } from 'react-bootstrap';
import { IoChevronBackOutline } from "react-icons/io5";
import { Button } from 'primereact/button';
import { InputIcon } from "primereact/inputicon";
import { IconField } from "primereact/iconfield";
import { InputText } from "primereact/inputtext";
import { Badge } from 'primereact/badge';
import { MdFlight } from "react-icons/md";
import { Avatar } from 'primereact/avatar';
import { Sidebar } from 'primereact/sidebar';
import { Tooltip } from 'primereact/tooltip';
import { Link } from 'react-router-dom';
import { getSocket } from '../../context/socket';
import GifLoder from '../../interfaces/GifLoder';
import { useDebounce } from 'use-debounce'; // First, install it via npm
import { useAuth } from "../../context/AuthContext.js";
import api from "../../api/axios.js";
import { Dialog } from "primereact/dialog";
import AddCompanyAircraft from "../../components/AddCompanyAircraft.js";
import EditCompanyAircraft from "../../components/EditCompanyAircraft.js";


const CompanyAircraft = () => {
    const [visibleRight, setVisibleRight] = useState(false);
    const navigate = useNavigate();
    const { role, roleId, userId } = useAuth(); // Get roleId from the context
    const PAGE_NAME = "Aircraft Options"; // Page name for permission checking
    const socket = getSocket();
    const [sortOrder, setSortOrder] = useState('ASC');
    const [perPage, setPerPage] = useState(15);
    const [loading, setLoading] = useState(true);  // Block UI until all fetches succeed
    const [unauthorized, setUnauthorized] = useState(false); // Show Dialog if error
    const [businesses, setBusinesses] = useState([]);
    const [selectedBusiness, setSelectedBusiness] = useState('');
    const [airports, setAirports] = useState([]);
    const [selectedAirport, setSelectedAirport] = useState('');
    const [aircrafts, setAircrafts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch] = useDebounce(searchTerm, 500);
    const [selectedAircraft, setSelectedAircraft] = useState('');
    const [visibleRight2, setVisibleRight2] = useState(false);
    const goBack = () => {
        navigate(-1); // This will take the user back to the previous page in history
    };

    useEffect(() => {
        if (!socket) return;

        socket.emit('fetch-businesses', {
            role_id: roleId,
            page_name: PAGE_NAME,
            user_id: userId
        });

        socket.on('fetch-businesses-success', (data) => {
            setBusinesses(data);
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
    }, [socket, roleId, userId]);


    useEffect(() => {
        if (selectedBusiness && socket) {
            socket.emit("fetch-airports-by-business", { role_id: roleId, page_name: PAGE_NAME, business_id: selectedBusiness });

            socket.on("fetch-airports-by-business-success", (data) => {
                const formatted = data.map((a) => ({ name: `${a.name} (${a.iata})`, code: a.airport_id }));
                setAirports(formatted);
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
        }
    }, [socket, selectedBusiness, roleId]);


    // ✅ Auto-select first business when businesses arrive
    useEffect(() => {
        if (businesses.length > 0 && !selectedBusiness) {
            setSelectedBusiness(businesses[0].business_id); // 👈 select first business automatically
        }
    }, [businesses, selectedBusiness]);

    // ✅ Auto-select first airport when airports arrive
    useEffect(() => {
        if (airports.length > 0 && !selectedAirport) {
            setSelectedAirport(airports[0].code); // 👈 select first airport automatically
        }
    }, [airports, selectedAirport]);


    // ✅ Fetch company aircrafts
    useEffect(() => {
        if (!socket) return;

        const fetchCompanyAircrafts = () => {
            if (!selectedBusiness || !selectedAirport) {
                setAircrafts([]);
                setLoading(false);
                return;
            }

            setLoading(true);

            socket.emit("view-company-aircrafts", {
                role_id: roleId,
                page_name: PAGE_NAME,
                sortOrder,
                limit: perPage,
                searchTerm: debouncedSearch,
                business_id: selectedBusiness,
                airport_id: selectedAirport,
            });
        };

        // 🔹 Initial fetch
        fetchCompanyAircrafts();

        // 🔹 Listen for success
        socket.on("view-company-aircrafts-success", (data) => {
            setAircrafts(data);
            setLoading(false);
        });

        // 🔹 Listen for error
        socket.on("view-company-aircrafts-error", (error) => {
            const isPermissionError =
                error.message?.includes("Missing role_id") ||
                error.message?.includes("Page") ||
                error.message?.includes("Permission denied");

            if (isPermissionError) {
                setUnauthorized(true);
            } else {
                setAircrafts([]);
            }
            setLoading(false);
        });

        // 🔹 Listen for updates from server
        socket.on("company-aircrafts-updated", () => {
            fetchCompanyAircrafts(); // 👈 refetch automatically
        });

        return () => {
            socket.off("view-company-aircrafts-success");
            socket.off("view-company-aircrafts-error");
            socket.off("company-aircrafts-updated"); // cleanup
        };
    }, [socket, sortOrder, perPage, roleId, selectedBusiness, selectedAirport, debouncedSearch]);


    const handleDeleteAircraft = async (aircraft_id) => {
        setLoading(true);
        try {
            const res = await api.delete(`/company_aircraft_routes/delete_company_aircraft/${aircraft_id}/${PAGE_NAME}`);
            if (res.status === 200) {
                setLoading(false);
            }
        } catch (error) {
            console.error('Delete Aircraft error:', error);
            if (error.response?.status === 403) {
                setUnauthorized(true);
            }
        }
        finally {
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

    if (loading) {
        return <div className='loderDiv'><GifLoder /></div>;
    }

    return (
        <>

            <Row>
                <Col md={12} lg={6}>
                    <Breadcrumb>
                        <Breadcrumb.Item onClick={goBack}>
                            <IoChevronBackOutline /> Back
                        </Breadcrumb.Item>
                        <Breadcrumb.Item active>Aircraft Types</Breadcrumb.Item>
                    </Breadcrumb>
                </Col>
                <Col md={12} lg={6} className="text-end">
                    <Button
                        label="Add New"
                        icon="pi pi-plus"
                        severity="help"
                        className="py-2"
                        onClick={() => setVisibleRight(true)}
                    />
                </Col>
            </Row>
            <Row className="mx-0 mt-3">
                <Col>
                    <Card className="border-0 shadow-sm">
                        <Card.Header className="pt-3 pb-2 border-0 bg-transparent">
                            <div className="d-flex align-items-center gap-1 justify-content-end filterDiv">
                                <label className="me-2">Sort By</label>
                                <Form.Select
                                    aria-label="Sort Order"
                                    style={{ width: '100px' }}
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value)}
                                >
                                    <option value="ASC">ASC</option>
                                    <option value="DESC">DESC</option>
                                </Form.Select>
                                <Form.Select
                                    aria-label="Limit"
                                    style={{ width: '100px' }}
                                    value={perPage}
                                    onChange={(e) => setPerPage(Number(e.target.value))}
                                >
                                    <option value={15}>15</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </Form.Select>

                                {/* ✅ Business filter first */}
                                <Form.Select
                                    aria-label="Business Filter"
                                    style={{ width: '250px' }}
                                    value={selectedBusiness}
                                    onChange={(e) => setSelectedBusiness(e.target.value)}
                                >
                                    <option value="">-- Filter By Business --</option>
                                    {businesses.map((business) => (
                                        <option key={business.business_id} value={business.business_id}>
                                            {business.name}
                                        </option>
                                    ))}
                                </Form.Select>

                                {/* ✅ Airport filter after business */}
                                <Form.Select
                                    aria-label="Airport Filter"
                                    style={{ width: '250px' }}
                                    value={selectedAirport}
                                    onChange={(e) => setSelectedAirport(e.target.value)}
                                    disabled={!selectedBusiness} // 🚫 Disable until business selected
                                >
                                    <option value="">-- Filter By Airport --</option>
                                    {airports.map((airport) => (
                                        <option key={airport.code} value={airport.code}>
                                            {airport.name}
                                        </option>
                                    ))}
                                </Form.Select>
                                <IconField iconPosition="left">
                                    <InputIcon className="pi pi-search" />
                                    <InputText
                                        placeholder="Search"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </IconField>
                            </div>
                        </Card.Header>
                        <Card.Body>
                            <div className="table-responsive">
                                <Table bordered hover>
                                    <thead>
                                        <tr className="table-primary">
                                            <th style={{ width: '300px' }}>Aircraft Company</th>
                                            {/* <th>Aircraft Name</th>
                                            <th style={{ width: '120px' }}>Model/Make</th> */}
                                            <th style={{ width: '120px' }}>Region</th>
                                            <th>MOTW</th>
                                            <th style={{ width: '120px' }}>Limit Per Incident</th>
                                            <th>Price per Limit (INR) </th>
                                            <th>Price per Limit (USD)</th>
                                            <th style={{ width: '160px' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {aircrafts.map((aircraft, index) => (
                                            <tr key={index}>
                                                <td data-label="Airline Name">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <Avatar
                                                            className="me-2"
                                                            style={{ backgroundColor: 'rgb(197 197 197 / 27%)', color: 'rgb(146 74 151)' }}
                                                            shape="circle"
                                                        >
                                                            <MdFlight />
                                                        </Avatar>
                                                        <span className="d-flex flex-column gap-1">
                                                            <b>{aircraft.Company_name}</b>
                                                            <small>Aircraft Name : <b>{aircraft.Aircraft_name || '-'}</b></small>
                                                            <small>Model/Make : <b>{aircraft.Aircraft_model || '-'}</b></small> 
                                                        </span>
                                                        <span>
                                                            
                                                        </span>
                                                        <span>
                                                            
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>{aircraft.Flight_type}</td>
                                                <td>{aircraft.MTOW || '-'}</td>
                                                <td>{aircraft.Limit_per_incident || '-'}</td>
                                                <td>₹ {aircraft.Price_per_Limit_inr}</td>
                                                <td>$ {aircraft.Price_per_Limit_usd}</td>
                                                <td data-label="Action">
                                                    <Button
                                                        tooltip="Edit"
                                                        icon="pi pi-pencil"
                                                        severity="info"
                                                        className="p-0 border-0"
                                                        tooltipOptions={{ position: "top" }}
                                                        style={{ width: '30px' }}
                                                        text
                                                        onClick={() => {
                                                            setSelectedAircraft(aircraft); // Set data for editing
                                                            setVisibleRight2(true);            // Open the sidebar
                                                        }}
                                                    />
                                                    <Button
                                                        tooltip="Delete"
                                                        icon="pi pi-trash"
                                                        severity="danger"
                                                        className="p-0 border-0"
                                                        tooltipOptions={{ position: "top" }}
                                                        style={{ width: '30px' }}
                                                        text
                                                        onClick={() => handleDeleteAircraft(aircraft.aircraft_id)} // ✅ Pass the airport ID
                                                    />


                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>

                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Sidebar visible={visibleRight} position="right" style={{ width: '450px' }} onHide={() => setVisibleRight(false)} dismissable={false}>
                <AddCompanyAircraft onClose={() => setVisibleRight(false)} page_name={PAGE_NAME} />
            </Sidebar>

            <Sidebar visible={visibleRight2} position="right" style={{ width: '450px' }} onHide={() => setVisibleRight2(false)} dismissable={false}>
                <EditCompanyAircraft onClose={() => setVisibleRight2(false)} page_name={PAGE_NAME} airlineData={selectedAircraft} />
            </Sidebar>
        </>
    );
};


export default CompanyAircraft