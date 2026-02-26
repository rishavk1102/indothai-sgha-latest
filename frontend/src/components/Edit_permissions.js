import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Breadcrumb, Form, Card, Table, Label } from 'react-bootstrap';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Checkbox } from "primereact/checkbox";

const Edit_permissions = () => {
  const [value, setValue] = useState('');
  const [checked, setChecked] = useState(false);
   const [selectedRole, setSelectedRole] = useState(null);
    const [roles, setRoles] = useState([
   { name: 'System Engineer', code: 'SE' },
        { name: 'GM / DGM', code: 'GMDGM' },
        { name: 'Duty Manager', code: 'DM' },
        { name: 'Airport Manager', code: 'ARPM' },
        { name: 'Supervisor', code: 'SUP' }
    ]);
    const [showInput, setShowInput] = useState(false);
    const [newRole, setNewRole] = useState("");

  const handleSaveRole = () => {
    if (newRole.trim() !== "") {
      const newItem = { name: newRole, code: newRole.toUpperCase().slice(0, 3) };
      setRoles((prev) => [...prev, newItem]);
      setSelectedRole(newItem);
      setNewRole("");
      setShowInput(false);
    }
  };

  const handleCancel = () => {
    setNewRole("");
    setShowInput(false);
  };
  return (
    <>
      <div className="py-3 mb-4 d-flex justify-content-between align-items-center border-bottom bg-white sticky-top">
        <h6 className="text-black">Edit Roles & Permissions</h6>
        <Button
          label="Save Role"
          severity="success"
          className="py-1"
          style={{ fontSize: "14px" }}
        />
      </div>
      <div className="mb-3 permisionsDiv position-relative">
        <label>Select Role</label>
      <Dropdown
        value={selectedRole}
        onChange={(e) => setSelectedRole(e.value)}
        options={roles}
        optionLabel="name"
        placeholder="Select Role"
        className="w-100"
      />
    </div>
    <div className="mb-3 permisionsDiv">
      <label>Desciption</label>
       <InputTextarea 
        value={value} 
        onChange={(e) => setValue(e.target.value)} 
        rows={3}
        style={{ width: '100%' }}
       />
    </div>
    <div className="mb-3 permisionsDiv" style={{ overflow: 'auto', height: '40vh' }}>
      <Table hover bordered>
        <thead>
          <tr className="table-warning">
            <th>Page Name</th>
            <th style={{ width: '50px' }} className="text-center">Add</th>
            <th style={{ width: '50px' }} className="text-center">Edit</th>
            <th style={{ width: '50px' }} className="text-center">View</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Roles & Permissions</td>
            <td className="text-center">
              <Checkbox onChange={e => setChecked(e.checked)} checked={checked}></Checkbox>
            </td>
            <td className="text-center">
              <Checkbox onChange={e => setChecked(e.checked)} checked={checked}></Checkbox>
            </td>
            <td className="text-center">
              <Checkbox onChange={e => setChecked(e.checked)} checked={checked}></Checkbox>
            </td>
          </tr>

          <tr>
            <td>Users</td>
            <td className="text-center">
              <Checkbox onChange={e => setChecked(e.checked)} checked={checked}></Checkbox>
            </td>
            <td className="text-center">
              <Checkbox onChange={e => setChecked(e.checked)} checked={checked}></Checkbox>
            </td>
            <td className="text-center">
              <Checkbox onChange={e => setChecked(e.checked)} checked={checked}></Checkbox>
            </td>
          </tr>

          <tr>
            <td>Handling Companies</td>
            <td className="text-center">
              <Checkbox onChange={e => setChecked(e.checked)} checked={checked}></Checkbox>
            </td>
            <td className="text-center">
              <Checkbox onChange={e => setChecked(e.checked)} checked={checked}></Checkbox>
            </td>
            <td className="text-center">
              <Checkbox onChange={e => setChecked(e.checked)} checked={checked}></Checkbox>
            </td>
          </tr>

          <tr>
            <td>Departments</td>
            <td className="text-center">
              <Checkbox onChange={e => setChecked(e.checked)} checked={checked}></Checkbox>
            </td>
            <td className="text-center">
              <Checkbox onChange={e => setChecked(e.checked)} checked={checked}></Checkbox>
            </td>
            <td className="text-center">
              <Checkbox onChange={e => setChecked(e.checked)} checked={checked}></Checkbox>
            </td>
          </tr>
        </tbody>
      </Table>
    </div>
    </>
    );
};

export default Edit_permissions;