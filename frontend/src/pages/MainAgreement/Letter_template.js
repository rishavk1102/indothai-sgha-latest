import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Breadcrumb, Table, Card } from 'react-bootstrap'; // Added Button import
import { DataTable } from 'primereact/datatable';
import { IoChevronBackOutline } from "react-icons/io5";
import { Column } from 'primereact/column';
import CustomToast from '../../components/CustomToast';
import { Button } from 'primereact/button'; // Import PrimeReact Button
import { Link } from 'react-router-dom';
import CustomConfirmPopup from '../../components/CustomConfirmPopup';
import { Dialog } from 'primereact/dialog'; // Import PrimeReact Dialog
import logoImage from '../../assets/images/logo.png';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { useAuth } from '../../context/AuthContext';
import successVideo from '../../assets/video/paperplane.mp4';
import crossVideo from '../../assets/video/cross.mp4';
import { getSocket } from '../../context/socket';
import GifLoder from '../../interfaces/GifLoder';
import { Sidebar } from 'primereact/sidebar';

const Letter_template = () => {
  const navigate = useNavigate(); // Initialize the navigate function
  const {roleId} = useAuth(); // Get roleId from the context
  const PAGE_NAME = "Main Agreement Template"; // Page name for permission checking
  const [unauthorized, setUnauthorized] = useState(false); // Show Dialog if error
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const toastRef = useRef(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null); // State for the selected template data
  const [dialogVisible, setDialogVisible] = useState(false); // Dialog visibility 
    const goBack = () => {
    navigate(-1); // This will take the user back to the previous page in history
  };
const showMessage = (severity, detail) => {
  const summary = severity.charAt(0).toUpperCase() + severity.slice(1);
  if (toastRef.current) {
    toastRef.current.show({ severity, summary, detail });
  }
};


  const [videoDialogVisible, setVideoDialogVisible] = useState(false); // New state for video dialog
  const [videocrossDialogVisible, setVideocrossDialogVisible] = useState(false); // New state for video dialog
  const socket = getSocket();


  // Function to fetch letter templates from API
  const fetchLetterTemplates = () => {
  setLoading(true);

  socket.emit('fetch-all-letter-templates', {
    role_id: roleId,
    page_name: PAGE_NAME,
  });

  // Clean up existing listeners before adding new ones
  socket.off('letter-templates-fetched');
  socket.off('letter-templates-error');

  socket.on('letter-templates-fetched', (data) => {
    setTemplates(data.templates);
    setError('');
    showMessage('success', 'Letter templates fetched successfully');
    setLoading(false);
  });

  socket.on('letter-templates-error', (error) => {
    const isPermissionError =
      error.message?.includes('Missing role_id') ||
      error.message?.includes('Permission denied') ||
      error.message?.includes('Page');

    if (isPermissionError) {
      setUnauthorized(true);
    } else {
      setError('Error fetching letter templates. Please try again.');
      showMessage('error', 'Error fetching letter templates. Please try again.');
    }

    console.error('Socket error fetching templates:', error);
    setLoading(false);
  });
};



  const fetchTemplateDetails = (templateId) => {
    socket.emit('fetch-letter-template-by-id', {
      template_id: templateId,
      role_id: roleId, // from useAuth()
      page_name: PAGE_NAME, // or whatever page name you're checking permissions for
    });

    socket.once('fetch-letter-template-success', (data) => {
      setSelectedTemplate(data);
      setDialogVisible(true); // Show dialog with template
    });

    socket.once('fetch-letter-template-error', (error) => {
      const isPermissionError =
      error.message?.includes('Missing role_id') ||
      error.message?.includes('Permission denied') ||
      error.message?.includes('Page');

    if (isPermissionError) {
      setUnauthorized(true);
    } else {
      showMessage('error', 'Failed to fetch template details. Please try again.');
    }
    console.error('Error fetching template details:', error);
  });
};


  // Fetch templates when the component mounts
useEffect(() => {
  fetchLetterTemplates();

  socket.on('letter-templates-updated', fetchLetterTemplates);

  return () => {
    socket.off('letter-templates-updated', fetchLetterTemplates);
    socket.off('letter-templates-fetched');
    socket.off('letter-templates-error');
  };
}, []);



  // Helper function to format date as dd/mm/yyyy
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Action button click handler
  const handleAction = async (action, templateId) => {
    switch (action) {
      case 'view':
        fetchTemplateDetails(templateId); // Fetch template details and show in dialog
        break;
      case 'edit':
        navigate(`/dashboard/editagreement/${templateId}`); // Navigate to the edit page
        break;
      case 'delete':
         socket.emit('delete-letter-template', {
          template_id: templateId,
          role_id: roleId, // get from useAuth()
          page_name: PAGE_NAME,
        });

        socket.once('delete-letter-template-success', (res) => {
          console.log(res.message);
          setVideoDialogVisible(true);

          setTimeout(() => {
            setVideoDialogVisible(false);
          }, 2000);
        });

        socket.once('delete-letter-template-error', (err) => {
              const isPermissionError =
                err.message?.includes('Missing role_id') ||
                err.message?.includes('Permission denied') ||
                err.message?.includes('Page');

              if (isPermissionError) {
                setUnauthorized(true); // optional state flag
              } else {
                console.error('Error deleting template:', err.message);
                setVideocrossDialogVisible(true);
                setTimeout(() => setVideocrossDialogVisible(false), 3000);
              }
            });

        break;

      default:
        console.log(`Action ${action} not recognized`);
    }
  };

  // Custom action button
  const actionBodyTemplate = (rowData) => {
    return (
      <div>
        <Button
          title="View"
          outlined
          icon="pi pi-eye"
          severity='warning'
          className="p-button-sm border-0"
          onClick={() => handleAction('view', rowData.template_id)}
        />
        <Button
          title="Edit"
          outlined
          icon="pi pi-pencil"
          severity='primary'
          className="p-button-sm border-0"
          onClick={() => handleAction('edit', rowData.template_id)}
        />
        {/* <CustomConfirmPopup
          message="Are you sure you want to duplicate this Template?"
          icon="pi pi-exclamation-triangle"
          defaultFocus="accept"
          acceptClassName='p-button-success'
          buttonLabel="Duplicate"
          title='Duplicate'
          buttonClass="p-button-secondary p-button-text"
          buttonIcon="pi pi-clone"
          onConfirm={() => handleAction('copy', rowData.template_id)}
          onReject={() => console.log('Duplicate action canceled')}
        /> */}

        {/* <Button
                    title="Send"
                    outlined
                    icon="pi pi-send"
                    severity='help'
                    className="p-button-sm border-0"
                    onClick={() => handleAction('send', rowData.template_id)}
                /> */}

        <CustomConfirmPopup
          message="Are you sure you want to Delete this Template?"
          icon="pi pi-exclamation-triangle"
          acceptClassName='p-button-danger'
          defaultFocus="reject"
          title='Delete'
          buttonLabel="Delete"
          buttonClass="p-button-danger p-button-text"
          buttonIcon="pi pi-trash"
          onConfirm={() => handleAction('delete', rowData.template_id)}
          onReject={() => console.log('Duplicate action canceled')}
        />




      </div>
    );
  };

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
      <Row className="body_content">
        <Row className="mx-0">
          <Col md={12} lg={6}>
              <Breadcrumb>
               <Breadcrumb.Item onClick={goBack}>
                    <IoChevronBackOutline /> Back
                </Breadcrumb.Item>
                  <Breadcrumb.Item active>Main Agreement Template List</Breadcrumb.Item>
              </Breadcrumb>
          </Col>
          <Col md={12} lg={6} className="text-end">
                <Link to="/dashboard/addagreement">
                  <Button
                    label="Template"
                    icon="pi pi-plus"
                    className="py-2"
                    severity='help'
                    style={{ fontSize: '14px' }}
                  />
                </Link>
          </Col>


          <Col md={6} lg={12} className="mt-4">
            <Card className='border-0 shadow-sm'>
              <Card.Body className='p-0'>
                {loading ? (
                  <p>Loading data...</p> // Display loading message while fetching
                ) : error ? (
                  <p>{error}</p> // Display error message if fetching fails
                ) : (
                  <DataTable
                    value={templates}
                    sortMode="multiple"
                    tableStyle={{ minWidth: "50rem" }}
                  >
                    <Column
                      field="template_name"
                      header="Template Name"
                      sortable
                    ></Column>
                    <Column
                      field="createdAt"
                      header="Created At"
                      sortable
                      style={{ width: "15%" }}
                      body={(rowData) => formatDate(rowData.createdAt)} // Formatting date
                    ></Column>
                    <Column
                      field="updatedAt"
                      header="Updated At"
                      sortable
                      style={{ width: "15%" }}
                      body={(rowData) => formatDate(rowData.updatedAt)} // Formatting date
                    ></Column>
                    {/* Action column */}
                    <Column
                      header="Actions"
                      body={actionBodyTemplate}
                      style={{ width: "210px" }}
                    ></Column>
                  </DataTable>
                )}
              </Card.Body>
              <CustomToast ref={toastRef} />
            </Card>
          </Col>
        </Row>
      </Row>
      {/* Dialog to display template details */}

      <Sidebar position="right" style={{ width: "70vw"}}
        visible={dialogVisible}
        
        onHide={() => setDialogVisible(false)}
      >
        {selectedTemplate ? (
          <div className="letterTable">
              <div className="d-flex justify-content-between align-items-center py-3 mb-3">
                <h4 className='text-black'>{selectedTemplate?.template_name}</h4>
                <span className="d-block">
                  <img
                    src={logoImage}
                    alt="brand-logo"
                    style={{ width: "80px" }}
                  />
                </span>
              </div>
                <Table bordered-0>
                  <tbody>
                    <tr>
                      <td colSpan={2} className='d-flex align-items-center gap-2'>
                        <span>An Agreement made between :</span> 
                        <b className='mb-0' style={{borderBottom: "1px solid #ccc", paddingBottom: "5px"}}></b>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} className='d-flex align-items-center gap-2'>
                        <span>having its principal office at·</span>
                        <b className='mb-0' style={{borderBottom: "1px solid #ccc", paddingBottom: "5px"}}></b>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2}>hereinafter referred to as the 'Carrier' or the 'Handling Company' as the case may be,</td>
                    </tr>
                    <tr>
                      <td colSpan={2} className='d-flex align-items-center gap-2'>
                        <span>and:</span>
                        <b className='mb-0' style={{borderBottom: "1px solid #ccc", paddingBottom: "5px"}}></b>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} className='d-flex align-items-center gap-2'>
                        <span>having its principal office at·</span>
                         <b className='mb-0' style={{borderBottom: "1px solid #ccc", paddingBottom: "5px"}}></b>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2}>
                        hereinafter referred to as the 'Handling Company' or the 'Carrier', as the case may be,
                        the Carrier and/or the Handling Company may hereinafter be referred to as the "Party(ies)" Whereby all the parties agree as follows:
                      </td>
                    </tr>
                    {selectedTemplate.sections &&
                      selectedTemplate.sections.length > 0 ? (
                      selectedTemplate.sections
                        .sort((a, b) => a.section_order - b.section_order) // Ensure sections are rendered in order
                        .map((section) => (
                          <tr key={section.section_id}>
                            <td colSpan={2}>
                              <h6>{section.section_heading}</h6>
                              <div
                                dangerouslySetInnerHTML={{
                                  __html: section.section_body,
                                }}
                              />
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan={2}>
                          <p>No sections available.</p>
                        </td>
                      </tr>
                    )}

                   
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>
                        <div className='d-flex align-items-center gap-2'>
                            <span>Signed the</span> <span style={{borderBottom: "1px solid #ccc", width: "calc(100% - 80px)"}}></span>
                        </div>
                      </td>
                      <td>
                        <div className='d-flex align-items-center gap-2'>
                          <span>Signed the</span> <span style={{borderBottom: "1px solid #ccc", width: "calc(100% - 80px)"}}></span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div className='d-flex align-items-center gap-2'>
                          <span>at</span> <span style={{borderBottom: "1px solid #ccc", width: "calc(100% - 20px)"}}></span>
                        </div>
                      </td>
                      <td>
                        <div className='d-flex align-items-center gap-2'>
                          <span>at</span> <span style={{borderBottom: "1px solid #ccc", width: "calc(100% - 20px)"}}></span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div className='d-flex align-items-center gap-2'>
                          <span>for and on behalf of</span> <span style={{borderBottom: "1px solid #ccc", width: "calc(100% - 130px)"}}></span>
                        </div>
                        
                      </td>
                      <td>
                        <div className='d-flex align-items-center gap-2'>
                          <span>for and on behalf of</span> <span style={{borderBottom: "1px solid #ccc", width: "calc(100% - 130px)"}}></span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div className='d-flex align-items-center gap-2'>
                          <span>by</span> <span style={{borderBottom: "1px solid #ccc", width: "calc(100% - 20px)"}}></span>
                        </div>
                        
                      </td>
                      <td>
                        <div className='d-flex align-items-center gap-2'>
                          <span>by</span> <span style={{borderBottom: "1px solid #ccc", width: "calc(100% - 20px)"}}></span>
                        </div>
                        
                      </td>
                    </tr>
                    <tr>
                      <td className="text-end" colSpan={2}>
                          <small className='mt-4'>People. Passion. Pride. Since 1833</small>
                      </td>
                    </tr>
                  </tfoot>
                </Table>
          </div>
        ) : (
          <p>No template data available</p>
        )}
      </Sidebar>

      <Dialog
        visible={videoDialogVisible}
        className="fadeInUp_dilog"
        onHide={() => setVideoDialogVisible(false)}
        style={{ width: "320px" }}
        closable={false}
      >
        <video
          src={successVideo}
          autoPlay
          loop
          muted
          style={{ width: "100%" }}
        />
        <h6 className="text-center mt-0 fadeInUp">
          Process Completed <span className="text-success">Successfully</span>
        </h6>
      </Dialog>

      <Dialog
        visible={videocrossDialogVisible}
        className="fadeInUp_dilog"
        onHide={() => setVideoDialogVisible(false)}
        style={{ width: "320px" }}
        closable={false}
      >
        <video
          src={crossVideo}
          autoPlay
          loop
          muted
          style={{ width: "100%" }}
        />
        <h6 className="text-center mt-0 fadeInUp">
          Process <span className="text-danger">Denied</span>
        </h6>
      </Dialog>
    </>
  );
};

export default Letter_template;