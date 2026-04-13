import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from "react-router-dom";
import { Col, Row, Card, Breadcrumb, Table, Alert, Badge } from 'react-bootstrap';
import { Button } from "primereact/button";
import { Dialog } from 'primereact/dialog';
import { IoChevronBackOutline } from "react-icons/io5";
import { MdOutlineDatasetLinked } from "react-icons/md";
import { FiLink } from "react-icons/fi";
import { GoUnlink } from "react-icons/go";
import { TbUnlink, TbLinkPlus } from "react-icons/tb";
import api from '../../api/axios';
import GifLoder from '../../interfaces/GifLoder';
import { getSocket } from "../../context/socket";
import { useAuth } from "../../context/AuthContext";
import { useDebounce } from 'use-debounce'; // First, install it via npm

const ClientLinksPage = () => {
    const { role, roleId } = useAuth();
    const PAGE_NAME = "Client Registratiion Link";
    const socket = getSocket();
    const [loading, setLoading] = useState(true);
    const [unauthorized, setUnauthorized] = useState(false);
    const [clientName, setClientName] = useState('');
    const [clientDialogVisible, setClientDialogVisible] = useState(false);
    const [links, setLinks] = useState([]);
    const [counts, setCounts] = useState({
        totalLinks: 0,
        totalRegistrationTrue: 0,
        totalActiveRegistrationFalse: 0,
        totalInactive: 0,
    });
    const [generatedLink, setGeneratedLink] = useState('');
    const [dialogVisible, setDialogVisible] = useState(false);
    const navigate = useNavigate();
    const goBack = () => {
        navigate(-1); // This will take the user back to the previous page in history
    };
    // Fetch all links on component mount
    useEffect(() => {
        fetchLinks();
    }, []);

    const fetchLinks = async () => {
        try {
            const response = await api.get(`/ClientAuthRoutes/all-links/${PAGE_NAME}`);
            setLinks(response.data.links || []); // Fallback to empty array if null
            setCounts(response.data.counts || {
                totalLinks: 0,
                totalRegistrationTrue: 0,
                totalActiveRegistrationFalse: 0,
                totalInactive: 0,
            });
        } catch (error) {
            console.error('Error fetching links:', error);
            setLinks([]); // Ensure links is at least an empty array
            if (error.response?.status === 403) {
                setUnauthorized(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const generateLink = async () => {
        if (!clientName.trim()) {
            return;
        }

        setLoading(true);
        try {
            const response = await api.post(
                `/ClientAuthRoutes/generate-link/${PAGE_NAME}`,
                {
                    client_name: clientName,
                    frontend_origin: typeof window !== 'undefined' ? window.location.origin : undefined,
                }
            );

            setGeneratedLink(response.data.link || '');
            setDialogVisible(true);
            setClientDialogVisible(false); // ✅ close name dialog
            setClientName(''); // reset
            fetchLinks();
        } catch (error) {
            console.error('Error generating link:', error);
            if (error.response?.status === 403) {
                setUnauthorized(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDialogHide = () => navigate(-1);
    const [copySuccess, setCopySuccess] = useState('');

    const handleCopyLink = () => {
        if (generatedLink) {
            navigator.clipboard.writeText(generatedLink).then(() => {
                setCopySuccess('Link copied successfully!');
            }).catch((error) => {
                console.error('Failed to copy link:', error);
                setCopySuccess('Failed to copy the link.');
            });
        }
    };
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
                    <Col sm={6} lg={6} className="mb-4">
                        <Breadcrumb>
                            <Breadcrumb.Item onClick={goBack}>
                                <IoChevronBackOutline /> Back
                            </Breadcrumb.Item>
                            <Breadcrumb.Item active>Client Registration Links</Breadcrumb.Item>
                        </Breadcrumb>
                    </Col>
                    <Col sm={6} lg={6} className="mb-4 text-end">
                        <Button
                            onClick={() => setClientDialogVisible(true)}
                            loading={loading}
                            label="Generate New Link"
                            icon="pi pi-link"
                            className="border-0 py-2"
                            severity='primary'
                        />
                    </Col>
                    <Col sm={12} lg={12} className="mb-3">
                        <ul className='justify-content-start taskperform ticketlist'>
                            <li className='dashboard_card'>
                                <Card className="shadow-0 h-100">
                                    <Card.Header>
                                        <div className="d-flex justify-content-between">
                                            <div className='repTItle'>
                                                <span className="d-block">Total Links:</span>
                                                <span className="d-block h4 mt-3">{counts.totalLinks}</span>
                                            </div>
                                            <div className='hrshortdata'>
                                                <span style={{ color: '#cdf0ff' }}><TbLinkPlus /></span>
                                            </div>
                                        </div>
                                    </Card.Header>
                                </Card>
                            </li>
                            <li className='dashboard_card'>
                                <Card className="shadow-0 h-100">
                                    <Card.Header>
                                        <div className="d-flex justify-content-between">
                                            <div className='repTItle'>
                                                <span className="d-block">Active Registration False:</span>
                                                <span className="d-block h4 mt-3">{counts.totalActiveRegistrationFalse}</span>
                                            </div>
                                            <div className='hrshortdata'>
                                                <span style={{ color: '#fff3cf' }}><TbUnlink /></span>
                                            </div>
                                        </div>
                                    </Card.Header>
                                </Card>
                            </li>
                            <li className='dashboard_card'>
                                <Card className="shadow-0 h-100">
                                    <Card.Header>
                                        <div className="d-flex justify-content-between">
                                            <div className='repTItle'>
                                                <span className="d-block">Registration True:</span>
                                                <span className="d-block h4 mt-3">{counts.totalRegistrationTrue}</span>
                                            </div>
                                            <div className='hrshortdata'>
                                                <span style={{ color: '#dfffe1' }}><FiLink /></span>
                                            </div>

                                        </div>
                                    </Card.Header>
                                </Card>
                            </li>
                            <li className='dashboard_card'>
                                <Card className="shadow-0 h-100">
                                    <Card.Header>
                                        <div className="d-flex justify-content-between">
                                            <div className='repTItle'>
                                                <span className="d-block">Inactive Links:</span>
                                                <span className="d-block h4 mt-3">{counts.totalInactive}</span>
                                            </div>
                                            <div className='hrshortdata'>
                                                <span style={{ color: '#ffeeee' }}><GoUnlink /></span>
                                            </div>
                                        </div>
                                    </Card.Header>
                                </Card>
                            </li>
                        </ul>
                    </Col>

                    <Col sm={12} lg={12}>
                        <Card>
                            <Card.Body className='gerdatatable_link'>
                                <div>
                                    <Table hover striped bordered responsive size='sm'>
                                        <thead>
                                            <tr className='table-primary sticky-top'>
                                                <th style={{ width: '200px' }}>Client Name</th>
                                                <th>Link URL</th>
                                                <th className="text-center" style={{ width: '70px' }}>Status</th>
                                                <th className="text-center" style={{ width: '100px' }}>Registration</th>
                                                <th className="text-center" style={{ width: '150px', whiteSpace: 'nowrap' }}>Last Updated</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {links && links.length > 0 ? (
                                                links.map((rowData, index) => (
                                                    <tr key={index}>
                                                        {/* Link URL */}
                                                        <td>{rowData?.Client_name || 'N/A'}</td>
                                                        <td>
                                                            {rowData?.link_url ? (
                                                                <a
                                                                    href={rowData.link_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    {rowData.link_url}
                                                                </a>
                                                            ) : (
                                                                'N/A'
                                                            )}
                                                        </td>
                                                        {/* Status */}
                                                        <td className="text-center">
                                                            <Badge
                                                                bg={
                                                                    rowData?.link_status === 'Active'
                                                                        ? 'success'
                                                                        : 'danger'
                                                                }
                                                                className='text-white border-0'
                                                            >
                                                                {rowData?.link_status || 'Unknown'}
                                                            </Badge>
                                                        </td>
                                                        {/* Registration */}
                                                        <td className="text-center">
                                                            <span
                                                                className={`fw-bold ${rowData?.registration
                                                                    ? 'text-success'
                                                                    : 'text-danger'
                                                                    }`}
                                                            >
                                                                {rowData?.registration ? 'True' : 'False'}
                                                            </span>
                                                        </td>
                                                        {/* Last Updated */}
                                                        <td className="text-center">
                                                            {rowData?.updatedAt ? (
                                                                new Intl.DateTimeFormat('en-GB', {
                                                                    day: '2-digit',
                                                                    month: '2-digit',
                                                                    year: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                    hour12: false,
                                                                }).format(new Date(rowData.updatedAt))
                                                            ) : (
                                                                'N/A'
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="4" className="text-center">
                                                        No data available
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </Table>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Row>
            <Dialog
                visible={dialogVisible}
                onHide={() => setDialogVisible(false)}
                header="Generated Registration Link"
                style={{ width: 'min(95vw, 520px)', maxWidth: '100%' }}
            >
                <div style={{ overflowX: 'hidden', maxWidth: '100%' }}>
                    <p className="mb-2 small text-secondary">
                        Copy or open this link and share it with the client.
                    </p>
                    {generatedLink ? (
                        <>
                            <div
                                className="rounded border bg-light p-3 mb-3 font-monospace small"
                                style={{
                                    overflowWrap: 'anywhere',
                                    wordBreak: 'break-word',
                                    maxWidth: '100%',
                                }}
                            >
                                <a
                                    href={generatedLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary text-decoration-underline"
                                    style={{
                                        overflowWrap: 'anywhere',
                                        wordBreak: 'break-word',
                                    }}
                                >
                                    {generatedLink}
                                </a>
                            </div>
                            <div className="d-flex justify-content-center align-items-center">
                                <Button
                                    label="Copy Link"
                                    icon="pi pi-copy"
                                    className="border-0 py-2"
                                    onClick={handleCopyLink}
                                    severity="success"
                                />
                            </div>
                            {copySuccess && (
                                <Alert variant="success" className="py-1 text-center mt-3 mb-0">
                                    {copySuccess}
                                </Alert>
                            )}
                        </>
                    ) : (
                        <Alert variant="danger" className="py-1 text-center mb-0">
                            No link generated yet.
                        </Alert>
                    )}
                </div>
            </Dialog>

            <Dialog
                visible={clientDialogVisible}
                onHide={() => setClientDialogVisible(false)}
                header="Enter Client Name"
                style={{ width: '400px' }}
            >
                <div className="p-fluid">
                    <div className="field">
                        <label htmlFor="clientName">Client Name</label>
                        <input
                            type="text"
                            id="clientName"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            className="form-control"
                            placeholder="Enter client name"
                        />
                    </div>
                    <div className="d-flex justify-content-end mt-3">
                        <Button
                            label="Cancel"
                            icon="pi pi-times"
                            className="p-button-text me-2"
                            onClick={() => setClientDialogVisible(false)}
                            severity="secondary"
                        />
                        <Button
                            label="Generate"
                            icon="pi pi-check"
                            onClick={generateLink}
                            disabled={!clientName.trim()}
                            severity="success"
                        />
                    </div>
                </div>
            </Dialog>



        </>
    );
};

export default ClientLinksPage;
