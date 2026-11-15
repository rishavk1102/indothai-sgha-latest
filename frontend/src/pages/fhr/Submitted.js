import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Breadcrumb, Card, Form, InputGroup, Table, Badge } from 'react-bootstrap';
import { IoChevronBackOutline } from "react-icons/io5";
import { Button } from 'primereact/button';
import { InputIcon } from "primereact/inputicon";
import { IconField } from "primereact/iconfield";
import { InputText } from "primereact/inputtext";
import { MdFlight } from "react-icons/md";
import { Avatar } from 'primereact/avatar';
import { Dialog } from 'primereact/dialog';
import DateRangePicker from 'react-bootstrap-daterangepicker';
import 'bootstrap-daterangepicker/daterangepicker.css';
import Newfhr_add from '../../components/Newfhr_add';
import { useAuth } from "../../context/AuthContext.js";
import { getSocket } from "../../context/socket.js";
import GifLoder from '../../interfaces/GifLoder';
import { useDebounce } from 'use-debounce'; // First, install it via npm
import moment from "moment";
import Fhr_view from "./Fhr_view.js";
import { Sidebar } from 'primereact/sidebar';

const Submitted = () => {
    const { role, roleId, userId } = useAuth(); // Get roleId from the context
    const PAGE_NAME = "FHR Submitted"; // Page name for permission checking
    const [loading, setLoading] = useState(true);  // Block UI until all fetches succeed
    const [unauthorized, setUnauthorized] = useState(false); // Show Dialog if error
    const socket = getSocket();
    const navigate = useNavigate();
    const goBack = () => {
        navigate(-1); // This will take the user back to the previous page in history
    };
    const [visible, setVisible] = useState(false);
    const [visible1, setVisible1] = useState(false);
    const [selectedFhrId, setSelectedFhrId] = useState(null);
    const [fhrListings, setFhrListings] = useState([]);
    // const [searchTerm, setSearchTerm] = useState('');
    // const [limit, setLimit] = useState(50); // Or make it dynamic

    const [airports, setAirports] = useState([]);
    // const [selectedAirport, setSelectedAirport] = useState(null);
    // // Date range defaulting to today
    // const [dateRange, setDateRange] = useState({
    //     startDate: moment().startOf("day"),
    //     endDate: moment().endOf("day"),
    // });

    const getLS = (key) => localStorage.getItem(`${PAGE_NAME}_${key}`) || '';


    const [searchTerm, setSearchTerm] = useState(getLS("searchTerm"));
    const [limit, setLimit] = useState(Number(getLS("limit")) || 50);

    const [selectedAirport, setSelectedAirport] = useState(() => {
        const stored = getLS("selectedAirport");
        return stored ? JSON.parse(stored) : null;
    });

    const [dateRange, setDateRange] = useState(() => ({
        startDate: moment().subtract(365, 'days').startOf('day'),
        endDate: moment().add(30, 'days').endOf('day'),
    }));


    const [debouncedSearch] = useDebounce(searchTerm, 500); // 500ms debounce

    useEffect(() => {
        localStorage.setItem(`${PAGE_NAME}_searchTerm`, searchTerm);
    }, [searchTerm]);

    useEffect(() => {
        localStorage.setItem(`${PAGE_NAME}_limit`, limit.toString());
    }, [limit]);

    useEffect(() => {
        if (selectedAirport) {
            localStorage.setItem(`${PAGE_NAME}_selectedAirport`, JSON.stringify(selectedAirport));
        } else {
            localStorage.removeItem(`${PAGE_NAME}_selectedAirport`);
        }
    }, [selectedAirport]);

    useEffect(() => {
        localStorage.setItem(`${PAGE_NAME}_dateRange`, JSON.stringify({
            startDate: dateRange.startDate.clone().startOf('day').toISOString(),
            endDate: dateRange.endDate.clone().endOf('day').toISOString(),
        }));
    }, [dateRange]);





    useEffect(() => {
        if (!socket) return;

        const fetchSubmittedFHRs = () => {
            socket.emit('view-fhr-submitted', {
                role_id: roleId,
                page_name: PAGE_NAME,
                limit,
                searchTerm: debouncedSearch,
                airport_id: selectedAirport,
                start_date: dateRange.startDate.format("YYYY-MM-DD"),
                end_date: dateRange.endDate.format("YYYY-MM-DD"),
            });
        };

        fetchSubmittedFHRs();

        socket.on('view-fhr-submitted-success', (data) => {
            setFhrListings(data);
            setLoading(false);
        });

        socket.on('view-fhr-submitted-error', (error) => {
            const isPermissionError =
                error.message?.includes('Missing role_id') ||
                error.message?.includes('Page') ||
                error.message?.includes('Permission denied');

            if (isPermissionError) {
                setUnauthorized(true);
            } else {
                setFhrListings([]);
                console.warn('Submitted fetch error:', error.message);
            }

            setLoading(false);
        });

        return () => {
            socket.off('view-fhr-submitted-success');
            socket.off('view-fhr-submitted-error');
        };
    }, [socket, roleId, PAGE_NAME, debouncedSearch, limit, selectedAirport, dateRange]);




    useEffect(() => {
        if (socket) {
            socket.emit("fetch-airports", { role_id: roleId, page_name: PAGE_NAME, user_id: userId });

            socket.on("fetch-airports-success", (data) => {
                const formatted = data.map((a) => ({ name: `${a.name} (${a.iata})`, code: a.airport_id }));
                setAirports(formatted);
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
                        <Breadcrumb.Item active>Submitted FHRs</Breadcrumb.Item>
                    </Breadcrumb>
                </Col>
                <Col md={12} lg={6} className="text-end">
                    <Button
                        label="Add FHR"
                        icon="pi pi-plus"
                        severity="warning"
                        className="py-2"
                        style={{ fontSize: "14px" }}
                        onClick={() => navigate('/dashboard/FHR_nonschedule')}
                    />
                </Col>
                <Col md={12} lg={12} className="mt-5">
                    <Row className="mx-0">
                        <Card className="border-0 shadow-sm">
                            <Card.Header className="pt-3 pb-2 border-0 bg-transparent">
                                <div className="d-flex align-items-center gap-1 justify-content-end filterDiv">
                                    <label className="me-2">Sort By</label>
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
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Search by Flight number"
                                        />

                                    </IconField>
                                    <DateRangePicker
                                        initialSettings={{
                                            startDate: dateRange.startDate.toDate(),
                                            endDate: dateRange.endDate.toDate()
                                        }}
                                        onApply={(e, picker) => {
                                            setDateRange({
                                                startDate: moment(picker.startDate),
                                                endDate: moment(picker.endDate),
                                            });
                                        }}
                                    >
                                        <input type="text" className="form-control" style={{ width: '190px' }} />
                                    </DateRangePicker>
                                </div>
                            </Card.Header>
                            <Card.Body>
                                <div className="table-responsive" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                                    <Table bordered hover className="fhrTable">
                                        <thead>
                                            <tr className="table-primary sticky-top">
                                                <th style={{ width: '90px' }}>ID</th>
                                                <th style={{ width: '230px' }}>Airline</th>
                                                <th>Flight No.</th>
                                                <th>Client</th>
                                                <th>Aircraft</th>
                                                <th>Category</th>
                                                <th>Station</th>
                                                <th>STA / STD</th>
                                                <th>ATA / ATD</th>
                                                <th>Difference</th>
                                                <th style={{ width: '160px' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {fhrListings.length > 0 ? (
                                                fhrListings.map((item) => (
                                                    <tr key={item.fhr_id}>
                                                        <td data-label="ID">{item.fhr_id}</td>
                                                        <td data-label="Airline" className="position-relative">
                                                            <div className="d-flex align-items-center gap-2">
                                                                <Avatar className="me-2" style={{ backgroundColor: 'rgb(197 197 197 / 27%)', color: 'rgb(146 74 151)', width: '30px', height: '30px' }} shape="circle">
                                                                    <MdFlight />
                                                                </Avatar>
                                                                <span className="d-flex flex-column gap-1" style={{ width: 'calc(100% - 35px)' }}>
                                                                    <b>{item.airline_name || 'N/A'}</b>
                                                                    {item.type === 'Arrival' && (
                                                                        <Badge className="fhrbadge bg-success text-white">Arrival</Badge>
                                                                    )}
                                                                    {item.type === 'Departure' && (
                                                                        <Badge className="fhrbadge bg-warning text-black">Departure</Badge>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td data-label="Flight No.">{item.flight_no || 'N/A'}</td>
                                                        <td data-label="Client">{item.client_name || 'N/A'}</td>
                                                        <td data-label="Aircraft">{item.aircraft_type || 'N/A'}</td>
                                                        <td data-label="Category">{item.Fhr_type || 'N/A'}</td>
                                                        <td data-label="Station"> {item.type === 'Arrival'
                                                            ? `${item.station || ''}->${item.airport?.iata || ''}`
                                                            : `${item.airport?.iata || ''}->${item.station || ''}`}</td>
                                                        <td data-label="STA / STD">
                                                            {item.date_of_flight ? moment(item.date_of_flight).format("DD/MM/YYYY") : 'N/A'} {item.st}
                                                        </td>
                                                        <td data-label="ATA / ATD">
                                                            {item.type === 'Arrival'
                                                                ? item.fhr?.arrival_details?.ata
                                                                    ? new Date(item.fhr.arrival_details.ata).toLocaleString("en-GB", {
                                                                        day: "2-digit",
                                                                        month: "long",
                                                                        year: "numeric",
                                                                        hour: "2-digit",
                                                                        minute: "2-digit",
                                                                        hour12: false,
                                                                    })
                                                                    : 'N/A'
                                                                : item.fhr?.departure_details?.atd
                                                                    ? new Date(item.fhr.departure_details.atd).toLocaleString("en-GB", {
                                                                        day: "2-digit",
                                                                        month: "long",
                                                                        year: "numeric",
                                                                        hour: "2-digit",
                                                                        minute: "2-digit",
                                                                        hour12: false,
                                                                    })
                                                                    : 'N/A'}
                                                        </td>
                                                        <td data-label="Difference">
                                                            {item.type === 'Arrival'
                                                                ? item.fhr?.arrival_details?.sta_ata_diff
                                                                    ? `${item.fhr.arrival_details.sta_ata_diff} min`
                                                                    : 'N/A'
                                                                : item.fhr?.departure_details?.std_atd_diff
                                                                    ? `${item.fhr.departure_details.std_atd_diff} min`
                                                                    : 'N/A'}
                                                        </td>

                                                        <td>
                                                            <div className="d-flex flex-wrap align-items-center gap-2 p-0">
                                                                <Button
                                                                    tooltip="View"
                                                                    icon="pi pi-eye"
                                                                    severity="help"
                                                                    className="p-0 border-0"
                                                                    tooltipOptions={{ position: "top" }}
                                                                    style={{ width: '20px', fontSize: '14px' }}
                                                                    text
                                                                    onClick={() => {
                                                                        setSelectedFhrId(item.fhr_id);
                                                                        setVisible1(true);
                                                                    }}
                                                                />
                                                                <Button
                                                                    tooltip="Edit"
                                                                    icon="pi pi-pencil"
                                                                    severity="secondary"
                                                                    className="p-0 border-0"
                                                                    tooltipOptions={{ position: "top" }}
                                                                    style={{ width: '20px', fontSize: '14px' }}
                                                                    text
                                                                    onClick={() => navigate(`/dashboard/edit_fhr/${item.fhr_id}`)}
                                                                />
                                                                <Button
                                                                    tooltip="Mail"
                                                                    icon="pi pi-envelope"
                                                                    severity="success"
                                                                    className="p-0 border-0"
                                                                    tooltipOptions={{ position: "top" }}
                                                                    style={{ width: '20px', fontSize: '14px' }}
                                                                    text
                                                                />
                                                                <Button
                                                                    tooltip="Download PDF"
                                                                    icon="pi pi-file-pdf"
                                                                    severity="primary"
                                                                    className="p-0 border-0"
                                                                    tooltipOptions={{ position: "top" }}
                                                                    style={{ width: '20px', fontSize: '14px' }}
                                                                    text
                                                                />
                                                                <Button
                                                                    tooltip="Delete"
                                                                    icon="pi pi-trash"
                                                                    severity="danger"
                                                                    className="p-0 border-0"
                                                                    tooltipOptions={{ position: "top" }}
                                                                    style={{ width: '20px', fontSize: '14px' }}
                                                                    text
                                                                />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="9" className="text-center text-muted">
                                                        No records found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </Table>
                                </div>
                            </Card.Body>
                        </Card>
                    </Row>
                </Col>
            </Row>


            <Dialog header="Create New FHR" visible={visible} style={{ width: '95vw', height: '100vh' }} onHide={() => { if (!visible) return; setVisible(false); }}>
                <Newfhr_add />
            </Dialog>

            <Sidebar
                visible={visible1}
                position="right"
                onHide={() => setVisible1(false)}
                style={{ width: '75vw' }}
                className="p-sidebar-lg"
                showCloseIcon
            >
                <Fhr_view
                    fhr_id={selectedFhrId}
                    page_name={PAGE_NAME}
                    onClose={() => setVisible1(false)}
                />
            </Sidebar>



        </>
    );
};

export default Submitted
