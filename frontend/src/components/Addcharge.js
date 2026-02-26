import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Form } from 'react-bootstrap';
import { IoChevronBackOutline } from "react-icons/io5";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { InputNumber } from 'primereact/inputnumber';
import api from '../api/axios';
import GifLoder from '../interfaces/GifLoder';
import { getSocket } from "../context/socket";
import { useAuth } from "../context/AuthContext";
import { Dialog } from "primereact/dialog";
const Addcharge = ({ aircraft_data, onClose, page_name }) => {
    const { role, roleId } = useAuth(); // Get roleId from the context
    const [unauthorized, setUnauthorized] = useState(false);
    const [loading, setLoading] = useState(false);
    const handleDialogHide = () => {
        setUnauthorized(false);
        onClose();
    };
    const socket = getSocket();
    const [chargeTypes, setChargeTypes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [formData, setFormData] = useState({
        charge_type_id: '',
        category_id: '', // ✅ add this
        service: '',
        unit: '',
        rate_type: '',
        reference_charge_type_id: null,
        count: 1,
        include_aai: '',
        rate: 0,
        aai_levy: 0,
        total_rate: 0,
        of_count: 0,
        of_rate: 0,
        of_aai_levy: 0,
        total_of_rate: 0
    });


    const calculateLevy = (field, value, prevData) => {
        const levyPercent = Number(aircraft_data?.AAI_levy || 0);
        const updatedData = { ...prevData, [field]: value };

        const rate = parseFloat(updatedData.rate) || 0;
        const of_rate = parseFloat(updatedData.of_rate) || 0;

        // If AAI Levy is included and levy % is > 0
        if (updatedData.include_aai === '1' && levyPercent > 0) {
            const aai_levy = +(rate * levyPercent / 100).toFixed(2);
            const of_aai_levy = +(of_rate * levyPercent / 100).toFixed(2);

            return {
                ...updatedData,
                aai_levy,
                total_rate: +(rate + aai_levy).toFixed(2),
                of_aai_levy,
                total_of_rate: +(of_rate + of_aai_levy).toFixed(2)
            };
        }

        // If AAI Levy is not included
        return {
            ...updatedData,
            aai_levy: 0,
            total_rate: rate,
            of_aai_levy: 0,
            total_of_rate: of_rate
        };
    };


    const handleInputChange = (field, value) => {
        setFormData(prev => calculateLevy(field, value, prev));
    };


    const handleSubmit = async () => {
        setLoading(true);
        try {
            const response = await api.post(`/charge-types/add_charge/${page_name}`, {
                aircraft_id: aircraft_data.aircraft_id,
                category_id: formData.category_id, // ✅ Add this
                charge_type_id: formData.charge_type_id,
                service: formData.service,
                unit: formData.unit,
                rate_type: formData.rate_type,
                reference_charge_type_id: formData.reference_charge_type_id,
                count: formData.count,
                include_aai: formData.include_aai === '1', // 🔁 convert to boolean
                rate: formData.rate,
                aai_levy: formData.aai_levy,
                total_rate: formData.total_rate,
                of_count: formData.of_count,
                of_rate: formData.of_rate,
                of_aai_levy: formData.of_aai_levy,
                total_of_rate: formData.total_of_rate
            });
            onClose();
        } catch (error) {
            console.error('Add Charge Error:', error);
            if (error.response?.status === 403) {
                setUnauthorized(true);
            }
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        if (!socket) return;

        socket.emit('fetch-charge-types', {
            role_id: roleId, // or get from context
            page_name: page_name
        });

        // New: fetch-categories
        socket.emit('fetch-categories', {
            role_id: roleId,
            page_name,
        });
        const handleCategories = (data) => setCategories(data);
        const handleSuccess = (data) => {
            setChargeTypes(data);
            setLoading(false);
        };

        const handleError = (error) => {
            const isPermissionError =
                error.message?.includes('Missing role_id') ||
                error.message?.includes('Page') ||
                error.message?.includes('Permission denied');

            if (isPermissionError) {
                setUnauthorized(true);
            } else {
                setChargeTypes([]);
                console.warn('Aircraft charges fetch error:', error.message);
            }

            setLoading(false);
        };

        const refetch = () => {
            socket.emit('fetch-charge-types', {
                role_id: roleId,
                page_name: page_name
            });
        };

        socket.on('fetch-charge-types-success', handleSuccess);
        socket.on('fetch-categories-success', handleCategories);
        socket.on('fetch-charge-types-error', handleError);
        socket.on('fetch-categories-error', handleError);
        socket.on('ChargeTypesUpdated', refetch);

        return () => {
            socket.off('fetch-charge-types-success', handleSuccess);
            socket.off('fetch-categories-success', handleCategories);
            socket.off('fetch-charge-types-error', handleError);
            socket.off('fetch-categories-error', handleError);
            socket.off('ChargeTypesUpdated', refetch);
        };
    }, [socket, roleId, page_name]);




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

    if (loading) {
        return <div className='loderDiv'><GifLoder /></div>;
    }
    return (
        <>
            <Row className="mx-0 py-3 border-bottom mb-4">
                <h5 className="text-black">Add New Charge</h5>
            </Row>
            <div className="addClient px-2">
                <div className="mb-3">
                    <label>Category</label>
                    <Form.Select value={formData.category_id} onChange={e => handleInputChange('category_id', e.target.value)}>
                        <option value="">--- Select Category ---</option>
                        {categories.map(cat => (
                            <option key={cat.category_id} value={cat.category_id}>
                                {cat.name}
                            </option>
                        ))}
                    </Form.Select>
                </div>

                <div className="mb-3">
                    <label>Charge Type</label>
                    <Form.Select value={formData.charge_type_id} onChange={e => handleInputChange('charge_type_id', e.target.value)}>
                        <option value="">--- Select Type ---</option>
                        {chargeTypes.map(type => (
                            <option key={type.charge_type_id} value={type.charge_type_id}>
                                {type.name}
                            </option>
                        ))}
                    </Form.Select>
                </div>
                <div className="mb-3">
                    <label>Service</label>
                    <InputText className="w-100" value={formData.service} onChange={(e) => handleInputChange('service', e.target.value)} />
                </div>
                <div className="mb-3">
                    <label>Unit</label>
                    <Form.Select value={formData.unit} onChange={e => handleInputChange('unit', e.target.value)}>
                        <option value="">--- Select Unit ---</option>
                        <option value="hour">Per Hour</option>
                        <option value="start">Per Start</option>
                        <option value="use">Per Use</option>
                        <option value="flight">Per Flight</option>
                    </Form.Select>
                </div>

                <div className="mb-3">
                    <label>Include {aircraft_data?.AAI_levy || 0}% AAI Levy</label>
                    <Form.Select value={formData.include_aai} onChange={e => handleInputChange('include_aai', e.target.value)}>
                        <option value="">--- Select ---</option>
                        <option value="0">No</option>
                        <option value="1">Yes</option>
                    </Form.Select>
                </div>
                <div className="mb-3">
                    <label>Rate Type</label>
                    <Form.Select value={formData.rate_type} onChange={e => handleInputChange('rate_type', e.target.value)}>
                        <option value="">--- Select ---</option>
                        <option value="Fixed">Fixed Price in Digits</option>
                        <option value="Percentage">In Percentage (%)</option>
                    </Form.Select>
                </div>
                {formData.rate_type === 'Percentage' &&
                    <div className="mb-3">
                        <label>Percentage Of</label>
                        <Form.Select value={formData.reference_charge_type_id} onChange={e => handleInputChange('reference_charge_type_id', e.target.value)}>
                            <option value="">--- Select Charge Type ---</option>
                            {chargeTypes.map(type => (
                                <option key={type.charge_type_id} value={type.charge_type_id}>
                                    {type.name}
                                </option>
                            ))}
                        </Form.Select>
                    </div>
                }
                <div className="mb-3">
                    <label>Unit Included Count {formData.unit ? `(unit in ${formData.unit})` : ''}</label>
                    <InputNumber value={formData.count} min={1} className="w-100" onValueChange={(e) => handleInputChange('count', e.value)} />
                </div>
                <div className="mb-3">
                    <label>Rate ({aircraft_data?.currency || 'INR'}) {formData.rate_type === 'Percentage' ? '(in %)' : ''}</label>
                    <InputNumber value={formData.rate} min={0} className="w-100" onValueChange={(e) => handleInputChange('rate', e.value)} />
                    {formData.aai_levy > 0 && <small style={{ fontSize: '12px' }} className="text-warning">Enter basic rate without incl. AAI Levy.</small>}
                </div>
                <div className="mb-3">
                    <label>Overflow Rate ({aircraft_data?.currency || 'INR'}) {formData.rate_type === 'Percentage' ? '(in %)' : ''}</label>
                    <InputNumber value={formData.of_rate} min={0} className="w-100" onValueChange={(e) => handleInputChange('of_rate', e.value)} />
                    {formData.aai_levy > 0 && <small style={{ fontSize: '12px' }} className="text-warning">Enter basic rate without incl. AAI Levy.</small>}
                </div>
                {formData.include_aai === '1' && (
                    <>
                        <div className="mb-2">
                            <small className="text-muted">AAI Levy on Rate: {formData.aai_levy} </small>
                        </div>
                        <div className="mb-2">
                            <small className="text-muted">Total Rate: {formData.total_rate} </small>
                        </div>
                        <div className="mb-2">
                            <small className="text-muted">AAI Levy on Overflow Rate: {formData.of_aai_levy} </small>
                        </div>
                        <div className="mb-3">
                            <small className="text-muted">Total Overflow Rate: {formData.total_of_rate} </small>
                        </div>
                    </>
                )}

                {formData.include_aai === '0' && (
                    <>
                        <div className="mb-2">
                            <small className="text-muted">Total Rate: {formData.total_rate} </small>
                        </div>
                        <div className="mb-3">
                            <small className="text-muted">Total Overflow Rate: {formData.total_of_rate} </small>
                        </div>
                    </>
                )}
                <div className="d-flex justify-content-end">
                    <Button label="Save" className="py-2 px-4 border-0" severity="help" onClick={handleSubmit} />
                </div>
            </div>
        </>
    );
};

export default Addcharge;