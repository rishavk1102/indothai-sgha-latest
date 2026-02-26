import React, { useState, useEffect } from 'react';
import { Form, Row, Col, Card } from 'react-bootstrap';
import { Button } from 'primereact/button';
import api from '../api/axios';
import GifLoder from '../interfaces/GifLoder';
import { Dialog } from 'primereact/dialog';
function Emergencycontact({ userId, emergencyContact, setVisibleModal3, page_name }) {
    const PAGE_NAME = "EmployeeEdit"; // Page name for permission checking
    const [contact, setContact] = useState({ name: '', relationship: '', phone: '' });
    const [errors, setErrors] = useState({ name: '', relationship: '', phone: '' });
    const [unauthorized, setUnauthorized] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleDialogHide = () => {
        setUnauthorized(false);
        setVisibleModal3(false); // Or redirect if needed
    };


    useEffect(() => {
        if (emergencyContact && Object.keys(emergencyContact).length > 0) {
            setContact({
                name: emergencyContact.Contact_name || '',
                relationship: emergencyContact.Relation || '',
                phone: emergencyContact.Phone_no || '',
            });
            setErrors({ name: '', relationship: '', phone: '' });
        }
    }, [emergencyContact]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setContact({ ...contact, [name]: value });

        if (value.trim() !== '') {
            setErrors({ ...errors, [name]: '' });
        }
    };

    const validatePhoneNumber = (phone) => {
        const phoneRegex = /^[6-9]\d{9}$/; // Example for Indian numbers
        return phoneRegex.test(phone);
    };

    const validateForm = () => {
        const newErrors = {
            name: contact.name.trim() === '' ? 'Name is required' : '',
            relationship: contact.relationship.trim() === '' ? 'Relationship is required' : '',
            phone: contact.phone.trim() === '' ? 'Phone number is required' :
                !validatePhoneNumber(contact.phone) ? 'Phone number is invalid' : '',
        };
        setErrors(newErrors);

        return !Object.values(newErrors).some(error => error !== '');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (validateForm()) {
            setLoading(true);
            try {
                const data = {
                    user_id: userId,
                    Contact_name: contact.name,
                    Relation: contact.relationship,
                    Phone_no: contact.phone,
                };

                if (emergencyContact && Object.keys(emergencyContact).length > 0) {
                    await api.put(`/Emergency/emergency-contact/${userId}/${page_name}`, data);
                }

                setVisibleModal3(false);
            } catch (error) {
                console.error('Error saving emergency contact:', error);

                if (error.response && error.response.status === 403) {
                    setUnauthorized(true); // Trigger unauthorized dialog
                }
            } finally {
                setLoading(false);
            }
        } else {
            console.log('Form contains errors');
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
        <Form onSubmit={handleSubmit}>
            <Col lg='12' className='mb-4'>
                <Row className="mb-3">
                    <Col lg={4} md={6}>
                        <Form.Label>Name <span className='text-danger'>*</span></Form.Label>
                        <Form.Control
                            type="text"
                            name="name"
                            value={contact.name}
                            onChange={handleChange}
                            placeholder="Name"
                            isInvalid={!!errors.name}
                        />
                        <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
                    </Col>
                    <Col lg={4} md={6}>
                        <Form.Label>Relationship <span className='text-danger'>*</span></Form.Label>
                        <Form.Control
                            type="text"
                            name="relationship"
                            value={contact.relationship}
                            onChange={handleChange}
                            placeholder="Relationship"
                            isInvalid={!!errors.relationship}
                        />
                        <Form.Control.Feedback type="invalid">{errors.relationship}</Form.Control.Feedback>
                    </Col>
                    <Col lg={4} md={6}>
                        <Form.Label>Phone No.<span className='text-danger'>*</span></Form.Label>
                        <Form.Control
                            type="text"
                            name="phone"
                            value={contact.phone}
                            onChange={handleChange}
                            placeholder="Phone Number"
                            isInvalid={!!errors.phone}
                        />
                        <Form.Control.Feedback type="invalid">{errors.phone}</Form.Control.Feedback>
                    </Col>
                </Row>
            </Col>
            <Col lg='12' className='d-flex justify-content-end pt-3'>
                <Button
                    label="Save"
                    severity="warning"
                    style={{ height: '40px' }}
                    icon="pi pi-save"
                    type="submit"
                />
            </Col>
        </Form>
    );
}

export default Emergencycontact;
