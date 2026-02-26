import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Breadcrumb, Card, Table, Form, CardTitle } from 'react-bootstrap';
import { TabView, TabPanel } from 'primereact/tabview';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import CustomToast from '../../components/CustomToast';
import { Image } from 'primereact/image';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom'; // ⬅️ Step 1
import { Dialog } from "primereact/dialog";
import GifLoder from '../../interfaces/GifLoder';
import { useAuth } from "../../context/AuthContext.js";
import { getSocket } from "../../context/socket.js";
import { MultiSelect } from 'primereact/multiselect';
import { IoChevronBackOutline } from "react-icons/io5";


const VerifyEmployee = () => {
    const PAGE_NAME = "Verification"; // Page name for permission checking
    const navigate = useNavigate(); // ⬅️ Step 2
    const [loading, setLoading] = useState(true);  // Block UI until all fetches succeed
    const [unauthorized, setUnauthorized] = useState(false); // Show Dialog if error
    const [dataLoaded, setDataLoaded] = useState({ employees: false, roles: false, count: false });
    const { role, roleId, userId } = useAuth(); // Get roleId from the context
    const socket = getSocket();
    const [activeIndex, setActiveIndex] = useState(0);
    const [editModes, setEditModes] = useState({});
    const [formData, setFormData] = useState({});
    const [unverifiedEmployees, setUnverifiedEmployees] = useState([]);
    const [roles, setRoles] = useState([]);
    const [errors, setErrors] = useState({});
    const toastRef = useRef(null);
    const [unverifiedCount, setUnverifiedCount] = useState(0); // State to store unverified count
    const [businesses, setBusinesses] = useState([]);

    
    const goBack = () => {
        navigate(-1); // This will take the user back to the previous page in history
    };

    const [airports, setAirports] = useState([]);
    const showMessage = (severity, detail) => {
        const summary = severity.charAt(0).toUpperCase() + severity.slice(1);
        toastRef.current.show(severity, summary, detail);
    };

    const checkUnverifiedCount = async () => {
        try {
            const response = await api.get(`/promotion/unverified_count/${PAGE_NAME}`);
            const newCount = response.data.count;

            if (newCount !== unverifiedCount) {
                setUnverifiedCount(newCount);

            }
            setDataLoaded(prev => ({ ...prev, count: true }));
        } catch (error) {
            console.error('Error fetching unverified users count:', error);
            if (error.response?.status === 403) {
                setUnauthorized(true);
            }
        }
    };

    // Fetch unverified employees
    const fetchUnverifiedEmployees = async () => {
        try {
            const response = await api.get(`/promotion/users_unverified/${PAGE_NAME}`);
            setUnverifiedEmployees(response.data);
            setDataLoaded(prev => ({ ...prev, employees: true }));
        } catch (error) {
            console.error('Error fetching unverified employees:', error);
            if (error.response?.status === 403) {
                setUnauthorized(true);
            }
        }
    };

    // Fetch roles
    const fetchRoles = async () => {
        try {
            const response = await api.get(`/roles/allroles`,);
            setRoles(response.data);
            setDataLoaded(prev => ({ ...prev, roles: true }));
        } catch (error) {
            console.error('Error fetching roles:', error);
            if (error.response?.status === 403) {
                setUnauthorized(true);
            }
        }
    };

    useEffect(() => {
        fetchUnverifiedEmployees();
        fetchRoles();
        checkUnverifiedCount();
    }, []);


    useEffect(() => {
        if (!socket) return;

        socket.emit('fetch-businesses', {
            role_id: roleId,
            page_name: PAGE_NAME,
            user_id: userId
        });

        socket.on('fetch-businesses-success', (data) => {
            setBusinesses(data);
        });

        socket.on('fetch-businesses-error', (error) => {
            const isPermissionError =
                error.message?.includes('Missing role_id') ||
                error.message?.includes('Page') ||
                error.message?.includes('Permission denied');

            if (isPermissionError) {
                setUnauthorized(true);
            } else {
                setBusinesses([]);
                console.warn('Business fetch error:', error.message);
            }
        });

        return () => {
            socket.off('fetch-businesses-success');
            socket.off('fetch-businesses-error');
        };
    }, [socket]);

    useEffect(() => {
        if (socket) {
            socket.emit("fetch-airports", { role_id: roleId, page_name: PAGE_NAME, user_id: userId });

            socket.on("fetch-airports-success", (data) => {
                const formatted = data.map((a) => ({ name: `${a.name} (${a.iata})`, code: a.airport_id }));
                setAirports(formatted);
            });

            socket.on("fetch-airports-error", (error) => {
                const isPermissionError =
                    error.message?.includes('Missing role_id') ||
                    error.message?.includes('Page') ||
                    error.message?.includes('Permission denied');

                if (isPermissionError) {
                    setUnauthorized(true);
                } else {
                    setAirports([]);
                    console.warn('Airport fetch error:', error.message);
                }

                setLoading(false);
            });

            return () => {
                socket.off("fetch-airports-success");
                socket.off("fetch-airports-error");
            };
        }
    }, [socket]);

    // useEffect(() => {
    //     const allDone = Object.values(dataLoaded).every(Boolean);
    //     if (allDone) {
    //         setLoading(false);
    //     }
    // }, [dataLoaded]);
    useEffect(() => {
        const allDone = Object.values(dataLoaded).every(Boolean);
        if (allDone) {
            const timer = setTimeout(() => setLoading(false), 100); // Minimum 3 sec loader
            return () => clearTimeout(timer); // Cleanup on unmount
        }
    }, [dataLoaded]);


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

    const handleEditClick = (employee) => {
        setEditModes((prevEditModes) => ({
            ...prevEditModes,
            [employee.user_id]: true,
        }));
        setFormData((prevFormData) => ({
            ...prevFormData,
            [employee.user_id]: {
                userId: employee.user_id,
                date: employee.date_of_joining ? new Date(employee.date_of_joining) : null,
                role: employee.Role_id || '',
                business_ids: employee.business_ids || [], // Add if coming from backend
                airport_ids: employee.airport_ids || []     // Add if coming from backend
            },
        }));
        setErrors((prevErrors) => ({
            ...prevErrors,
            [employee.user_id]: {},
        }));
    };

    const handleSaveClick = async (userId) => {
        const validationErrors = validateForm(userId);
        if (Object.keys(validationErrors).length > 0) {
            setErrors((prevErrors) => ({
                ...prevErrors,
                [userId]: validationErrors,
            }));
            return;
        }

        try {
            const employeeData = formData[userId];


            const selectedRole = roles.find(role => role.role_name === employeeData.role);

            const roleName = selectedRole ? selectedRole.role_name : '';



            const payload = {
                user_id: employeeData.userId,
                user_type: roleName || 'Unverified',
                date_of_joining: employeeData.date,
                business_ids: employeeData.business_ids || [],
                airport_ids: employeeData.airport_ids || []
            };



            await api.post(`/promotion/update-user-role-location/${PAGE_NAME}`, {
                ...payload,
            });

            setEditModes((prevEditModes) => ({
                ...prevEditModes,
                [userId]: false,
            }));

            fetchUnverifiedEmployees(); // Refetch unverified employees after saving
        } catch (error) {
            console.error('Error saving employee data:', error);
        }
    };
    const handleCancelClick = (userId) => {
        setEditModes((prevEditModes) => ({
            ...prevEditModes,
            [userId]: false,
        }));
    };

    const handleFormChange = (userId, e) => {
        const { name, value } = e.target;

        setFormData((prevFormData) => ({
            ...prevFormData,
            [userId]: {
                ...prevFormData[userId],
                [name]: value,
            },
        }));
        setErrors((prevErrors) => ({
            ...prevErrors,
            [userId]: {
                ...prevErrors[userId],
                [name]: '',
            },
        }));
    };

    const handleDateChange = (userId, date) => {

        setFormData((prevFormData) => ({
            ...prevFormData,
            [userId]: {
                ...prevFormData[userId],
                date,
            },
        }));
        setErrors((prevErrors) => ({
            ...prevErrors,
            [userId]: {
                ...prevErrors[userId],
                date: '',
            },
        }));
    };

    const validateForm = (userId) => {
        const employeeData = formData[userId] || {};
        const newErrors = {};

        if (!employeeData.date) newErrors.date = 'Join Date is required';
        if (!employeeData.role) newErrors.role = 'Role is required';
        if (!employeeData.business_ids || employeeData.business_ids.length === 0)
            newErrors.business_ids = 'At least one business must be selected';
        if (!employeeData.airport_ids || employeeData.airport_ids.length === 0)
            newErrors.airport_ids = 'At least one airport must be selected';

        return newErrors;
    };



    return (
        <>
            <Row className='body_content'>
                <Col md={12} lg={6}>
                    <Breadcrumb>
                    <Breadcrumb.Item onClick={goBack}>
                        <IoChevronBackOutline /> Back
                    </Breadcrumb.Item>
                    <Breadcrumb.Item active>Categories</Breadcrumb.Item>
                    </Breadcrumb>
                </Col>
                <Row className='mx-0 mt-5'>
                    <Card className='mb-4 p-0 border-0 shadow-sm'>
                        <Card.Header className='border-0 pb-0 pe-0 d-flex justify-content-between align-items-center'>
                            <h6 className='text-muted'>Unverified Employees</h6>
                            <div className='tabbutton'>
                                <Button
                                    onClick={() => setActiveIndex(0)}
                                    rounded
                                    outlined={activeIndex !== 0}
                                    className='bg-transparent border-0'
                                >
                                    <span className="p-badge bg-transparent text-danger" style={{ fontSize: '18px' }}>{unverifiedCount}</span>
                                </Button>
                            </div>
                        </Card.Header>
                        <Card.Body style={{ height: '30vh', overflowY: 'auto' }}>
                            <Table responsive hover className='unverified-table'>
                                <thead className="table-header table-primary">
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Document</th>
                                        <th>Join Date</th>
                                        <th>Role</th>
                                        <th>Handling Companies</th>
                                        <th>Airports</th>
                                        <th style={{ width: '135px' }} className='text-center'>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {unverifiedEmployees.map(employee => {
                                        const userId = employee.user_id;
                                        const isEditMode = editModes[userId] || false;
                                        const employeeData = formData[userId] || {};
                                        const employeeErrors = errors[userId] || {};

                                        return (
                                            <tr key={userId}>
                                                <td>{employee.first_name} {employee.last_name}</td>

                                                <td>{employee.email}</td>
                                                <td>
                                                    <ul className='up-document-table border-0 p-0'>
                                                        {employee.documents && employee.documents.length > 0 ? (
                                                            employee.documents.map((doc, index) => (
                                                                <li key={index}>
                                                                    <Image
                                                                        src={doc.document_url}
                                                                        zoomSrc={doc.document_url}
                                                                        alt={`Document ${index + 1}`}
                                                                        preview
                                                                    />
                                                                </li>
                                                            ))
                                                        ) : (
                                                            <li>No documents available</li>
                                                        )}
                                                    </ul>
                                                </td>

                                                <td>
                                                    {isEditMode ? (
                                                        <>
                                                            <Calendar
                                                                name="date"
                                                                value={employeeData.date || ''}
                                                                onChange={(e) => handleDateChange(userId, e.value)}
                                                                placeholder='Join Date'
                                                                dateFormat='dd/mm/yy'
                                                                className={employeeErrors.date ? 'p-invalid' : ''}
                                                            />
                                                            {employeeErrors.date && (
                                                                <small className='p-error'>{employeeErrors.date}</small>
                                                            )}
                                                        </>
                                                    ) : (
                                                        employee.date_of_joining || ''
                                                    )}
                                                </td>
                                                <td>
                                                    {isEditMode ? (
                                                        <>
                                                            <Form.Select
                                                                name="role"
                                                                value={employeeData.role || ''}
                                                                onChange={(e) => handleFormChange(userId, e)}
                                                                className={employeeErrors.role ? 'p-invalid' : ''}
                                                            >
                                                                <option value=''>Select Role</option>
                                                                {roles.map(role => (
                                                                    <option key={role.Role_id} value={role.role_name}>
                                                                        {role.role_name}
                                                                    </option>
                                                                ))}
                                                            </Form.Select>
                                                            {employeeErrors.role && (
                                                                <small className='p-error'>{employeeErrors.role}</small>
                                                            )}
                                                        </>
                                                    ) : (
                                                        employee.role_name || ''
                                                    )}
                                                </td>
                                                <td>
                                                    {isEditMode ? (
                                                        <>
                                                            <MultiSelect
                                                                value={employeeData.business_ids || []}
                                                                options={businesses.map((b) => ({ label: b.name, value: b.business_id }))}
                                                                onChange={(e) =>
                                                                    handleFormChange(userId, {
                                                                        target: { name: 'business_ids', value: e.value }
                                                                    })
                                                                }
                                                                selectedItemsLabel="{0} airports selected"
                                                                placeholder="Select Businesses"
                                                                className="w-full"
                                                            />
                                                        </>
                                                    ) : (
                                                        'Assigned Businesses'
                                                    )}
                                                </td>
                                                <td>
                                                    {isEditMode ? (
                                                        <>
                                                            <MultiSelect
                                                                value={employeeData.airport_ids || []}
                                                                options={airports.map((a) => ({ label: a.name, value: a.code }))}
                                                                onChange={(e) =>
                                                                    handleFormChange(userId, {
                                                                        target: { name: 'airport_ids', value: e.value }
                                                                    })
                                                                }
                                                                selectedItemsLabel="{0} airports selected"
                                                                placeholder="Select Airports"
                                                                className="w-full"
                                                            />
                                                        </>
                                                    ) : (
                                                        'Assigned Airports'
                                                    )}
                                                </td>
                                                <td>
                                                    <div className='text-center d-flex justify-content-center align-items-center'>
                                                        {isEditMode ? (
                                                            <>
                                                                <Button
                                                                    //label="Save"
                                                                    icon="pi pi-check"
                                                                    text
                                                                    severity='success'
                                                                    className='me-2 border-0'
                                                                    onClick={() => handleSaveClick(userId)}
                                                                    style={{ width: '32px' }}
                                                                />
                                                                <Button
                                                                    //label="Cancel"
                                                                    icon="pi pi-times"
                                                                    text
                                                                    severity='danger'
                                                                    onClick={() => handleCancelClick(userId)}
                                                                    style={{ width: '32px' }}
                                                                    className='border-0'
                                                                />
                                                            </>
                                                        ) : (
                                                            <Button
                                                                //label="Edit"
                                                                icon="pi pi-pencil"
                                                                text
                                                                severity='warning'
                                                                onClick={() => handleEditClick(employee)}
                                                                style={{ width: '32px' }}
                                                                className='border-0'
                                                            />
                                                        )}
                                                    </div>
                                                    
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Row>
            </Row>
            <CustomToast ref={toastRef} />
        </>
    );
};

export default VerifyEmployee;
