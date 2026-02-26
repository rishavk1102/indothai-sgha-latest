import React, { useEffect, useState } from "react";
import { Row, Col, Breadcrumb, Form, Label } from "react-bootstrap";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import 'react-phone-number-input/style.css'
import api from '../api/axios';
import GifLoder from '../interfaces/GifLoder';
import { Dialog } from 'primereact/dialog';
import { getSocket } from "../context/socket";
import { useAuth } from "../context/AuthContext";

const Edit_Airlines = ({ onClose, page_name, airlineData }) => {
    const { roleId, userId } = useAuth(); // make sure you're getting roleId from context

    const [formData, setFormData] = useState({
        business_id: '',
        airport_id: '',
        client_id: '',
        airline_name: '',
        iata: '',
        icao: '',
        airline_type: ''
    });

    const [clients, setClients] = useState([]);
    const [unauthorized, setUnauthorized] = useState(false);
    const [loading, setLoading] = useState(false);
    const handleDialogHide = () => {
        setUnauthorized(false);
        onClose();
    };
    const socket = getSocket();

    const [businesses, setBusinesses] = useState([]);
    const [airports, setAirports] = useState([]);




    useEffect(() => {
        if (socket) {
            setLoading(true);

            socket.emit('fetch-businesses', {
                role_id: roleId,
                page_name,
                user_id: userId
            });

            socket.on('fetch-businesses-success', (data) => {
                const formatted = data.map(b => ({
                    name: b.name,
                    code: b.business_id
                }));
                setBusinesses(formatted);
                setLoading(false);
            });

            socket.on('fetch-businesses-error', (error) => {
                console.error('Business fetch error:', error.message);

                // Inline permission handling (your pattern)
                const isPermissionError =
                    error.message?.includes('Missing role_id') ||
                    error.message?.includes('Page') ||
                    error.message?.includes('Permission denied');

                if (isPermissionError) {
                    setUnauthorized(true);
                } else {
                    setBusinesses([]); // optional: preserve or clear
                    console.warn('Server error, not unauthorized:', error.message);
                }

                setLoading(false);
            });

            return () => {
                socket.off('fetch-businesses-success');
                socket.off('fetch-businesses-error');
            };
        }
    }, [socket]);

    useEffect(() => {
        if (formData.business_id && socket) {
            socket.emit("fetch-airports-by-business", {
                role_id: roleId,
                page_name,
                business_id: formData.business_id,
            });

            socket.on("fetch-airports-by-business-success", (data) => {
                const formatted = data.map((a) => ({
                    name: `${a.name} (${a.iata})`,
                    code: a.airport_id,
                }));
                setAirports(formatted);
            });

            socket.on("fetch-airports-by-business-error", (error) => {
                console.error("Airport fetch error:", error.message);
                setAirports([]);
            });

            return () => {
                socket.off("fetch-airports-by-business-success");
                socket.off("fetch-airports-by-business-error");
            };
        }
    }, [formData.business_id]);


    useEffect(() => {
        if (formData.business_id && formData.airport_id && socket) {
            socket.emit("fetch-clients-by-business", {
                role_id: roleId,
                page_name,
                business_id: formData.business_id,
                airport_id: formData.airport_id
            });

            socket.on("fetch-clients-by-business-success", (data) => {
                const formatted = data.map((c) => ({
                    name: c.name,
                    code: c.client_id
                }));
                setClients(formatted);
            });

            socket.on("fetch-clients-by-business-error", (error) => {
                console.error("Client fetch error:", error.message);
                setClients([]);
            });

            return () => {
                socket.off("fetch-clients-by-business-success");
                socket.off("fetch-clients-by-business-error");
            };
        }
    }, [formData.business_id, formData.airport_id]);



    useEffect(() => {
        if (airlineData) {
            setFormData({
                business_id: airlineData.business_id || '',
                airport_id: airlineData.airport_id || '',
                client_id: airlineData.client_id || '',
                airline_name: airlineData.airline_name || '',
                iata: airlineData.iata || '',
                icao: airlineData.icao || '',
                airline_type: airlineData.airline_type || ''
            });
        }
    }, [airlineData]);

    const handleSubmit = async () => {
        try {
            setLoading(true);
            const response = await api.put(`/airlines/edit_airline/${airlineData.airline_id}/${page_name}`, formData);
            if (response.status === 201) {
                onClose(); // ✅ Close on successful edit
            }
        } catch (error) {
            console.error('Edit Airline Error:', error);
            if (error.response?.status === 403) {
                setUnauthorized(true);
            }
        } finally {
            setLoading(false);
        }
    };



    // Unauthorized UI
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
                        className="py-2 mt-3 text-white"
                        style={{ fontSize: '14px' }}
                        severity='danger'
                        onClick={handleDialogHide}
                    />
                </div>
            </Dialog>
        );
    }

    // Loading UI
    if (loading) {
        return <div className='loderDiv'><GifLoder /></div>;
    }




    return (
        <>
            <Row className="mx-0 mt-3 addClient">
                <h5 className="py-4">Edit Airline</h5>
                <Row className="mx-0 mt-3">
                    <Col md={12} lg={12} className="px-1 mb-2">
                        <label>Handling Company</label>
                        <Dropdown
                            value={formData.business_id}
                            onChange={(e) => setFormData({ ...formData, business_id: e.value })}
                            options={businesses}
                            optionLabel="name"
                            optionValue="code"
                            placeholder="Select a Headquarter"
                            className="w-100"
                        />
                    </Col>

                    {formData.business_id && (
                        <>
                            <Col md={12} lg={12} className="px-1 mb-2 mt-2">
                                <label>Airport</label>
                                <Dropdown
                                    value={formData.airport_id}
                                    onChange={(e) => setFormData({ ...formData, airport_id: e.value })}
                                    options={airports}
                                    optionLabel="name"
                                    optionValue="code"
                                    placeholder="Select Airport"
                                    className="w-100"
                                />
                            </Col>

                            <Col md={12} lg={12} className="px-1 mb-2 mt-2">
                                <label>Client</label>
                                <Dropdown
                                    value={formData.client_id}
                                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                                    options={clients}
                                    optionLabel="name"
                                    optionValue="code"
                                    placeholder="Select Client"
                                    className="w-100"
                                />
                            </Col>
                        </>
                    )}

                    <Col md={12} lg={12} className="px-1 mb-2 mt-2">
                        <label>Airline Name</label>
                        <InputText value={formData.airline_name} onChange={(e) => setFormData({ ...formData, airline_name: e.target.value })} className="w-100 mt-2" />
                    </Col>

                    <Col md={12} lg={12} className="px-1 mb-2">
                        <label>Airline IATA (Optional)</label>
                        <InputText value={formData.iata} onChange={(e) => setFormData({ ...formData, iata: e.target.value })} className="w-100 mt-2" />
                    </Col>

                    <Col md={12} lg={12} className="px-1 mb-2">
                        <label>Airline ICAO (Optional)</label>
                        <InputText value={formData.icao} onChange={(e) => setFormData({ ...formData, icao: e.target.value })} className="w-100 mt-2" />
                    </Col>

                    <Col md={12} lg={12} className="px-1 mb-2">
                        <label>Airline Type</label>
                        <Form.Select
                            value={formData.airline_type}
                            onChange={(e) => setFormData({ ...formData, airline_type: e.target.value })}
                        >
                            <option value="" disabled>---- Select Type ----</option>
                            <option value="both">Both</option>
                            <option value="domestic">Domestic</option>
                            <option value="international">International</option>
                        </Form.Select>
                    </Col>

                    <Col md={6} lg={12} className="text-end p-0 mt-3">
                        <Button label="Cancel" className="py-2 border-0 me-2" severity="secondary" onClick={onClose} />
                        <Button label="Update Airline" className="py-2 border-0" severity="help" onClick={handleSubmit} />
                    </Col>
                </Row>
            </Row>
        </>
    );
};


export default Edit_Airlines
