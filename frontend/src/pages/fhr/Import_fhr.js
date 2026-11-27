import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Breadcrumb, Form, Card, Table, InputGroup, Badge } from 'react-bootstrap';
import { IoChevronBackOutline } from "react-icons/io5";
import { Button } from 'primereact/button';
import { InputIcon } from "primereact/inputicon";
import { IconField } from "primereact/iconfield";
import { InputText } from "primereact/inputtext";
import { LuUpload } from "react-icons/lu";
import { MdOutlineFlight } from "react-icons/md";
import { Avatar } from 'primereact/avatar';
import { getSocket } from '../../context/socket';
import GifLoder from '../../interfaces/GifLoder';
import { useDebounce } from 'use-debounce'; // First, install it via npm
import { useAuth } from "../../context/AuthContext.js";
import api from "../../api/axios.js";
import { Dialog } from "primereact/dialog";
import { Sidebar } from 'primereact/sidebar';
import { TabView, TabPanel } from 'primereact/tabview';
import { PiAirplaneLanding, PiAirplaneTakeoff } from "react-icons/pi";
import { RiFileExcel2Line } from "react-icons/ri";


const Import_fhr = () => {
    const { role, roleId, userId } = useAuth(); // Get roleId from the context
    const PAGE_NAME = "FHR Import"; // Page name for permission checking
    const socket = getSocket();
    const [loading, setLoading] = useState(false);  // Block UI until all fetches succeed
    const [unauthorized, setUnauthorized] = useState(false); // Show Dialog if error

    const [businesses, setBusinesses] = useState([]);
    const [selectedBusiness, setSelectedBusiness] = useState('');


    const [progressMessages, setProgressMessages] = useState([]);
    const [showDownloadDialog, setShowDownloadDialog] = useState(false);

    const [excelDataList, setExcelDataList] = useState([]);
    const [sortOrder, setSortOrder] = useState("DESC");
    const [limit, setLimit] = useState(15);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearchTerm] = useDebounce(searchTerm, 500); // 500ms delay

    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [uploadedFileSortOrder, setUploadedFileSortOrder] = useState("DESC");
    const [uploadedFileLimit, setUploadedFileLimit] = useState(5);
    const [uploadedFileSearchTerm, setUploadedFileSearchTerm] = useState("");
    const [debouncedUploadedFileSearchTerm] = useDebounce(uploadedFileSearchTerm, 500);




    const navigate = useNavigate();
    const goBack = () => {
        navigate(-1); // This will take the user back to the previous page in history
    };

    const [visibleRight, setVisibleRight] = useState(false);
    const [fileName, setFileName] = useState('');
    const [date, setDate] = useState('');
    const [remarks, setRemarks] = useState('');
    const [visible, setVisible] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        if (e.target.files?.length > 0) {
            setFileName(e.target.files[0].name);
        }
    };



    useEffect(() => {
        if (!socket || !roleId || !userId) return undefined;

        const onBizOk = (data) => {
            setBusinesses(Array.isArray(data) ? data : []);
        };
        const onBizErr = (error) => {
            const msg = error?.message || "";
            const isPermissionError =
                msg.includes("Missing role_id") ||
                msg.includes("Page") ||
                msg.includes("Permission denied");

            if (isPermissionError) {
                setUnauthorized(true);
                return;
            }

            // Fallback: list all businesses if user has none linked yet
            socket.emit("view-businesses", {
                role_id: roleId,
                page_name: PAGE_NAME,
                limit: 100,
                sortOrder: "ASC",
            });
            console.warn("Business fetch error:", msg);
        };
        const onViewOk = (data) => {
            const rows = Array.isArray(data) ? data : data?.businesses || [];
            setBusinesses(rows);
        };
        const onViewErr = (error) => {
            setBusinesses([]);
            console.warn("View businesses error:", error?.message);
        };

        socket.emit("fetch-businesses", {
            role_id: roleId,
            page_name: PAGE_NAME,
            user_id: userId,
        });
        socket.on("fetch-businesses-success", onBizOk);
        socket.on("fetch-businesses-error", onBizErr);
        socket.on("view-businesses-success", onViewOk);
        socket.on("view-businesses-error", onViewErr);

        const onProgress = (data) => {
            if (String(data.user_id) === String(userId)) {
                setProgressMessages((prev) => [...prev, data.step]);
                setShowDownloadDialog(true);
            }
        };
        const onExcelErr = (data) => {
            if (String(data.user_id) === String(userId)) {
                setProgressMessages((prev) => [
                    ...prev,
                    `Error: ${data.message}`,
                ]);
            }
        };
        const onExcelDone = (data) => {
            if (String(data.user_id) === String(userId)) {
                setProgressMessages([`${data.message}`]);
            }
        };

        socket.on("excel-progress", onProgress);
        socket.on("excel-error", onExcelErr);
        socket.on("excel-complete", onExcelDone);

        return () => {
            socket.off("fetch-businesses-success", onBizOk);
            socket.off("fetch-businesses-error", onBizErr);
            socket.off("view-businesses-success", onViewOk);
            socket.off("view-businesses-error", onViewErr);
            socket.off("excel-progress", onProgress);
            socket.off("excel-error", onExcelErr);
            socket.off("excel-complete", onExcelDone);
        };
    }, [socket, roleId, userId]);


    useEffect(() => {
        if (!socket) return;

        const fetchExcelData = () => {
            socket.emit('view-excel-data', {
                role_id: roleId,
                page_name: PAGE_NAME,
                sortOrder,
                limit,
                searchTerm: debouncedSearchTerm,
            });
        };

        fetchExcelData();

        const handleSuccess = (data) => setExcelDataList(data);
        const handleError = (error) => {
            console.error("Excel fetch error:", error.message);
            const isPermissionError =
                error.message?.includes('Missing role_id') ||
                error.message?.includes('Page') ||
                error.message?.includes('Permission denied');

            if (isPermissionError) {
                setUnauthorized(true);
            } else {
                setExcelDataList([]);
                console.warn('Excel fetch error:', error.message);
            }
        };

        socket.on('view-excel-data-success', handleSuccess);
        socket.on('view-excel-data-error', handleError);
        socket.on('FHR-import-complete', fetchExcelData);

        return () => {
            socket.off('view-excel-data-success', handleSuccess);
            socket.off('view-excel-data-error', handleError);
            socket.off('FHR-import-complete', fetchExcelData);
        };
    }, [socket, roleId, PAGE_NAME, sortOrder, limit, debouncedSearchTerm]);


    useEffect(() => {
        if (!socket) return;

        const fetchUploadedExcelFiles = () => {
            socket.emit('view-excel-files', {
                role_id: roleId,
                page_name: PAGE_NAME,
                sortOrder: uploadedFileSortOrder,
                limit: uploadedFileLimit,
                searchTerm: debouncedUploadedFileSearchTerm,
            });
        };

        fetchUploadedExcelFiles();

        const handleSuccess = (data) => setUploadedFiles(data);
        const handleError = (error) => {
            console.error("Excel fetch error:", error.message);
            const isPermissionError =
                error.message?.includes('Missing role_id') ||
                error.message?.includes('Page') ||
                error.message?.includes('Permission denied');

            if (isPermissionError) {
                setUnauthorized(true);
            } else {
                setUploadedFiles([]);
                console.warn('Excel fetch error:', error.message);
            }
        };

        socket.on('view-excel-files-success', handleSuccess);
        socket.on('view-excel-files-error', handleError);
        socket.on('FHR-import-complete', fetchUploadedExcelFiles);

        return () => {
            socket.off('view-excel-files-success', handleSuccess);
            socket.off('view-excel-files-error', handleError);
            socket.off('FHR-import-complete', fetchUploadedExcelFiles);
        };
    }, [socket, roleId, PAGE_NAME, uploadedFileSortOrder, uploadedFileLimit, debouncedUploadedFileSearchTerm]);




    const handleDialogHide = () => navigate(-1);

    const handleDownloadExcel = async () => {
        if (!selectedBusiness || !userId) return;

        setProgressMessages([]);
        setShowDownloadDialog(true);

        try {
            const response = await api.get(`/FHR_Import/download-excel/${PAGE_NAME}/${selectedBusiness}/${userId}`, {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/zip' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'airline_export.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
            setProgressMessages((prev) => [...prev, 'Î“Â¥Ã® Failed to download the file.']);
            if (error.response?.status === 403) {
                setUnauthorized(true);
                setShowDownloadDialog(false);
            }
        }
    };


    const handleUpload = async () => {
        const fileInput = fileInputRef.current;
        if (!fileInput?.files?.length) {
            setProgressMessages(["Select an Excel file first."]);
            setShowDownloadDialog(true);
            return;
        }
        if (!date) {
            setProgressMessages(["Set With Effect To Date before uploading."]);
            setShowDownloadDialog(true);
            return;
        }
        if (!remarks?.trim()) {
            setProgressMessages(["Enter remarks before uploading."]);
            setShowDownloadDialog(true);
            return;
        }
        if (!selectedBusiness) {
            setProgressMessages([
                "Select the handling company first. Uploads are checked against that station so data from another location cannot be imported here.",
            ]);
            setShowDownloadDialog(true);
            return;
        }

        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("remarks", remarks);
        formData.append("inserted_by_user_id", userId);
        formData.append("wet", date);
        formData.append("business_id", selectedBusiness);

        setProgressMessages(["Uploading…"]);
        setShowDownloadDialog(true);

        try {
            const res = await api.post(`/FHR_Import/upload-excel/${PAGE_NAME}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            fileInput.value = "";
            setFileName("");
            setDate("");
            setRemarks("");
            setProgressMessages((prev) => [
                ...prev,
                res.data?.message || "Upload finished.",
            ]);
        } catch (error) {
            console.error("Upload failed:", error);
            setProgressMessages((prev) => [
                ...prev,
                error.response?.data?.message ||
                    error.message ||
                    "Upload failed.",
            ]);
            if (error.response?.status === 403) {
                setUnauthorized(true);
                setShowDownloadDialog(false);
            }
        }
    };



    const handleGenerateFHR = async () => {
        setLoading(true);
        try {
            const res = await api.post(`/FHR/generate-fhr/${PAGE_NAME}`);
            const created = res.data?.createdCount ?? 0;
            const skipped = res.data?.skippedEmptyRange ?? 0;
            window.alert(
                res.data?.message ||
                `Created ${created} draft FHR(s).` +
                (skipped ? ` Skipped ${skipped} row(s) with no matching flight dates.` : '')
            );
            if (socket) {
                socket.emit('view-excel-data', {
                    role_id: roleId,
                    page_name: PAGE_NAME,
                    sortOrder,
                    limit,
                    searchTerm: debouncedSearchTerm,
                });
            }
            if (created > 0) {
                navigate('/dashboard/FHR_draft');
            }
        } catch (error) {
            console.error('Generate FHR error:', error);
            if (error.response?.status === 403) {
                setUnauthorized(true);
            } else {
                window.alert(error.response?.data?.message || 'Failed to generate FHR.');
            }
        } finally {
            setLoading(false);
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

            <Row>
                <Col md={6} lg={6} sm={6}>
                    <Breadcrumb>
                        <Breadcrumb.Item onClick={goBack}>
                            <IoChevronBackOutline /> Back
                        </Breadcrumb.Item>
                        <Breadcrumb.Item active>FHR Import & Schedule</Breadcrumb.Item>
                    </Breadcrumb>
                </Col>
                <Col md={6} lg={6} sm={6} className="text-end">
                    <Button
                        label="Upload Excel"
                        icon="pi pi-upload"
                        severity="success"
                        outlined
                        className="py-2"
                        onClick={() => setVisibleRight(true)}
                    />
                </Col>
                <Col md={12} lg={12} className="text-end mt-4">
                    <TabView>
                        <TabPanel header="Uploaded Excel Files">
                            <Card className="border-0 shadow-0">
                                <Card.Header className="pt-3 pb-2 border-0 bg-transparent">
                                    <div className="d-flex align-items-center gap-1 justify-content-end filterDiv">
                                        <label className="me-2">Sort By</label>
                                        <Form.Select
                                            value={uploadedFileSortOrder}
                                            onChange={(e) => setUploadedFileSortOrder(e.target.value)}
                                            style={{ width: '100px' }}
                                        >
                                            <option value="ASC">ASC</option>
                                            <option value="DESC">DESC</option>
                                        </Form.Select>

                                        <Form.Select
                                            value={uploadedFileLimit}
                                            onChange={(e) => setUploadedFileLimit(parseInt(e.target.value))}
                                            style={{ width: '100px' }}
                                        >
                                            <option value={5}>5</option>
                                            <option value={10}>10</option>
                                            <option value={15}>15</option>
                                            <option value={20}>20</option>
                                        </Form.Select>

                                        <IconField iconPosition="left">
                                            <InputIcon className="pi pi-search" />
                                            <InputText
                                                placeholder="Search"
                                                value={uploadedFileSearchTerm}
                                                onChange={(e) => setUploadedFileSearchTerm(e.target.value)}
                                            />
                                        </IconField>

                                    </div>
                                </Card.Header>
                                <Card.Body>
                                    <div>
                                        <Table responsive hover className="clTable table-fixed-header">
                                            <thead className="table-primary sticky-header">
                                                <tr className="table-primary">
                                                    <th>File Name</th>
                                                    <th>Remarks</th>
                                                    <th>Uploaded By</th>
                                                    <th>Uploaded On</th>
                                                    <th style={{ width: '100px' }}>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {uploadedFiles.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="text-center">No Uploaded Files Found</td>
                                                    </tr>
                                                ) : (
                                                    uploadedFiles.map((file) => (
                                                        <tr key={file.excel_file_id}>
                                                            <td>
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <Avatar className="me-2 text-success" style={{ backgroundColor: 'rgb(197 197 197 / 27%)' }} shape="circle">
                                                                        <RiFileExcel2Line style={{ fontSize: '20px' }} />
                                                                    </Avatar>
                                                                    <span className="d-flex flex-column gap-1">
                                                                        {file.file_name}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td>{file.remarks || 'NA'}</td>
                                                            <td>
                                                                {file.inserted_by
                                                                    ? `${file.inserted_by.first_name} ${file.inserted_by.last_name}`
                                                                    : 'NA'}
                                                            </td>
                                                            <td>
                                                                {file.createdAt
                                                                    ? new Date(file.createdAt).toLocaleDateString('en-GB', {
                                                                        day: '2-digit',
                                                                        month: 'long',
                                                                        year: 'numeric'
                                                                    })
                                                                    : 'NA'}
                                                            </td>
                                                            <td className="text-center">
                                                                <Button
                                                                    icon="pi pi-download"
                                                                    severity="primary"
                                                                    className="p-0 border-0"
                                                                    style={{ width: '30px' }}
                                                                    tooltip="Download"
                                                                    tooltipOptions={{ position: "top" }}
                                                                    onClick={() => {
                                                                        if (file.file_url) {
                                                                            const link = document.createElement('a');
                                                                            link.href = file.file_url;
                                                                            link.download = file.file_name || 'download.xlsx';
                                                                            link.target = "_blank"; // Optional: open in new tab
                                                                            document.body.appendChild(link);
                                                                            link.click();
                                                                            document.body.removeChild(link);
                                                                        }
                                                                    }}
                                                                    text
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </Table>
                                    </div>
                                </Card.Body>
                            </Card>
                        </TabPanel>
                        <TabPanel header="Imported Data List" className="p-0">
                            <Card className="border-0 shadow-0 importTable">
                                <Card.Header className="pt-3 pb-3 border-0 bg-transparent px-0">
                                    <div className="d-flex align-items-center gap-1 justify-content-end filterDiv">
                                        <label className="me-2">Sort By</label>
                                        <Form.Select
                                            value={sortOrder}
                                            onChange={(e) => setSortOrder(e.target.value)}
                                            style={{ width: '100px' }}
                                        >
                                            <option value="ASC">ASC</option>
                                            <option value="DESC">DESC</option>
                                        </Form.Select>

                                        <Form.Select
                                            value={limit}
                                            onChange={(e) => setLimit(parseInt(e.target.value))}
                                            style={{ width: '100px' }}
                                        >
                                            <option value={15}>15</option>
                                            <option value={25}>25</option>
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                        </Form.Select>

                                        <IconField iconPosition="left">
                                            <InputIcon className="pi pi-search" />
                                            <InputText
                                                placeholder="Search"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </IconField>
                                        <Button
                                            icon="pi pi-check-circle"
                                            label="Generate FHR"
                                            severity="warning"
                                            className="py-2 border-0"
                                            tooltip="Create Draft FHRs from imported rows"
                                            tooltipOptions={{ position: "top" }}
                                            onClick={handleGenerateFHR}
                                            style={{ height: '35px'}}
                                        />
                                    </div>
                                </Card.Header>
                                <Card.Body className="p-0">
                                    <div style={{ overflowX: 'auto', maxHeight: '596px', position: 'relative' }}>
                                        <Table bordered hover className="clTable table-fixed-header mb-0">
                                            <thead className="table-primary sticky-header">
                                                <tr>
                                                    <th>Airline</th>
                                                    <th>Management Details</th>
                                                    <th>IATA</th>
                                                    <th>Arrival Flight No.</th>
                                                    <th>STA</th>
                                                    <th>Departure Flight No.</th>
                                                    <th>STD</th>
                                                    <th>Days</th>
                                                    <th>Effective From</th>
                                                    <th>Effective To</th>
                                                    <th>FHR Status</th>
                                                    <th>Uploaded By</th>
                                                    <th>Uploaded On</th>
                                                    <th style={{ width: '80px' }}>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {excelDataList.length === 0 ? (
                                                    <tr><td colSpan={16} className="text-center">No Data Found</td></tr>
                                                ) : (
                                                    excelDataList.map((item) => (
                                                        <tr key={item.excel_data_id}>

                                                             <td data-label="Airline">
                                                                 <div className="d-flex align-items-center gap-2">
                                                                    <Avatar className="me-2" style={{ backgroundColor: 'rgb(197 197 197 / 27%)', color: 'rgb(148 77 153)' }} shape="circle">
                                                                        <MdOutlineFlight style={{ fontSize: '20px' }} />
                                                                    </Avatar>
                                                                    <span>
                                                                        {item.aircraft?.airline?.airline_name || 'NA'}
                                                                        <small className="d-block">{item.type_of_aircraft || 'NA'}</small>
                                                                    </span>
                                                                    
                                                                </div>
                                                                
                                                            </td>
                                                             <td data-label="Management Details">
                                                                {item.aircraft?.airline?.business?.name || 'NA'} ({item.aircraft?.airline?.airport?.iata || ''})
                                                            </td>

                                                            <td data-label="File">
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <span className="d-flex gap-1">
                                                                            {item.from_iata || ''}
                                                                            {item.from_iata && item.aircraft?.airline?.airport?.iata && (
                                                                                <>
                                                                                    {' '}
                                                                                    <PiAirplaneLanding className="mx-2 text-success" style={{fontSize: '20px'}}/>{' '}
                                                                                </>
                                                                            )}
                                                                            {item.aircraft?.airline?.airport?.iata || ''}
                                                                            {item.aircraft?.airline?.airport?.iata && item.to_iata && (
                                                                                <>
                                                                                    {' '}
                                                                                    <PiAirplaneTakeoff className="mx-2 text-danger" style={{fontSize: '20px'}} />{' '}
                                                                                </>
                                                                            )}
                                                                            {item.to_iata || ''}
                                                                    </span>
                                                                </div>
                                                            </td>

                                                           

                                                            <td data-label="Arrival Flight No.">
                                                                {item.arrival_flight_no || 'NA'}
                                                            </td>

                                                            <td data-label="STA">
                                                                {item.sta || 'NA'}
                                                            </td>

                                                            <td data-label="Departure Flight No.">
                                                                {item.departure_flight_no || 'NA'}
                                                            </td>

                                                            <td data-label="STD">
                                                                {item.std || 'NA'}
                                                            </td>

                                                            <td data-label="Days">
                                                                {item.days || 'NA'}
                                                            </td>

                                                            <td data-label="Effective From">
                                                                {item.wef ? new Date(item.wef).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'NA'}
                                                            </td>

                                                            <td data-label="Effective To">
                                                                {item.wet ? new Date(item.wet).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'NA'}
                                                            </td>

                                                            <td data-label="FHR Status">
                                                                <Badge
                                                                    bg={item.fhr_creation_status ? 'success' : 'warning'}
                                                                    className="text-sm text-white"
                                                                >
                                                                    {item.fhr_creation_status ? 'Generated' : 'Pending'}
                                                                </Badge>
                                                            </td>

                                                            <td data-label="Uploaded By">
                                                                {item.inserted_by?.first_name} {item.inserted_by?.last_name}
                                                            </td>

                                                            <td data-label="Uploaded On">
                                                                {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'NA'}
                                                            </td>

                                                            <td className="text-center">
                                                                <Button
                                                                    tooltip="Delete"
                                                                    icon="pi pi-trash"
                                                                    severity="danger"
                                                                    className="p-0 border-0"
                                                                    tooltipOptions={{ position: "top" }}
                                                                    style={{ width: '30px' }}
                                                                    text
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>

                                        </Table>
                                    </div>
                                </Card.Body>
                            </Card>
                        </TabPanel>
                    </TabView>
                </Col>
            </Row>
            <Dialog
                header="Download Progress"
                visible={showDownloadDialog}
                style={{ width: '500px' }}
                onHide={() => setShowDownloadDialog(false)}
            >
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {progressMessages.map((msg, idx) => (
                        <div key={idx} className="mb-2">
                            {msg}
                        </div>
                    ))}
                </div>
            </Dialog>

            <Sidebar
                visible={visibleRight}
                position="right"
                onHide={() => setVisibleRight(false)}
                className="fhr-import-sidebar"
                style={{ width: "460px" }}
            >
                <Row className="mx-0">
                    <Col md={12} lg={12} className="rtpart ps-0">
                        <Card className="ignore-container p-3 shadow-0 border-0">
                            <Form.Group controlId="fileupload" className="file-upload">
                                <div className="mb-3">
                                    <label className="d-block mb-2 text-start fw-semibold">
                                        1. Select handling company
                                    </label>
                                    <div className="d-flex align-items-center gap-2 flex-wrap">
                                        <Form.Select
                                            aria-label="Business Filter"
                                            value={selectedBusiness}
                                            onChange={(e) =>
                                                setSelectedBusiness(e.target.value)
                                            }
                                        >
                                            <option value="">
                                                Filter By Handling Company
                                            </option>
                                            {businesses.map((b) => (
                                                <option
                                                    key={b.business_id}
                                                    value={b.business_id}
                                                >
                                                    {b.name}
                                                </option>
                                            ))}
                                        </Form.Select>
                                        <Button
                                            type="button"
                                            label="Download"
                                            icon="pi pi-file-excel"
                                            severity="success"
                                            className="py-2"
                                            disabled={!selectedBusiness}
                                            onClick={handleDownloadExcel}
                                            tooltip={
                                                selectedBusiness
                                                    ? "Download Excel template"
                                                    : "Select a handling company first"
                                            }
                                            tooltipOptions={{ position: "top" }}
                                        />
                                    </div>
                                    {!businesses.length ? (
                                        <small className="text-danger d-block mt-1">
                                            No companies loaded. Refresh the page or
                                            check that your user is linked to a
                                            handling company.
                                        </small>
                                    ) : null}
                                </div>

                                <label className="d-block mb-2 text-start fw-semibold">
                                    2. Upload filled Excel
                                </label>
                                <div className="file-wrap">
                                    <Form.Control
                                        ref={fileInputRef}
                                        type="file"
                                        name="upload"
                                        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                                        onChange={handleFileChange}
                                    />
                                    <div className="custom-upload-design">
                                        <div className="upload-icon">
                                            <LuUpload style={{ fontSize: '30px' }} />
                                        </div>
                                        <div className="upload-text">
                                            Upload excel file
                                        </div>
                                    </div>
                                </div>

                                {fileName && (
                                    <div className="mt-2 text-success">
                                        <strong>Selected File:</strong> {fileName}
                                    </div>
                                )}

                                <Row className="mx-0 mt-4">
                                    <Col md={6} lg={6} className="px-1">
                                        <label className="d-block mb-3 text-start">With Effect To Date</label>
                                        <InputGroup className="mb-3">
                                            <Form.Control
                                                placeholder="DD/MM/YYYY"
                                                type="date"
                                                name="date"
                                                value={date}
                                                onChange={(e) => setDate(e.target.value)}
                                            />
                                        </InputGroup>
                                    </Col>
                                    <Col md={6} lg={6} className="px-1">
                                        <label className="d-block mb-3 text-start">Remarks</label>
                                        <InputGroup className="mb-3">
                                            <Form.Control
                                                placeholder="Remarks"
                                                type="text"
                                                name="remarks"
                                                value={remarks}
                                                onChange={(e) => setRemarks(e.target.value)}
                                            />
                                        </InputGroup>
                                    </Col>
                                </Row>

                                <div className="d-flex justify-content-end">
                                    <Button
                                        label="Upload"
                                        icon="pi pi-upload"
                                        severity="warning"
                                        className="py-2 mt-3"
                                        onClick={handleUpload}
                                        disabled={!fileName || !remarks || !date}
                                    />
                                </div>
                            </Form.Group>
                        </Card>
                    </Col>
                    <Col md={12} lg={12} className="px-1 mt-3">
                        <Card className="ltpart text-start p-3 border-0" style={{ background: '#f3ebf4' }}>
                            <h6>Excel file upload instructions</h6>
                            <ul className="importText mb-0">
                                <li>
                                    Select a handling company above, then click <strong>Download</strong> to get the Excel template for that station.
                                </li>
                                <li>
                                    The Excel file has multiple sheets (one per airline). Fill aircraft and flight details using the NOTES sheet.
                                </li>
                                <li>
                                    Only edit unlocked table cells. Enter arrival/departure flights, STA/STD, and operating days as shown in NOTES.
                                </li>
                                <li>
                                    Upload the filled file, set With Effect To Date (WET), add remarks, then click Upload.
                                </li>
                                <li>
                                    When processing finishes, open <strong>FHR → Draft</strong> to see the generated scheduled FHRs.
                                </li>
                            </ul>
                        </Card>
                    </Col>
                </Row>
            </Sidebar>

        </>
    );
};

export default Import_fhr;
