import React, { useState, useEffect } from "react";
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import axios from 'axios';
import { Button } from 'primereact/button';
import config from '../config';
import { useAuth } from "../context/AuthContext";
import api from '../api/axios';
import GifLoder from '../interfaces/GifLoder';
import { Dialog } from 'primereact/dialog';
function PersonalInformations({ userId, personalInfo, setVisibleModal1, page_name }) {
    const PAGE_NAME = "EmployeeEdit"; // Page name for permission checking
    const [formData, setFormData] = useState({
        user_id: '',
        first_name: '',
        last_name: '',
        email: '',
        phone_no: '',
        alternate_no: '',
        personal_email: '',
        employee_no: '',
        joining_date: ''
    });

    const [isFormValid, setIsFormValid] = useState(false);
    const [unauthorized, setUnauthorized] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleDialogHide = () => {
        setUnauthorized(false);
        setVisibleModal1(false); // Or redirect if needed
    };

    useEffect(() => {
        if (personalInfo) {
            setFormData({
                user_id: userId,
                first_name: personalInfo.first_name || '',
                last_name: personalInfo.last_name || '',
                email: personalInfo.email || '',
                phone_no: personalInfo.phone_no || '',
                alternate_no: personalInfo.alternate_no || '',
                personal_email: personalInfo.personal_email || '',
                employee_no: personalInfo.employee_no || '',
                joining_date: personalInfo.joining_date || '',
            });
        }
    }, [personalInfo]);

    useEffect(() => {
        validateForm();
    }, [formData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const validateForm = () => {
        const {
            first_name,
            last_name,
            email,
            phone_no,
            employee_no,
        } = formData;

        const isValid = first_name && last_name && email && phone_no && employee_no;
        setIsFormValid(isValid);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isFormValid) return;

        setLoading(true);
        try {
            const response = await api.put(
                `/personal/update-employee/${page_name}`,
                formData
            );
            setVisibleModal1(false);
        } catch (error) {
            if (error.response?.status === 403) {
                setUnauthorized(true);
            } else {
                console.error('Error updating user details:', error);
            }
        } finally {
            setLoading(false);
        }
    };

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
                <Row className="mb-3">
                    <Col lg={4}>
                        <Form.Label>First Name *</Form.Label>
                        <Form.Control
                            type="text"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleChange}
                            required
                        />
                    </Col>
                    <Col lg={4}>
                        <Form.Label>Last Name *</Form.Label>
                        <Form.Control
                            type="text"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                            required
                        />
                    </Col>
                    <Col lg={4}>
                        <Form.Label>Email *</Form.Label>
                        <Form.Control
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </Col>
                </Row>
                <Row className="mb-3">
                    <Col lg={4}>
                        <Form.Label>Phone Number *</Form.Label>
                        <Form.Control
                            type="text"
                            name="phone_no"
                            value={formData.phone_no}
                            onChange={handleChange}
                            required
                        />
                    </Col>
                    <Col lg={4}>
                        <Form.Label>Alternate Number</Form.Label>
                        <Form.Control
                            type="text"
                            name="alternate_no"
                            value={formData.alternate_no}
                            onChange={handleChange}
                        />
                    </Col>
                    <Col lg={4}>
                        <Form.Label>Personal Email</Form.Label>
                        <Form.Control
                            type="email"
                            name="personal_email"
                            value={formData.personal_email}
                            onChange={handleChange}
                        />
                    </Col>
                </Row>
                <Row className="mb-3">
                    <Col lg={4}>
                        <Form.Label>Employee Number *</Form.Label>
                        <Form.Control
                            type="text"
                            name="employee_no"
                            value={formData.employee_no}
                            onChange={handleChange}
                            required
                        />
                    </Col>
                    <Col lg={4}>
                        <Form.Label>Joining Date</Form.Label>
                        <Form.Control
                            type="date"
                            name="joining_date"
                            value={formData.joining_date}
                            onChange={handleChange}
                        />
                    </Col>
                </Row>
                <Col lg='12' className='d-flex justify-content-end pt-3'>
                    <Button
                        label="Cancel"
                        type="button"
                        outlined
                        severity="secondary"
                        style={{ height: '40px' }}
                        icon="pi pi-times"
                        className='me-2'
                        onClick={() => setVisibleModal1(false)}
                    />
                    <Button
                        label="Save"
                        outlined
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

export default PersonalInformations;
