import React, { useState, useEffect } from "react";
import { Button } from "primereact/button";
import { Card } from "react-bootstrap";
import { Dropdown } from "primereact/dropdown";
import { AutoComplete } from "primereact/autocomplete";
import { InputNumber } from "primereact/inputnumber";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import { getSocket } from "../context/socket";
import GifLoder from "../interfaces/GifLoder";
import { Dialog } from "primereact/dialog";
import { useDebounce } from "use-debounce"; 

const EditServicePriceSidebar = ({ visible, onHide, pageName, editData }) => {

    const { roleId, userId } = useAuth();
    const socket = getSocket();

    const [loading, setLoading] = useState(false);
    const [unauthorized, setUnauthorized] = useState(false);

    // Business & Airport
    const [businesses, setBusinesses] = useState([]);
    const [selectedBusiness, setSelectedBusiness] = useState(editData?.business_id || "");
    const [airports, setAirports] = useState([]);
    const [selectedAirport, setSelectedAirport] = useState(editData?.airport_id || "");

    // Aircraft Category
    const [categories, setCategories] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState(editData?.aircraft_id || "");
    // state
    const [categoryOptions, setCategoryOptions] = useState([]);
    // Flight Type
    const [flightTypes, setFlightTypes] = useState([]);
    const [selectedFlightTypeId, setSelectedFlightTypeId] = useState(editData?.flight_type_id || "");
    const [flightTypeOptions, setFlightTypeOptions] = useState([]);

    // Service Category
    const [catOptions, setCatOptions] = useState([]);
    const [catInput, setCatInput] = useState(editData?.service || "");
    const [selectedCatId, setSelectedCatId] = useState(editData?.service_id || "");
    const [catSearch, setCatSearch] = useState("");
    const [debouncedCatSearch] = useDebounce(catSearch, 500);

    // Price
    const [price, setPrice] = useState(editData?.price || null);

    const handleDialogHide = () => {
        setUnauthorized(false);
        onHide();
    };

    // fetch businesses
    useEffect(() => {
        if (!socket) return;
        socket.emit("fetch-businesses", {
            role_id: roleId,
            page_name: pageName,
            user_id: userId,
        });

        socket.on("fetch-businesses-success", setBusinesses);
        socket.on("fetch-businesses-error", (error) => {
            if (error.message?.includes("Permission")) setUnauthorized(true);
            else setBusinesses([]);
        });

        return () => {
            socket.off("fetch-businesses-success");
            socket.off("fetch-businesses-error");
        };
    }, [socket, userId, roleId]);

    // fetch airports for selected business
    useEffect(() => {
        if (!socket || !selectedBusiness) return;

        socket.emit("fetch-airports-by-business", {
            role_id: roleId,
            page_name: pageName,
            business_id: selectedBusiness,
        });

        socket.on("fetch-airports-by-business-success", (data) => {
            setAirports(
                data.map((a) => ({
                    name: `${a.name} (${a.iata})`,
                    code: a.airport_id,
                }))
            );
        });

        return () => {
            socket.off("fetch-airports-by-business-success");
            socket.off("fetch-airports-by-business-error");
        };
    }, [socket, roleId, selectedBusiness]);

    // fetch aircraft categories
    useEffect(() => {
        if (!socket) return;

        socket.emit("get-aircraft-categories", {
            role_id: roleId,
            page_name: pageName,
            searchTerm: "", // always empty
        });

        const handleCategories = (data) => {
            setCategoryOptions(
                data.map((c) => ({
                    label: c.Category_name,
                    value: c.Aircraft_category_id,
                }))
            );
        };

        socket.on("get-aircraft-categories-success", handleCategories);

        return () => {
            socket.off("get-aircraft-categories-success", handleCategories);
        };
    }, [socket, roleId, pageName]);

    useEffect(() => {
        if (!socket) return;

        socket.emit("fetch-flight-types", {
            role_id: roleId,
            page_name: pageName,
            searchTerm: "", // always empty
        });

        const handleFlightTypes = (data) => {
            setFlightTypeOptions(
                data.map((ft) => ({
                    label: ft.Flight_type_name,
                    value: ft.Flight_type_id,
                }))
            );
        };

        socket.on("fetch-flight-types-success", handleFlightTypes);

        return () => {
            socket.off("fetch-flight-types-success", handleFlightTypes);
        };
    }, [socket, roleId, pageName]);


    // fetch service categories
    useEffect(() => {
        socket.emit("fetch-categories", {
            role_id: roleId,
            page_name: pageName,
            searchTerm: debouncedCatSearch || "",
        });

        socket.on("fetch-categories-success", (data) => {
            setCatOptions(
                data.map((cat) => ({
                    label: cat.name,
                    value: cat.category_id,
                }))
            );
        });

        return () => {
            socket.off("fetch-categories-success");
            socket.off("fetch-categories-error");
        };
    }, [debouncedCatSearch, roleId, pageName]);

    // ---------------- UPDATE HANDLER ----------------
    const handleUpdate = async () => {
        if (!selectedBusiness || !selectedAirport || !selectedCategoryId || !selectedFlightTypeId || !selectedCatId || !price) {
            return alert("Please fill all fields");
        }

        setLoading(true);
        try {
            const body = {
                Business_id: selectedBusiness,
                Airport_id: selectedAirport,
                Aircraft_category_id: selectedCategoryId,
                category_id: selectedCatId,
                Flight_type_id: selectedFlightTypeId,
                Price: price,
            };

            await api.put(`/service_price/edit_service_price/${editData.service_price_id}/${pageName}`, body, {});
            onHide(); // close after success
        } catch (err) {
            console.error("❌ Failed to update service price:", err);
            alert(err.response?.data?.message || "Failed to update service price");
        } finally {
            setLoading(false);
        }
    };

    if (unauthorized) {
        return (
            <Dialog
                style={{ width: "360px" }}
                visible={unauthorized}
                onHide={handleDialogHide}
                closable={false}
                dismissableMask={false}
            >
                <div className="text-center">
                    <img
                        src="https://blackboxstorage.blr1.cdn.digitaloceanspaces.com/assetImages/protect.png"
                        alt="symbol"
                        width="100"
                        className="mb-3"
                    />
                    <h5>Unauthorized</h5>
                    <p>You are not authorized</p>
                    <Button
                        label="Go Back"
                        icon="pi pi-arrow-left"
                        className="py-2 mt-3 text-white"
                        style={{ fontSize: "14px" }}
                        severity="danger"
                        onClick={handleDialogHide}
                    />
                </div>
            </Dialog>
        );
    }

    if (loading) {
        return <div className="loderDiv"><GifLoder /></div>;
    }

    return (
        <Card className="border-0 shadow-0 pt-3">
            <Card.Header className="bg-white border-0 shadow-0">
                <h5>Edit Charges</h5>
            </Card.Header>
            <Card.Body className="p-0 pt-3">
                <div className="mb-3">
                    <label className="mb-2">Handling Company</label>
                    <Dropdown
                        value={selectedBusiness}
                        options={businesses.map((b) => ({ label: b.name, value: b.business_id }))}
                        onChange={(e) => setSelectedBusiness(e.value)}
                        placeholder="Filter By Handling Company"
                        style={{ width: "100%" }}
                    />
                </div>
                
                <div className="mb-3">
                    <label className="mb-2">Airport</label>
                    <Dropdown
                        value={selectedAirport}
                        options={airports.map((a) => ({ label: a.name, value: a.code }))}
                        onChange={(e) => setSelectedAirport(e.value)}
                        placeholder="-- Filter By Airport --"
                        style={{ width: "100%" }}
                    />
                </div>

                <div className="mb-3">
                    <label className="mb-2">Flight Type</label>
                    <Dropdown
                        value={selectedFlightTypeId}
                        options={flightTypeOptions}
                        optionLabel="label"
                        optionValue="value"
                        onChange={(e) => setSelectedFlightTypeId(e.value)}
                        placeholder="Select Flight Type"
                        className="w-100"
                    />
                </div>

                <div className="mb-3">
                    <label className="mb-2">Flight Category</label>
                    <Dropdown
                        value={selectedCategoryId}
                        options={categoryOptions}
                        optionLabel="label"
                        optionValue="value"
                        onChange={(e) => setSelectedCategoryId(e.value)}
                        placeholder="Select Category"
                        className="w-100"
                    />
                </div>
                
                <div className="mb-3">
                    <label className="mb-2">Service Category</label>
                    <AutoComplete
                        value={catInput}
                        suggestions={catOptions}
                        completeMethod={(e) => setCatSearch(e.query)}
                        field="label"
                        className="w-100"
                        onChange={(e) => {
                            setCatInput(e.value);
                            setSelectedCatId(null);
                        }}
                        onSelect={(e) => {
                            setCatInput(e.value.label);
                            setSelectedCatId(e.value.value);
                        }}
                        placeholder="Search Category"
                    />
                </div>

                <div className="mb-3">
                    <label className="mb-2">Charges</label>
                    <InputNumber
                        value={price}
                        onValueChange={(e) => setPrice(e.value)}
                        placeholder="Enter Price"
                        mode="currency"
                        currency="INR"
                        className="w-100"
                    />
                </div>

                <div className="d-flex justify-content-end">
                    <Button
                        label="Update"
                        icon="pi pi-check"
                        className="mt-3 py-2"
                        severity="help"
                        onClick={handleUpdate}
                    />
                </div> 
            </Card.Body>
        </Card>
    );
};

export default EditServicePriceSidebar;
