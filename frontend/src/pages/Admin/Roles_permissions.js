import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from '../../components/Layout';
import { Row, Col, Breadcrumb, Form, Card, Table } from 'react-bootstrap';
import { IoChevronBackOutline } from "react-icons/io5";
import { Button } from 'primereact/button';
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputText } from "primereact/inputtext";
import { Sidebar } from 'primereact/sidebar';
import Permissions from '../../components/Permissions';
import Edit_permissions from '../../components/Edit_permissions';
import { getSocket } from "../../context/socket";
import { useAuth } from "../../context/AuthContext";
import GifLoder from '../../interfaces/GifLoder';
import { Dialog } from "primereact/dialog";
import { useDebounce } from 'use-debounce'; // First, install it via npm
const Roles_permissions = () => {
  const navigate = useNavigate();
  const socket = getSocket();
  const [sortOrder, setSortOrder] = useState("DESC");
  const [limit, setLimit] = useState(15);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebounce(searchTerm, 500); // 500ms debounce
  const [visibleRight, setVisibleRight] = useState(false);
  const [visibleRight2, setVisibleRight2] = useState(false);
  const goBack = () => {
    navigate(-1); // This will take the user back to the previous page in history
  };
  const { role, roleId } = useAuth(); // Get roleId from the context
  const PAGE_NAME = "Roles & Permissions"; // Page name for permission checking
  const [loading, setLoading] = useState(true);  // Block UI until all fetches succeed
  const [unauthorized, setUnauthorized] = useState(false); // Show Dialog if error
  const [rolesWithPermissions, setRolesWithPermissions] = useState([]);
  const permissionLabels = {
    can_view: "View",
    can_add: "Add",
    can_edit: "Edit",
    can_delete: "Delete",
  };
  const [showAllRoles, setShowAllRoles] = useState({});
  const toggleShowAll = (roleId) => {
    setShowAllRoles(prev => ({ ...prev, [roleId]: !prev[roleId] }));
  };


  useEffect(() => {
    if (!socket || !roleId) return;

    const fetchData = () => {
      setLoading(true);
      socket.emit("fetch-roles-permissions", {
        role_id: roleId,
        page_name: PAGE_NAME,
        sortOrder,
        limit,
        searchTerm: debouncedSearch.trim(),
      });
    };

    const handleSuccess = (data) => {
      setRolesWithPermissions(data);
      setLoading(false);
      setUnauthorized(false);
    };

    const handleError = (err) => {
      console.error("❌ Permission Error:", err.message);

      const isPermissionError =
        err.message?.includes("Missing role_id") ||
        err.message?.includes("Page") ||
        err.message?.includes("Permission denied");

      if (isPermissionError) {
        setUnauthorized(true);
      } else {
        console.warn("⚠️ Non-permission server error:", err.message);
      }

      setLoading(false);
    };

    // Initial fetch
    fetchData();

    // Socket listeners
    socket.on("roles-permissions-success", handleSuccess);
    socket.on("roles-permissions-error", handleError);
    socket.on("PermissionsUpdated", () => {
      fetchData();
    });

    return () => {
      socket.off("roles-permissions-success", handleSuccess);
      socket.off("roles-permissions-error", handleError);
      socket.off("PermissionsUpdated", fetchData);
    };
  }, [socket, roleId, sortOrder, limit, debouncedSearch]);





  const handleDialogHide = () => navigate(-1);

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

      <Row className="mx-0 align-items-center d-fltx">
        <Col md={12} lg={5}>
          <Breadcrumb className="mb-0">
            <Breadcrumb.Item onClick={goBack}>
              <IoChevronBackOutline /> Back
            </Breadcrumb.Item>
            <Breadcrumb.Item active>Roles & Permissions</Breadcrumb.Item>
          </Breadcrumb>
        </Col>
        <Col md={12} lg={7} className="text-end">
          <Button
            label="Add Role"
            icon="pi pi-plus"
            severity="help"
            className="py-2"
            onClick={() => setVisibleRight(true)}
            style={{ fontSize: "14px" }}
          />
        </Col>
      </Row>
      <Row className="mx-0 mt-3">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="pt-3 pb-2 border-0 bg-transparent">
              <div className="d-flex align-items-center gap-1 justify-content-end filterDiv">
                <label className="me-2">Sort By</label>
                <Form.Select
                  aria-label="Sort"
                  style={{ width: '100px' }}
                  onChange={(e) => setSortOrder(e.target.value)}
                  value={sortOrder}
                >
                  <option value="ASC">ASC</option>
                  <option value="DESC">DESC</option>
                </Form.Select>
                <Form.Select
                  aria-label="Limit"
                  style={{ width: '100px' }}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  value={limit}
                >
                  <option value="15">15</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </Form.Select>

                <IconField iconPosition="left">
                  <InputIcon className="pi pi-search" />
                  <InputText
                    placeholder="Search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </IconField>
              </div>
            </Card.Header>
            <Card.Body>
              <Table responsive hover bordered>
                <thead>
                  <tr>
                    <th style={{ width: '250px' }}>Role Name</th>
                    <th>Permissions</th>
                    <th style={{ width: '300px' }}>Description</th>
                    <th className="text-center" style={{ width: '80px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>

                  {rolesWithPermissions.map((role) => {
                    const showAll = showAllRoles[role.Role_id] || false;
                    const items = role.Permissions || [];
                    const visibleItems = showAll ? items : items.slice(0, 4);

                    return (
                      <tr key={role.Role_id}>
                        <td>{role.role_name}</td>

                        <td>
                          <ul className="roltable">
                            {visibleItems.map((perm, i) => (
                              <li key={i}>
                                <span>{perm.Page?.name || 'Unknown Page'}</span>
                                <small>
                                  {Object.entries(perm)
                                    .filter(([key, val]) => permissionLabels[key] && val)
                                    .map(([key]) => permissionLabels[key])
                                    .join(", ")}
                                </small>
                              </li>
                            ))}

                            {items.length > 4 && (
                              <li className="showbutton">
                                <Button
                                  label={showAll ? "Less..." : "More..."}
                                  onClick={() => toggleShowAll(role.Role_id)}
                                  text
                                  severity="warning"
                                  className="p-0 mt-2"
                                  style={{ fontSize: "14px" }}
                                />
                              </li>
                            )}
                          </ul>
                        </td>

                        <td>{role.role_description || '-'}</td>

                        <td className="text-center">
                          <Button
                            icon="pi pi-pencil"
                            severity="secondary"
                            className="p-0 border-0"
                            style={{ width: "30px" }}
                            text
                            tooltip="Edit"
                            tooltipOptions={{ position: "left" }}
                            onClick={() => setVisibleRight(true)}
                          />
                        </td>
                      </tr>
                    );
                  })}

                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Sidebar visible={visibleRight} position="right" style={{ width: '500px' }} onHide={() => setVisibleRight(false)}>
        <Permissions onClose={() => setVisibleRight(false)} />
      </Sidebar>

      <Sidebar visible={visibleRight2} position="right" style={{ width: '500px' }} onHide={() => setVisibleRight2(false)}>
        <Edit_permissions onClose={() => setVisibleRight2(false)} />
      </Sidebar>
    </>
  );
};

export default Roles_permissions;