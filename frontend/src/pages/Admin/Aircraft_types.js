import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Breadcrumb, Card, Table, Form } from 'react-bootstrap';
import { IoChevronBackOutline } from "react-icons/io5";
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { MdFlight } from "react-icons/md";
import { Avatar } from 'primereact/avatar';
import { Link } from 'react-router-dom';
import { InputIcon } from "primereact/inputicon";
import { IconField } from "primereact/iconfield";
import { InputText } from "primereact/inputtext";
import { Sidebar } from 'primereact/sidebar';
import Chargesdata from '../../components/Chargesdata.js';
import { getSocket } from '../../context/socket';
import GifLoder from '../../interfaces/GifLoder';
import { useDebounce } from 'use-debounce'; // First, install it via npm
import { useAuth } from "../../context/AuthContext.js";
import api from "../../api/axios.js";
import Add_Aircraft from "../../components/Add_Aircraft.js";
import Edit_Aircraft from "../../components/Edit_Aircraft.js";

const Aircraft_types = () => {
    const { role, roleId } = useAuth(); // Get roleId from the context
    const PAGE_NAME = "AircraftTypes"; // Page name for permission checking
    const socket = getSocket();
    const [loading, setLoading] = useState(true);  // Block UI until all fetches succeed
    const [unauthorized, setUnauthorized] = useState(false); // Show Dialog if error
    const { airline_id } = useParams();
    const [sortOrder, setSortOrder] = useState('ASC');
    const [perPage, setPerPage] = useState(15);
    const [searchValue, setSearchValue] = useState('');
    const [debouncedSearch] = useDebounce(searchValue, 500); // 500ms debounce
    const navigate = useNavigate();
    const goBack = () => {
        navigate(-1); // This will take the user back to the previous page in history
    };
    const [visibleRight, setVisibleRight] = useState(false);
    const [visible, setVisible] = useState(false);
    const [visibleEdit, setVisibleEdit] = useState(false);
    const [selectedAircraftData, setSelectedAircraftData] = useState(null);
    const [airlineDetails, setAirlineDetails] = useState(null);
    const [aircraftList, setAircraftList] = useState([]);
    const [selectedAircraftId, setSelectedAircraftId] = useState(null);

    const handleCloseEditDialog = () => {
        if (!visibleEdit) return;
        setVisibleEdit(false);
        setSelectedAircraftData(null); // ✅ Clear selected aircraft
    };

    const handleCloseChargesDialog = () => {
        if (!visibleRight) return;
        setVisibleRight(false);
        selectedAircraftData(null); // ✅ Clear selected aircraft
    };

    useEffect(() => {
        if (socket && airline_id) {
            setLoading(true);

            socket.emit('fetch-airline-by-id', {
                role_id: roleId,
                page_name: PAGE_NAME,
                airline_id: parseInt(airline_id)  // Ensure it's an integer if needed by backend
            });

            socket.on('fetch-airline-by-id-success', (data) => {
                setAirlineDetails(data);
                setLoading(false);
            });

            socket.on('fetch-airline-by-id-error', (error) => {
                const isPermissionError =
                    error.message?.includes('Missing role_id') ||
                    error.message?.includes('Page') ||
                    error.message?.includes('Permission denied');

                if (isPermissionError) {
                    setUnauthorized(true);
                } else {
                    console.warn('Error fetching airline:', error.message);
                }

                setLoading(false);
            });

            return () => {
                socket.off('fetch-airline-by-id-success');
                socket.off('fetch-airline-by-id-error');
            };
        }
    }, [socket, airline_id, roleId]);

    useEffect(() => {
        if (socket && airline_id) {
            const fetchAircrafts = () => {
                socket.emit('view-aircrafts', {
                    role_id: roleId,
                    page_name: PAGE_NAME,
                    sortOrder,
                    limit: perPage,
                    searchTerm: debouncedSearch,
                    airline_id: parseInt(airline_id)
                });
            };

            // Initial fetch
            fetchAircrafts();

            socket.on('view-aircrafts-success', (data) => {
                setAircraftList(data);
            });

            socket.on('view-aircrafts-error', (error) => {
                const isPermissionError =
                    error.message?.includes('Missing role_id') ||
                    error.message?.includes('Page') ||
                    error.message?.includes('Permission denied');

                if (isPermissionError) {
                    setUnauthorized(true);
                } else {
                    console.warn('Error fetching Aircraft:', error.message);
                    setAircraftList([]);
                }

                setLoading(false);
            });

            // Listen to aircrafts-updated and re-fetch
            socket.on('aircrafts-updated', fetchAircrafts);

            return () => {
                socket.off('view-aircrafts-success');
                socket.off('view-aircrafts-error');
                socket.off('aircrafts-updated', fetchAircrafts);
            };
        }
    }, [socket, roleId, airline_id, sortOrder, perPage, debouncedSearch]);


    const handleDuplicate = async (aircraft_id) => {
        setLoading(true);
        try {
            const res = await api.post(`/aircrafts/duplicate_aircraft/${aircraft_id}/${PAGE_NAME}`);
            if (res.status === 201) {
                setLoading(false);
            }
        } catch (error) {
            console.error('Duplicate airline error:', error);
            if (error.response?.status === 403) {
                setUnauthorized(true);
            }
        }
        finally {
            setLoading(false);
        }
    };


    const handleDeleteAirport = async (aircraft_id) => {
        setLoading(true);
        try {
            const res = await api.delete(`/aircrafts/delete_aircraft/${aircraft_id}/${PAGE_NAME}`);
            if (res.status === 200) {
                setLoading(false);
            }
        } catch (error) {
            console.error('Duplicate airport error:', error);
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
                <Col md={12} lg={8}>
                    <Breadcrumb>
                        <Breadcrumb.Item onClick={goBack}>
                            <IoChevronBackOutline /> Back
                        </Breadcrumb.Item>
                        <Breadcrumb.Item active>Aircraft Types</Breadcrumb.Item>
                    </Breadcrumb>
                </Col>
                <Col md={12} lg={4} className="text-end">
                    <Button
                        label="Aircraft Type"
                        icon="pi pi-plus"
                        severity="help"
                        className="py-2"
                        onClick={() => setVisible(true)}
                    />
                </Col>
                <Col md={12} lg={12} className="p-0 mt-4">
                    <Row className="mx-0">
                        <Col md={12} lg={12} className="airportDet d-flex gap-3">
                            <Card className="mb-3">
                                <Card.Header className="bg_lightper d-flex align-items-center justify-content-start">
                                    <Link to={'/dashboard/airports'} className="me-2">
                                        <Button
                                            tooltip="Back"
                                            icon="pi pi-arrow-left"
                                            severity="secondary"
                                            className="p-0 border-0"
                                            tooltipOptions={{ position: "top" }}
                                            style={{ width: '30px' }}
                                            text
                                        />
                                    </Link>
                                    <h6>Airport Details</h6>
                                </Card.Header>
                                <Card.Body>
                                    <ul>
                                        <li><small>Name :</small><span>{airlineDetails?.airport?.name || '-'}</span></li>
                                        <li><small>IATA :</small><span>{airlineDetails?.airport?.iata || '-'}</span></li>
                                        <li><small>ICAO :</small><span>{airlineDetails?.airport?.icao || '-'}</span></li>
                                        <li><small>Address :</small><span>{airlineDetails?.airport?.address1}, {airlineDetails?.airport?.city} - {airlineDetails?.airport?.pincode}, {airlineDetails?.airport?.state}, {airlineDetails?.airport?.country}</span></li>

                                    </ul>
                                </Card.Body>
                            </Card>
                            <Card className="mb-3">
                                <Card.Header className="bg_lightor d-flex align-items-center justify-content-start">
                                    <Link to={'/dashboard/clients'} className="me-2">
                                        <Button
                                            tooltip="Back"
                                            icon="pi pi-arrow-left"
                                            severity="secondary"
                                            className="p-0 border-0"
                                            tooltipOptions={{ position: "top" }}
                                            style={{ width: '30px' }}
                                            text
                                        />
                                    </Link>
                                    <h6>Client Details</h6>
                                </Card.Header>
                                <Card.Body>
                                    <ul>
                                        <li><small>Name :</small><span>{airlineDetails?.client?.name || '-'}</span></li>
                                        <li><small>Email  :</small><span>{airlineDetails?.client?.email || '-'}</span></li>
                                        <li><small>Phone :</small><span>{airlineDetails?.client?.phone || '-'}</span></li>
                                        <li><small>Address :</small>
                                            <span>{airlineDetails?.client?.address1}, {airlineDetails?.client?.city} - {airlineDetails?.client?.pincode}, {airlineDetails?.client?.state}, {airlineDetails?.client?.country}</span>
                                        </li>

                                    </ul>
                                </Card.Body>
                            </Card>
                            <Card className="mb-3">
                                <Card.Header className="bg_lightblue d-flex align-items-center justify-content-start">
                                    <Link to={'/dashboard/airlines'} className="me-2">
                                        <Button
                                            tooltip="Back"
                                            icon="pi pi-arrow-left"
                                            severity="secondary"
                                            className="p-0 border-0"
                                            tooltipOptions={{ position: "top" }}
                                            style={{ width: '30px' }}
                                            text
                                        />
                                    </Link>
                                    <h6>Airline Details</h6>
                                </Card.Header>
                                <Card.Body>
                                    <ul>
                                        <li><small>Name :</small><span>{airlineDetails?.airline_name || '-'}</span></li>
                                        <li><small>IATA  :</small><span>{airlineDetails?.iata || '-'}</span></li>
                                        <li><small>ICAO :</small><span>{airlineDetails?.icao || '-'}</span></li>
                                        <li><small>Type :</small><span>{airlineDetails?.airline_type || '-'}</span></li>

                                    </ul>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={12} lg={12} className="airportDet">
                            <Card className="w-100">
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
                                        <IconField iconPosition="left">
                                            <InputIcon className="pi pi-search" />
                                            <InputText
                                                placeholder="Search"
                                                value={searchValue}
                                                onChange={(e) => setSearchValue(e.target.value)}
                                            />
                                        </IconField>
                                    </div>
                                </Card.Header>
                                <Card.Body>
                                    <Table hover>
                                        <thead>
                                            <tr className="table-primary">
                                                <th>Type Name</th>
                                                <th>Currency</th>
                                                <th>AAI Levy (in %)</th>
                                                {/* <th>Charges</th> */}
                                                <th style={{ width: '150px' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {aircraftList.length > 0 ? (
                                                aircraftList.map((aircraft) => (
                                                    <tr key={aircraft.aircraft_id}>
                                                        <td>
                                                            <div className="d-flex align-items-center gap-2">
                                                                <Avatar
                                                                    className="me-2"
                                                                    style={{
                                                                        backgroundColor: 'rgb(197 197 197 / 27%)',
                                                                        color: 'rgb(146 74 151)'
                                                                    }}
                                                                    shape="circle"
                                                                >
                                                                    <MdFlight />
                                                                </Avatar>
                                                                <span className="d-flex flex-column gap-1">
                                                                    <b>{aircraft.type_name}</b>
                                                                    <small className="d-block text-muted">{aircraft.category?.Category_name || "Unknown"}</small>
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td>{aircraft.currency}</td>
                                                        <td>{aircraft.AAI_levy}</td>
                                                        {/* <td>
                                                            <Link to="#" onClick={() => {
                                                                setSelectedAircraftData(aircraft);  // Set aircraft ID
                                                                setVisibleRight(true);                       // Open sidebar
                                                            }}>
                                                                View Charges
                                                            </Link>
                                                        </td> */}
                                                        <td>
                                                            <Button
                                                                tooltip="Edit"
                                                                icon="pi pi-pencil"
                                                                severity="info"
                                                                className="p-0 border-0"
                                                                tooltipOptions={{ position: "top" }}
                                                                style={{ width: '30px' }}
                                                                text
                                                                onClick={() => {
                                                                    setSelectedAircraftData(aircraft); // Set data for editing
                                                                    setVisibleEdit(true);            // Open the sidebar
                                                                }}
                                                            />
                                                            <Button
                                                                tooltip="Duplicate"
                                                                icon="pi pi-copy"
                                                                severity="warning"
                                                                className="p-0 border-0"
                                                                tooltipOptions={{ position: "top" }}
                                                                style={{ width: '30px' }}
                                                                text
                                                                onClick={() => handleDuplicate(aircraft.aircraft_id)}
                                                            />
                                                            <Button
                                                                tooltip="Delete"
                                                                icon="pi pi-trash"
                                                                severity="danger"
                                                                className="p-0 border-0"
                                                                tooltipOptions={{ position: "top" }}
                                                                style={{ width: '30px' }}
                                                                text
                                                                onClick={() => handleDeleteAirport(aircraft.aircraft_id)}
                                                            />
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="text-center">
                                                        No aircraft types found.
                                                    </td>
                                                </tr>
                                            )}

                                        </tbody>
                                    </Table>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Col>
            </Row>
            <Sidebar
                visible={visibleRight}
                position="right"
                onHide={handleCloseChargesDialog}
                style={{ width: '70vw' }}
                dismissable={false}
            >
                <Chargesdata aircraft_data={selectedAircraftData} onClose={handleCloseChargesDialog} page_name={PAGE_NAME} />
            </Sidebar>

            <Dialog header="Add Aircraft Type" visible={visible} style={{ width: '360px' }} onHide={() => { if (!visible) return; setVisible(false); }}>
                <Add_Aircraft onClose={() => setVisible(false)} airline_id={airline_id} page_name={PAGE_NAME} />
            </Dialog>

            <Dialog
                header="Edit Aircraft Type"
                visible={visibleEdit}
                style={{ width: '360px' }}
                onHide={handleCloseEditDialog}
            >
                <Edit_Aircraft
                    onClose={handleCloseEditDialog}
                    aircraft_data={selectedAircraftData}
                    page_name={PAGE_NAME}
                />
            </Dialog>


        </>
    );
};

export default Aircraft_types;