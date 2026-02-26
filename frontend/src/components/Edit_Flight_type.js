import React, { useState, useEffect } from "react";
import { Row, Col } from "react-bootstrap";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import api from "../api/axios";
import { Dialog } from "primereact/dialog";
import { ProgressSpinner } from "primereact/progressspinner";

const Edit_Flight_type = ({ onClose, page_name, selectedFlightTypeData }) => {
    const [flightTypeName, setFlightTypeName] = useState("");
    const [loading, setLoading] = useState(false);
    const [unauthorized, setUnauthorized] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (selectedFlightTypeData) {
            setFlightTypeName(selectedFlightTypeData.Flight_type_name || "");
        }
    }, [selectedFlightTypeData]);

    const handleDialogHide = () => {
        setUnauthorized(false);
        onClose();
    };

    const handleUpdate = async () => {
        setError("");
        setSuccess(false);

        if (!flightTypeName.trim()) {
            setError("Flight type name is required");
            return;
        }

        setLoading(true);
        try {
            await api.put(
                `/flight_type/edit_flight_type/${selectedFlightTypeData.Flight_type_id}/${page_name}`,
                { Flight_type_name: flightTypeName.trim() }
            );

            setSuccess(true);
                onClose();
        } catch (err) {
            if (err.response?.status === 403) {
                setUnauthorized(true);
            } else {
                setError(err.response?.data?.message || "Failed to update Flight Type");
            }
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

    return (
        <div>
            <Row className="mb-3">
                <Col>
                    <label htmlFor="flightTypeName" className="form-label fw-bold">
                        Flight Type Name
                    </label>
                    <InputText
                        id="flightTypeName"
                        value={flightTypeName}
                        onChange={(e) => setFlightTypeName(e.target.value)}
                        placeholder="Enter flight type name"
                        className="w-100"
                        disabled={loading}
                    />
                </Col>
            </Row>

            {error && <p className="text-danger">{error}</p>}
            {success && <p className="text-success">Flight type updated successfully!</p>}

            <div className="d-flex justify-content-end gap-2">
                <Button
                    label="Cancel"
                    icon="pi pi-times"
                    className="p-button-text"
                    onClick={onClose}
                    disabled={loading}
                />
                <Button
                    label={loading ? "Updating..." : "Update"}
                    icon={loading ? "" : "pi pi-check"}
                    onClick={handleUpdate}
                    disabled={loading}
                />
            </div>

            {loading && (
                <div className="text-center mt-3">
                    <ProgressSpinner style={{ width: "40px", height: "40px" }} />
                </div>
            )}
        </div>
    );
};

export default Edit_Flight_type;