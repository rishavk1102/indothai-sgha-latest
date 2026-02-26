import React, { useState, useEffect } from "react";
import { Button } from "primereact/button";
import { Row, Col, Card, Table } from "react-bootstrap";
import { Dropdown } from "primereact/dropdown";
import { AutoComplete } from "primereact/autocomplete";
import { InputNumber } from "primereact/inputnumber";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import { getSocket } from "../context/socket";
import GifLoder from "../interfaces/GifLoder";
import { Dialog } from "primereact/dialog";
import { useDebounce } from "use-debounce"; // First, install it via npm
const AddServicePriceSidebar = ({ visible, onHide, pageName }) => {
  const { roleId, userId } = useAuth();
  const socket = getSocket();
  const [loading, setLoading] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState("");
  const [airports, setAirports] = useState([]);
  const [selectedAirport, setSelectedAirport] = useState("");
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebounce(searchTerm, 400);
  const [categoryInput, setCategoryInput] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [categories, setCategories] = useState([]);

  // Flight Types
  const [flightTypes, setFlightTypes] = useState([]);
  const [filteredFlightTypes, setFilteredFlightTypes] = useState([]);
  const [flightTypeInput, setFlightTypeInput] = useState("");
  const [selectedFlightTypeId, setSelectedFlightTypeId] = useState(null);
  const [flightTypeSearch, setFlightTypeSearch] = useState("");
  const [debouncedFlightTypeSearch] = useDebounce(flightTypeSearch, 400);

  // 🔹 Category states
  const [catOptions, setCatOptions] = useState([]);
  const [catInput, setCatInput] = useState("");
  const [catSearch, setCatSearch] = useState("");
  const [selectedCatId, setSelectedCatId] = useState(null);

  // Debounce category search
  const [debouncedCatSearch] = useDebounce(catSearch, 500);

  const [price, setPrice] = useState(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const handleDialogHide = () => {
    setUnauthorized(false);
    onHide();
  };

  useEffect(() => {
    if (!socket) return;

    socket.emit("fetch-businesses", {
      role_id: roleId,
      page_name: pageName,
      user_id: userId,
    });

    socket.on("fetch-businesses-success", (data) => {
      setBusinesses(data);
    });

    socket.on("fetch-businesses-error", (error) => {
      const isPermissionError =
        error.message?.includes("Missing role_id") ||
        error.message?.includes("Page") ||
        error.message?.includes("Permission denied");

      if (isPermissionError) {
        setUnauthorized(true);
      } else {
        setBusinesses([]);
        console.warn("Business fetch error:", error.message);
      }
    });

    return () => {
      socket.off("fetch-businesses-success");
      socket.off("fetch-businesses-error");
    };
  }, [socket, userId, roleId]);

  useEffect(() => {
    if (!socket || !selectedBusiness) return; // ✅ only run when we have businessId

    socket.emit("fetch-airports-by-business", {
      role_id: roleId,
      page_name: pageName,
      business_id: selectedBusiness,
    });

    socket.on("fetch-airports-by-business-success", (data) => {
      const formatted = data.map((a) => ({
        name: `${a.name} (${a.iata})`,
        code: a.airport_id,
      }));
      setAirports(formatted);
    });

    socket.on("fetch-airports-by-business-error", (error) => {
      const isPermissionError =
        error.message?.includes("Missing role_id") ||
        error.message?.includes("Page") ||
        error.message?.includes("Permission denied");

      if (isPermissionError) {
        setUnauthorized(true);
      } else {
        setAirports([]);
        console.warn("Airport fetch error:", error.message);
      }

      setLoading(false);
    });

    return () => {
      socket.off("fetch-airports-by-business-success");
      socket.off("fetch-airports-by-business-error");
    };
  }, [socket, roleId, selectedBusiness]);

  // 🔹 Fetch categories using socket
  useEffect(() => {
    // Emit every time search changes (empty search can return all)
    socket.emit("get-aircraft-categories", {
      role_id: roleId,
      page_name: pageName,
      searchTerm: debouncedSearch || "", // send empty for initial fetch
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

    // ✅ Cleanup listeners on unmount / dependency change
    return () => {
      socket.off("get-aircraft-categories-success", handleSuccess);
      socket.off("get-aircraft-categories-error", handleError);
    };
  }, [debouncedSearch, roleId, pageName, socket]);

  // 🔹 Fetch flight types using socket
  useEffect(() => {
    if (!socket) return;

    socket.emit("fetch-flight-types", {
      role_id: roleId,
      page_name: pageName,
      searchTerm: debouncedFlightTypeSearch || "", // ✅ now debounced search
    });

    const handleSuccess = (data) => {
      const formatted = data.map((ft) => ({
        label: ft.Flight_type_name,
        value: ft.Flight_type_id,
      }));
      setFlightTypes(formatted);
    };

    const handleError = (error) => {
      const isPermissionError =
        error.message?.includes("Missing role_id") ||
        error.message?.includes("Page") ||
        error.message?.includes("Permission denied");

      if (isPermissionError) {
        setUnauthorized(true);
      } else {
        console.warn("Error fetching flight types:", error.message);
        setFlightTypes([]);
      }
      setLoading(false);
    };

    socket.on("fetch-flight-types-success", handleSuccess);
    socket.on("fetch-flight-types-error", handleError);

    return () => {
      socket.off("fetch-flight-types-success", handleSuccess);
      socket.off("fetch-flight-types-error", handleError);
    };
  }, [debouncedFlightTypeSearch, roleId, pageName, socket]);

  // 🔹 Fetch flight types using socket
  useEffect(() => {
    if (!socket) return;

    socket.emit("fetch-categories", {
      role_id: roleId,
      page_name: pageName,
      searchTerm: debouncedCatSearch || "", // ✅ now debounced search
    });

    const handleSuccess = (data) => {
      const formatted = data.map((cat) => ({
        label: cat.name,
        value: cat.category_id,
      }));
      setCatOptions(formatted);
    };

    const handleError = (error) => {
      const isPermissionError =
        error.message?.includes("Missing role_id") ||
        error.message?.includes("Page") ||
        error.message?.includes("Permission denied");

      if (isPermissionError) {
        setUnauthorized(true);
      } else {
        console.warn("Error fetching flight types:", error.message);
        setCatOptions([]);
      }
      setLoading(false);
    };

    socket.on("fetch-categories-success", handleSuccess);
    socket.on("fetch-categories-error", handleError);

    return () => {
      socket.off("fetch-categories-success", handleSuccess);
      socket.off("fetch-categories-error", handleError);
    };
  }, [debouncedCatSearch, roleId, pageName, socket]);

  // ---------------- SUBMIT HANDLER ----------------
  const handleSubmit = async () => {
    if (
      !selectedBusiness ||
      !selectedAirport ||
      !selectedCategoryId ||
      !selectedFlightTypeId ||
      !selectedCatId ||
      !price
    ) {
      return alert("Please fill all fields");
    }

    setLoading(true);
    try {
      const body = {
        Business_id: selectedBusiness,
        Airport_id: selectedAirport,
        Aircraft_category_id: selectedCategoryId,
        category_id: selectedCatId, // 👈 if service category is different, use that instead
        Flight_type_id: selectedFlightTypeId,

        Price: price,
      };

      const res = await api.post(
        `/service_price/add_service_price/${pageName}`,
        body,
        {}
      );
      onHide(); // close after success
    } catch (err) {
      console.error("❌ Failed to add service price:", err);
      alert(err.response?.data?.message || "Failed to add service price");
    } finally {
      setLoading(false);
    }
  };

  // Unauthorized UI
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

  // Loading UI
  if (loading) {
    return (
      <div className="loderDiv">
        <GifLoder />
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-0 pt-3">
      <Card.Header className="bg-white border-0 shadow-0">
        <h5>Add New Charges</h5>
      </Card.Header>
      <Card.Body className="p-0 pt-3">
        <div className="mb-3">
            <label className="mb-2">Handling Company</label>
            <Dropdown
                value={selectedBusiness}
                options={businesses.map((b) => ({
                    label: b.name,
                    value: b.business_id,
                }))}
                onChange={(e) => setSelectedBusiness(e.value)}
                placeholder="Filter By Handling Company"
                style={{ width: "100%" }}
            />
        </div>
        
        <div className="mb-3">
            <label className="mb-2">Airport</label>
            <Dropdown
                value={selectedAirport}
                options={airports.map((a) => ({
                    label: a.name,
                    value: a.code,
                }))}
                onChange={(e) => setSelectedAirport(e.value)}
                placeholder="-- Filter By Airport --"
                style={{ width: "100%" }}
            />
        </div>
        <div className="mb-3">
            <label className="mb-2">Scheduled / Non-scheduled</label>
            <AutoComplete
                value={flightTypeInput}
                suggestions={flightTypes} // ✅ use socket data directly
                completeMethod={(e) => setFlightTypeSearch(e.query)} // triggers new fetch
                field="label"
                className="w-100"
                onChange={(e) => {
                    // user typing — just keep text
                    setFlightTypeInput(e.value);
                    setSelectedFlightTypeId(null);
                }}
                onSelect={(e) => {
                    // when selecting from suggestions — set both input & id
                    setFlightTypeInput(e.value.label);
                    setSelectedFlightTypeId(e.value.value);
                }}
                placeholder="Scheduled / Non-scheduled flight"
            />
        </div>    
        <div className="mb-3">
            <label className="mb-2">Flight Category</label>
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
                placeholder="Search Flight Category"
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
                    setSelectedCatId(null); // reset until user selects
                }}
                onSelect={(e) => {
                    setCatInput(e.value.label);
                    setSelectedCatId(e.value.value);
                }}
                placeholder="Search Service Category"
            />
        </div> 
        <div className="mb-3">
            <label className="mb-2">Add Charges</label>
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
                label="Save"
                icon="pi pi-check"
                className="mt-3 py-2"
                severity="help"
                onClick={handleSubmit}
            />
        </div>    
      </Card.Body>
    </Card>
  );
};

export default AddServicePriceSidebar;
