import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Form, Col, Card, Row } from 'react-bootstrap';
import config from '../config';
import { Button } from 'primereact/button';
import api from '../api/axios';
import GifLoder from '../interfaces/GifLoder';
import { Dialog } from 'primereact/dialog';
function Bankinformation({ userId, bankDetails, setVisibleModal4, page_name }) {
    const PAGE_NAME = "EmployeeEdit"; // Page name for permission checking
    const [unauthorized, setUnauthorized] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleDialogHide = () => {
        setUnauthorized(false);
        setVisibleModal4(false); // Or redirect if needed
    };

    const [formData, setFormData] = useState({
        bankName: '',
        bankAccountNo: '',
        ifscCode: '',
        branchName: '',
        accountHolderName: '',
        upiId: '',
    });
    useEffect(() => {
        if (bankDetails) {
            setFormData({
                bankName: bankDetails.bank_name || '',
                bankAccountNo: bankDetails.bank_account_no || '',
                ifscCode: bankDetails.ifsc_code || '',
                branchName: bankDetails.branch_name || '',
                accountHolderName: bankDetails.accountHolder_name || '',
                upiId: bankDetails.upi_id || '',
            });
        }
    }, [bankDetails]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    };

   const handleSubmit = async (e) => {
        e.preventDefault();

        const payload = {
            user_id: userId,
            bank_name: formData.bankName,
            bank_account_no: formData.bankAccountNo,
            ifsc_code: formData.ifscCode,
            branch_name: formData.branchName,
            account_holder_name: formData.accountHolderName,
            upi_id: formData.upiId
        };

        setLoading(true);
        try {
            if (bankDetails) {
                await api.put(`/bank/bank-information/${userId}/${page_name}`, payload);
            }
            setVisibleModal4(false); // Close the modal on success
        } catch (error) {
            console.error('Error saving bank details:', error);
            if (error.response && error.response.status === 403) {
                setUnauthorized(true); // Show unauthorized dialog
            }
        } finally {
            setLoading(false);
        }
    };

    const isFormValid = () => {
        return (
            formData.bankName &&
            formData.bankAccountNo &&
            formData.ifscCode &&
            formData.branchName &&
            formData.accountHolderName &&
            formData.upiId

        );
    };

    // Unauthorized UI
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

    // Loading UI
    if (loading) {
        return <div className='loderDiv'><GifLoder /></div>;
    }

    return (
        <>
            <Form onSubmit={handleSubmit}>
                <Col lg="12">
                    <Row className="mb-3">
                        <Col lg={6} md={6} className="mb-3">
                            <Form.Label className="mb-1">
                                Bank Name <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                                type="text"
                                name="bankName"
                                value={formData.bankName}
                                onChange={handleChange}
                                placeholder="Bank name"
                            />
                        </Col>
                        <Col lg={6} md={6} className="mb-3">
                            <Form.Label className="mb-1">
                                Bank Account No. <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                                type="text"
                                name="bankAccountNo"
                                value={formData.bankAccountNo}
                                onChange={handleChange}
                                placeholder="xxxxxxxxxxx"
                                min="0"
                                onKeyDown={(e) =>
                                    e.key === 'e' || e.key === '-' || e.key === '.'
                                        ? e.preventDefault()
                                        : null
                                }
                            />
                        </Col>
                        <Col lg={6} md={6} className="mb-3">
                            <Form.Label className="mb-1">
                                IFSC Code <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                                type="text"
                                name="ifscCode"
                                value={formData.ifscCode}
                                onChange={handleChange}
                                placeholder="ICIxxxxx"
                            />
                        </Col>
                        <Col lg={6} md={6} className="mb-3">
                            <Form.Label className="mb-1">
                                Branch Name <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                                type="text"
                                name="branchName"
                                value={formData.branchName}
                                onChange={handleChange}
                                placeholder="Branch name"
                            />
                        </Col>
                        <Col lg={6} md={6} className="mb-3">
                            <Form.Label className="mb-1">
                                Account Holder Name <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                                type="text"
                                name="accountHolderName"
                                value={formData.accountHolderName}
                                onChange={handleChange}
                                placeholder="Account holder name"
                            />
                        </Col>
                        <Col lg={6} md={6} className="mb-3">
                            <Form.Label className="mb-1">
                                UPI Id <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                                type="text"
                                name="upiId"
                                value={formData.upiId}
                                onChange={handleChange}
                                placeholder="UPI Idxxxxxx"
                            />
                        </Col>
                    </Row>
                </Col>
                <Col lg="12" className="d-flex justify-content-end pt-3">
                    <Button
                        label="Save"
                        severity="warning"
                        style={{ height: '40px' }}
                        icon="pi pi-save"
                        type="submit"
                        disabled={!isFormValid()}
                    />
                </Col>
            </Form>
        </>
    );
}

export default Bankinformation;
