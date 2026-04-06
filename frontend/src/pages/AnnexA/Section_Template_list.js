import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from 'primereact/dialog';
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputText } from "primereact/inputtext";
import React, { useEffect, useState } from "react";
import { Breadcrumb, Card, Col, Form, Row } from 'react-bootstrap';
import { IoChevronBackOutline } from "react-icons/io5";
import { Link, useNavigate } from "react-router-dom";
import { useDebounce } from 'use-debounce'; // First, install it via npm
import api from "../../api/axios";
import CustomConfirmPopup from '../../components/CustomConfirmPopup';
import DynamicSectionsList from '../../components/DynamicSectionsList';
import { useAuth } from "../../context/AuthContext";
import { getSocket } from "../../context/socket";
import GifLoder from '../../interfaces/GifLoder';
import AgreementBodyHtml from '../../components/AgreementBodyHtml';
const Section_Template_list = () => {
    const { roleId } = useAuth(); // Get roleId from the context
    const PAGE_NAME = "Section Template"; // Page name for permission checking
    const [unauthorized, setUnauthorized] = useState(false); // Show Dialog if error
    const [loading, setLoading] = useState(false);
    const [sections, setSections] = useState([]);
    const [sortOrder, setSortOrder] = useState('ASC');
    const [perPage, setPerPage] = useState(15);
    const [searchValue, setSearchValue] = useState('');
    const [debouncedSearch] = useDebounce(searchValue, 500); // 500ms debounce
    const [error, setError] = useState("");
    const socket = getSocket();
    const navigate = useNavigate(); // Initialize the navigate function
    const [viewDialogVisible, setViewDialogVisible] = useState(false);
    const [selectedSection, setSelectedSection] = useState(null);

    const goBack = () => {
        navigate(-1); // This will take the user back to the previous page in history
    };

    useEffect(() => {
        const fetchTemplates = (roleId, PAGE_NAME) => {
            setLoading(true);
            socket.emit("view-sgha-templates", { role_id: roleId, page_name: PAGE_NAME, sortOrder, limit: perPage, searchTerm: debouncedSearch });

            socket.once("view-sgha-templates-success", (data) => {
                setSections(data);   // ✅ directly store templates
                setError("");
                setUnauthorized(false);
                setLoading(false);
            });

            socket.once("view-sgha-templates-error", (error) => {
                const isPermissionError =
                    error.message?.includes("Missing role_id") ||
                    error.message?.includes("Permission denied") ||
                    error.message?.includes("Page");

                if (isPermissionError) {
                    setUnauthorized(true);
                } else {
                    setError("Error fetching templates. Please try again.");
                }

                console.error("Socket error fetching templates:", error);
                setLoading(false);
            });
        };

        fetchTemplates(roleId, PAGE_NAME);

        const handleTemplateUpdate = () => {
            fetchTemplates(roleId, PAGE_NAME);
        };

        socket.on("sgha-templates-updated", handleTemplateUpdate);

        return () => {
            socket.off("sgha-templates-updated", handleTemplateUpdate);
        };
    }, [socket, roleId, PAGE_NAME, sortOrder, perPage, debouncedSearch]);



    // Helper function to format date as dd/mm/yyyy
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const handleEdit = (rowData) => {
        console.log("Edit clicked", rowData.SGHA_T_id);
        navigate(`/dashboard/editsection/${rowData.SGHA_T_id}`); // Navigate to the edit page
    };

    const handleAction = async (type, SGHA_T_id) => {
        if (type === "delete") {
            try {
                const response = await api.delete(`/sgha_annex_template/delete_sgha_template/${SGHA_T_id}/${PAGE_NAME}`);

                if (response.status === 200) {
                }
            } catch (error) {
                console.error("Failed to delete section:", error);
                if (error.response?.status === 403) {
                    setUnauthorized(true);
                }
            } finally {
                setLoading(false);
            }
        }
    };

    const handleView = async (rowData, customYear = null, customType = null) => {
        console.log("Viewing section data:", rowData);
        setLoading(true);
        
        let sectionsData = null;
        
        // First check if sectionsData is already in rowData (from backend)
        if (rowData.sectionsData && Array.isArray(rowData.sectionsData) && rowData.sectionsData.length > 0) {
            sectionsData = rowData.sectionsData;
            console.log("Using sectionsData from rowData");
        } else {
            try {
                // Try to fetch new format data from Template table
                const possibleYears = customYear ? [customYear] : [2024, 2025, 2026, new Date().getFullYear()];
                const possibleTypes = customType ? [customType] : ['Annex A', 'Annex B', 'Main Agreement'];
                
                for (const year of possibleYears) {
                    for (const type of possibleTypes) {
                        try {
                            const response = await api.get(`/sgha_template_content/get/${year}/${type}/${PAGE_NAME}`);
                            if (response.data?.data?.content) {
                                const content = response.data.data.content;
                                // Check if content is a string that needs parsing
                                if (typeof content === 'string') {
                                    try {
                                        const parsed = JSON.parse(content);
                                        if (Array.isArray(parsed) && parsed.length > 0) {
                                            // Check if it's the new format
                                            const isNewFormat = parsed.some(item => 
                                                item && item.type && (
                                                    item.type === 'heading_no' || 
                                                    item.type === 'heading' || 
                                                    item.type === 'subheading_no' || 
                                                    item.type === 'subheading' || 
                                                    item.type === 'editor'
                                                )
                                            );
                                            if (isNewFormat) {
                                                sectionsData = parsed;
                                                console.log(`Found new format data for year ${year}, type ${type}`);
                                                break;
                                            }
                                        }
                                    } catch (e) {
                                        console.warn(`Could not parse content for ${year}/${type}:`, e);
                                    }
                                } else if (Array.isArray(content) && content.length > 0) {
                                    sectionsData = content;
                                    console.log(`Found new format data (array) for year ${year}, type ${type}`);
                                    break;
                                }
                            }
                        } catch (e) {
                            // Continue to next combination
                            continue;
                        }
                    }
                    if (sectionsData) break;
                }
            } catch (error) {
                console.warn("Error fetching from Template table:", error);
            }
            
            // If not found in Template table, check rowData for content
            if (!sectionsData) {
                // Check for new format in various possible fields
                const possibleData = rowData.templateFields || 
                                    rowData.fields_data || 
                                    rowData.fields || 
                                    rowData.content;
                
                if (possibleData) {
                    if (typeof possibleData === 'string') {
                        try {
                            sectionsData = JSON.parse(possibleData);
                        } catch (e) {
                            console.warn("Could not parse possibleData as JSON:", e);
                        }
                    } else if (Array.isArray(possibleData)) {
                        sectionsData = possibleData;
                    }
                }
            }
        }
        
        const sectionData = {
            ...rowData,
            sectionsData: sectionsData
        };
        
        console.log("Final section data:", sectionData);
        console.log("SectionsData:", sectionsData);
        console.log("Is array?", Array.isArray(sectionsData));
        if (sectionsData && Array.isArray(sectionsData)) {
            console.log("First few items:", sectionsData.slice(0, 5));
        }
        
        setSelectedSection(sectionData);
        setViewDialogVisible(true);
        setLoading(false);
    };



    const actionBodyTemplate = (rowData) => {
        return (
            <div className="d-flex gap-2">
                <Button
                    icon="pi pi-eye"
                    severity="help"
                    text
                    className="p-0 border-0"
                    onClick={() => handleView(rowData)}
                    tooltip="View"
                />
                <Button
                    icon="pi pi-pencil"
                    severity="warning"
                    text
                    className="p-0 border-0"
                    onClick={() => handleEdit(rowData)}
                    tooltip="Edit"
                />
                <CustomConfirmPopup
                    message="Are you sure you want to Delete this Template?"
                    icon="pi pi-exclamation-triangle"
                    acceptClassName='p-button-danger'
                    defaultFocus="reject"
                    title='Delete'
                    buttonLabel="Delete"
                    buttonClass="p-button-danger p-button-text"
                    buttonIcon="pi pi-trash"
                    onConfirm={() => handleAction('delete', rowData.SGHA_T_id)}
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
                            <Breadcrumb.Item active>AnnexureA Section List</Breadcrumb.Item>
                        </Breadcrumb>
                    </Col>
                    <Col md={12} lg={6} className="text-end">
                        <Link to="/dashboard/add_template">
                            <Button
                                label="Template"
                                icon="pi pi-plus"
                                className="py-2"
                                severity='help'
                                style={{ fontSize: '14px' }}
                            />
                        </Link>
                    </Col>
                    <Col md={12} lg={12} className="text-end mt-2">
                        <div className="d-flex align-items-center gap-1 justify-content-end filterDiv">
                            <label className="me-2">Sort By</label>
                            <Form.Select
                                aria-label="Sort Order"
                                style={{ width: '100px' }}
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                            >
                                <option value="ASC">ASC</option>
                                <option value="DESC">DESC</option>
                            </Form.Select>
                            <Form.Select
                                aria-label="Limit"
                                style={{ width: '100px' }}
                                value={perPage}
                                onChange={(e) => setPerPage(Number(e.target.value))}
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
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                />
                            </IconField>
                        </div>
                    </Col>
                    <Col md={6} lg={12} className="mt-4">
                        <Card className='border-0 shadow-sm'>
                            <Card.Body className='p-0'>
                                <DataTable value={sections} paginator rows={10} responsiveLayout="scroll">
                                    <Column field="Section_position" header="Document Position" sortable />
                                    <Column field="template_name" header="Section Heading" />
                                    <Column
                                        field="categories"
                                        header="Categories"
                                        style={{ width: "20%" }}
                                        body={(rowData) => rowData.categories?.map(c => c.name).join(", ")}
                                    />

                                    <Column
                                        field="updatedAt"
                                        header="Last Updated"
                                        style={{ width: "15%" }}
                                        body={(rowData) => formatDate(rowData.updatedAt)} // Formatting date
                                    ></Column>
                                    <Column body={actionBodyTemplate} header="Actions" style={{ width: "200px" }} />
                                </DataTable>

                            </Card.Body>

                        </Card>
                    </Col>
                </Row>
            </Row>

            <Dialog
                visible={viewDialogVisible}
                style={{ width: '70vw', maxHeight: '90vh' }}
                modal
                onHide={() => setViewDialogVisible(false)}
            >
                <Card className="border-0 shadow-0 p-0" style={{ overflow: "auto", maxHeight: '85vh' }}>
                    {selectedSection ? (
                        <Card.Body className="priviewPart p-4">
                            {/* 🔹 Section Metadata */}
                            <div className="mb-3" style={{ background: '#f9f9f9', padding: '15px', borderRadius: '5px' }}>
                                <p className="mb-1"><b>Section Position:</b> {selectedSection.Section_position}</p>
                                <p className="mb-0">
                                    <b>Selected Categories:</b>{" "}
                                    {selectedSection.categories?.map(c => c.name).join(", ") || "—"}
                                </p>
                            </div>
                            
                            {/* 🔹 Dynamic Sections Display */}
                            {(() => {
                                // Check for new format data
                                const sectionsData = selectedSection.sectionsData;
                                
                                console.log("=== RENDERING SECTIONS ===");
                                console.log("sectionsData:", sectionsData);
                                console.log("Type:", typeof sectionsData);
                                console.log("Is array?", Array.isArray(sectionsData));
                                
                                if (sectionsData) {
                                    // Handle string that needs parsing
                                    let parsedData = sectionsData;
                                    if (typeof sectionsData === 'string') {
                                        try {
                                            parsedData = JSON.parse(sectionsData);
                                            console.log("Parsed from string:", parsedData);
                                        } catch (e) {
                                            console.error("Failed to parse sectionsData:", e);
                                        }
                                    }
                                    
                                    // Check if it's an array with the new format
                                    if (Array.isArray(parsedData) && parsedData.length > 0) {
                                        // Check if it's the new format (has type field)
                                        const isNewFormat = parsedData.some(item => 
                                            item && typeof item === 'object' && (
                                                item.type === 'heading_no' || 
                                                item.type === 'heading' || 
                                                item.type === 'subheading_no' || 
                                                item.type === 'subheading' || 
                                                item.type === 'editor'
                                            )
                                        );
                                        
                                        console.log("Is new format?", isNewFormat);
                                        console.log("First item:", parsedData[0]);
                                        
                                        if (isNewFormat) {
                                            return (
                                                <DynamicSectionsList 
                                                    sectionsData={parsedData}
                                                    title={selectedSection.template_name || 'IATA Standard Ground Handling Agreement ANNEX A'}
                                                    serviceTypes={{
                                                        comp: true,
                                                        ramp: false,
                                                        cargo: false
                                                    }}
                                                />
                                            );
                                        } else {
                                            console.warn("Data is array but not new format. First item:", parsedData[0]);
                                        }
                                    } else {
                                        console.warn("sectionsData is not a valid array:", parsedData);
                                    }
                                }
                                
                                // Fallback to old format
                                if (selectedSection.sections && selectedSection.sections.length > 0) {
                                    console.log("Using old format with", selectedSection.sections.length, "sections");
                                    return (
                                        <div>
                                            <h4 className="mb-3">{selectedSection.template_name}</h4>
                                            {selectedSection.sections.map((sec) => (
                                                <div key={sec.SGHA_ST_id} className="mb-4">
                                                    <h5>{sec.subheading}</h5>
                                                    {sec.body && sec.body !== "<p><br></p>" && (
                                                        <AgreementBodyHtml content={sec.body} />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                }
                                
                                return (
                                    <div>
                                        <p className="text-muted">No sections available.</p>
                                        <p className="text-muted small">
                                            Debug: sectionsData = {sectionsData ? 'exists' : 'null'}, 
                                            sections = {selectedSection.sections ? `${selectedSection.sections.length} items` : 'null'}
                                        </p>
                                    </div>
                                );
                            })()}
                        </Card.Body>
                    ) : (
                        <p>Loading...</p>
                    )}
                </Card>
            </Dialog>

        </>
    );
};

export default Section_Template_list;
