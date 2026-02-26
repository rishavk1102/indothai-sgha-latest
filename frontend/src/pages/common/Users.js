import React, { useState } from "react";
import {useNavigate } from "react-router-dom";
import Layout from '../../components/Layout';
import { Row, Col, Breadcrumb, Form, Card, Table, Badge } from 'react-bootstrap';
import { IoChevronBackOutline } from "react-icons/io5";
import '../../assets/css/common_style.css';
import { Button } from 'primereact/button';
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputText } from "primereact/inputtext";
import { Avatar } from 'primereact/avatar';
import { Chip } from 'primereact/chip';
import { Sidebar } from 'primereact/sidebar';
import { Checkbox } from "primereact/checkbox";

const Users = () => {
    const navigate = useNavigate();
    const [visibleRight, setVisibleRight] = useState(false);
    const goBack = () => {
        navigate(-1); // This will take the user back to the previous page in history
    };
 /*-------------show div--------------*/

  const [isExpanded, setIsExpanded] = useState(false);
  const [isExpanded2, setIsExpanded2] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(prev => !prev);
  };

  const toggleExpand2 = () => {
    setIsExpanded2(prev => !prev);
  };

  /*-------------Checkbox--------------*/

  const [ingredients, setIngredients] = useState([]);

    const onIngredientsChange = (e) => {
        let _ingredients = [...ingredients];

        if (e.checked)
            _ingredients.push(e.value);
        else
            _ingredients.splice(_ingredients.indexOf(e.value), 1);

        setIngredients(_ingredients);
    }

  /*---------------Select_change background--------------*/

  const [status, setStatus] = useState("Verified");

  const getBackgroundColor = () => {
    switch (status) {
      case "Verified":
        return "#d4edda"; // green
      case "Not Verified":
        return "#f8d7da"; // red
      case "Pending":
        return "#fff3cd"; // yellow
      case "Left":
        return "#e5e7eb"; // blue
      default:
        return "white";
    }
  };

  return (
    <Layout>
      <Row className="mx-0">
        <Col md={6} lg={5}>
          <Breadcrumb>
          <Breadcrumb.Item onClick={goBack}>
                <IoChevronBackOutline /> Back
            </Breadcrumb.Item>
            <Breadcrumb.Item active>Users</Breadcrumb.Item>
          </Breadcrumb>
        </Col>
        <Col md={6} lg={7} className="text-end">
          <Button
            label="Add Role"
            icon="pi pi-plus"
            severity="help"
            className="py-2"
          />
        </Col>
      </Row>
      <Row className="mx-0 mt-3">
        <Col>
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
                    <InputText placeholder="Search"/>
                </IconField>
              </div>
            </Card.Header>
            <Card.Body>
              <Table responsive hover>
                  <thead>
                    <tr className="table-primary">
                        <th>Name</th>
                        <th>Emp No.</th>
                        <th>Roles</th>
                        <th>Airports</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>City, State</th>
                        <th style={{ width: '120px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                        <td data-label="Name">
                            <span className="d-flex align-items-center gap-2">
                                <Avatar image="https://primefaces.org/cdn/primereact/images/avatar/onyamalimba.png" shape="circle" />
                                 John Doe 
                            </span>
                        </td>
                        <td data-label="Emp No.">123456 <Badge>Verified</Badge></td>
                        <td data-label="Roles">Admin</td>
                        <td data-label="Airports">
                            <small className="d-flex flex-wrap gap-2">
                                <Chip label="BBI" />
                                <Chip label="GAY" />
                                <Chip label="CCJ" />
                            </small>
                        </td>
                        <td data-label="Email">john@gmail.com</td>
                        <td data-label="Phone">+91-1234567890</td>
                        <td data-label="City, State">Bangalore, Karnataka</td>
                        <td data-label="Action">
                            <Button
                                tooltip="Edit"
                                icon="pi pi-pencil"
                               severity="info"
                                className="p-0 border-0"
                                text
                                onClick={() => setVisibleRight(true)}
                            />
                            <Button
                                tooltip="View"
                                icon="pi pi-eye"
                                severity="help"
                                className="p-0 border-0"
                                text
                                onClick={() => setVisibleRight(true)}
                            />
                        </td>
                    </tr>
                  </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

        <Sidebar visible={visibleRight} position="right" style={{ width: '500px' }} onHide={() => setVisibleRight(false)}>
            <Row className="mx-0 pt-3 justify-content-between align-items-center border-bottom pb-2 mb-3"> 
              <Col md={6} lg={3} className='position-relative pb-2'>
                <div className='position-relative' style={{ width: '100px' }}>
                    <img
                        src={require("../../assets/images/no_user.png")}
                        alt=''
                        style={{ width: '100px', height: '100px', background: 'background: rgb(61 61 61)', border: '1px solid rgb(61, 61, 61)' }}
                        className='rounded-circle'
                    />
                </div>
            </Col>
            <Col md={6} lg={8} className='mb-3 p-0 pe-1 rpprofile'>
                <h5>Jon Doe <Badge>Verified</Badge></h5>
                <p className="mb-0"><span>Mobile:</span> +91-1234567890</p>
                <p className="mb-0"><span>Email:</span> john@gmail.com</p>
            </Col>
          </Row>
          <Row className="mx-0">
            <h6 className="text-muted opacity-50 p-0 mb-4">Employee Details</h6>
            <Table>
              
              <tbody>
                <tr>
                  <td>User Status</td>
                  <th>
                    <Form.Select
                      aria-label="Select Status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      style={{
                        backgroundColor: getBackgroundColor(),
                        transition: 'background-color 0.3s ease'
                      }}
                    >
                      <option value="Verified">Verified</option>
                      <option value="Not Verified">Not Verified</option>
                      <option value="Pending">Pending</option>
                      <option value="Left">Left</option>
                    </Form.Select>
                  </th>
                </tr>
                <tr>
                  <td style={{ width: '150px' }}>Full Name</td>
                  <th>Jon Doe</th>
                </tr>
                <tr>
                  <td>Employee Number</td>
                  <th>AS100137</th>
                </tr>
                <tr>
                  <td>Date of Birth</td>
                  <th>01 Aug, 1994</th>
                </tr>
                <tr>
                  <td>Gender</td>
                  <th>Male</th>
                </tr>
                <tr>
                  <td>Roles</td>
                  <td>
                    <small className="d-flex flex-wrap gap-2">
                      <Chip label="System Engineer" />
                      <Chip label="Super Admin" />
                      <Chip label="GM / DGM" />
                      <Button
                        tooltip={isExpanded ? "Remove Role" : "Add Role"}
                        icon={isExpanded ? "pi pi-minus" : "pi pi-plus"}
                        severity="danger"
                        className="p-0 border-0"
                        text
                        tooltipOptions={{ position: "top" }}
                        onClick={toggleExpand}
                      />
                    </small>
                    {isExpanded && (
                      <div className="mt-2">
                        {/* Replace with your custom content */}
                        <div className="p-2 border rounded bg-light">
                          <div className="d-flex flex-wrap justify-content-start gap-3">
                            <div className="d-flex align-items-center gap-2">
                                <Checkbox inputId="ingredient1" value="System Engineer" onChange={onIngredientsChange} checked={ingredients.includes('System Engineer')} />
                                <label htmlFor="ingredient1" className="me-2">System Engineer</label>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <Checkbox inputId="ingredient2" value="Super Admin" onChange={onIngredientsChange} checked={ingredients.includes('Super Admin')} />
                                <label htmlFor="ingredient2" className="me-2">Super Admin</label>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <Checkbox inputId="ingredient3" value="GMDGM" onChange={onIngredientsChange} checked={ingredients.includes('GMDGM')} />
                                <label htmlFor="ingredient3" className="me-2">GM / DGM</label>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <Checkbox inputId="ingredient4" value="Duty Manager" onChange={onIngredientsChange} checked={ingredients.includes('Duty Manager')} />
                                <label htmlFor="ingredient4" className="me-2">Duty Manager</label>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <Checkbox inputId="ingredient5" value="Airport Manager" onChange={onIngredientsChange} checked={ingredients.includes('Airport Manager')} />
                                <label htmlFor="ingredient5" className="me-2">Airport Manager</label>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <Checkbox inputId="ingredient6" value="Supervisor" onChange={onIngredientsChange} checked={ingredients.includes('Supervisor')} />
                                <label htmlFor="ingredient6" className="me-2">Supervisor</label>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <Checkbox inputId="ingredient7" value="CSACSA" onChange={onIngredientsChange} checked={ingredients.includes('CSACSA')} />
                                <label htmlFor="ingredient7" className="me-2">Sr. CSA / CSA</label>
                            </div>
                          </div>
                          <div className="mt-3">
                            <Button
                              label="update"
                              className="py-1 border-0"
                              severity="help"
                            />
                            <Button
                              label="Cancel"
                              className="py-1 border-0 ms-2"
                              severity="secondary"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
                <tr>
                  <td>Airports</td>
                  <td>
                    <small className="d-flex flex-wrap gap-2">
                      <Chip label="BBI" />
                      <Chip label="GAY" />
                      <Chip label="CCJ" />
                      <Button
                        tooltip={isExpanded2 ? "Remove Role" : "Add Role"}
                        icon={isExpanded2 ? "pi pi-minus" : "pi pi-plus"}
                        severity="danger"
                        className="p-0 border-0"
                        text
                        tooltipOptions={{ position: "top" }}
                        onClick={toggleExpand2}
                      />
                    </small>
                    {isExpanded2 && (
                      <div className="mt-2">
                          <div className="p-2 border rounded bg-light">
                            <p>No Airports</p>
                          </div>
                      </div>
                    )}
                  </td>
                </tr>
                 
                 <tr>
                  <td>Address</td>
                  <th>11/1, Edison Road, Durgapur - 713205, West Bengal, India</th>
                </tr>
              </tbody>
            </Table>
          </Row>
        </Sidebar>
    </Layout>
  );
};

export default Users;