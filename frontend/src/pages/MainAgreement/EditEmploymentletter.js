import React, { useEffect, useState } from 'react';
import { Col, Row, Card, Breadcrumb, Form, Table } from 'react-bootstrap';
import { Button } from 'primereact/button';
import { Editor } from 'primereact/editor';
import { useParams, useNavigate } from 'react-router-dom';
import logoImage from '../../assets/images/logo.png';
import { useAuth } from '../../context/AuthContext';
import successVideo from '../../assets/video/paperplane.mp4';
import crossVideo from '../../assets/video/cross.mp4';
import { Dialog } from "primereact/dialog";
import { getSocket } from '../../context/socket';
import { IoChevronBackOutline } from "react-icons/io5";
import GifLoder from '../../interfaces/GifLoder';
const EditEmploymentletter = () => {
      const navigate = useNavigate(); // Initialize the navigate function
      const { roleId} = useAuth(); // Get roleId from the context
      const PAGE_NAME = "Main Agreement Template"; // Page name for permission checking
      const [unauthorized, setUnauthorized] = useState(false); // Show Dialog if error
        const goBack = () => {
        navigate(-1); // This will take the user back to the previous page in history
      };
    const socket = getSocket();
    const { template_id } = useParams();
    const [loading, setLoading] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [sections, setSections] = useState([]);

    const [videoDialogVisible, setVideoDialogVisible] = useState(false); // New state for video dialog
    const [videocrossDialogVisible, setVideocrossDialogVisible] = useState(false); // New state for video dialog

    useEffect(() => {

        if (template_id) {
            fetchTemplate(template_id);
        }
    }, [template_id]);

    const fetchTemplate = (template_id) => {
        setLoading(true);

        // Emit request to fetch template
        socket.emit('fetch-letter-template-by-id',{template_id, role_id: roleId, page_name: PAGE_NAME});

        // Listen for success
        socket.once('fetch-letter-template-success', (data) => {
            const { template_name,  sections } = data;
            setTemplateName(template_name);
            setSections(sections);
            setLoading(false);
        });

        // Listen for errors
        socket.once('fetch-letter-template-error', (error) => {
                const isPermissionError =
                error.message?.includes('Missing role_id') ||
                error.message?.includes('Permission denied') ||
                error.message?.includes('Page');

                if (isPermissionError) {
                setUnauthorized(true);
                } else {
                setSections([]);

                }

                console.error('Error fetching template data:', error);
                setLoading(false);
            });

    };



    // Handle changes to section fields
    const handleSectionChange = (index, field, value) => {
        const updatedSections = [...sections];
        updatedSections[index][field] = value;
        setSections(updatedSections);
    };

    // Add a new section
    const handleAddSection = () => {
        setSections([
            ...sections,
            { section_heading: '', section_body: '', section_order: sections.length + 1 },
        ]);
    };

    // Remove a section
    const handleRemoveSection = (index) => {
        const updatedSections = sections.filter((_, i) => i !== index);
        setSections(updatedSections);
    };

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();

        const payload = {
            template_id: template_id, // only if you're editing, can be undefined/null for new
            template_name: templateName,
            sections: sections,
            role_id: roleId,
            page_name: PAGE_NAME,
        };

        socket.emit('create-or-update-letter-template', payload);

        socket.once('letter-template-success', (res) => {
            console.log(res.message);
            setVideoDialogVisible(true);

            setTimeout(() => {
                setVideoDialogVisible(false);
                navigate('/dashboard/view_agreement');
            }, 5000);
        });

         socket.once('letter-template-error', (error) => {
            const isPermissionError =
            error.message?.includes('Missing role_id') ||
            error.message?.includes('Permission denied') ||
            error.message?.includes('Page');

            if (isPermissionError) {
            setUnauthorized(true); // Trigger unauthorized UI
            } else {

            setVideocrossDialogVisible(true);

            setTimeout(() => {
                setVideocrossDialogVisible(false);
            }, 5000);
            }

            console.error('Socket error saving letter template:', error);
            setLoading(false);
        });
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
                    <Col sm={12} lg={12} className="mb-4">
                        <Breadcrumb>
                        <Breadcrumb.Item onClick={goBack}>
                            <IoChevronBackOutline /> Back
                        </Breadcrumb.Item>
                            <Breadcrumb.Item active>Employment Letter</Breadcrumb.Item>
                        </Breadcrumb>
                    </Col>
                    <Col sm={12} lg={6}>
                        <Card className="shadow-0 sticky-top letterForm addEm">
                            <Card.Header className='h6 d-flex justify-content-between align-items-center'>
                                Letter Details
                                <Button type="submit" icon="pi pi-save" label="Save" severity="primary" onClick={handleSubmit} />

                            </Card.Header>
                            <Card.Body style={{ height: '72vh', overflow: 'auto' }}>
                                <Form >

                                    <Form.Group className="mb-3">
                                        <Form.Label htmlFor="templateName">Template Name</Form.Label>
                                        <Form.Control
                                            type="text"
                                            id="templateName"
                                            value={templateName}
                                            onChange={(e) => setTemplateName(e.target.value)}
                                        />
                                    </Form.Group>

                                    {sections.map((section, index) => (
                                        <React.Fragment key={index}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className='d-flex justify-content-between align-items-center'>
                                                    Section {index + 1} Heading
                                                    <Button
                                                        type="button"
                                                        title="Remove Section"
                                                        severity="danger"
                                                        icon="pi pi-trash"
                                                        onClick={() => handleRemoveSection(index)}
                                                        outlined
                                                        className="border-0 rounded-0"
                                                    />
                                                </Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    value={section.section_heading}
                                                    onChange={(e) =>
                                                        handleSectionChange(index, 'section_heading', e.target.value)
                                                    }
                                                />
                                            </Form.Group>
                                            <Form.Group className="mb-3">
                                                <Form.Label>Section {index + 1} Body</Form.Label>
                                                <Editor
                                                    value={section.section_body}
                                                    onTextChange={(e) =>
                                                        handleSectionChange(index, 'section_body', e.htmlValue)
                                                    }
                                                    style={{ height: '200px' }}
                                                />
                                            </Form.Group>

                                        </React.Fragment>
                                    ))}
                                </Form>
                                <div className='d-flex justify-content-start sticky-top bg-white pt-2'>
                                    <Button
                                        type="button"
                                        label="Section"
                                        severity='help'
                                        icon="pi pi-plus"
                                        onClick={handleAddSection}
                                        outlined
                                        className="mb-4 py-2"
                                    />
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col sm={12} lg={6} className="h-auto">
                        <Card className='h-auto'>
                            <Card.Body className="letterTable pb-0" style={{ height: '72vh', overflow: 'auto' }}>
                                <Table border={0}>
                                    <thead>
                                        <tr>
                                            <td>
                                                <img src={logoImage} alt="brand-logo" style={{ width: '120px' }} />
                                            </td>
                                        </tr>
                                    </thead>
                                    <tbody>

                                        {sections.map((section, index) => (
                                            <tr key={index}>
                                                <td>
                                                    <h5>{section.section_heading}</h5>
                                                    <div dangerouslySetInnerHTML={{ __html: section.section_body }}></div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Row>
            <Dialog visible={videoDialogVisible} className='fadeInUp_dilog'
                onHide={() => setVideoDialogVisible(false)} style={{ width: '320px' }} closable={false}>
                <video src={successVideo} autoPlay loop muted style={{ width: '100%' }} />
                <h6 className="text-center mt-0 fadeInUp">Process Completed <span className='text-success'>Successfully</span></h6>
            </Dialog>


            <Dialog visible={videocrossDialogVisible} className='fadeInUp_dilog'
                onHide={() => setVideoDialogVisible(false)} style={{ width: '320px' }} closable={false}>
                <video src={crossVideo} autoPlay loop muted style={{ width: '100%' }} />
                <h6 className="text-center mt-0 fadeInUp">Process <span className='text-danger'>Denied</span></h6>
            </Dialog>
        </>
    );
};

export default EditEmploymentletter;
