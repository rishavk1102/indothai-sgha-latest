import React, { useEffect, useState } from "react";
import { Row, Col, Breadcrumb, Form, Label } from "react-bootstrap";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import api from '../api/axios';
import GifLoder from '../interfaces/GifLoder';
import { Dialog } from 'primereact/dialog';
import { useDebounce } from 'use-debounce'; // First, install it via npm
import { getSocket } from "../context/socket";
import { useAuth } from "../context/AuthContext";
import { AutoComplete } from "primereact/autocomplete";

const Add_Aircraft = ({ onClose, airline_id, page_name }) => {
    const { roleId } = useAuth(); // Get roleId from the context
    const [formData, setFormData] = useState({
        type_name: '',
        currency: '',
        AAI_levy: '',
        Aircraft_category_id: null
    });

    const [unauthorized, setUnauthorized] = useState(false);
    const [loading, setLoading] = useState(false);

    // AutoComplete states
    const [categories, setCategories] = useState([]);
    const [filteredCategories, setFilteredCategories] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch] = useDebounce(searchTerm, 400);
    const [categoryInput, setCategoryInput] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const handleDialogHide = () => {
        setUnauthorized(false);
        onClose();
    };

    const socket = getSocket();

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };


    // 🔹 Fetch categories using socket
    useEffect(() => {
        // Emit every time search changes (empty search can return all)
        socket.emit("get-aircraft-categories", {
            role_id: roleId,
            page_name,
            searchTerm: debouncedSearch || ""   // send empty for initial fetch
        });

        const handleSuccess = (data) => {
            setCategories(data);
            setFilteredCategories(
                data.map(c => ({
                    label: c.Category_name,
                    value: c.Aircraft_category_id
                }))
            );
        };

        const handleError = (error) => {
            const isPermissionError =
                error.message?.includes("Missing role_id") ||
                error.message?.includes("Page") ||
                error.message?.includes("Permission denied");

            if (isPermissionError) {
                setUnauthorized(true);
            } else {
                console.warn("Error fetching categories:", error.message);
                setCategories([]);
                setFilteredCategories([]);
            }
            setLoading(false);
        };

        socket.on("get-aircraft-categories-success", handleSuccess);
        socket.on("get-aircraft-categories-error", handleError);

        // ✅ Cleanup listeners on unmount / dependency change
        return () => {
            socket.off("get-aircraft-categories-success", handleSuccess);
            socket.off("get-aircraft-categories-error", handleError);
        };
    }, [debouncedSearch, roleId, page_name, socket]);


    const handleSubmit = async () => {
        if (!selectedCategoryId) {
            return;
        }

        setLoading(true);
        try {
            const response = await api.post(`/aircrafts/add_aircraft/${page_name}`, {
                airline_id: parseInt(airline_id),
                Aircraft_category_id: selectedCategoryId,  // ✅ use separate state
                type_name: formData.type_name,
                currency: formData.currency,
                AAI_levy: formData.AAI_levy
            });

            if (response.status === 201) {
                onClose();
            }
        } catch (error) {
            console.error('Add Aircraft Error:', error);
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
        <div className="addClient">
            {/* 🔹 Aircraft Category AutoComplete */}
            <div className="px-1 mb-3">
                <label>Aircraft Category</label>
                <AutoComplete
                    value={categoryInput}   // shows typed input
                    suggestions={filteredCategories}
                    completeMethod={(e) => setSearchTerm(e.query)}
                    field="label"
                    className="w-100"
                    onChange={(e) => {
                        setCategoryInput(e.value); // typing updates input
                        setSelectedCategoryId(null); // reset if user is typing
                    }}
                    onSelect={(e) => {
                        setCategoryInput(e.value.label);   // show category name
                        setSelectedCategoryId(e.value.value); // store category id
                    }}
                />
            </div>

            <div className="px-1 mb-3">
                <label>Type Name</label>
                <InputText
                    value={formData.type_name}
                    className="w-100"
                    onChange={(e) => handleInputChange('type_name', e.target.value)}
                />
            </div>
            <div className="px-1 mb-3">
                <label>Currency</label>
                <Form.Select
                    value={formData.currency}
                    onChange={(e) => handleInputChange('currency', e.target.value)}
                >
                    <option value="">--- select Currency ---</option>
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                </Form.Select>
            </div>
            <div className="px-1 mb-3">
                <label>AAI Levy (in %)</label>
                <InputText
                    value={formData.AAI_levy}
                    className="w-100"
                    onChange={(e) => handleInputChange('AAI_levy', e.target.value)}
                />
            </div>
            <div className="d-flex justify-content-end">
                <Button
                    label={loading ? "Saving..." : "Save"}
                    className="py-2 border-0 text-white"
                    severity="help"
                    onClick={handleSubmit}
                    disabled={loading}
                />
            </div>
        </div>
    );
};

export default Add_Aircraft;
