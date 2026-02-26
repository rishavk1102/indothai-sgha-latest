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

const EditCompanyAircraft = ({ onClose, page_name, airlineData }) => {
    const { roleId, userId } = useAuth(); // make sure you're getting roleId from context

    const [formData, setFormData] = useState({
        business_id: '',
        airport_id: '',
        Aircraft_name: '',
        Aircraft_model: '',
        Company_name: '',
        MTOW: '',
        Limit_per_incident: 0,      // number
        Flight_type: '',
        Price_per_Limit_inr: 0,     // number
        Price_per_Limit_usd: 0      // number
    });

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

    // Prefill form with airlineData (aircraft data)
    useEffect(() => {
        if (airlineData) {
            setFormData({
                business_id: airlineData.business_id || '',
                airport_id: airlineData.airport_id || '',
                Aircraft_name: airlineData.Aircraft_name || '',
                Aircraft_model: airlineData.Aircraft_model || '',
                Company_name: airlineData.Company_name || '',
                MTOW: airlineData.MTOW || '',
                Limit_per_incident: airlineData.Limit_per_incident || 0,
                Flight_type: airlineData.Flight_type || '',
                Price_per_Limit_inr: airlineData.Price_per_Limit_inr || 0,
                Price_per_Limit_usd: airlineData.Price_per_Limit_usd || 0,
            });
        }
    }, [airlineData]);

    // ✅ Handle update API
    const handleSubmit = async () => {
        try {
            setLoading(true);
            const payload = {
                ...formData,
                MTOW: parseFloat(formData.MTOW) || 0,
                Limit_per_incident: parseFloat(formData.Limit_per_incident) || 0,
                Price_per_Limit_inr: parseFloat(formData.Price_per_Limit_inr) || 0,
                Price_per_Limit_usd: parseFloat(formData.Price_per_Limit_usd) || 0,
            };

            const response = await api.put(`/company_aircraft_routes/edit_company_aircraft/${airlineData.aircraft_id}/${page_name}`, payload);

            if (response.status === 200) {
                onClose(); // ✅ Close on successful edit
            }
        } catch (error) {
            console.error("❌ Failed to update aircraft:", error);
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
                <h5 className="py-4">Edit Company Aircraft</h5>

                <Col md={12} className="mb-3">
                    <label>Handling Company</label>
                    <Dropdown
                        value={formData.business_id}
                        onChange={(e) => setFormData({ ...formData, business_id: e.value })}
                        options={businesses}
                        optionLabel="name"
                        optionValue="code"
                        placeholder="Select a Business"
                        className="w-100"
                        disabled  // 🔒 makes it read-only
                    />
                </Col>

                {formData.business_id && (
                    <Col md={12} className="mb-3">
                        <label>Airport</label>
                        <Dropdown
                            value={formData.airport_id}
                            onChange={(e) => setFormData({ ...formData, airport_id: e.value })}
                            options={airports}
                            optionLabel="name"
                            optionValue="code"
                            placeholder="Select Airport"
                            className="w-100"
                            disabled  // 🔒 makes it read-only
                        />
                    </Col>
                )}

                <Col md={12} className="mb-3">
                    <label>Aircraft Name</label>
                    <InputText
                        value={formData.Aircraft_name}
                        onChange={(e) => setFormData({ ...formData, Aircraft_name: e.target.value })}
                        className="w-100"
                    />
                </Col>
                <Col md={12} className="mb-3">
                    <label>Company Name</label>
                    <InputText
                        value={formData.Company_name}
                        onChange={(e) => setFormData({ ...formData, Company_name: e.target.value })}
                        className="w-100"
                    />
                </Col>
                <Col md={12} className="mb-3">
                    <label>Aircraft Model</label>
                    <InputText
                        value={formData.Aircraft_model}
                        onChange={(e) => setFormData({ ...formData, Aircraft_model: e.target.value })}
                        className="w-100"
                    />
                </Col>


                <Col md={12} className="mb-3">
                    <label>Flight Type</label>
                    <Form.Select
                        value={formData.Flight_type}
                        onChange={(e) => setFormData({ ...formData, Flight_type: e.target.value })}
                        disabled  // 🔒 makes it read-only
                    >
                        <option value="" disabled>-- Select Type --</option>
                        <option value="Domestic">Domestic</option>
                        <option value="International">International</option>
                    </Form.Select>
                </Col>
                <Col md={12} className="mb-3">
                    <label>MTOW</label>
                    <InputText
                        value={formData.MTOW}
                        onChange={(e) => setFormData({ ...formData, MTOW: e.target.value })}
                        className="w-100"
                    />
                </Col>

                <Col md={12} className="mb-3">
                    <label>Limit per Incident</label>
                    <InputText
                        type="number"
                        min="0"   // ✅ prevent negative values
                        value={formData.Limit_per_incident}
                        onChange={(e) => setFormData({ ...formData, Limit_per_incident: e.target.value })}
                        className="w-100"
                    />
                </Col>

                <Col md={12} className="mb-3">
                    <label>Price per Limit (INR)</label>
                    <InputText
                        type="number"
                        min="0"   // ✅ prevent negative values
                        value={formData.Price_per_Limit_inr}
                        onChange={(e) => setFormData({ ...formData, Price_per_Limit_inr: e.target.value })}
                        className="w-100"
                    />
                </Col>

                <Col md={12} className="mb-3">
                    <label>Price per Limit (USD)</label>
                    <InputText
                        type="number"
                        min="0"   // ✅ prevent negative values
                        value={formData.Price_per_Limit_usd}
                        onChange={(e) => setFormData({ ...formData, Price_per_Limit_usd: e.target.value })}
                        className="w-100"
                    />
                </Col>
                <Col md={12} className="text-end mt-3">
                    <Button label="Cancel" className="py-2 border-0 me-2" severity="secondary" onClick={onClose} />
                    <Button label="Edit Aircraft" className="py-2 border-0" severity="help" onClick={handleSubmit} />
                </Col>
            </Row>

        </>
    );
};

export default EditCompanyAircraft