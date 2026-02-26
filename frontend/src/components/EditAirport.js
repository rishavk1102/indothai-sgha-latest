import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Breadcrumb, Form, Label } from "react-bootstrap";
import { IoChevronBackOutline } from "react-icons/io5";
import { Button } from "primereact/button";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Sidebar } from "primereact/sidebar";
import 'react-phone-number-input/style.css'
import PhoneInput from 'react-phone-number-input'
import { InputTextarea } from "primereact/inputtextarea";
import ReactFlagsSelect from "react-flags-select";
import api from '../api/axios';
import GifLoder from '../interfaces/GifLoder';
import { Dialog } from 'primereact/dialog';
import { getSocket } from "../context/socket";
import Add_handling_companies from '../components/Add_handling_companies';
import { useAuth } from "../context/AuthContext";

const EditAirport = ({ onClose, page_name, airportdata }) => {
    const { role, roleId } = useAuth(); // Get roleId from the context
    const [unauthorized, setUnauthorized] = useState(false);
    const [loading, setLoading] = useState(false);
    const [visibleRight, setVisibleRight] = useState(false);
    const handleDialogHide = () => {
        setUnauthorized(false);
        onClose();
    };
    const socket = getSocket();

    const [businesses, setBusinesses] = useState([]);
    const [formData, setFormData] = useState({
        business_id: '',
        name: '',
        iata: '',
        icao: '',
        address1: '',
        address2: '',
        city: '',
        state: '',
        pincode: '',
        country: ''
    });
    // Add state for file
    const [file, setFile] = useState(null);
    useEffect(() => {
        if (socket) {
            setLoading(true);

            socket.emit('fetch-businesses', {
                role_id: roleId,
                page_name
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
        if (airportdata) {
            setFormData({
                business_id: airportdata.business_id || '',
                name: airportdata.name || '',
                iata: airportdata.iata || '',
                icao: airportdata.icao || '',
                address1: airportdata.address1 || '',
                address2: airportdata.address2 || '',
                city: airportdata.city || '',
                state: airportdata.state || '',
                pincode: airportdata.pincode || '',
                country: airportdata.country || 'IN',
            });
        }
    }, [airportdata]);



    const handleSubmit = async () => {
        setLoading(true);
        try {
            // Build FormData for file + other fields
            const formDataToSend = new FormData();

            formDataToSend.append("business_id", formData.business_id);
            formDataToSend.append("name", formData.name);
            formDataToSend.append("iata", formData.iata);
            formDataToSend.append("icao", formData.icao);
            formDataToSend.append("address1", formData.address1);
            formDataToSend.append("address2", formData.address2);
            formDataToSend.append("city", formData.city);
            formDataToSend.append("state", formData.state);
            formDataToSend.append("pincode", formData.pincode);
            formDataToSend.append("country", formData.country);

            if (file) {
                formDataToSend.append("icon", file); // ✅ attach new file if chosen
            }

            const res = await api.put(
                `/airports/edit_airport/${airportdata.airport_id}/${page_name}`,
                formDataToSend,
                {
                    headers: {
                        "Content-Type": "multipart/form-data"
                    }
                }
            );

            if (res.status === 200) {
                onClose(); // Close the sidebar
            }
        } catch (error) {
            if (error.response?.status === 403) {
                setUnauthorized(true);
            } else {
                console.error("✖️ Airport update failed:", error);
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
                <h5 className="text-black">Edit Airports</h5>
                <Form className="mt-4">
                    <Col md={12} lg={12} className="px-1 mb-3">
                        <span className="d-flex justify-content-between align-items-center gap-2">
                            <label>Headquarter </label>
                            <Button
                                icon="pi pi-plus"
                                severity="danger"
                                className="p-0 border-0"
                                style={{ width: "30px" }}
                                text
                                tooltip="Add New"
                                tooltipOptions={{ position: "left" }}
                                onClick={(e) => {
                                    e.preventDefault(); // ✅ Prevent default behavior
                                    setVisibleRight(true);
                                }}
                            />
                        </span>

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
                    <Row className="mx-0">
                        <Col md={12} lg={12} className="px-1 mb-3">
                            <Form.Group controlId="formFile">
                                <Form.Label>Airport Logo</Form.Label>
                                <Form.Control
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setFile(e.target.files[0])}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={12} lg={12} className="px-1 mb-3">
                            <label>Airport Name</label>
                            <InputText value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-100"
                            />
                        </Col>
                        <Col md={12} lg={6} className="px-1 mb-3">
                            <label>IATA</label>
                            <InputText value={formData.iata}
                                onChange={(e) => setFormData({ ...formData, iata: e.target.value })}
                                className="w-100" />
                        </Col>
                        <Col md={12} lg={6} className="px-1 mb-3">
                            <label>ICAO</label>
                            <InputText value={formData.icao}
                                onChange={(e) => setFormData({ ...formData, icao: e.target.value })}
                                className="w-100" />
                        </Col>
                        <Col md={12} lg={12} className="px-1 mb-3">
                            <label>Address Line 1 </label>
                            <InputText value={formData.address1}
                                onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
                                className="w-100" />
                        </Col>
                        <Col md={12} lg={12} className="px-1 mb-3">
                            <label>Address Line 2</label>
                            <InputText value={formData.address2}
                                onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
                                className="w-100" />
                        </Col>
                        <Col md={12} lg={6} className="px-1 mb-3">
                            <label>City</label>
                            <InputText value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                className="w-100" />
                        </Col>
                        <Col md={12} lg={6} className="px-1 mb-3">
                            <label>PIN</label>
                            <InputText value={formData.pincode}
                                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                                className="w-100" />
                        </Col>
                        <Col md={12} lg={6} className="px-1 mb-3">
                            <label>State</label>
                            <InputText value={formData.state}
                                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                className="w-100" />
                        </Col>
                        <Col md={12} lg={6} className="px-1 mb-3">
                            <label>Country </label>
                            <ReactFlagsSelect
                                selected={formData.country}
                                onSelect={(code) => setFormData({ ...formData, country: code })}
                                searchable={true}
                            />

                        </Col>
                    </Row>
                    <div className="d-flex justify-content-end">
                        <Button
                            label="Save Airport"
                            className="py-2 border-0"
                            severity="help"
                            onClick={handleSubmit}
                        />

                    </div>
                </Form>
            </Row>
            <Sidebar visible={visibleRight} position="right" style={{ width: '610px' }} onHide={() => setVisibleRight(false)} dismissable={false}>
                <Add_handling_companies onClose={() => setVisibleRight(false)} page_name={page_name} />
            </Sidebar>
        </>
    );
};

export default EditAirport
