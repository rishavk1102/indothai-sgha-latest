import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Row, Col, Breadcrumb, Card } from 'react-bootstrap';
import '../../assets/css/employelist.css';
import { Button } from 'primereact/button';
import { Link } from 'react-router-dom';
import noUserImg from "../../assets/images/no_user.png";
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';
import { getSocket, waitForSocketConnection, isSocketConnected } from '../../context/socket';
import { Dialog } from "primereact/dialog";
import GifLoder from '../../interfaces/GifLoder';
const Employelist = () => {
    const { role, roleId } = useAuth(); // Get roleId from the context
    const PAGE_NAME = "EmployeeList"; // Page name for permission checking
    const [loading, setLoading] = useState(true);  // Block UI until all fetches succeed
    const [unauthorized, setUnauthorized] = useState(false); // Show Dialog if error
    const socket = getSocket();
    const [employeesByType, setEmployeesByType] = useState({});
    const [selectedEmployee, setSelectedEmployee] = useState(null); // State for selected employee
    const allowedRoles = ['Admin', 'SuperAdmin'];
    const navigate = useNavigate();
    useEffect(() => {
        if (!roleId) return;

        let connectedSocket = null;
        let isMounted = true;

        const fetchEmployees = async () => {
            try {
                // Wait for socket connection
                connectedSocket = await waitForSocketConnection();
                
                if (!connectedSocket || !isMounted) {
                    if (isMounted) {
                        console.error("Socket not available");
                        setLoading(false);
                    }
                    return;
                }

                const handleSuccess = (data) => {
                    if (!isMounted) return;
                    
                    setEmployeesByType(data);

                    if (data['Admin'] && data['Admin'].length > 0) {
                        setSelectedEmployee(data['Admin'][0]);
                    }

                    setTimeout(() => {
                        if (isMounted) {
                            setLoading(false);
                        }
                    }, 100); // Loader delay
                };

                const handleError = (error) => {
                    if (!isMounted) return;
                    
                    console.error("Socket error:", error.message);

                    const isPermissionError =
                        error.message?.includes("Missing role_id") ||
                        error.message?.includes("Page") ||
                        error.message?.includes("Permission denied");

                    if (isPermissionError) {
                        setUnauthorized(true);
                    }

                    setLoading(false);
                };

                connectedSocket.on('get-all-employees-success', handleSuccess);
                connectedSocket.on('get-all-employees-error', handleError);

                // Emit the event
                connectedSocket.emit('get-all-employees', {
                    role_id: roleId,
                    page_name: PAGE_NAME
                });
            } catch (error) {
                if (isMounted) {
                    console.error("Failed to connect socket:", error);
                    setLoading(false);
                }
            }
        };

        fetchEmployees();

        // Cleanup function
        return () => {
            isMounted = false;
            if (connectedSocket) {
                connectedSocket.off('get-all-employees-success');
                connectedSocket.off('get-all-employees-error');
            }
        };
    }, [roleId]);



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
                        className="py-2 mt-3"
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
            <Row className='body_content w-100'>
                <Row className="justify-content-start">
                    <Col md={6} lg={3} className='mb-0'>
                        <Breadcrumb>
                            <Breadcrumb.Item onClick={() => navigate(-1)} style={{ cursor: "pointer" }}>
                                <i className="pi pi-angle-left"></i> Back
                            </Breadcrumb.Item>
                            <Breadcrumb.Item active>Employee List</Breadcrumb.Item>
                        </Breadcrumb>
                    </Col>
                    <Col lg={12} className='my-4'>
                        <Row className='mx-0'>
                            <Col lg={3} className='mb-4 ps-lg-0'>
                                {selectedEmployee && (
                                    <Card className='sticky-top'>
                                        {/* <Card.Header className='border-0 text-end'>
                                            <img src={require("../../assets/images/gifImage.gif")} alt="Logo" style={{ width: '100px', height: '100px' }} />
                                        </Card.Header> */}
                                        <Card.Body>
                                            <div className='userImg text-center'>
                                                <img
                                                    src={selectedEmployee?.profile_image || noUserImg}
                                                    alt={selectedEmployee?.name}
                                                    className='profile-image'
                                                />
                                            </div>
                                            <div className='userfinfo'>
                                                <h5>{selectedEmployee?.name}</h5>
                                                <p>Role: {selectedEmployee?.role}
                                                    <small className='d-block'>
                                                        Joining: {new Date(selectedEmployee?.joining_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                    </small>

                                                </p>
                                            </div>
                                            <div className='userfinfo_contact'>
                                                <Button icon="pi pi-envelope" severity='help' rounded outlined aria-label="Email" tooltip={selectedEmployee.email} tooltipOptions={{ position: 'top' }} className='me-2' />
                                                <Button icon="pi pi-phone" severity='info' rounded outlined aria-label="Phone" tooltip={selectedEmployee.employee_data?.phone} tooltipOptions={{ position: 'top' }} className='me-2' />
                                                {allowedRoles.includes(role) && (<Link to={`/dashboard/associateedit/${selectedEmployee.user_id}`}><Button icon="pi pi-eye" severity='success' rounded outlined aria-label="View Profile" tooltip="View Profile" tooltipOptions={{ position: 'top' }} /></Link>)}
                                            </div>
                                        </Card.Body>
                                        <Card.Footer className='border-0 userfinfo_foot'>
                                            <p>{selectedEmployee?.employee_data?.City}<small>City</small></p>
                                            <p>{selectedEmployee?.employee_data?.State}<small>State</small></p>
                                        </Card.Footer>
                                    </Card>
                                )}
                            </Col>

                            <Col lg={9} className='mb-4 ps-lg-5'>
                                {/* Dynamically render employee data grouped by role */}
                                {Object.entries(employeesByType).map(([role, employees]) => (
                                    <div className='allempList' key={role}>
                                        <div className='rol-title'>{role}</div>
                                        <ul>
                                            {employees.map((employee) => (
                                                <li key={employee.user_id} onClick={() => setSelectedEmployee(employee)} className='bg-white py-2 px-3 d-flex gap-3 align-items-center justify-content-between'>
                                                    <div className='userImg text-center mb-0'>
                                                        <img
                                                            src={employee?.profile_image || noUserImg}
                                                            alt={employee?.name}
                                                            className='profile-image '
                                                        />
                                                    </div>
                                                    <div className='userfinfo'>
                                                        <h5 style={{ textAlign:'left', fontSize: '16px'}}>{employee?.name}</h5>
                                                        <p style={{ textAlign:'left', color:'#212121'}}>Role : {role}</p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </Row>
        </>
    );
};

export default Employelist;
