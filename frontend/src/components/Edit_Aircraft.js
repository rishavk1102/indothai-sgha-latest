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

const Edit_Aircraft = ({ onClose, aircraft_data, page_name }) => {
    const { roleId } = useAuth();
    const socket = getSocket();
    const [formData, setFormData] = useState({
        type_name: '',
        currency: '',
        AAI_levy: ''
    });

    const [unauthorized, setUnauthorized] = useState(false);
    const [loading, setLoading] = useState(false);
    const [categoryInput, setCategoryInput] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);

    const [categories, setCategories] = useState([]);
    const [filteredCategories, setFilteredCategories] = useState([]);

    // Debounced search term
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch] = useDebounce(searchTerm, 400);

    // 🔹 Load initial aircraft data
    useEffect(() => {
        if (aircraft_data) {
            setFormData({
                type_name: aircraft_data.type_name || "",
                currency: aircraft_data.currency || "",
                AAI_levy: aircraft_data.AAI_levy || "",
            });
            setCategoryInput(aircraft_data.category?.Category_name || "");
            setSelectedCategoryId(aircraft_data.category?.Aircraft_category_id || null);
        }
    }, [aircraft_data]);


    // 🔹 Fetch categories with socket (with debounce)
    useEffect(() => {
        socket.emit("get-aircraft-categories", {
            role_id: roleId,
            page_name,
            searchTerm: debouncedSearch || "",
        });

        const handleSuccess = (data) => {
            setCategories(data);
            setFilteredCategories(
                data.map((c) => ({
                    label: c.Category_name,
                    value: c.Aircraft_category_id,
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

        return () => {
            socket.off("get-aircraft-categories-success", handleSuccess);
            socket.off("get-aircraft-categories-error", handleError);
        };
    }, [debouncedSearch, roleId, page_name, socket]);



    const handleDialogHide = () => {
        setUnauthorized(false);
        onClose();
    };
    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // 🔹 Submit update
    const handleSubmit = async () => {
        if (!selectedCategoryId) {
            return;
        }

        setLoading(true);
        try {
            const response = await api.put(
                `/aircrafts/edit_aircraft/${aircraft_data.aircraft_id}/${page_name}`,
                {
                    airline_id: aircraft_data.airline_id,
                    Aircraft_category_id: selectedCategoryId, // ✅ use selected ID
                    ...formData,
                }
            );

            if (response.status === 200) {
                onClose();
            }
        } catch (error) {
            console.error("Edit Aircraft Error:", error);
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
                    value={categoryInput}
                    suggestions={filteredCategories}
                    completeMethod={(e) => setSearchTerm(e.query)}
                    field="label"
                    className="w-100"
                    onChange={(e) => {
                        setCategoryInput(e.value);
                        setSelectedCategoryId(null);
                    }}
                    onSelect={(e) => {
                        setCategoryInput(e.value.label);
                        setSelectedCategoryId(e.value.value);
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


export default Edit_Aircraft
