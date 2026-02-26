import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Breadcrumb, Form, InputGroup, Card, Table, CardHeader } from 'react-bootstrap';
import { Link, useParams, useNavigate } from 'react-router-dom';
import '../../assets/css/profile.css';
import axios from 'axios';
import { Dialog } from 'primereact/dialog';
import Profileinformation from '../../modalPopup/Profileinformation';
import Personalinformations from '../../modalPopup/Personalinformations';
import Emergencycontact from '../../modalPopup/Emergencycontact';
import Bankinformation from '../../modalPopup/Bankinformation';
import { FiEdit3 } from "react-icons/fi";
import { Button } from 'primereact/button';
import { CgGenderMale } from "react-icons/cg";
import { TbGenderFemme } from "react-icons/tb";
import config from '../../config';
import { useAuth } from '../../context/AuthContext';
import { FileUpload } from 'primereact/fileupload';
import '../../assets/css/dashboard.css';
import CustomToast from '../../components/CustomToast';
import { IoChevronBackOutline } from "react-icons/io5";
import { Image } from 'primereact/image';
import AddDocuments from '../../modalPopup/AddDocuments';
import api from '../../api/axios';
import { TabView, TabPanel } from 'primereact/tabview';
import { getSocket } from '../../context/socket';
import GifLoder from '../../interfaces/GifLoder';
import EditUserBusinesses from '../../components/EditUserBusinesses';
import EditUserAirports from '../../components/EditUserAirports';


