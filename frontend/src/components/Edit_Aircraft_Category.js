import React, { useState, useEffect } from "react";
import { Row, Col } from "react-bootstrap";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import api from '../api/axios';
import { Dialog } from 'primereact/dialog';

const Edit_Aircraft_Category = ({ onClose, page_name, selectedAircraftCategoryData }) => {
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  // ✅ Pre-fill with existing category name
  useEffect(() => {
    if (selectedAircraftCategoryData?.Category_name) {
      setCategoryName(selectedAircraftCategoryData.Category_name);
    }
  }, [selectedAircraftCategoryData]);

  const handleDialogHide = () => {
    setUnauthorized(false);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!categoryName.trim()) return;

    setLoading(true);
    try {
      await api.put(
        `/aircraft_category/edit_aircraft_category/${selectedAircraftCategoryData.Aircraft_category_id}/${page_name}`,
        { Category_name: categoryName.trim() }
      );
      onClose(); // ✅ Close dialog after success
    } catch (err) {
      console.error("❌ Error editing category:", err);
      if (err.response?.status === 403) {
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
            style={{ fontSize: '14px' }}
            severity="danger"
            onClick={handleDialogHide}
          />
        </div>
      </Dialog>
    );
  }

  return (
    <div className="addClient">
      <Row>
        <Col md={12} className="mb-3">
          <label htmlFor="categoryName">Category Name</label>
          <InputText
            id="categoryName"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder="Enter category name"
            className="w-100"
          />
        </Col>
      </Row>
      <div className="d-flex justify-content-end gap-2">
        <Button
          type="button"
          label="Cancel"
          className="p-button-secondary"
          onClick={onClose}
          disabled={loading}
        />
        <Button
          type="submit"
          label={loading ? "Saving..." : "Save"}
          icon={loading ? "pi pi-spin pi-spinner" : "pi pi-check"}
          disabled={loading}
          onClick={handleSubmit}
        />
      </div>
    </div>
  );
};

export default Edit_Aircraft_Category;
