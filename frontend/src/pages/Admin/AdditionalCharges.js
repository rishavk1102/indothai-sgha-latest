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
import Add_Aircraft_Charge from "../../components/Add_Aircraft_Charge.js";
import Edit_Aircraft_Charge from "../../components/Edit_Aircraft_Charge.js";


const AdditionalCharges = () => {
    const { roleId, userId } = useAuth();
    const PAGE_NAME = "Additional Charges"; // Page name for permission checking
    const socket = getSocket();
    const [loading, setLoading] = useState(true);  // Block UI until all fetches succeed
    const [unauthorized, setUnauthorized] = useState(false); // Show Dialog if error
    const [sortOrder, setSortOrder] = useState('ASC');
    const [perPage, setPerPage] = useState(15);
    const [searchValue, setSearchValue] = useState('');
    const [debouncedSearch] = useDebounce(searchValue, 500); // 500ms debounce
    const navigate = useNavigate();
    const goBack = () => {
        navigate(-1); // This will take the user back to the previous page in history
    };

    const [businesses, setBusinesses] = useState([]);
    const [selectedBusiness, setSelectedBusiness] = useState('');
    const [airports, setAirports] = useState([]);
    const [selectedAirport, setSelectedAirport] = useState('');
    const [charges, setCharges] = useState([]);
    const [visibleRight, setVisibleRight] = useState(false);
    const [visibleRight2, setVisibleRight2] = useState(false);
    const [editingCharge, setEditingCharge] = useState(null);


    // Edit
    const handleEdit = (charge) => {
        setEditingCharge(charge);
        setVisibleRight2(true); // second sidebar
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
        setLoading(true); // ✅ show loader only when we actually query

        const fetchCharges = () => {
            socket.emit("view-new-additional-charges", {   // ✅ updated event name
                role_id: roleId,
                page_name: PAGE_NAME,
                sortOrder,
                limit: perPage,
                searchTerm: debouncedSearch,
                Business_id: selectedBusiness,
                Airport_id: selectedAirport
            });
        };

        // Initial fetch
        fetchCharges();

        // Handle success
        const handleSuccess = (data) => {
            setCharges(data);
            setLoading(false);
        };

        // Handle no content
        const handleNoContent = () => {
            setCharges([]);
            setLoading(false);
        };

        // Handle error
        const handleError = (error) => {
            console.error("❌ Charges fetch error:", error.message);
            setCharges([]);
            setLoading(false);
        };

        // 🔄 Handle updates (refetch when server says data changed)
        const handleUpdated = () => {
            fetchCharges();
        };

        // ✅ update socket events
        socket.on("view-new-additional-charges-success", handleSuccess);
        socket.on("view-new-additional-charges-no-content", handleNoContent);
        socket.on("view-new-additional-charges-error", handleError);
        socket.on("additional-charges-updated", handleUpdated);

        return () => {
            socket.off("view-new-additional-charges-success", handleSuccess);
            socket.off("view-new-additional-charges-no-content", handleNoContent);
            socket.off("view-new-additional-charges-error", handleError);
            socket.off("additional-charges-updated", handleUpdated);
        };
    }, [socket, roleId, selectedBusiness, selectedAirport, sortOrder, perPage, debouncedSearch]);




    // // Delete
    const handleDelete = async (id) => {
        try {
            await api.delete(`/additional_charge/delete_additional_charge/${id}/${PAGE_NAME}`);
        } catch (error) {
            console.error("❌ Delete failed:", error.message);
            if (error.res?.status === 403) {
                setUnauthorized(true);
            }
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

    if (loading) {
        return <div className='loderDiv'><GifLoder /></div>;
    }


    return (
        <>
            <Row className="mb-4">
                <Col md={12} lg={12} className="d-flex align-items-center justify-content-between mb-3">
                    <Breadcrumb>
                        <Breadcrumb.Item onClick={goBack}>
                            <IoChevronBackOutline /> Back
                        </Breadcrumb.Item>
                        <Breadcrumb.Item active>Additional Charges</Breadcrumb.Item>
                    </Breadcrumb>
                    <Button
                        label="Charge"
                        icon="pi pi-plus"
                        className="py-2"
                        style={{ fontSize: '14px' }}
                        onClick={() => setVisibleRight(true)}
                    />
                </Col>
                <Col md={12} lg={12} className="text-end">
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
                        <IconField iconPosition="left">
                            <InputIcon className="pi pi-search" />
                            <InputText
                                placeholder="Search"
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                            />
                        </IconField>

                    </div>
                </Col>
            </Row>
            <Row className="mb-3">
                {/* Charges Table */}
                <Table striped bordered hover responsive>
                    <thead>
                        <tr>
                            <th style={{ width: '100px' }}>Serial. No.</th>
                            <th>Service</th>
                            <th>Applicable for</th>
                            <th>Unit of Measure</th>
                            <th style={{ width: '155px' }}>Rate</th>
                            <th style={{ width: '490px' }}>Remarks</th>
                            <th style={{ width: '166px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {charges.length > 0 ? (
                            charges.map((c, i) => (
                                <tr key={c.Additional_charges_id}>
                                    <td>{i + 1}</td>
                                    <td>{c.Service_name}</td>
                                    <td>{c.Charge_type}</td>
                                    <td>{c.unit_or_measure}</td>
                                    
                                    <td>
                                        ₹ {c.rate_inr || "-"} <br />
                                        $ {c.rate_usd || "-"}   {/* ✅ show both INR & USD */}
                                    </td>
                                    <td>{c.Remarks || "-"}</td>
                                    <td>
                                        <Button
                                            icon="pi pi-pencil"
                                            className="p-button-sm p-button-text text-primary p-0"
                                            onClick={() => handleEdit(c)}
                                        />


                                        <Button
                                            tooltip="Delete"
                                            icon="pi pi-trash"
                                            severity="danger"
                                            className="p-button-sm p-button-text text-danger p-0"
                                            tooltipOptions={{ position: "top" }}
                                            text
                                            onClick={() => handleDelete(c.Additional_charges_id)}
                                        />
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="text-center">No charges found</td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </Row >

            <Sidebar visible={visibleRight} position="right" style={{ width: '500px' }} onHide={() => setVisibleRight(false)} dismissable={false}>
                <Add_Aircraft_Charge onClose={() => setVisibleRight(false)} page_name={PAGE_NAME} />
            </Sidebar>


            <Sidebar
                visible={visibleRight2}
                position="right"
                style={{ width: '500px' }}
                onHide={() => setVisibleRight2(false)}
                dismissable={false}
            >
                {editingCharge && (
                    <Edit_Aircraft_Charge
                        onClose={() => setVisibleRight2(false)}
                        page_name={PAGE_NAME}
                        initialData={editingCharge} // pass charge to prefill form
                    />
                )}
            </Sidebar>


        </>
    );
};

export default AdditionalCharges