const EmployeeEdit = () => {
    const { role, roleId } = useAuth(); // Get roleId from the context
    const PAGE_NAME = "EmployeeEdit"; // Page name for permission checking
    const navigate = useNavigate();
    const socket = getSocket();
    const [loading, setLoading] = useState(true);  // Block UI until all fetches succeed
    const [unauthorized, setUnauthorized] = useState(false); // Show Dialog if error
    const [dataLoaded, setDataLoaded] = useState({ employees: false, roles: false, count: false });
    const [userBusinesses, setUserBusinesses] = useState([]);
    const [userAirports, setUserAirports] = useState([]);

    const [checked, setChecked] = useState(true);
    const [visibleModal1, setVisibleModal1] = useState(false);
    const [visibleModal2, setVisibleModal2] = useState(false);
    const [visibleModal3, setVisibleModal3] = useState(false);
    const [visibleModal4, setVisibleModal4] = useState(false);
    const [visibleModal5, setVisibleModal5] = useState(false);
    const [showBusinessDialog, setShowBusinessDialog] = useState(false);
    const [showAirportDialog, setShowAirportDialog] = useState(false);
    const { user_id } = useParams(); // Get the user_id from the URL params
    const [userDetails, setUserDetails] = useState({});
    const [emergencyContacts, setEmergencyContacts] = useState([]);
    const [educationalInfo, setEducationalInfo] = useState([]);
    const [bankDetails, setBankDetails] = useState(null);
    const toastRef = useRef(null);
    const [IdentificationInfo, setIdentificationInfo] = useState([]);
    const [profileImageUrl, setProfileImageUrl] = useState(null);
    const [uploadError, setUploadError] = useState(null);
    const [documentUrls, setDocumentUrls] = useState([]);

    // Function to navigate back to the previous page
    const goBack = () => {
        navigate(-1); // This will take the user back to the previous page in history
    };


    const showMessage = (severity, detail) => {
        const summary = severity.charAt(0).toUpperCase() + severity.slice(1);
        toastRef.current.show(severity, summary, detail);
    };


    const fetchDocuments = async () => {
        try {
            const response = await api.get(`/documents/profiledocuments/${user_id}`,);
            setDocumentUrls(response.data.documentUrls);
        } catch (error) {
            console.error('Error fetching documents:', error);
        }
    };


    useEffect(() => {
        fetchDocuments();
    }, [user_id]);


    const handleUpload = async (event) => {
        const file = event.files[0]; // Get the first file from event.files

        if (file) {
            try {
                setLoading(true);
                const formData = new FormData();
                formData.append('profileImage', file); // Ensure the name matches the backend

                // Send the request to your API
                const response = await api.post(
                    `/proimage/upload/${user_id}/${PAGE_NAME}`, // API endpoint
                    formData,
                );

                // Check if the response has the image URL
                if (response.data && response.data.data && response.data.data.img_url) {
                    setProfileImageUrl(response.data.data.img_url); // Set the new image URL in state
                    setUploadError(null); // Reset any previous error if successful
                    setLoading(false);
                    showMessage('success', 'Image Updated Successfully');
                } else {
                    throw new Error('No image URL returned from the server');
                    setLoading(false);
                    showMessage('error', 'Error uploading image. Please try again.');
                }
            } catch (error) {
                console.error('Error uploading file:', error);
                setUploadError('Error uploading file. Please try again.'); // Set an error message in case of failure
                setLoading(false);
            }
        } else {
            setUploadError('No file selected'); // Handle the case where no file is selected
            showMessage('info', 'No file Selected.');
            setLoading(false);
        }
    };




    useEffect(() => {
        if (!socket) return;

        setLoading(true); // Start loading
        const payload = { user_id, role_id: roleId, page_name: PAGE_NAME };

        // --- SUCCESS HANDLERS ---
        const handleUserSuccess = data => setUserDetails(data);
        const handleEmergencySuccess = data => setEmergencyContacts(data);
        const handleBankSuccess = data => setBankDetails(data);
        const handlePersonalSuccess = data => setIdentificationInfo(data);
        const handleProfileImageSuccess = data => {
            setProfileImageUrl(data?.img_url || null);
        };
        // Success handlers
        const handleBusinessesSuccess = (data) => setUserBusinesses(data?.businesses || []);
        const handleAirportsSuccess = (data) => setUserAirports(data?.airports || []);

        // --- ERROR HANDLER ---
        const handleError = (error) => {
            const message = error?.message || error;

            const isPermissionError =
                message?.includes("Missing") ||
                message?.includes("Permission denied") ||
                message?.includes("registration");

            if (isPermissionError) {
                setUnauthorized(true);
            }

            console.error("❌ Error fetching SGHA templates:", message);
            setLoading(false);
        };


        // Emit requests
        socket.emit('get-user-details', payload);
        // socket.emit('get-emergency-contact', payload);
        // socket.emit('get-bank-information', payload);
        socket.emit('get-personal-information', payload);
        socket.emit('get-user-profile-images', payload); // NEW: profile image request
        socket.emit('get-user-businesses', payload);
        socket.emit('get-user-airports', payload);

        // Success listeners
        socket.on('get-user-details-success', handleUserSuccess);
        socket.on('get-emergency-contact-success', handleEmergencySuccess);
        socket.on('get-bank-information-success', handleBankSuccess);
        socket.on('get-personal-information-success', handlePersonalSuccess);
        socket.on('get-user-profile-images-success', handleProfileImageSuccess); // NEW
        socket.on('get-user-businesses-success', handleBusinessesSuccess);
        socket.on('get-user-airports-success', handleAirportsSuccess);

        // Error listeners
        socket.on('get-user-details-error', handleError);
        socket.on('get-emergency-contact-error', handleError);
        socket.on('get-bank-information-error', handleError);
        socket.on('get-personal-information-error', handleError);
        socket.on('get-user-profile-images-error', handleError); // NEW
        socket.on('get-user-businesses-error', handleError);
        socket.on('get-user-airports-error', handleError);

        // Wait a bit and turn off loading
        const loaderTimer = setTimeout(() => setLoading(false), 1500);

        // Real-time update handlers
        const refreshData = () => {
            socket.emit('get-user-details', payload);
            // socket.emit('get-emergency-contact', payload);
            // socket.emit('get-bank-information', payload);
            socket.emit('get-personal-information', payload);
            socket.emit('get-user-profile-images', payload); // NEW

        };

        // Real-time refresh
        const refreshUserAssociations = () => {
            socket.emit('get-user-businesses', payload);
            socket.emit('get-user-airports', payload);
        };

        socket.on("bankinfoupdated", refreshData);
        socket.on("emergencyContactupdated", refreshData);
        socket.on("personalInfoupdated", refreshData);
        socket.on("profile-image-updated", refreshData);


        socket.on('businesses-updated', ({ user_id: updatedUserId }) => {
            if (updatedUserId === user_id) refreshUserAssociations();
        });

        socket.on('Airports-updated', ({ user_id: updatedUserId }) => {
            if (updatedUserId === user_id) refreshUserAssociations();
        });

        return () => {
            clearTimeout(loaderTimer);

            socket.off('get-user-details-success', handleUserSuccess);
            socket.off('get-emergency-contact-success', handleEmergencySuccess);
            socket.off('get-bank-information-success', handleBankSuccess);
            socket.off('get-personal-information-success', handlePersonalSuccess);
            socket.off('get-user-profile-images-success', handleProfileImageSuccess); // NEW

            socket.off('get-user-details-error', handleError);
            // socket.off('get-emergency-contact-error', handleError);
            // socket.off('get-bank-information-error', handleError);
            socket.off('get-personal-information-error', handleError);
            socket.off('get-user-profile-images-error', handleError); // NEW

            socket.off("bankinfoupdated", refreshData);
            socket.off("emergencyContactupdated", refreshData);
            socket.off("personalInfoupdated", refreshData);
            socket.off("profile-image-updated", refreshData);

            socket.off('get-user-businesses-success', handleBusinessesSuccess);
            socket.off('get-user-airports-success', handleAirportsSuccess);
            socket.off('get-user-businesses-error', handleError);
            socket.off('get-user-airports-error', handleError);
            socket.off('businesses-updated', refreshUserAssociations);
            socket.off('Airports-updated', refreshUserAssociations);





        };
    }, [user_id, roleId, socket]);



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



    const openModalWithUserId = () => {
        setVisibleModal2(true);
    }

    const openModalWithUser = () => {
        setVisibleModal3(true);
    }

    const openModalWith = () => {
        setVisibleModal4(true);
    }


    const openModalWithedu = () => {
        setVisibleModal5(true);
    }

    const openModalWithu = () => {
        setVisibleModal1(true);
    }



    return (
        <>
            <Row className='body_content'>
                <Row className='mx-0'>
                    <Col md={6} lg={9} className='mb-1'>
                        <Breadcrumb>
                            <Breadcrumb.Item onClick={() => navigate(-1)} style={{ cursor: "pointer" }}>
                                <i className="pi pi-angle-left"></i> Back
                            </Breadcrumb.Item>
                            <Breadcrumb.Item active>Profile</Breadcrumb.Item>
                        </Breadcrumb>
                    </Col>
                    {/* <Col md={6} lg={3} className='d-flex justify-content-end mb-4'>
                    <a href='/employees/Addemployee' className='btn btn-primary'>Add Employee</a>
                </Col>   */}
                    <Row className="mx-0 justify-content-between mt-4">
                        <Col lg={6} md={12} className='px-lg-3 pcl-card'>
                            <Card className='mb-3 border-0 shadow-sm'>
                                <Card.Body>
                                    <div className='d-flex align-items-center'>
                                        <div className='position-relative'>
                                            <img
                                                src={profileImageUrl ? profileImageUrl : require("../../assets/images/no_user.png")}
                                                alt=''
                                                style={{ width: '120px', height: '120px' }}
                                                className='rounded-circle'
                                            />
                                            {/* <FileUpload
                                                mode="basic"
                                                name="profileImage"
                                                accept="image/*"
                                                maxFileSize={300000} // 300KB
                                                customUpload
                                                uploadHandler={handleUpload} // Directly use the upload handler
                                                className="FlUpload"
                                            /> */}

                                            <FileUpload
                                                mode="basic"
                                                name="profileImage" // Single file upload name attribute
                                                accept="image/*" // Accept only image files
                                                maxFileSize={300000} // Set the maximum file size to 300KB
                                                customUpload
                                                uploadHandler={handleUpload} // Use the custom upload handler
                                                auto
                                                className="FlUpload text-light" // Add custom class if needed
                                            />


                                        </div>
                                        <div className='ms-3'>
                                            <h3 className='fw-bold mb-0 text-dark'>{`${userDetails?.first_name || ''} ${userDetails?.last_name || ''}`}  <small className='digi'>{userDetails?.user_type || 'Not Specified'}</small></h3>
                                            <p className='text-secondary mb-0'><small>{userDetails?.email || 'Not Provided Yet'}</small></p>
                                            <p className='text-secondary mb-0'><small>Date of Joining : {new Date(userDetails?.joining_date || 'Not Provided Yet').toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</small></p>
                                            <p className='text-secondary mb-0'>
                                                {IdentificationInfo?.gender === 'Male' ? (
                                                    <CgGenderMale className='me-1 text-danger' />
                                                ) : IdentificationInfo?.gender === 'Female' ? (
                                                    <TbGenderFemme className='me-1 text-danger' />
                                                ) : null}
                                                <small>{IdentificationInfo?.gender || 'Not Provided Yet'}</small>
                                            </p>

                                        </div>
                                    </div>
                                </Card.Body>
                            </Card>
                            <Card className='mb-3 border-0 shadow-sm'>
                                <Card.Body>
                                    <Card.Title className="d-flex justify-content-between align-items-center">
                                        Businesses:
                                        <div className='pro-edit'>
                                            <Link to={'#'} className='edit-icon' onClick={() => setShowBusinessDialog(true)}>
                                                <FiEdit3 />
                                            </Link>
                                        </div>
                                    </Card.Title>
                                    {userBusinesses.length > 0 && (
                                        <div className="mb-3">
                                            <ul className='businessul'>
                                                {userBusinesses.map((b) => (
                                                    <li key={b.business_id}>{b.name}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                </Card.Body>
                            </Card>
                            <Card className='mb-3 border-0 shadow-sm'>
                                <Card.Body>
                                    <Card.Title className="d-flex justify-content-between align-items-center">
                                        Airports:
                                        <div className='pro-edit'>
                                            <Link to={'#'} className='edit-icon' onClick={() => setShowAirportDialog(true)}>
                                                <FiEdit3 />
                                            </Link>
                                        </div>
                                    </Card.Title>
                                    {userAirports.length > 0 && (
                                        <div className="mb-3">
                                            <ul className='businessul'>
                                                {userAirports.map((a) => (
                                                    <li key={a.airport_id}>{a.name} ({a.iata})</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                </Card.Body>
                            </Card>
                            <Card className='mb-3 border-0 shadow-sm'>
                                <Card.Body>
                                    <Card.Title className="d-flex justify-content-between align-items-center">
                                        Documents
                                        <span>
                                            <a href='#!' className='edit-icon' onClick={openModalWithedu}>
                                                <FiEdit3 />
                                            </a>
                                        </span>
                                    </Card.Title>
                                    {/* <ul className="up-document">
                                        {documentUrls.length > 0 ? (
                                            documentUrls.map((url, index) => (
                                                <li key={index}>
                                                    <Image src={url} alt={`Document ${index + 1}`} preview />
                                                </li>
                                            ))
                                        ) : (
                                            <p>No documents available</p>
                                        )}
                                    </ul> */}
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col lg={6} md={12} className='mb-4 pcl-card'>
                            <Card className='mb-3 border-0 shadow-sm'>
                                <Card.Body>
                                    <Card.Title className="d-flex justify-content-between align-items-center">
                                        Personal Informations
                                        <div className='pro-edit'>
                                            <Link to={'#'} className='edit-icon' onClick={openModalWithu}>
                                                <FiEdit3 />
                                            </Link>
                                        </div>
                                    </Card.Title>
                                    <table className='table pro_table'>
                                        <tr>
                                            <th style={{ width: '110px' }}>Personal Email :</th>
                                            <td>
                                                {userDetails?.personal_email || 'Not Provided Yet'}</td>
                                        </tr>

                                        <tr>
                                            <th style={{ width: '110px' }}>Position :</th>
                                            <td>
                                                {userDetails?.user_type || 'Not Provided Yet'}</td>
                                        </tr>
                                        <tr>
                                            <th style={{ width: '110px' }}>Phone :</th>
                                            <td>{userDetails?.phone_no}</td>
                                        </tr>
                                        <tr>
                                            <th style={{ width: '110px' }}>Alternate No :</th>
                                            <td>
                                                {userDetails?.alternate_no || 'Not Provided Yet'}</td>
                                        </tr>

                                    </table>

                                </Card.Body>
                            </Card>
                            <Card className='mb-3 border-0 shadow-sm'>
                                <Card.Body>
                                    <Card.Title className="d-flex justify-content-between align-items-center">
                                        Basic information
                                        <div className='pro-edit'>
                                            <a className='edit-icon' onClick={openModalWithUserId}>
                                                <FiEdit3 />
                                            </a>
                                        </div>
                                    </Card.Title>
                                    <table className='table pro_table'>
                                        <tr>
                                            <th>Address :</th>
                                            <td>{IdentificationInfo?.Address1} {IdentificationInfo?.Address2}</td>
                                        </tr>
                                        <tr>
                                            <th>City :</th>
                                            <td>{IdentificationInfo?.City}</td>
                                        </tr>

                                        <tr>
                                            <th>State :</th>
                                            <td>{IdentificationInfo?.State}</td>
                                        </tr>
                                        <tr>
                                            <th>Pan card No. :</th>
                                            <td>{IdentificationInfo?.pan_card_no}</td>
                                        </tr>
                                        <tr>
                                            <th>Passport No. :</th>
                                            <td>{IdentificationInfo?.passport_no}</td>
                                        </tr>
                                        <tr>
                                            <th>Aadhar No. :</th>
                                            <td>{IdentificationInfo?.aadhar_no}</td>
                                        </tr>
                                        <tr>
                                            <th>Nationality :</th>
                                            <td>{IdentificationInfo?.nationality}</td>
                                        </tr>
                                        <tr>
                                            <th>Religion :</th>
                                            <td>{IdentificationInfo?.religion}</td>
                                        </tr>
                                        <tr>
                                            <th>Marital status :</th>
                                            <td>{IdentificationInfo?.marital_status || 'Not set'}</td>
                                        </tr>
                                        <tr>
                                            <th>Employment of spouse :</th>
                                            <td>{IdentificationInfo?.employment_of_spouse || 'Not set'}</td>
                                        </tr>
                                        <tr>
                                            <th>No. of children :</th>
                                            <td>{IdentificationInfo?.no_of_children || 'Not set'}</td>
                                        </tr>
                                    </table>

                                </Card.Body>
                            </Card>
                            {/* <Card className='mb-3 border-0 shadow-sm'>
                                 <Card.Body>
                                    <Card.Title className="d-flex justify-content-between align-items-center">
                                        Emergency Contact
                                        <div className='pro-edit'>
                                            <a href='#!' className='edit-icon' onClick={openModalWithUser}>
                                                <FiEdit3 />
                                            </a>
                                        </div>
                                    </Card.Title>
                                    <table className='table pro_table'>
                                        {emergencyContacts && emergencyContacts.Contact_name ? (
                                            <>
                                                <tr>
                                                    <th colSpan={1} className='text-secondary'>Contact</th>
                                                </tr>
                                                <tr>
                                                    <th>Name :</th>
                                                    <td>{emergencyContacts.Contact_name}</td>
                                                </tr>
                                                <tr>
                                                    <th>Relationship :</th>
                                                    <td>{emergencyContacts.Relation}</td>
                                                </tr>
                                                <tr>
                                                    <th>Phone :</th>
                                                    <td>{emergencyContacts.Phone_no}</td>
                                                </tr>
                                            </>
                                        ) : (
                                            <tr>
                                                <td colSpan={2}>Emergency contact not added</td>
                                            </tr>
                                        )}
                                    </table>
                                </Card.Body>
                            </Card>
                            <Card className='mb-3 border-0 shadow-sm'>
                                <Card.Body>
                                    <Card.Title className="d-flex justify-content-between align-items-center">
                                        Bank Information
                                        <div className='pro-edit'>
                                            <a href='#!' className='edit-icon' onClick={openModalWith}>
                                                <FiEdit3 />
                                            </a>
                                        </div>
                                    </Card.Title>

                                    <table className='table pro_table'>

                                        <tr>
                                            <th>Bank Name:</th>
                                            <td>{bankDetails?.bank_name || 'Not set'}</td>
                                        </tr>
                                        <tr>
                                            <th>Bank Account No.:</th>
                                            <td>{bankDetails?.bank_account_no || 'Not set'}</td>
                                        </tr>
                                        <tr>
                                            <th>Account Holders Name:</th>
                                            <td>{bankDetails?.account_holder_name || 'Not set'}</td>
                                        </tr>
                                        <tr>
                                            <th>IFSC Code:</th>
                                            <td>{bankDetails?.ifsc_code || 'Not set'}</td>
                                        </tr>
                                        <tr>
                                            <th>Branch Name:</th>
                                            <td>{bankDetails?.branch_name || 'Not set'}</td>
                                        </tr>
                                        <tr>
                                            <th>UPI Id</th>
                                            <td>{bankDetails?.upi_id || 'Not set'}</td>
                                        </tr>
                                    </table>
                                    
                                </Card.Body>
                            </Card> */}
                        </Col>
                    </Row>
                    <CustomToast ref={toastRef} />
                </Row>
            </Row>


            {/* -- Modal part ---*/}
            <Dialog header="Personal Informations" visible={visibleModal1} style={{ width: '50vw' }} onHide={() => {
                setVisibleModal1(false);
            }}>
                {visibleModal1 && <Personalinformations userId={user_id} personalInfo={userDetails} page_name={PAGE_NAME} setVisibleModal1={setVisibleModal1} />}
            </Dialog>

            <Dialog header="Profile Information" aria-labelledby="proIn" visible={visibleModal2} style={{ width: '50vw' }} onHide={() => {
                setVisibleModal2(false);
            }}>
                {visibleModal2 && <Profileinformation userId={user_id} IdentificationInfo={IdentificationInfo} page_name={PAGE_NAME} setVisibleModal2={setVisibleModal2} />}
            </Dialog>



            <Dialog
                header="Emergency Contacts"
                visible={visibleModal3}
                style={{ width: '50vw' }}
                onHide={() => {
                    setVisibleModal3(false);
                }}
            >
                {visibleModal3 && (
                    <Emergencycontact
                        userId={user_id}
                        emergencyContact={emergencyContacts} // Correct prop name
                        page_name={PAGE_NAME}
                        setVisibleModal3={setVisibleModal3}
                    />
                )}
            </Dialog>


            <Dialog header="Bank Information" visible={visibleModal4} style={{ width: '50vw' }} onHide={() => {
                setVisibleModal4(false);
            }}>
                {visibleModal4 && <Bankinformation userId={user_id} bankDetails={bankDetails} page_name={PAGE_NAME} setVisibleModal4={setVisibleModal4} />}
            </Dialog>


            <Dialog header="Upload " aria-labelledby="proIn" visible={visibleModal5} style={{ width: '40vw' }} onHide={() => {
                setVisibleModal5(false);
                fetchDocuments(); // Fetch data on close
            }}>
                {visibleModal5 && <AddDocuments userId={user_id} />}
            </Dialog>


            <Dialog header="Edit Businesses" visible={showBusinessDialog} style={{ width: '350px' }} onHide={() => { if (!showBusinessDialog) return; setShowBusinessDialog(false); }}>
                {showBusinessDialog && <EditUserBusinesses user_id={user_id} page_name={PAGE_NAME} onClose={() => setShowBusinessDialog(false)}
                    initialSelectedBusinesses={userBusinesses} // 👈 pass from parent
                />}
            </Dialog>

            <Dialog header="Edit Airports" visible={showAirportDialog} style={{ width: '350px' }} onHide={() => { if (!showAirportDialog) return; setShowAirportDialog(false); }}>
                {showAirportDialog && <EditUserAirports user_id={user_id} page_name={PAGE_NAME} onClose={() => setShowAirportDialog(false)}
                    initialSelectedAirports={userAirports} // 👈 send from parent
                />}
            </Dialog>



        </>
    )
};

export default EmployeeEdit;