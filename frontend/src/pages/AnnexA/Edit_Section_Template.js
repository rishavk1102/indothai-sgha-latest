import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Steps } from "primereact/steps";
import { Row, Col, Card, Breadcrumb, Form, InputGroup, Badge, Tab, Table } from "react-bootstrap";
import { Checkbox } from "primereact/checkbox";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Sidebar } from 'primereact/sidebar';
import { Editor } from "primereact/editor";
import { IoChevronBackOutline } from "react-icons/io5";
import { InputTextarea } from "primereact/inputtextarea";
import { FaArrowUp, FaArrowDown, FaTrash } from "react-icons/fa";
import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import { getSocket } from "../../context/socket";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import GifLoder from '../../interfaces/GifLoder';
import { Dialog } from "primereact/dialog";
import DOMPurify from 'dompurify';

const Edit_Section_Template = () => {
    const { roleId } = useAuth(); // Get roleId from the context
    const PAGE_NAME = "Section Template"; // Page name for permission checking
    const { SGHA_T_id } = useParams();
    const [unauthorized, setUnauthorized] = useState(false); // Show Dialog if error
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const goBack = () => navigate(-1);
    const socket = getSocket();

    // 🔹 Category states
    const [catOptions, setCatOptions] = useState([]);
    // 🔹 State for selected categories
    const [selectedCats, setSelectedCats] = useState([]);

    // 🔹 Handle checkbox change
    const onCategoryChange = (e) => {
        let _selectedCats = [...selectedCats];

        if (e.checked) {
            _selectedCats.push(e.value);   // add category_id
        } else {
            _selectedCats = _selectedCats.filter((id) => id !== e.value); // remove category_id
        }

        setSelectedCats(_selectedCats);
    };

    const renderHeader = () => {
        return (
            <span className="ql-formats">
                <button className="ql-bold" aria-label="Bold"></button>
                <button className="ql-italic" aria-label="Italic"></button>
                <button className="ql-underline" aria-label="Underline"></button>
                <button className="ql-list" value="bullet" aria-label="Bullet List"></button>
                <button className="ql-list" value="ordered" aria-label="Numbered List"></button>
            </span>
        );
    };
    const header = renderHeader();
    // Form states
    const [templateName, setTemplateName] = useState("");
    const [sectionPosition, setSectionPosition] = useState("");
    const [items, setItems] = useState([
        { SGHA_section_Subheading: "", SGHA_Section_body: "" }
    ]);

    // Sidebar states
    const [visibleRight, setVisibleRight] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [stepItems, setStepItems] = useState([]);
    const [stepContents, setStepContents] = useState([]);

    const addItem = () => {
        setItems([...items, { SGHA_section_Subheading: "", SGHA_Section_body: "" }]);
    };

    const deleteItem = (index) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const updateItem = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };


    useEffect(() => {
        const steps = items.map((item, idx) => ({
            label: item.SGHA_section_Subheading || `Step ${idx + 1}`
        }));

        const contents = items.map((item) => (
            <div>
                <h5>{item.SGHA_section_Subheading}</h5>
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.SGHA_Section_body) }} />
            </div>
        ));

        setStepItems(steps);
        setStepContents(contents);
    }, [items]);


    const nextStep = () => {
        if (activeIndex < stepItems.length - 1) {
            setActiveIndex(activeIndex + 1);
        } else {
            // ✅ Already on the last step → close sidebar
            setVisibleRight(false);
        }
    };

    const prevStep = () => {
        if (activeIndex > 0) {
            setActiveIndex(activeIndex - 1);
        }
    };



    // 🔹 Fetch flight types using socket
    useEffect(() => {
        if (!socket) return;

        socket.emit("fetch-categories", {
            role_id: roleId,
            page_name: PAGE_NAME,
        });

        const handleSuccess = (data) => {
            const formatted = data.map((cat) => ({
                label: cat.name,
                value: cat.category_id,
            }));
            setCatOptions(formatted);
        };

        const handleError = (error) => {
            const isPermissionError =
                error.message?.includes("Missing role_id") ||
                error.message?.includes("Page") ||
                error.message?.includes("Permission denied");

            if (isPermissionError) {
                setUnauthorized(true);
            } else {
                console.warn("Error fetching flight types:", error.message);
                setCatOptions([]);
            }
            setLoading(false);
        };

        socket.on("fetch-categories-success", handleSuccess);
        socket.on("fetch-categories-error", handleError);

        return () => {
            socket.off("fetch-categories-success", handleSuccess);
            socket.off("fetch-categories-error", handleError);
        };
    }, [roleId, PAGE_NAME, socket]);



    useEffect(() => {
        if (!socket || !SGHA_T_id) return;

        setLoading(true);

        socket.emit("fetch-sgha-template", {
            role_id: roleId,
            page_name: PAGE_NAME,
            SGHA_T_id, // comes from useParams()
        });

        const handleSuccess = (template) => {
            // ✅ Set template name & position
            setTemplateName(template.template_name || "");
            setSectionPosition(template.Section_position || "");

            // ✅ Pre-fill categories
            setSelectedCats(template.categories?.map((c) => c.category_id) || []);

            // ✅ Pre-fill sections (items state)
            setItems(
                template.sections?.map((sec) => ({
                    SGHA_section_Subheading: sec.subheading || "",
                    SGHA_Section_body: sec.body || "",
                })) || [{ SGHA_section_Subheading: "", SGHA_Section_body: "" }]
            );

            setLoading(false);
        };

        const handleError = (error) => {
            console.error("❌ Error fetching SGHA Template:", error.message);
            if (
                error.message?.includes("Missing role_id") ||
                error.message?.includes("Page") ||
                error.message?.includes("Permission denied")
            ) {
                setUnauthorized(true);
            }
            setLoading(false);
        };

        socket.on("fetch-sgha-template-success", handleSuccess);
        socket.on("fetch-sgha-template-error", handleError);

        return () => {
            socket.off("fetch-sgha-template-success", handleSuccess);
            socket.off("fetch-sgha-template-error", handleError);
        };
    }, [roleId, PAGE_NAME, socket, SGHA_T_id]);



    const handleSave = async () => {
        try {
            setLoading(true);

            const payload = {
                template_name: templateName,
                Section_position: sectionPosition,
                sections: items.map(i => ({
                    SGHA_section_Subheading: i.SGHA_section_Subheading,
                    SGHA_Section_body: i.SGHA_Section_body,
                })),
                categories: selectedCats,
            };

            const response = await api.put(`/sgha_annex_template/update_sgha_template/${SGHA_T_id}/${PAGE_NAME}`, payload);
            if (response.status === 200) {
                navigate('/dashboard/sectiontemplatelist');
            }

        } catch (error) {
            console.error("❌ Error adding section:", error);
            if (error.response?.status === 403) {
                setUnauthorized(true);
            }
        } finally {
            setLoading(false);
        }
    };


    const handleDialogHide = () => navigate(-1);


    // Unauthorized UI
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

    // Loading UI
    if (loading) {
        return <div className='loderDiv'><GifLoder /></div>;
    }

    return (
        <>
            <Row className="mx-0 align-items-center d-fltx mb-5" >
                <Col md={12} lg={5}>
                    <Breadcrumb className="mb-0">
                        <Breadcrumb.Item onClick={goBack}>
                            <IoChevronBackOutline /> Back
                        </Breadcrumb.Item>
                        <Breadcrumb.Item active>Edit Section</Breadcrumb.Item>
                    </Breadcrumb>
                </Col>
            </Row>
            <Row className="mx-0 mb-3">
                <Card className="border-0 shadow-sm p-0">
                    <Card.Header className="border-0 shadow-sm" style={{ background: 'rgba(255, 234, 213, 0.5)' }}>
                        <Row className="mx-0 align-items-center">
                            <Col lg={3}>
                                <div className="d-flex flex-column">
                                    <label style={{ fontWeight: '500' }}>Section Number <sup className="text-danger">*</sup></label>
                                    <InputText
                                        value={sectionPosition}
                                        className="100%"
                                        placeholder="Add Section Number"
                                        onChange={(e) => setSectionPosition(e.target.value)}
                                    />
                                </div>
                            </Col>
                            <Col lg={9}>
                                <div className="d-flex flex-column">
                                    <label style={{ fontWeight: '500' }}>Section Header <sup className="text-danger">*</sup></label>
                                    <InputText
                                        value={templateName}
                                        className="w-100"
                                        placeholder="Add Section Header"
                                        onChange={(e) => setTemplateName(e.target.value)}
                                    />
                                </div>
                            </Col>
                            <Col lg={12} className="mt-3">
                                <label style={{ fontWeight: '500' }}>Service Type</label>
                                <div className="d-flex gap-4 justify-content-start pt-2 pb-3">
                                    {catOptions.map((cat) => (
                                        <div key={cat.value} className="flex align-items-center">
                                            <Checkbox
                                                inputId={`cat-${cat.value}`}
                                                value={cat.value} // category_id
                                                onChange={onCategoryChange}
                                                checked={selectedCats.includes(cat.value)}
                                            />
                                            <label htmlFor={`cat-${cat.value}`} className="ms-2">
                                                <b>{cat.label}</b>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </Col>
                        </Row>
                    </Card.Header>
                    <Card.Body>
                        <ul style={{ maxHeight: "65vh", overflowY: "auto" }} className="subsectionSGHA">
                            {items.map((item, index) => (
                                <li key={index}>
                                    <div className="w-100 pe-lg-5">
                                        <label style={{ fontWeight: '500' }}>Sub Section</label>
                                        <InputText
                                            value={item.SGHA_section_Subheading}
                                            className="w-100"
                                            onChange={(e) => updateItem(index, "SGHA_section_Subheading", e.target.value)}
                                        />

                                        <Editor
                                            value={item.SGHA_Section_body}
                                            onTextChange={(e) => updateItem(index, "SGHA_Section_body", e.htmlValue)}
                                            headerTemplate={header}
                                            className="mt-2 bg-light"
                                            style={{ height: '250px' }}
                                        />
                                    </div>
                                    {index !== 0 && (
                                        <Button
                                            icon="pi pi-times"
                                            severity="danger"
                                            className="p-0"
                                            style={{ width: '30px', position: 'absolute', right: '0', top: '10px' }}
                                            text
                                            onClick={() => deleteItem(index)}
                                        />
                                    )}
                                </li>
                            ))}
                        </ul>

                        <div className="d-flex justify-content-end bg-white border-0 shadow-0 py-2">
                            <Button
                                label="Sub Sec"
                                icon="pi pi-plus"
                                severity="secondary"
                                className="py-1 px-3"
                                iconPos="left"
                                style={{ fontSize: "13px" }}
                                onClick={addItem}
                            />
                        </div>
                    </Card.Body>
                    <Card.Footer className="d-flex justify-content-end bg-white border-0 shadow-0 pt-3 pb-2">
                        <Button
                            label="Save Section"
                            icon="pi pi-save"
                            severity="success"
                            className="py-2"
                            iconPos="left"
                            style={{ fontSize: '14px' }}
                            onClick={handleSave}
                        />
                        <Button
                            label="View Section"
                            icon="pi pi-eye"
                            severity="warning"
                            className="py-2 ms-2"
                            iconPos="left"
                            style={{ fontSize: '14px' }}
                            onClick={() => {
                                setVisibleRight(true);
                                setActiveIndex(0);
                            }}
                        />
                    </Card.Footer>
                </Card>
            </Row>
            <Sidebar visible={visibleRight} position="right" onHide={() => setVisibleRight(false)} style={{ width: '75vw' }}>
                <Row className="mx-0 pt-4">
                    <div className="mt-4 p-lg-4">
                        <h5>{templateName}</h5>

                    </div>
                    <Steps
                        model={stepItems}
                        activeIndex={activeIndex}
                        onSelect={(e) => setActiveIndex(e.index)}
                        readOnly={false}
                    />

                    <div className="mt-4 p-lg-4 SidBodyText">
                        {stepContents[activeIndex]}
                    </div>

                    <div className="d-flex justify-content-between mt-4 sidButtonpart">
                        <Button
                            tooltip="Previous"
                            icon="pi pi-arrow-left"
                            severity="warning"
                            className="py-2"
                            onClick={prevStep}
                            disabled={activeIndex === 0}
                            tooltipOptions={{ position: "top" }}
                        />
                        <Button
                            tooltip={activeIndex === stepItems.length - 1 ? "Finish" : "Next"}
                            icon="pi pi-arrow-right"
                            iconPos="right"
                            severity="warning"
                            className="py-2"
                            onClick={nextStep}
                            tooltipOptions={{ position: "top" }}
                        />
                    </div>
                </Row>
            </Sidebar>

        </>
    )
}

export default Edit_Section_Template;