import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Breadcrumb, Form, Card, Table, Label } from 'react-bootstrap';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Checkbox } from "primereact/checkbox";
import api from '../api/axios';
import GifLoder from '../interfaces/GifLoder';

const Permissions = ({ onClose }) => {
  const [value, setValue] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);
  const [roles, setRoles] = useState([]);
  const [pages, setPages] = useState([]);
  const [showInput, setShowInput] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(false);
  const handleCancel = () => {
    setNewRole("");
    setShowInput(false);
  };

  useEffect(() => {
    fetchRoles();
    fetchPages();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      fetchPermissions(selectedRole.Role_id);
    }
  }, [selectedRole]);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/roles/allroles`);
      setRoles(res.data);
    } catch (error) {
      console.error("Error fetching roles:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPages = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/roles/allpages`);
      setPages(res.data);
    } catch (error) {
      console.error("Error fetching pages:", error);
    } finally {
      setLoading(false);
    }
  };


  const fetchPermissions = async (role_id) => {
    setLoading(true);
    try {
      const res = await api.get(`/roles/permissions/${role_id}`);
      const perms = {};
      res.data.forEach(p => {
        perms[p.page_id] = p;
      });
      setPermissions(perms);
    } catch (error) {
      if (error.response?.status === 404) {
        setPermissions({});
      } else {
        console.error("Error fetching permissions:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (page_id, field) => {
    setPermissions(prev => ({
      ...prev,
      [page_id]: {
        ...prev[page_id],
        [field]: !prev[page_id]?.[field]
      }
    }));
  };

  const handleSaveRole = async () => {
    if (newRole.trim() !== "" && value.trim() !== "") {
      setLoading(true);
      try {
        const res = await api.post(`/roles/add-role`, {
          role_name: newRole,
          role_description: value
        });
        setRoles(prev => [...prev, res.data.role]);
        setSelectedRole(res.data.role);
        setNewRole("");
        setValue("");
        setShowInput(false);
      } catch (error) {
        console.error("Error creating role:", error);
      } finally {
        setLoading(false);
      }
    }
  };


  const handlePermissionSave = async () => {
    if (!selectedRole) return;

    const payload = Object.entries(permissions).map(([page_id, perm]) => ({
      page_id: Number(page_id),
      can_view: perm.can_view || false,
      can_add: perm.can_add || false,
      can_edit: perm.can_edit || false,
      can_delete: perm.can_delete || false
    }));

    setLoading(true);
    try {
      await api.post(`/roles/add_permissions_bulk`, {
        role_id: selectedRole.Role_id,
        permissions: payload
      });
      onClose();
    } catch (error) {
      console.error("Error saving permissions:", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };


  // Loading UI
  if (loading) {
    return <div className='loderDiv'><GifLoder /></div>;
  }

  return (
    <>
      <div className="py-3 mb-4 d-flex justify-content-between align-items-center border-bottom bg-white sticky-top">
        <h6 className="text-black">Roles & Permissions</h6>
        <Button
          label="Save Permissions"
          severity="success"
          className="py-1"
          style={{ fontSize: "14px" }}
          onClick={handlePermissionSave}
        />
      </div>
      <div className="mb-3 permisionsDiv position-relative">
        <label className="d-flex align-items-center justify-content-between">
          Select Role
          <Button
            icon="pi pi-plus"
            severity="danger"
            className="p-0 border-0"
            style={{ width: "30px" }}
            text
            tooltip="Add Role"
            tooltipOptions={{ position: "left" }}
            onClick={() => setShowInput(true)}
          />
        </label>

        <Dropdown
          value={selectedRole}
          onChange={(e) => {
            console.log('Selected Role:', e.value);
            setSelectedRole(e.value);
          }}
          options={roles}
          optionLabel="role_name"
          placeholder="Select Role"
          className="w-100"
        />

        {showInput && (
          <div
            className="card p-2 border rounded bg-light mt-2"
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              zIndex: 1000,
              width: "100%",
            }}
          >
            <InputText
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              placeholder="Enter new role"
              className="w-100 mb-2"
            />
            <InputTextarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={3}
              placeholder="Role Description"
              className="w-100 mb-2"
            />
            <div className="d-flex justify-content-end gap-2">
              <Button tooltip="Cancel" icon="pi pi-times" severity="secondary" onClick={handleCancel} className="py-1" tooltipOptions={{ position: "bottom" }} />
              <Button tooltip="Save" icon="pi pi-check" severity="warning" onClick={handleSaveRole} className="py-1" tooltipOptions={{ position: "bottom" }} />
            </div>
          </div>
        )}
      </div>
      <div className="mb-3 permisionsDiv">
        <label>Desciption</label>
        <InputTextarea
          value={selectedRole?.role_description || ''}
          rows={3}
          style={{ width: '100%' }}
          readOnly
        />
      </div>
      <div className="mb-3 permisionsDiv">
        <Table hover bordered>
          <thead>
            <tr className="table-warning">
              <th>Page Name</th>
              <th style={{ width: '50px' }} className="text-center">Add</th>
              <th style={{ width: '50px' }} className="text-center">Edit</th>
              <th style={{ width: '50px' }} className="text-center">View</th>
              <th style={{ width: '50px' }} className="text-center">Delete</th>
            </tr>
          </thead>
          <tbody>
            {pages.map(page => (
              <tr key={page.page_id}>
                <td>{page.name}</td>
                <td className="text-center">
                  <Checkbox
                    onChange={() => handleToggle(page.page_id, "can_add")}
                    checked={permissions[page.page_id]?.can_add || false}
                  />
                </td>
                <td className="text-center">
                  <Checkbox
                    onChange={() => handleToggle(page.page_id, "can_edit")}
                    checked={permissions[page.page_id]?.can_edit || false}
                  />
                </td>
                <td className="text-center">
                  <Checkbox
                    onChange={() => handleToggle(page.page_id, "can_view")}
                    checked={permissions[page.page_id]?.can_view || false}
                  />
                </td>
                <td className="text-center">
                  <Checkbox
                    onChange={() => handleToggle(page.page_id, "can_delete")}
                    checked={permissions[page.page_id]?.can_delete || false}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </>
  );
};

export default Permissions;