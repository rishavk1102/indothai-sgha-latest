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
import Add_handling_companies from '../components/Add_handling_companies.js';
import Addairports from "./Addairports.js";
import api from '../api/axios';
import GifLoder from '../interfaces/GifLoder';
import { Dialog } from 'primereact/dialog';
import { getSocket } from "../context/socket";
import { useAuth } from "../context/AuthContext";

const EditClient = ({ onClose, page_name, clientData }) => {
    const [selectedCountry, setSelectedCountry] = useState(null);
    const [visibleRight, setVisibleRight] = useState(false);
    const [visibleRight2, setVisibleRight2] = useState(false);
    const { role, roleId } = useAuth(); // Get roleId from the context
    const [unauthorized, setUnauthorized] = useState(false);
    const [loading, setLoading] = useState(false);
    const handleDialogHide = () => {
        setUnauthorized(false);
        onClose();
    };
    const socket = getSocket();

    const [businesses, setBusinesses] = useState([]);
    const [airports, setAirports] = useState([]);

    const [formData, setFormData] = useState({
        business_id: "",
        airport_id: "",
        name: "",
        email: "",
        operator: "",
        contact_person: "",
        phone: "",
        pan: "",
        gstin: "",
        address1: "",
        address2: "",
        city: "",
        pincode: "",
        state: "",
        country: "",
        other_details: "",
    });



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
        if (clientData) {
            setFormData({
                business_id: clientData.business_id || '',
                airport_id: clientData.airport_id || '',
                name: clientData.name || '',
                email: clientData.email || '',
                operator: clientData.operator || '',
                contact_person: clientData.contact_person || '',
                phone: clientData.phone || '',
                pan: clientData.pan || '',
                gstin: clientData.gstin || '',
                address1: clientData.address1 || '',
                address2: clientData.address2 || '',
                city: clientData.city || '',
                pincode: clientData.pincode || '',
                state: clientData.state || '',
                country: clientData.country || 'IN',
                other_details: clientData.other_details || '',
            });
        }
    }, [clientData]);





    const handleSubmit = async (e) => {
        e.preventDefault(); // ✅ Prevent form reload
        setLoading(true);

        try {
            const response = await api.put(`/clients/edit_client/${clientData.client_id}/${page_name}`, {
                ...formData,
            });
            onClose();
        } catch (error) {
            console.error('Edit Client Error:', error);
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
                <h5 className="text-black">Edit Client</h5>

                <Col md={12} lg={12} className="px-1 mb-3 mt-3">
                    <span className="d-flex justify-content-between align-items-center gap-2">
                        <label>Handling Company </label>
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
                <Col md={12} className="px-1 mb-3">
                    <span className="d-flex justify-content-between align-items-center gap-2">
                        <label>Airport</label>
                        <Button icon="pi pi-plus" severity="danger" className="p-0 border-0" style={{ width: "30px" }} text tooltip="Add New" tooltipOptions={{ position: "left" }} onClick={(e) => {
                            e.preventDefault(); // ✅ Prevent default behavior
                            setVisibleRight2(true);
                        }} />
                    </span>
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
                <Row className="mx-0">
                    <Col md={12} lg={12} className="px-1 mb-3">
                        <label>Name/Company</label>
                        <InputText value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-100" />
                    </Col>
                    <Col md={12} lg={6} className="px-1 mb-3">
                        <label>Operator (Optional)</label>
                        <InputText value={formData.operator} onChange={(e) => setFormData({ ...formData, operator: e.target.value })} className="w-100" />
                    </Col>
                    <Col md={12} lg={6} className="px-1 mb-3">
                        <label>Contact Person (Optional)</label>
                        <InputText value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} className="w-100" />
                    </Col>
                    <Col md={12} lg={6} className="px-1 mb-3">
                        <label>Email</label>
                        <InputText value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-100" />
                    </Col>
                    <Col md={12} lg={6} className="px-1 mb-3">
                        <label>Phone (Optional)</label>
                        <PhoneInput
                            value={formData.phone}
                            onChange={(phone) => setFormData({ ...formData, phone })}
                            defaultCountry="IN"
                            international
                            countryCallingCodeEditable={false}
                            className="w-100"
                        />
                    </Col>
                    <Col md={12} lg={6} className="px-1 mb-3">
                        <label>PAN</label>
                        <InputText value={formData.pan} onChange={(e) => setFormData({ ...formData, pan: e.target.value })} className="w-100" />
                    </Col>
                    <Col md={12} lg={6} className="px-1 mb-3">
                        <label>GSTIN</label>
                        <InputText value={formData.gstin} onChange={(e) => setFormData({ ...formData, gstin: e.target.value })} className="w-100" />
                    </Col>
                    <Col md={12} lg={6} className="px-1 mb-3">
                        <label>Address Line 1 </label>
                        <InputText value={formData.address1} onChange={(e) => setFormData({ ...formData, address1: e.target.value })} placeholder="Address" className="w-100" />
                    </Col>
                    <Col md={12} lg={6} className="px-1 mb-3">
                        <label>Address Line 2</label>
                        <InputText value={formData.address2} onChange={(e) => setFormData({ ...formData, address2: e.target.value })} placeholder="(Optional)" className="w-100" />
                    </Col>
                    <Col md={12} lg={6} className="px-1 mb-3">
                        <label>City</label>
                        <InputText value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-100" />
                    </Col>
                    <Col md={12} lg={6} className="px-1 mb-3">
                        <label>PIN</label>
                        <InputText value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} className="w-100" />
                    </Col>
                    <Col md={12} lg={6} className="px-1 mb-3">
                        <label>State</label>
                        <InputText value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} className="w-100" />
                    </Col>
                    <Col md={12} lg={6} className="px-1 mb-3">
                        <label>Country </label>
                        <InputText value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="w-100" />
                    </Col>
                    <Col md={12} lg={12} className="px-1 mb-3">
                        <label>Other Details</label>
                        <InputTextarea placeholder="(Optional)" rows={3} cols={30} value={formData.other_details} onChange={(e) => setFormData({ ...formData, other_details: e.target.value })} className="w-100 h-auto" />
                    </Col>
                </Row>
                <div className="d-flex justify-content-end">
                    <Button
                        label="Save Client"
                        className="py-2 border-0"
                        severity="help"
                        onClick={handleSubmit}
                    />

                </div>

            </Row>

            <Sidebar visible={visibleRight} position="right" style={{ width: '610px' }} onHide={() => setVisibleRight(false)} dismissable={false}>
                <Add_handling_companies onClose={() => setVisibleRight(false)} page_name={page_name} />
            </Sidebar>

            <Sidebar visible={visibleRight2} position="right" style={{ width: '610px' }} onHide={() => setVisibleRight2(false)} dismissable={false}>
                <Addairports onClose={() => setVisibleRight2(false)} page_name={page_name} />
            </Sidebar>


        </>
    );
};
export default EditClient
