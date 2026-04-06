import { AutoComplete } from 'primereact/autocomplete';
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from 'primereact/dialog';
import { Dropdown } from "primereact/dropdown";
import { InputText } from 'primereact/inputtext';
import { Sidebar } from 'primereact/sidebar';
import { Tag } from "primereact/tag";
import React, { useEffect, useState } from "react";
import { Breadcrumb, Card, Col, Row, Table } from 'react-bootstrap';
import { IoChevronBackOutline } from "react-icons/io5";
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import api from "../../api/axios";
import logoImage from '../../assets/images/logo.png';
import { useAuth } from "../../context/AuthContext";
import { getSocket } from "../../context/socket";
import GifLoder from '../../interfaces/GifLoder';
import AgreementBodyHtml from '../../components/AgreementBodyHtml';
const SGHA_List = () => {
    const navigate = useNavigate(); // Initialize the navigate function
    const { roleId, userId } = useAuth(); // Get roleId from the context
    const PAGE_NAME = "SGHA Agreement"; // Page name for permission checking
    const [unauthorized, setUnauthorized] = useState(false); // Show Dialog if error
    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState([]);
    const socket = getSocket();
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [showDialog, setShowDialog] = useState(false);
    const goBack = () => {
        navigate(-1); // This will take the user back to the previous page in history
    };
    const [visible, setVisible] = useState(false);



    
    useEffect(() => {
        if (!socket) return;

        const fetchTemplates = () => {
            setLoading(true); // Start loading
            socket.emit("fetch-all-sgh-agreement-templates", {
                role_id: roleId,
                page_name: PAGE_NAME,
            });
        };

        fetchTemplates();

        socket.on("sgh-agreement-templates-data", ({ templates }) => {
            setTemplates(templates);
            setLoading(false); // Stop loading on success
        });

        socket.on("sgh-agreement-templates-fetch-error", ({ message }) => {
            const isPermissionError =
                message?.includes("Missing role_id") ||
                message?.includes("Permission denied") ||
                message?.includes("Page");

            if (isPermissionError) {
                setUnauthorized(true);
            }

            console.error("Error fetching template details:", message);
            setLoading(false); // Stop loading on error
        });

        socket.on("sgh-agreement-templates-updated", () => {
            fetchTemplates();
        });

        return () => {
            socket.off("sgh-agreement-templates-data");
            socket.off("sgh-agreement-templates-fetch-error");
            socket.off("sgh-agreement-templates-updated");
        };
    }, [socket, roleId]);

    const statusBody = (rowData) => {
        const status = rowData.status;

        const getSeverity = () => {
            switch (status) {
                case 'Approved':
                    return 'success';
                case 'Rejected':
                    return 'danger';
                case 'Submitted':
                    return 'info';
                case 'Sent':
                    return 'warning';
                case 'Draft':
                default:
                    return 'secondary';
            }
        };

        return <Tag value={status} severity={getSeverity()} />;
    };

    const templateNameBody = (rowData) => <strong>{rowData.template_name}</strong>;

    const letterTemplateBody = (rowData) =>
        rowData.mainAgreement?.template_name || <Tag severity="danger">Missing</Tag>;

    const clientBody = (rowData) => {
        const client = rowData.client;
        if (!client) return <Tag severity="danger">Missing</Tag>;

        return (
            <div>
                <div><strong>{client.name}</strong></div>
                <small>{client.city}, {client.country}</small>
            </div>
        );
    };

    const businessBody = (rowData) => {
        const business = rowData.business;
        if (!business) return <Tag severity="danger">Missing</Tag>;

        return (
            <div>
                <div><strong>{business.name}</strong></div>
                <small>Contact: {business.contact_person}</small>
            </div>
        );
    };




    // const annexureNameBody = (rowData) =>
    //     rowData.annexure?.annexure_template_name || <Tag severity="danger">Missing</Tag>;

    const actionsBody = (rowData) => (
        <div className="d-flex gap-2">
            <Button
                icon="pi pi-eye"
                severity="help"
                text
                tooltip="View"
                tooltipOptions={{ position: "top" }}
                className="border-0 p-0"
                onClick={() => {
                    setSelectedTemplate(rowData);
                    setShowDialog(true);
                }}
            />
            {rowData.status !== 'Sent' && (
                <Button
                    icon="pi pi-send"
                    severity="success"
                    text
                    tooltip="Send"
                    tooltipOptions={{ position: "top" }}
                    className="border-0 p-0"
                    onClick={() => handleSendTemplate(rowData)}
                />
            )}
        </div>
    );


    const renderDialogContent = () => {
        if (!selectedTemplate) return null;

        // const { template_name, letterTemplate, annexure } = selectedTemplate;
        const { mainAgreement, business, client } = selectedTemplate;
        return (
            <div className="p-2">
                {mainAgreement ? (
                    <div className="letterTable">
                        <div className="d-flex justify-content-between align-items-center py-3 mb-3">
                            <h4 className='text-black'>{mainAgreement?.template_name}</h4>
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
                                        <b className='mb-0' style={{ borderBottom: "1px solid #ccc", paddingBottom: "5px" }}>{client?.name}</b>
                                    </td>
                                </tr>
                                <tr>
                                    <td colSpan={2} className='d-flex align-items-center gap-2'>
                                        <span>having its principal office at·</span>
                                        <b className='mb-0' style={{ borderBottom: "1px solid #ccc", paddingBottom: "5px" }}>{client?.city}, {client?.country}</b>
                                    </td>
                                </tr>
                                <tr>
                                    <td colSpan={2}>hereinafter referred to as the 'Carrier' or the 'Handling Company' as the case may be,</td>
                                </tr>
                                <tr>
                                    <td colSpan={2} className='d-flex align-items-center gap-2'>
                                        <span>and:</span>
                                        <b className='mb-0' style={{ borderBottom: "1px solid #ccc", paddingBottom: "5px" }}>{business?.name}</b>
                                    </td>
                                </tr>
                                <tr>
                                    <td colSpan={2} className='d-flex align-items-center gap-2'>
                                        <span>having its principal office at·</span>
                                        <b className='mb-0' style={{ borderBottom: "1px solid #ccc", paddingBottom: "5px" }}>{business?.city}, {business?.country}</b>
                                    </td>
                                </tr>
                                <tr>
                                    <td colSpan={2}>
                                        hereinafter referred to as the 'Handling Company' or the 'Carrier', as the case may be,
                                        the Carrier and/or the Handling Company may hereinafter be referred to as the "Party(ies)" Whereby all the parties agree as follows:
                                    </td>
                                </tr>
                                {mainAgreement.sections &&
                                    mainAgreement.sections.length > 0 ? (
                                    mainAgreement.sections
                                        .sort((a, b) => a.section_order - b.section_order) // Ensure sections are rendered in order
                                        .map((section) => (
                                            <tr key={section.section_id}>
                                                <td colSpan={2}>
                                                    <h6>{section.section_heading}</h6>
                                                    <AgreementBodyHtml content={section.section_body} />
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
                                            <span>Signed the</span> <span style={{ borderBottom: "1px solid #ccc", width: "calc(100% - 80px)" }}></span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className='d-flex align-items-center gap-2'>
                                            <span>Signed the</span> <span style={{ borderBottom: "1px solid #ccc", width: "calc(100% - 80px)" }}></span>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div className='d-flex align-items-center gap-2'>
                                            <span>at</span> <span style={{ borderBottom: "1px solid #ccc", width: "calc(100% - 20px)" }}></span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className='d-flex align-items-center gap-2'>
                                            <span>at</span> <span style={{ borderBottom: "1px solid #ccc", width: "calc(100% - 20px)" }}></span>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div className='d-flex align-items-center gap-2'>
                                            <span>for and on behalf of</span> <span style={{ borderBottom: "1px solid #ccc", width: "calc(100% - 130px)" }}></span>
                                        </div>

                                    </td>
                                    <td>
                                        <div className='d-flex align-items-center gap-2'>
                                            <span>for and on behalf of</span> <span style={{ borderBottom: "1px solid #ccc", width: "calc(100% - 130px)" }}></span>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div className='d-flex align-items-center gap-2'>
                                            <span>by</span> <span style={{ borderBottom: "1px solid #ccc", width: "calc(100% - 20px)" }}></span>
                                        </div>

                                    </td>
                                    <td>
                                        <div className='d-flex align-items-center gap-2'>
                                            <span>by</span> <span style={{ borderBottom: "1px solid #ccc", width: "calc(100% - 20px)" }}></span>
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
            </div>
        );
    };


// const renderDialogContent = () => {
//     if (!selectedTemplate) return null;

//     const { letterTemplate, business, client } = selectedTemplate;

//     return (
//         <div className="p-2">
//             {letterTemplate ? (
//                 <HTMLFlipBook
//                     width={600}
//                     height={800}
//                     size="stretch"
//                     minWidth={315}
//                     maxWidth={1000}
//                     minHeight={400}
//                     maxHeight={1536}
//                     drawShadow={true}
//                     showCover={false}
//                     mobileScrollSupport={true}
//                     className="letter-flipbook"
//                 >
//                     {/* Page 1: Header & Parties */}
//                     <div className="page p-4">
//                         <div className="letterTable">
//                             <div className="d-flex justify-content-between align-items-center py-3 mb-3">
//                                 <h4 className='text-black'>{letterTemplate?.template_name}</h4>
//                                 <span className="d-block">
//                                     <img
//                                         src={logoImage}
//                                         alt="brand-logo"
//                                         style={{ width: "80px" }}
//                                     />
//                                 </span>
//                             </div>

//                             <p><strong>Agreement Between:</strong> {client?.name}</p>
//                             <p>Address: {client?.city}, {client?.country}</p>

//                             <p><strong>And:</strong> {business?.name}</p>
//                             <p>Address: {business?.city}, {business?.country}</p>
//                         </div>
//                     </div>

//                     {/* Pages for Sections */}
//                     {letterTemplate.sections
//                         ?.sort((a, b) => a.section_order - b.section_order)
//                         ?.map((section) => (
//                             <div className="page p-4" key={section.section_id}>
//                                 <div className="letterTable">
//                                     <h6 className="mb-2 text-primary">{section.section_heading}</h6>
//                                     <div
//                                         className="mb-3"
//                                         dangerouslySetInnerHTML={{ __html: section.section_body }}
//                                     />
//                                 </div>
//                             </div>
//                         ))}

//                     {/* Signature Page */}
//                     <div className="page p-4">
//                         <div className="letterTable">
//                             <h6 className="text-decoration-underline mb-3">Signatures</h6>
//                             <p>Signed by __________ at __________</p>
//                             <p>On behalf of __________ by __________</p>
//                             <div className="text-end mt-4">
//                                 <small>People. Passion. Pride. Since 1833</small>
//                             </div>
//                         </div>
//                     </div>
//                 </HTMLFlipBook>
//             ) : (
//                 <p>No template data available</p>
//             )}
//         </div>
//     );
// };






    /*----------------Add SGHA Template Dialog----------------*/

    const [templateName, setTemplateName] = useState('');
    // Letter Template
    const [letterQuery, setLetterQuery] = useState('');
    const [letterSuggestions, setLetterSuggestions] = useState([]);
    const [selectedLetter, setSelectedLetter] = useState(null);

    const [businesses, setBusinesses] = useState([]);
    const [selectedBusiness, setSelectedBusiness] = useState(null);

    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);

    useEffect(() => {
        socket.on('search-letter-template-success', ({ letterTemplates }) => {
            setLetterSuggestions(letterTemplates.map(t => ({
                label: t.template_name,
                value: t.template_id
            })));
        });

        socket.on('search-letter-template-error', ({ message }) => {
            const isPermissionError =
                message?.includes("Missing role_id") ||
                message?.includes("Permission denied") ||
                message?.includes("Page");

            if (isPermissionError) {
                setUnauthorized(true);
            }

            console.error("Error fetching template details:", message);

        });

        socket.on('sgh-agreement-template-add-success', () => {
            setTemplateName('');
            setSelectedLetter(null);
            setVisible(false);
        });

        socket.on('sgh-agreement-template-add-error', (err) => {
            const isPermissionError =
                err?.includes("Missing role_id") ||
                err?.includes("Permission denied") ||
                err?.includes("Page");

            if (isPermissionError) {
                setUnauthorized(true);
            }

            console.error("Error fetching template details:", err);
        });


        return () => {
            socket.off('search-letter-template-success');
            socket.off('search-letter-template-error');
            socket.off('sgh-agreement-template-add-success');
            socket.off('sgh-agreement-template-add-error');
        };
    }, [socket]);

    const searchLetterTemplates = (e) => {
        setLetterQuery(e.query);

        socket.emit('search-letter-template', {
            searchTerm: e.query,
            role_id: roleId, // Replace with actual role value
            page_name: PAGE_NAME, // Set appropriate page name
        });
    };


    useEffect(() => {
        if (socket) {
            socket.emit('fetch-businesses', {
                role_id: roleId,
                page_name: PAGE_NAME,
                user_id: userId
            });

            socket.on('fetch-businesses-success', (data) => {
                const formatted = data.map(b => ({
                    name: b.name,
                    code: b.business_id
                }));
                setBusinesses(formatted);
            });

            socket.on('fetch-businesses-error', (error) => {
                console.error('Business fetch error:', error.message);

                // Inline permission handling (your pattern)
                const isPermissionError =
                    error.message?.includes('Missing role_id') ||
                    error.message?.includes('Page') ||
                    error.message?.includes('Permission denied');

                if (isPermissionError) {
                    setUnauthorized(true);
                } else {
                    setBusinesses([]); // optional: preserve or clear
                    console.warn('Server error, not unauthorized:', error.message);
                }
            });

            return () => {
                socket.off('fetch-businesses-success');
                socket.off('fetch-businesses-error');
            };
        }
    }, [socket, userId, roleId]);

    useEffect(() => {
        if (!selectedBusiness || !socket) return;
        socket.emit("fetch-clients-by-only-business", {
            role_id: roleId,
            page_name: PAGE_NAME,
            business_id: selectedBusiness,
        });

        socket.on("fetch-clients-by-only-business-success", (data) => {
            const formatted = data.map((c) => ({
                name: c.name,
                code: c.client_id,
            }));
            setClients(formatted);
        });

        socket.on("fetch-clients-by-only-business-error", (error) => {
            console.error("Client fetch error:", error.message);

            const isPermissionError =
                error.message?.includes("Missing role_id") ||
                error.message?.includes("Page") ||
                error.message?.includes("Permission denied");

            if (isPermissionError) {
                setUnauthorized(true);
            } else {
                setClients([]);
            }

        });

        return () => {
            socket.off("fetch-clients-by-only-business-success");
            socket.off("fetch-clients-by-only-business-error");
        };
    }, [socket, selectedBusiness, roleId]);





    const handleSubmit = () => {
        if (!templateName || !selectedLetter?.value) {
            alert('Please fill all fields');
            return;
        }

        socket.emit('add-sgh-agreement-template', {
            template_name: templateName,
            letter_template_id: selectedLetter.value,
            business_id: selectedBusiness,
            client_id: selectedClient,
            role_id: roleId,
            page_name: PAGE_NAME,
        });

    };


    const handleSendTemplate = async (template) => {
        if (!template?.SGHA_template_id) {
            return;
        }

        try {
            // Optional: show loading indicator here
            setLoading(true);

            const response = await api.post(
                `/sgha/send-sgha/${template.SGHA_template_id}/${PAGE_NAME}`
            );
            if (response.status === 201) {
                setSelectedTemplate(null);
                setLoading(false);
            }

        } catch (error) {
            console.error('Error sending template:', error);
            if (error.response?.status === 403) {
                setUnauthorized(true);
            }
        } finally {
            setLoading(false);
        }
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
            <Row className='mb-4'>
                <Col md={12} lg={6}>
                    <Breadcrumb>
                        <Breadcrumb.Item onClick={goBack}>
                            <IoChevronBackOutline /> Back
                        </Breadcrumb.Item>
                        <Breadcrumb.Item active>SGH Agreement Templates</Breadcrumb.Item>
                    </Breadcrumb>
                </Col>
                <Col md={12} lg={6} className="text-end">
                    <Button
                        label="SGHA Template"
                        icon="pi pi-plus"
                        className="py-2"
                        severity='help'
                        style={{ fontSize: '14px' }}
                        onClick={() => navigate('/dashboard/createSGHATemplate')}
                    />
                </Col>
            </Row>
            <Card className="shadow-sm border-0 p-0">
                <DataTable
                    value={templates}
                    paginator
                    rows={10}
                    stripedRows
                    responsiveLayout="scroll"
                    emptyMessage="No SGH Agreement Templates found."
                >
                    <Column header="Sl.No" body={(_, { rowIndex }) => rowIndex + 1} style={{ width: "120px" }} />
                    <Column field="template_name" header="Template Name" body={templateNameBody} />
                    <Column header="Main Agreement Template" body={letterTemplateBody} />
                    <Column header="Client" body={clientBody} />
                    <Column header="Business" body={businessBody} />
                    <Column header="Status" body={statusBody} />
                    {/* <Column header="Annexure" body={annexureNameBody} /> */}
                    <Column header="Actions" body={actionsBody} style={{ width: "120px" }} />
                </DataTable>
            </Card>

            <Sidebar position="right"
                style={{ width: "70vw" }}
                visible={showDialog}
                onHide={() => setShowDialog(false)}
                breakpoints={{ '960px': '95vw' }}
            >
                {renderDialogContent()}
            </Sidebar>
            <Dialog header="Add SGH Agreement Template" visible={visible} style={{ width: '360px' }} onHide={() => { if (!visible) return; setVisible(false); }}>

                <div>
                    <label className="block mb-2">Template Name</label>
                    <InputText
                        className="w-100"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block mb-2">Letter Template</label>
                    <AutoComplete
                        value={selectedLetter}
                        suggestions={letterSuggestions}
                        completeMethod={searchLetterTemplates}
                        field="label"
                        onChange={(e) => setSelectedLetter(e.value)}
                        placeholder="Search Letter Template"
                        className="w-100"
                    />
                </div>
                <div>
                    <label className="block mb-2">Business</label>
                    <Dropdown
                        value={selectedBusiness}
                        onChange={(e) => {
                            const businessId = e.value;
                            setSelectedBusiness(businessId);
                            setSelectedClient(null); // Reset client when business changes
                            setClients([]);          // Clear client options when switching
                        }}
                        options={businesses}
                        optionLabel="name"
                        optionValue="code"
                        placeholder="Select a Headquarter"
                        className="w-100"
                    />

                </div>
                <div>
                    <label className="block mb-2">Client</label>
                    {selectedBusiness && (
                        <Dropdown
                            value={selectedClient}
                            onChange={(e) => {
                                const clientId = e.value;
                                setSelectedClient(clientId);
                            }}
                            options={clients}
                            optionLabel="name"
                            optionValue="code"
                            placeholder={selectedBusiness ? "Select Client" : "Select Business First"}
                            className="w-100"
                            disabled={!selectedBusiness || loading}
                        />
                    )}

                </div>

                <div className="d-flex justify-content-end">
                    <Button
                        label="Create SGHA Template"
                        severity="warning"
                        style={{ fontSize: '14px' }}
                        onClick={() => navigate('/dashboard/createSGHATemplate')}
                        className="py-2 mt-4 border-0 text-white"

                    />
                </div>
            </Dialog>

        </>
    );
};


export default SGHA_List;
