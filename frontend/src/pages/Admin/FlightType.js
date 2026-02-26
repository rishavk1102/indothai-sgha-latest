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
import { getSocket } from '../../context/socket';
import GifLoder from '../../interfaces/GifLoder';
import { useDebounce } from 'use-debounce'; // First, install it via npm
import { useAuth } from "../../context/AuthContext.js";
import api from "../../api/axios.js";
import Add_Flight_type from "../../components/Add_Flight_type.js";
import Edit_Flight_type from "../../components/Edit_Flight_type.js";

const FlightType = () => {
    const { role, roleId } = useAuth(); // Get roleId from the context
    const PAGE_NAME = "FlightType"; // Page name for permission checking
    const socket = getSocket();
    const [loading, setLoading] = useState(true);  // Block UI until all fetches succeed
    const [unauthorized, setUnauthorized] = useState(false); // Show Dialog if error
    const navigate = useNavigate();
    const goBack = () => {
        navigate(-1); // This will take the user back to the previous page in history
    };
    const [sortOrder, setSortOrder] = useState('ASC');
    const [perPage, setPerPage] = useState(15);
    const [searchValue, setSearchValue] = useState('');
    const [debouncedSearch] = useDebounce(searchValue, 500); // 500ms debounce
    const [flightTypes, setFlightTypes] = useState([]);
    const [visible, setVisible] = useState(false);
    const [visibleEdit, setVisibleEdit] = useState(false);
    const [selectedFlightTypeData, setSelectedFlightTypeData] = useState(null);


    useEffect(() => {
        if (!socket) return;

        const fetchFlightTypes = () => {
            setLoading(true);
            socket.emit('view-flight-types', {
                role_id: roleId,
                page_name: PAGE_NAME,
                sortOrder,
                limit: perPage,
                searchTerm: debouncedSearch
            });
        };

        // Success handler
        const handleSuccess = (data) => {
            setFlightTypes(data);
            setLoading(false);
        };

        // Error handler
        const handleError = (err) => {
            console.error("❌ Socket error fetching flight types:", err);
            if (err?.message?.toLowerCase().includes("not authorized")) {
                setUnauthorized(true);
            }
            setLoading(false);
        };

        // Listen for main responses
        socket.on('view-flight-types-success', handleSuccess);
        socket.on('view-flight-types-error', handleError);

        // Listen for updates broadcast from server
        socket.on('flight-types-updated', () => {
            fetchFlightTypes();
        });

        // Initial fetch
        fetchFlightTypes();

        return () => {
            socket.off('view-flight-types-success', handleSuccess);
            socket.off('view-flight-types-error', handleError);
            socket.off('flight-types-updated');
        };
    }, [socket, roleId, PAGE_NAME, sortOrder, perPage, debouncedSearch]);


    const handleDuplicate = async (Flight_type_id) => {
        setLoading(true);
        try {
            const res = await api.post(`/flight_type/duplicate_flight_type/${Flight_type_id}/${PAGE_NAME}`);
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


    const handleDeleteFlightType = async (Flight_type_id) => {
        setLoading(true);
        try {
            const res = await api.delete(`/flight_type/delete_flight_type/${Flight_type_id}/${PAGE_NAME}`);
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
                        <Breadcrumb.Item active>Flight Types</Breadcrumb.Item>
                    </Breadcrumb>
                </Col>
                <Col md={12} lg={4} className="text-end">
                    <Button
                        label="Flight Type"
                        icon="pi pi-plus"
                        severity="help"
                        className="py-2"
                        onClick={() => setVisible(true)}
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
                            <div className="table-responsive">
                                <Table bordered hover>
                                    <thead>
                                        <tr className="table-primary">
                                            <th style={{ width: '300px' }}>ID</th>
                                            <th>Category Name</th>
                                            <th style={{ width: '160px' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {flightTypes.map((ft, index) => (
                                            <tr key={ft.Flight_type_id}>
                                                <td>{index + 1}</td>
                                                <td>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <Avatar
                                                            style={{ backgroundColor: 'rgb(197 197 197 / 27%)', color: 'rgb(146 74 151)' }}
                                                            shape="circle"
                                                        >
                                                            <MdFlight />
                                                        </Avatar>
                                                        <b>{ft.Flight_type_name}</b>
                                                    </div>
                                                </td>
                                                <td>
                                                    <Button
                                                        tooltip="Edit"
                                                        icon="pi pi-pencil"
                                                        severity="info"
                                                        text
                                                        style={{ width: '30px' }}
                                                        onClick={() => {
                                                            setSelectedFlightTypeData(ft);
                                                            setVisibleEdit(true);
                                                        }}
                                                    />
                                                    <Button
                                                        tooltip="Duplicate"
                                                        icon="pi pi-copy"
                                                        severity="warning"
                                                        text
                                                        style={{ width: '30px' }}
                                                        onClick={() => handleDuplicate(ft.Flight_type_id)}
                                                    />
                                                    <Button
                                                        tooltip="Delete"
                                                        icon="pi pi-trash"
                                                        severity="danger"
                                                        text
                                                        style={{ width: '30px' }}
                                                        onClick={() => handleDeleteFlightType(ft.Flight_type_id)}
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
            <Dialog header="Add Flight Type" visible={visible} style={{ width: '360px' }} onHide={() => { if (!visible) return; setVisible(false); }}>
                <Add_Flight_type onClose={() => setVisible(false)} page_name={PAGE_NAME} />
            </Dialog>
            <Dialog header="Edit Flight Type" visible={visibleEdit} style={{ width: '360px' }} onHide={() => { if (!visibleEdit) return; setVisibleEdit(false); }}>
                <Edit_Flight_type onClose={() => setVisibleEdit(false)} page_name={PAGE_NAME} selectedFlightTypeData={selectedFlightTypeData} />
            </Dialog>
        </>
    );
};


export default FlightType;