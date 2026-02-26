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

const Edit_handling_companies = ({ onClose, page_name, businessData }) => {
    const [unauthorized, setUnauthorized] = useState(false);
    const [loading, setLoading] = useState(false);
    const handleDialogHide = () => {
        setUnauthorized(false);
        onClose();
    };
    const [value, setValue] = useState(''); // phone
    const [selected, setSelected] = useState("IN");

    const [formData, setFormData] = useState({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        landline: '',
        pan: '',
        gstin: '',
        cin: '',
        address1: '',
        address2: '',
        city: '',
        pincode: '',
        state: '',
        country: 'India',
        bank: '',
        branch: '',
        account_no: '',
        ifsc: '',
        swift_code: '',
    });

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };


    useEffect(() => {
        if (businessData) {
            setFormData({
                ...formData,
                ...businessData,
            });
            setValue(businessData.phone || ''); // For PhoneInput
            setSelected(businessData.country || 'IN'); // For ReactFlagsSelect
        }
    }, [businessData]);


    const handleSubmit = async () => {
        setLoading(true);
        try {
            const payload = {
                ...formData,
                phone: value,
                country: selected,
            };

            const res = await api.put(`/business/business/${businessData.business_id}/${page_name}`, payload);

            if (res.status === 200) {
                onClose(); // Close sidebar on success
            }
        } catch (error) {
            if (error.response?.status === 403) {
                setUnauthorized(true);
            } else {
                console.error('Failed to update business:', error);
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
                <h5 className="text-black">Edit Handling Companies</h5>
                <Form className="mt-4">
                    <Row className="mx-0">
                        <Col md={12} lg={12} className="px-1 mb-3">
                            <label>Name/Company</label>
                            <InputText value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)} className="w-100" />
                        </Col>
                        <Col md={12} lg={6} className="px-1 mb-3">
                            <label>Contact Person (Optional)</label>
                            <InputText value={formData.contact_person}
                                onChange={(e) => handleInputChange('contact_person', e.target.value)} className="w-100" />
                        </Col>
                        <Col md={12} lg={6} className="px-1 mb-3">
                            <label>Email</label>
                            <InputText value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)} className="w-100" />
                        </Col>
                        <Col md={12} lg={6} className="px-1 mb-3">
                            <label>Phone (Optional)</label>
                            <PhoneInput
                                value={value}
                                onChange={setValue}
                                defaultCountry="IN"
                                international
                                countryCallingCodeEditable={false}
                            />
                        </Col>
                        <Col md={12} lg={6} className="px-1 mb-3">
                            <label>Landline (Optional)</label>
                            <InputText
                                value={formData.landline}
                                onChange={(e) => handleInputChange("landline", e.target.value)}
                                placeholder="Landline number with STD code"
                                className="w-100"
                            />
                        </Col>
                        <Col md={12} lg={4} className="px-1 mb-3">
                            <label>PAN</label>
                            <InputText
                                value={formData.pan}
                                onChange={(e) => handleInputChange("pan", e.target.value)}
                                className="w-100"
                            />
                        </Col>
                        <Col md={12} lg={4} className="px-1 mb-3">
                            <label>GSTIN</label>
                            <InputText
                                value={formData.gstin}
                                onChange={(e) => handleInputChange("gstin", e.target.value)}
                                className="w-100"
                            />
                        </Col>

                        <Col md={12} lg={4} className="px-1 mb-3">
                            <label>CIN</label>
                            <InputText
                                value={formData.cin}
                                onChange={(e) => handleInputChange("cin", e.target.value)}
                                className="w-100"
                            />
                        </Col>

                        <Col md={12} lg={6} className="px-1 mb-3">
                            <label>Address Line 1</label>
                            <InputText
                                value={formData.address1}
                                onChange={(e) => handleInputChange("address1", e.target.value)}
                                className="w-100"
                            />
                        </Col>

                        <Col md={12} lg={6} className="px-1 mb-3">
                            <label>Address Line 2</label>
                            <InputText
                                value={formData.address2}
                                onChange={(e) => handleInputChange("address2", e.target.value)}
                                className="w-100"
                            />
                        </Col>

                        <Col md={12} lg={6} className="px-1 mb-3">
                            <label>City</label>
                            <InputText
                                value={formData.city}
                                onChange={(e) => handleInputChange("city", e.target.value)}
                                className="w-100"
                            />
                        </Col>

                        <Col md={12} lg={6} className="px-1 mb-3">
                            <label>PIN</label>
                            <InputText
                                value={formData.pincode}
                                onChange={(e) => handleInputChange("pincode", e.target.value)}
                                className="w-100"
                            />
                        </Col>

                        <Col md={12} lg={6} className="px-1 mb-3">
                            <label>State</label>
                            <InputText
                                value={formData.state}
                                onChange={(e) => handleInputChange("state", e.target.value)}
                                className="w-100"
                            />
                        </Col>

                        <Col md={12} lg={6} className="px-1 mb-3">
                            <label>Country</label>
                            <ReactFlagsSelect
                                selected={selected}
                                onSelect={(code) => setSelected(code)}
                                searchable={true}
                                style={{ height: "47px" }}
                            />
                        </Col>

                        <Col md={12} lg={12} className="py-3 mt-2 px-0 border-top">
                            <h6 className="text-dark mb-3">Bank Details</h6>
                        </Col>

                        <Col md={12} lg={6} className="px-1 mb-3">
                            <label>Bank Name</label>
                            <InputText
                                value={formData.bank}
                                onChange={(e) => handleInputChange("bank", e.target.value)}
                                className="w-100"
                            />
                        </Col>

                        <Col md={12} lg={6} className="px-1 mb-3">
                            <label>Branch Name</label>
                            <InputText
                                value={formData.branch}
                                onChange={(e) => handleInputChange("branch", e.target.value)}
                                className="w-100"
                            />
                        </Col>

                        <Col md={12} lg={12} className="px-1 mb-3">
                            <label>Account No</label>
                            <InputText
                                value={formData.account_no}
                                onChange={(e) => handleInputChange("account_no", e.target.value)}
                                className="w-100"
                            />
                        </Col>

                        <Col md={12} lg={6} className="px-1 mb-3">
                            <label>RTGS/NEFT IFSC Code</label>
                            <InputText
                                value={formData.ifsc}
                                onChange={(e) => handleInputChange("ifsc", e.target.value)}
                                className="w-100"
                            />
                        </Col>

                        <Col md={12} lg={6} className="px-1 mb-3">
                            <label>Swift Code</label>
                            <InputText
                                value={formData.swift_code}
                                onChange={(e) => handleInputChange("swift_code", e.target.value)}
                                className="w-100"
                            />
                        </Col>
                    </Row>
                    <div className="d-flex justify-content-end">
                        <Button
                            label="Save Companies"
                            className="py-2 border-0"
                            severity="help"
                            onClick={handleSubmit}
                        />

                    </div>
                </Form>
            </Row>
        </>
    );
};

export default Edit_handling_companies
