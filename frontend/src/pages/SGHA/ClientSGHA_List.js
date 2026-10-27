import React, { useState, useEffect, useRef, useCallback } from "react";
import { getSocket } from "../../context/socket";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { Row, Col, Card } from 'react-bootstrap';
import { AutoComplete } from 'primereact/autocomplete';
import { InputText } from 'primereact/inputtext';
import { useAuth } from "../../context/AuthContext";
import GifLoder from '../../interfaces/GifLoder';
import SentAgreementLetterView from '../../components/SentAgreementLetterView';
import { Sidebar } from 'primereact/sidebar';
import { useAppMessageDialog } from "../../hooks/useAppMessageDialog";
import {
  downloadSentAgreementPdf,
  sentAgreementPdfFilename,
} from "../../utils/generateSentAgreementPdf";
import {
    ClientBreadcrumbs,
    ClientEmptyState,
    ClientUnauthorizedDialog,
    CLIENT_HOME,
    CLIENT_PAGE_PERMISSION_NAMES,
} from '../../components/ClientPageChrome';
const ClientSGHA_List = () => {
    const { roleId, userId } = useAuth(); // Get roleId from the context
    const PAGE_NAME = CLIENT_PAGE_PERMISSION_NAMES.agreements;
    const [unauthorized, setUnauthorized] = useState(false); // Show Dialog if error
    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState([]);
    const socket = getSocket();
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [showDialog, setShowDialog] = useState(false);
    const [pdfExportTemplate, setPdfExportTemplate] = useState(null);
    const [downloadingId, setDownloadingId] = useState(null);
    const pdfExportRef = useRef(null);
    const { showError, messageDialog } = useAppMessageDialog();

    const waitForPaint = () =>
        new Promise((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(resolve));
        });

    const handleDownloadAgreement = useCallback(
        async (rowData) => {
            if (!rowData?.mainAgreement) {
                showError("No agreement content to download.");
                return;
            }
            const id = rowData.SGHA_template_id;
            setDownloadingId(id);
            setPdfExportTemplate(rowData);
            try {
                await waitForPaint();
                await new Promise((resolve) => setTimeout(resolve, 80));
                if (!pdfExportRef.current) {
                    throw new Error("PDF export container not ready");
                }
                await downloadSentAgreementPdf(
                    pdfExportRef.current,
                    sentAgreementPdfFilename(rowData),
                );
            } catch (err) {
                console.error("[ClientSGHA_List] PDF download failed:", err);
                showError("Failed to download PDF. Please try again.");
            } finally {
                setPdfExportTemplate(null);
                setDownloadingId(null);
            }
        },
        [showError],
    );

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
                message?.includes("Missing role_id") ||
                message?.includes("Permission denied") ||
                (message?.includes("Page") && message?.includes("not found"));

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
            <Button
                icon="pi pi-file-pdf"
                severity="success"
                text
                tooltip="Download PDF"
                tooltipOptions={{ position: "top" }}
                className="border-0 p-0"
                loading={downloadingId === rowData.SGHA_template_id}
                disabled={
                    downloadingId != null && downloadingId !== rowData.SGHA_template_id
                }
                onClick={() => handleDownloadAgreement(rowData)}
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


    if (unauthorized) {
        return (
            <ClientUnauthorizedDialog
                visible={unauthorized}
                message="You are not authorized to view agreements sent to you. Return to Home to continue in your workspace."
            />
        );
    }

    if (loading) {
        return <div className='loderDiv'><GifLoder /></div>;
    }

    return (
        <>
            {messageDialog}
            {pdfExportTemplate ? (
                <div
                    aria-hidden
                    style={{
                        position: "fixed",
                        left: -10000,
                        top: 0,
                        width: "794px",
                        background: "#fff",
                        zIndex: -1,
                    }}
                >
                    <SentAgreementLetterView
                        ref={pdfExportRef}
                        template={pdfExportTemplate}
                    />
                </div>
            ) : null}
            <Row className='mb-4'>
                <Col md={12} lg={8}>
                    <ClientBreadcrumbs
                        backTo={CLIENT_HOME}
                        backLabel="Home"
                        items={[{ label: "Agreements" }]}
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
                    emptyMessage={
                        <ClientEmptyState
                            icon="pi pi-file"
                            title="No agreements sent to you"
                            message="When a handling company sends you an agreement, it will appear here. Your own submissions live under My Submissions."
                            primaryLabel="Go to Home"
                            primaryTo={CLIENT_HOME}
                        />
                    }
                >
                    <Column header="Sl.No" body={(_, { rowIndex }) => rowIndex + 1} style={{ width: "120px" }} />
                    <Column field="template_name" header="Template Name" body={templateNameBody} />
                    <Column header="Agreement Content" body={letterTemplateBody} />
                    <Column header="Client" body={clientBody} />
                    <Column header="Business" body={businessBody} />
                    <Column header="Status" body={statusBody} />
                    {/* <Column header="Annexure" body={annexureNameBody} /> */}
                    <Column header="Actions" body={actionsBody} style={{ width: "140px" }} />
                </DataTable>
            </Card>
            <Sidebar
                position="right"
                style={{ width: "70vw" }}
                visible={showDialog}
                onHide={() => setShowDialog(false)}
                breakpoints={{ "960px": "95vw" }}
                header={
                    selectedTemplate ? (
                        <div className="d-flex align-items-center justify-content-between w-100 pe-2 gap-2">
                            <span className="text-truncate">{selectedTemplate.template_name}</span>
                            <Button
                                label="Download PDF"
                                icon="pi pi-file-pdf"
                                size="small"
                                severity="success"
                                loading={
                                    downloadingId === selectedTemplate.SGHA_template_id
                                }
                                disabled={downloadingId != null}
                                onClick={() => handleDownloadAgreement(selectedTemplate)}
                            />
                        </div>
                    ) : null
                }
            >
                <SentAgreementLetterView template={selectedTemplate} />
            </Sidebar>
        </>
    );
};


export default ClientSGHA_List;