import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Steps } from "primereact/steps";
import { Row, Col, Card, Breadcrumb } from "react-bootstrap";
import { Checkbox } from "primereact/checkbox";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Sidebar } from "primereact/sidebar";
import { IoChevronBackOutline } from "react-icons/io5";
import { Dialog } from "primereact/dialog";
import { Editor } from "primereact/editor";
import { getSocket } from "../../context/socket";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import GifLoder from "../../interfaces/GifLoder";

import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

const Add_Section_Template = () => {
    const { roleId } = useAuth();
    const PAGE_NAME = "Section Template";

    const [unauthorized, setUnauthorized] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const goBack = () => navigate(-1);
    const socket = getSocket();

    // 🔹 Categories
    const [catOptions, setCatOptions] = useState([]);
    const [selectedCats, setSelectedCats] = useState([]);

    const onCategoryChange = (e) => {
        if (e.checked) {
            setSelectedCats([e.value]); // select new one
        } else {
            setSelectedCats([]); // unselect if clicked again
        }
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

    // 🔹 Form states
    const [templateName, setTemplateName] = useState("");
    const [sectionPosition, setSectionPosition] = useState("");
    const [items, setItems] = useState([
        { code: "", SGHA_section_Subheading: "", subchilds: [] }
    ]);

    // 🔹 Sidebar states
    const [visibleRight, setVisibleRight] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [stepItems, setStepItems] = useState([]);
    const [stepContents, setStepContents] = useState([]);

    const addItem = () => {
        setItems([...items, { code: "", SGHA_section_Subheading: "", subchilds: [] }]);
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
            <div key={item.code}>
                <h5>
                    {item.code} - {item.SGHA_section_Subheading}
                </h5>
                {item.subchilds?.length > 0 && (
                    <ul>
                        {item.subchilds.map((sc) => (
                            <li key={sc.code}>
                                {sc.code} - {sc.SGHA_section_Subheading}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        ));

        setStepItems(steps);
        setStepContents(contents);
    }, [items]);

    /*----------- SubChild handlers --------------*/
    const addSubChild = (parentIndex) => {
        const newItems = [...items];
        newItems[parentIndex].subchilds.push({
            code: "",
            SGHA_section_Subheading: ""
        });
        setItems(newItems);
    };

    const updateSubChild = (parentIndex, childIndex, field, value) => {
        const newItems = [...items];
        newItems[parentIndex].subchilds[childIndex][field] = value;
        setItems(newItems);
    };

    const deleteSubChild = (parentIndex, childIndex) => {
        const newItems = [...items];
        newItems[parentIndex].subchilds.splice(childIndex, 1);
        setItems(newItems);
    };

    const nextStep = () => {
        if (activeIndex < stepItems.length - 1) {
            setActiveIndex(activeIndex + 1);
        } else {
            setVisibleRight(false);
        }
    };

    const prevStep = () => {
        if (activeIndex > 0) {
            setActiveIndex(activeIndex - 1);
        }
    };

    // 🔹 Fetch categories via socket
    useEffect(() => {
        if (!socket) return;

        socket.emit("fetch-categories", {
            role_id: roleId,
            page_name: PAGE_NAME
        });

        const handleSuccess = (data) => {
            const formatted = data.map((cat) => ({
                label: cat.name,
                value: cat.category_id
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
                console.warn("Error fetching categories:", error.message);
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

    /*----------- Save Template --------------*/
    const handleSave = async () => {
        try {
            setLoading(true);

            const payload = {
                template_name: templateName,
                Section_position: sectionPosition,
                sections: items.map((i) => ({
                    code: i.code,
                    title: i.SGHA_section_Subheading,
                    subsecs:
                        i.subchilds?.map((child) => ({
                            code: child.code,
                            title: child.SGHA_section_Subheading
                        })) || []
                })),
                category_ids: selectedCats
            };

            const response = await api.post(`/annxroutes/add_template`, payload);

            if (response.status === 201) {
                navigate("/dashboard/sectiontemplatelist");
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
                style={{ width: "360px" }}
                visible={unauthorized}
                onHide={handleDialogHide}
                closable={false}
                dismissableMask={false}
            >
                <div className="text-center">
                    <img
                        src="https://blackboxstorage.blr1.cdn.digitaloceanspaces.com/assetImages/protect.png"
                        alt="symbol"
                        width="100"
                        className="mb-3"
                    />
                    <h5>Unauthorized</h5>
                    <p>You are not authorized</p>
                    <Button
                        label="Go Back"
                        icon="pi pi-arrow-left"
                        className="py-2 mt-3 text-white"
                        style={{ fontSize: "14px" }}
                        severity="danger"
                        onClick={handleDialogHide}
                    />
                </div>
            </Dialog>
        );
    }

    // Loading UI
    if (loading) {
        return <div className="loderDiv"><GifLoder /></div>;
    }

    return (
        <>
            <Row className="mx-0 align-items-center d-fltx mb-5">
                <Col md={12} lg={5}>
                    <Breadcrumb className="mb-0">
                        <Breadcrumb.Item onClick={goBack}>
                            <IoChevronBackOutline /> Back
                        </Breadcrumb.Item>
                        <Breadcrumb.Item active>Add Section</Breadcrumb.Item>
                    </Breadcrumb>
                </Col>
            </Row>

            <Row className="mx-0 mb-3">
                <Card className="border-0 shadow-sm p-0">
                    <Card.Header
                        className="border-0 shadow-sm"
                        style={{ background: "rgba(255, 234, 213, 0.5)" }}
                    >
                        <Row className="mx-0 align-items-center">
                            <Col lg={3}>
                                <div className="d-flex flex-column">
                                    <label style={{ fontWeight: "500" }}>
                                        Section Number <sup className="text-danger">*</sup>
                                    </label>
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
                                    <label style={{ fontWeight: "500" }}>
                                        Section Header <sup className="text-danger">*</sup>
                                    </label>
                                    <InputText
                                        value={templateName}
                                        className="w-100"
                                        placeholder="Add Section Header"
                                        onChange={(e) => setTemplateName(e.target.value)}
                                    />
                                </div>
                            </Col>
                            <Col lg={12} className="mt-3">
                                <label style={{ fontWeight: "500" }}>Service Type</label>
                                <div className="d-flex gap-4 justify-content-start pt-2 pb-3">
                                    {catOptions.map((cat) => (
                                        <div key={cat.value} className="flex align-items-center">
                                            <Checkbox
                                                inputId={`cat-${cat.value}`}
                                                value={cat.value}
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
                        <ul
                            style={{ maxHeight: "65vh", overflowY: "auto" }}
                            className="subsectionSGHA p-0"
                        >
                            {items.map((item, index) => (
                                <li key={index}>
                                    <div className="w-100">
                                        <label style={{ fontWeight: "500" }}>Section Code</label>
                                        <InputText
                                            value={item.code}
                                            className="w-100 mb-2"
                                            onChange={(e) => updateItem(index, "code", e.target.value)}
                                        />

                                        <label style={{ fontWeight: "500" }}>Sub Section</label>
                                        <InputText
                                            value={item.SGHA_section_Subheading}
                                            className="w-100"
                                            onChange={(e) =>
                                                updateItem(index, "SGHA_section_Subheading", e.target.value)
                                            }
                                        />

                                        <div className="mt-2 ps-lg-5">
                                            {item.subchilds?.map((child, cIndex) => (
                                                <div
                                                    key={cIndex}
                                                    className="subchilds mt-3"
                                                    style={{ position: "relative" }}
                                                >
                                                    <label style={{ fontWeight: "500" }}>Sub Child Code</label>
                                                    <InputText
                                                        value={child.code}
                                                        className="w-100 mb-2"
                                                        onChange={(e) =>
                                                            updateSubChild(index, cIndex, "code", e.target.value)
                                                        }
                                                    />

                                                    <label style={{ fontWeight: "500" }}>Sub Child Section</label>
                                                     <Editor
                                                        value={child.SGHA_section_Subheading}
                                                        className="mt-2 bg-light"
                                                        headerTemplate={header}
                                                        style={{ height: "100px" }}
                                                        onChange={(e) =>
                                                            updateSubChild(
                                                                index,
                                                                cIndex,
                                                                "SGHA_section_Subheading",
                                                                e.target.value
                                                            )
                                                        }
                                                    />

                                                    <Button
                                                        icon="pi pi-times"
                                                        severity="danger"
                                                        className="p-0"
                                                        style={{
                                                            width: "30px",
                                                            position: "absolute",
                                                            right: "0",
                                                            top: "10px"
                                                        }}
                                                        text
                                                        onClick={() => deleteSubChild(index, cIndex)}
                                                    />
                                                </div>
                                            ))}

                                            <Button
                                                label="Sub child"
                                                icon="pi pi-plus"
                                                severity="secondary"
                                                className="py-1 px-3 mt-2"
                                                iconPos="left"
                                                style={{ fontSize: "13px", height: "30px" }}
                                                onClick={() => addSubChild(index)}
                                            />
                                        </div>
                                    </div>

                                    {index !== 0 && (
                                        <Button
                                            icon="pi pi-times"
                                            severity="danger"
                                            className="p-0"
                                            style={{
                                                width: "30px",
                                                position: "absolute",
                                                right: "0",
                                                top: "10px"
                                            }}
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
                                severity="help"
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
                            style={{ fontSize: "14px" }}
                            onClick={handleSave}
                        />
                        <Button
                            label="View Section"
                            icon="pi pi-eye"
                            severity="warning"
                            className="py-2 ms-2"
                            iconPos="left"
                            style={{ fontSize: "14px" }}
                            onClick={() => {
                                setVisibleRight(true);
                                setActiveIndex(0);
                            }}
                        />
                    </Card.Footer>
                </Card>
            </Row>

            <Sidebar
                visible={visibleRight}
                position="right"
                onHide={() => setVisibleRight(false)}
                style={{ width: "75vw" }}
            >
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
    );
};

export default Add_Section_Template;
