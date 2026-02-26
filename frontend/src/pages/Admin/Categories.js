import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from '../../components/Layout';
import { Row, Col, Breadcrumb, Form, Card, Table } from 'react-bootstrap';
import { IoChevronBackOutline } from "react-icons/io5";
import { Button } from 'primereact/button';
import { Sidebar } from 'primereact/sidebar';
import { InputIcon } from "primereact/inputicon";
import { IconField } from "primereact/iconfield";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from 'primereact/inputtextarea';
import api from '../../api/axios';
import GifLoder from '../../interfaces/GifLoder';
import { getSocket } from "../../context/socket";
import { Dialog } from "primereact/dialog";
import { useAuth } from "../../context/AuthContext";
import { useDebounce } from 'use-debounce'; // First, install it via npm
const Categories = () => {
  const { role, roleId } = useAuth();
  const PAGE_NAME = "Categories";
  const socket = getSocket();
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [categories, setCategories] = useState([]);
  const [sortOrder, setSortOrder] = useState('ASC');
  const [perPage, setPerPage] = useState(15);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch] = useDebounce(searchValue, 500);
  const [visibleRight, setVisibleRight] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [editCategoryId, setEditCategoryId] = useState(null);
  const navigate = useNavigate();
  const goBack = () => {
    navigate(-1); // This will take the user back to the previous page in history
  };

  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState('');

  const toggleExpand = () => {
    setExpanded(prev => !prev);
  };

  const handleDialogHide = () => navigate(-1);


  const handleDuplicate = async (category_id) => {
    setLoading(true);
    try {
      const res = await api.post(`/categories/duplicate_category/${category_id}/${PAGE_NAME}`);
      if (res.status === 201) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Duplicate category error:', error);
      if (error.response?.status === 403) {
        setUnauthorized(true);
      }
    }
    finally {
      setLoading(false);
    }
  };


  const handleDelete = async (category_id) => {
    setLoading(true);
    try {
      const res = await api.delete(`/categories/delete_category/${category_id}/${PAGE_NAME}`);
      if (res.status === 200) {
        setLoading(false);
      }
    } catch (error) {
      console.error('delete category error:', error);
      if (error.response?.status === 403) {
        setUnauthorized(true);
      }
    }
    finally {
      setLoading(false);
    }
  };


  const handleSubmit = async () => {
    setFormLoading(true);
    try {
      if (editCategoryId) {
        await api.put(`/categories/edit_category/${editCategoryId}/${PAGE_NAME}`, {
          name: categoryName,
          description
        });
      } else {
        await api.post(`/categories/add_category/${PAGE_NAME}`, {
          name: categoryName,
          description
        });
      }
      setVisibleRight(false);
      setCategoryName('');
      setDescription('');
      setEditCategoryId(null);
    } catch (error) {
      if (error.response?.status === 403) setUnauthorized(true);
    } finally {
      setFormLoading(false);
    }
  };

  const openEditSidebar = (category) => {
    setCategoryName(category.name);
    setDescription(category.description);
    setEditCategoryId(category.category_id);
    setVisibleRight(true);
  };




  useEffect(() => {
    if (!socket || !roleId) return;

    const fetchCategories = () => {
      socket.emit("view-categories", {
        role_id: roleId,
        page_name: PAGE_NAME,
        sortOrder,
        limit: perPage,
        searchTerm: debouncedSearch
      });
    };

    // Initial fetch
    fetchCategories();

    // Success listener
    const handleSuccess = (data) => {
      setCategories(data);
      setLoading(false);
    };

    // Error listener
    const handleError = (error) => {
      const isPermissionError =
        error.message?.includes('Missing role_id') ||
        error.message?.includes('Page') ||
        error.message?.includes('Permission denied');

      if (isPermissionError) {
        setUnauthorized(true);
      } else {
        setCategories([]);
        console.warn('Airport fetch error:', error.message);
      }

      setLoading(false);
    };

    socket.on("view-categories-success", handleSuccess);
    socket.on("view-categories-error", handleError);

    // Refetch on external emit
    socket.on("categories-updated", fetchCategories);

    // Cleanup
    return () => {
      socket.off("view-categories-success", handleSuccess);
      socket.off("view-categories-error", handleError);
      socket.off("categories-updated", fetchCategories);
    };
  }, [socket, roleId, sortOrder, perPage, debouncedSearch]);




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
      <Row>
        <Col md={12} lg={6}>
          <Breadcrumb>
            <Breadcrumb.Item onClick={goBack}>
              <IoChevronBackOutline /> Back
            </Breadcrumb.Item>
            <Breadcrumb.Item active>Categories</Breadcrumb.Item>
          </Breadcrumb>
        </Col>
        <Col md={12} lg={6} className="text-end">
          <Button
            label="Add Categories"
            icon="pi pi-plus"
            severity="warning"
            className="py-2"
            onClick={() => setVisibleRight(true)}
            style={{ fontSize: '14px' }}
          />
        </Col>
        <Col md={12} lg={12} className="mt-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="pt-3 pb-2 border-0 bg-transparent">
              <div className="d-flex align-items-center gap-1 justify-content-end filterDiv">
                <label className="me-2">Sort By</label>
                <Form.Select aria-label="Default select example" style={{ width: '100px' }}>
                  <option value="ASC">ASC</option>
                  <option value="DESC">DESC</option>
                </Form.Select>
                <Form.Select aria-label="Default select example" style={{ width: '100px' }}>
                  <option value="1">15</option>
                  <option value="2">25</option>
                  <option value="3">50</option>
                  <option value="4">100</option>
                </Form.Select>
                <IconField iconPosition="left">
                  <InputIcon className="pi pi-search "> </InputIcon>
                  <InputText placeholder="Search" />
                </IconField>
              </div>
            </Card.Header>
            <Card.Body>
              <div className="table-responsive">
                <Table striped hover>
                  <thead>
                    <tr className="table-primary">
                      <th>Category</th>
                      <th>Description</th>
                      <th>Last Updated Date and Time</th>
                      <th style={{ width: '120px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category) => (
                      <React.Fragment key={category.category_id}>
                        <tr>
                          <td>{category.name}</td>
                          <td>{category.description || '-'}</td>
                          <td>{category.updatedAt ? new Date(category.updatedAt).toLocaleString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: 'numeric', minute: 'numeric' }) : '-'}</td>
                          <td data-label="Action">
                            {/* <Button
                                tooltip={expanded ? "Collapse" : "Activity History"}
                                icon={expanded ? "pi pi-times" : "pi pi-clock"}
                                severity="help" 
                                className="p-0 border-0"
                                tooltipOptions={{ position: "top" }}
                                style={{ width: '30px' }}
                                text
                                onClick={toggleExpand}
                              /> */}
                            <Button
                              tooltip="Edit"
                              icon="pi pi-pencil"
                              severity="info"
                              className="p-0 border-0"
                              style={{ width: '30px' }}
                              text
                              onClick={() => openEditSidebar(category)}
                            />
                            <Button
                              tooltip="Duplicate"
                              icon="pi pi-copy"
                              severity="warning"
                              className="p-0 border-0"
                              tooltipOptions={{ position: "top" }}
                              style={{ width: '30px' }}
                              text
                              onClick={() => handleDuplicate(category.category_id)}
                            />
                            <Button
                              tooltip="Delete"
                              icon="pi pi-trash"
                              severity="danger"
                              className="p-0 border-0"
                              tooltipOptions={{ position: "top" }}
                              style={{ width: '30px' }}
                              text
                              onClick={() => handleDelete(category.category_id)}
                            />
                          </td>
                        </tr>
                        {expanded && (
                          <tr>
                            <td colSpan="3" className="bg-light">
                              <div className="p-3 border">
                                <strong>Log Activity History</strong>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Sidebar visible={visibleRight} position="right" style={{ width: '450px' }} onHide={() => setVisibleRight(false)} dismissable={false}>
        <Row className="mx-0">
          <Col md={12} className="px-0 py-4 mb-3">
            <h5 className="text-black">{editCategoryId ? 'Edit Category' : 'Add New Category'}</h5>
          </Col>
          <Col md={12} className="px-1 mb-3">
            <label>Category Name</label>
            <InputText value={categoryName} onChange={(e) => setCategoryName(e.target.value)} className="w-100 mt-2" />
          </Col>
          <Col md={12} className="px-1 mb-3">
            <label>Description</label>
            <InputTextarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="w-100 h-auto mt-2" />
          </Col>
          <Col md={12} className="px-1 mb-3 text-end">
            <Button
              label={editCategoryId ? 'Update Category' : 'Add Category'}
              className="py-2 border-0"
              severity="warning"
              loading={formLoading}
              onClick={handleSubmit}
            />
          </Col>
        </Row>
      </Sidebar>
    </>
  );
};

export default Categories;