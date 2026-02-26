import React, { useState, useEffect } from "react";
import { getSocket } from "../../context/socket";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { Row, Col, Breadcrumb, Card, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { Dialog } from 'primereact/dialog';
import { AutoComplete } from 'primereact/autocomplete';
import { InputText } from 'primereact/inputtext';
import logoImage from '../../assets/images/logo.png';
import { useAuth } from "../../context/AuthContext";
import { Dropdown } from "primereact/dropdown";
import api from "../../api/axios";
import GifLoder from '../../interfaces/GifLoder';
import { IoChevronBackOutline } from "react-icons/io5";
import { Sidebar } from 'primereact/sidebar';
const ClientSGHA_List = () => {
    const navigate = useNavigate(); // Initialize the navigate function
    const { roleId, userId } = useAuth(); // Get roleId from the context
    const PAGE_NAME = "SGHA Agreement list"; // Page name for permission checking
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
        if (!socket || !userId) return;

        const fetchTemplates = () => {
            setLoading(true);
            socket.emit("fetch-sent-sgha-by-registration", {
                client_registration_id: userId, // assuming userId === client_registration_id
            });
        };

        fetchTemplates();

        // Handle successful fetch
        socket.on("fetch-sent-sgha-by-registration-success", ({ agreements }) => {
            setTemplates(agreements);
            setUnauthorized(false);
            setLoading(false);
        });

        // Handle fetch error
        socket.on("fetch-sent-sgha-by-registration-error", ({ message }) => {
            const isPermissionError =
                message?.includes("Missing") ||
                message?.includes("Permission denied") ||
                message?.includes("registration");

            if (isPermissionError) {
                setUnauthorized(true);
            }

            console.error("❌ Error fetching SGHA templates:", message);
            setLoading(false);
        });

        // Refetch if an update event matches the current user's registration ID
        socket.on("sgh-agreement-client-update", ({ client_id }) => {
            if (client_id === userId) {
                fetchTemplates();
            }
        });

        return () => {
            socket.off("fetch-sent-sgha-by-registration-success");
            socket.off("fetch-sent-sgha-by-registration-error");
            socket.off("sgh-agreement-client-update");
        };
    }, [socket, userId]);


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
            {/* {!rowData.status === 'Sent' && (
                <Button
                    icon="pi pi-send"
                    severity="success"
                    text
                    tooltip="Send"
                    tooltipOptions={{ position: "top" }}
                    className="border-0 p-0"
                    onClick={() => handleSendTemplate(rowData)}
                />
            )} */}
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
                        <Breadcrumb.Item active>SGH Agreement List</Breadcrumb.Item>
                    </Breadcrumb>
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
                    <Column header="Agreement Content" body={letterTemplateBody} />
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
        </>
    );
};


export default ClientSGHA_List;