import React, { useState, useEffect } from "react";
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';
import { Calendar } from 'primereact/calendar';
import PhoneInput from 'react-phone-number-input';
import 'react-datepicker/dist/react-datepicker.css';
import 'react-phone-number-input/style.css';
import axios from 'axios';
import config from '../config';
import { Button } from 'primereact/button';
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import GifLoder from '../interfaces/GifLoder';
import { Dialog } from 'primereact/dialog';
function Profileinformation({ userId, IdentificationInfo, setVisibleModal2, page_name }) {
    const PAGE_NAME = "EmployeeEdit"; // Page name for permission checking
    const [formData, setFormData] = useState({
        pan_card_no: IdentificationInfo?.pan_card_no || '',
        passport_no: IdentificationInfo?.passport_no || '',
        aadhar_no: IdentificationInfo?.aadhar_no || '',
        nationality: IdentificationInfo?.nationality || '',
        religion: IdentificationInfo?.religion || '',
        marital_status: IdentificationInfo?.marital_status || '',
        employment_of_spouse: IdentificationInfo?.employment_of_spouse || '',
        no_of_children: IdentificationInfo?.no_of_children || '0',
        date_of_birth: IdentificationInfo?.date_of_birth || '',
        Address1: IdentificationInfo?.Address1 || '',
        Address2: IdentificationInfo?.Address2 || '',
        City: IdentificationInfo?.City || '',
        State: IdentificationInfo?.State || '',
        gender: IdentificationInfo?.gender || '',
        Country: IdentificationInfo?.Country || '',
    });


    const [error, setError] = useState('');
    const [unauthorized, setUnauthorized] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleDialogHide = () => {
        setUnauthorized(false);
        setVisibleModal2(false); // Or redirect if needed
    };
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevState) => ({
            ...prevState,
            [name]: value,
        }));
    };

    const validateForm = () => {
        const {
            pan_card_no,
            passport_no,
            aadhar_no,
            nationality,
            religion,
            marital_status,
            employment_of_spouse,
            no_of_children,
            date_of_birth,
            Address1,
            Address2,
            City,
            State,
            gender,
            Country
        } = formData;

        return (
            pan_card_no &&
            passport_no &&
            aadhar_no &&
            nationality &&
            religion &&
            marital_status &&
            employment_of_spouse &&
            no_of_children !== '' &&
            date_of_birth &&
            Address1 &&
            Address2 &&
            City &&
            State &&
            gender &&
            Country
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.put(
                `/personal/personal-information-edit/${userId}/${page_name}`,
                formData
            );
            console.log(response.data);
            setVisibleModal2(false);
        } catch (err) {
            console.error('Error saving profile information:', err);
            if (err.response?.status === 403) {
                setUnauthorized(true);
            } else {
                setError('Failed to save personal information.');
            }
        } finally {
            setLoading(false);
        }
    };

    const isFormValid = validateForm();

    if (unauthorized) {
        return (
            <Dialog
                header="Unauthorized"
                visible={unauthorized}
                onHide={handleDialogHide}
                closable={false}
                dismissableMask={false}
                footer={
                    <Button
                        label="Go Back"
                        icon="pi pi-arrow-left"
                        className="py-1"
                        style={{ fontSize: '14px' }}
                        severity='danger'
                        onClick={handleDialogHide}
                    />
                }
            >
                <p>You are not authorized to Edit this page.</p>
            </Dialog>
        );
    }

    if (loading) {
        return <div className='loderDiv'><GifLoder /></div>;
    }


    return (
        <>
            <Form onSubmit={handleSubmit}>
                <Col lg="12" className="mb-4">

                    <Row className="mb-3">
                        <Col lg={6} md={6}>
                            <Form.Label>Pan Card No.</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.pan_card_no}
                                name="pan_card_no"
                                placeholder="Pan Card No."
                                onChange={handleChange}
                                required
                            />
                        </Col>
                        <Col lg={6} md={6}>
                            <Form.Label>Passport No.</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.passport_no}
                                name="passport_no"
                                placeholder="Passport No."
                                onChange={handleChange}
                                required
                            />
                        </Col>
                    </Row>
                    <Row className="mb-3">
                        <Col lg={6} md={6}>
                            <Form.Label>Aadhar No.</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.aadhar_no}
                                name="aadhar_no"
                                placeholder="Aadhar No."
                                onChange={handleChange}
                                required
                            />
                        </Col>
                        <Col lg={6} md={6}>
                            <Form.Label>Nationality</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.nationality}
                                name="nationality"
                                placeholder="Nationality"
                                onChange={handleChange}
                                required
                            />
                        </Col>
                    </Row>
                    <Row className="mb-3">
                        <Col lg={6} md={6}>
                            <Form.Label>Religion</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.religion}
                                name="religion"
                                placeholder="Religion"
                                onChange={handleChange}
                                required
                            />
                        </Col>
                        <Col lg={6} md={6}>
                            <Form.Label>Marital Status</Form.Label>
                            <Form.Select
                                aria-label="Marital Status"
                                name="marital_status"
                                value={formData.marital_status}
                                onChange={handleChange}
                                required
                            >
                                <option value="" disabled>Select Marital Status</option>
                                <option value="Single">Single</option>
                                <option value="Married">Married</option>
                            </Form.Select>
                        </Col>
                    </Row>
                    <Row className="mb-3">
                        <Col lg={6} md={6}>
                            <Form.Label>Employment of Spouse</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.employment_of_spouse}
                                name="employment_of_spouse"
                                placeholder="Employment of Spouse"
                                onChange={handleChange}
                                required
                            />
                        </Col>
                        <Col lg={6} md={6}>
                            <Form.Label>No. of Children</Form.Label>
                            <Form.Control
                                type="number"
                                value={formData.no_of_children || '0'}
                                name="no_of_children"
                                placeholder="No. of Children"
                                onChange={handleChange}
                                required
                            />
                        </Col>
                    </Row>
                    <Row className="mb-3">
                        <Col lg={6} md={6}>
                            <Form.Label>Gender</Form.Label>
                            <Form.Select
                                aria-label="Gender"
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                required
                            >
                                <option value="" disabled>Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </Form.Select>
                        </Col>
                        <Col lg={6} md={6} >
                            <Form.Label className="w-100 d-block">Date of Birth</Form.Label>
                            <Calendar
                                value={formData.date_of_birth ? new Date(formData.date_of_birth) : null}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        date_of_birth: e.value ? e.value.toISOString().split('T')[0] : '',
                                    }))
                                }
                                dateFormat="dd-mm-yy"
                                placeholder="Select Date of Birth"
                                required
                            />
                        </Col>
                    </Row>

                    <Row className="mb-3">
                        <Col lg={6} md={6}>
                            <Form.Label>Address Line 1</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.Address1}
                                name="Address1"
                                placeholder="Address Line 1"
                                onChange={handleChange}
                                required
                            />
                        </Col>
                        <Col lg={6} md={6}>
                            <Form.Label>Address Line 2</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.Address2}
                                name="Address2"
                                placeholder="Address Line 2"
                                onChange={handleChange}
                                required
                            />
                        </Col>
                    </Row>

                    <Row className="mb-3">
                        <Col lg={6} md={6}>
                            <Form.Label>City</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.City}
                                name="City"
                                placeholder="City"
                                onChange={handleChange}
                                required
                            />
                        </Col>
                        <Col lg={6} md={6}>
                            <Form.Label>State</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.State}
                                name="State"
                                placeholder="State"
                                onChange={handleChange}
                                required
                            />
                        </Col>
                    </Row>

                    <Row className="mb-3">
                        <Col lg={6} md={6}>
                            <Form.Label>Country</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.Country}
                                name="Country"
                                placeholder="Country"
                                onChange={handleChange}
                                required
                            />
                        </Col>
                    </Row>
                </Col>
                <Col lg="12" className="d-flex justify-content-end pt-3">
                    <Button
                        type="button"
                        label="Cancel"
                        outlined
                        severity="secondary"
                        style={{ height: '40px' }}
                        icon="pi pi-times"
                        className='me-2'
                        onClick={() => setVisibleModal2(false)}
                    />
                    <Button
                        label="Save"

                        severity="warning"
                        style={{ height: '40px' }}
                        icon="pi pi-save"
                        type="submit"
                        disabled={!isFormValid}
                    />
                </Col>
            </Form>
        </>
    );
}

export default Profileinformation;
