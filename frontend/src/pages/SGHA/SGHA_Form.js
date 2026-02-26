import { Accordion, AccordionTab } from 'primereact/accordion';
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Chip } from 'primereact/chip';
import { Dialog } from 'primereact/dialog';
import { Sidebar } from 'primereact/sidebar';
import { Steps } from "primereact/steps";
import React, { useEffect, useRef, useState } from 'react';
import { Card, Col, Form, InputGroup, Row, Table } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getSocket } from "../../context/socket";
import GifLoder from '../../interfaces/GifLoder';


const SGHA_Form = () => {
     const { role, roleId } = useAuth();
    const PAGE_NAME = "SGHA FORM";
    const socket = getSocket();
    const [loading, setLoading] = useState(false);
    const [unauthorized, setUnauthorized] = useState(false);
    const navigate = useNavigate();

    const handleDialogHide = () => navigate(-1);


    const [visibleRight, setVisibleRight] = useState(false);
    
      // State for cards
      const [currentCardIndex, setCurrentCardIndex] = useState(0);
    
      // State for vertical stepper
      const [activeIndex, setActiveIndex] = useState(0);
    
      // 8 Steps
      const steps = [
        { label: "1.1 Representation" },
        { label: "1.2 Administrative Functions" },
        { label: "1.3 Supervision and/or Coordination" },
        { label: "1.4 Station Management" },
        // { label: "Step 5" },
        // { label: "Step 6" },
        // { label: "Step 7" },
        // { label: "Step 8" }
      ];
    
      // Card navigation
      const nextCard = () => {
        if (currentCardIndex < 2) {
          setCurrentCardIndex((prev) => prev + 1);
        }
      };
    
      const prevCard = () => {
        if (currentCardIndex > 0) {
          setCurrentCardIndex((prev) => prev - 1);
        }
      };
    
      // Stepper navigation
      const nextStep = () => {
        if (activeIndex < steps.length - 1) {
          setActiveIndex((prev) => prev + 1);
        }
      };
    
      const prevStep = () => {
        if (activeIndex > 0) {
          setActiveIndex((prev) => prev - 1);
        }
      };
    
      const [ingredients, setIngredients] = useState([]);
    
      const onIngredientsChange = (e) => {
          let _ingredients = [...ingredients];
    
          if (e.checked)
              _ingredients.push(e.value);
          else
              _ingredients.splice(_ingredients.indexOf(e.value), 1);
    
          setIngredients(_ingredients);
      }
    
      /*--------------show hide comment box-------------*/
    
      const [showInput, setShowInput] = useState(false);
      const [comment, setComment] = useState("");
    
      const handleAddClick = () => {
        setShowInput(true);
      };
    
      const handleCancel = () => {
        setShowInput(false);
        setComment(""); // clear input
      };
    
      const handleSend = () => {
        console.log("Comment submitted:", comment);
        setComment("");
        setShowInput(false);
      };
    
    /*---------------For Last Step---------------*/
       const stepsRef = useRef(null);
      const items = [
        { label: "Handling Services & Charges", command: () => setActiveIndex(0) },
        { label: "Additional Services & Charges", command: () => setActiveIndex(1) },
        { label: "Disbursements", command: () => setActiveIndex(2) },
        { label: "Training", command: () => setActiveIndex(3) },
        { label: "Limit of Liability", command: () => setActiveIndex(4) },
        { label: "Transfer of Services", command: () => setActiveIndex(5) },
        { label: "Payment", command: () => setActiveIndex(6) },
        { label: "Supervision & Administration", command: () => setActiveIndex(7) },
        { label: "Use of Yllow Pages", command: () => setActiveIndex(8) },
        { label: "Duration, Modification & Termination", command: () => setActiveIndex(9) },
        { label: "Notification", command: () => setActiveIndex(10) },
        { label: "Governing Law", command: () => setActiveIndex(11) },
      ];
    
      // Auto scroll active step into view
      useEffect(() => {
        const activeStep = stepsRef.current?.querySelector(".p-steps-item.p-highlight");
        if (activeStep) {
          activeStep.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
          });
        }
      }, [activeIndex]);
    
      const handleNext = () => {
        if (activeIndex < items.length - 1) {
          setActiveIndex((prev) => prev + 1);
        } else {
          alert("🎉 Finished all steps!");
        }
      };


      /*-----------------Add remove table column---------------------*/
      
        const [rows, setRows] = useState([
          { subSection: "3.4.1 (a)(c)1", description: "GPU", perUnit: "", rate: "" },
          { subSection: "3.4.1 (a)(c)5", description: "Air Starter Unit", perUnit: "", rate: "" },
        ]);
  
        // Add new row (empty inputs)
        const addRow = () => {
          setRows([
            ...rows,
            { subSection: "", description: "", perUnit: "", rate: "" }
          ]);
        };
  
        // Remove row
        const removeRow = (index) => {
          setRows(rows.filter((_, i) => i !== index));
        };
  
        // Handle input change
        const handleChange = (rowIndex, key, value) => {
          const updatedRows = [...rows];
          updatedRows[rowIndex][key] = value;
          setRows(updatedRows);
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
        <Row className="justify-content-center">
        <Col lg={12} className="p-0 mt-4 overflow-hidden">
          <div className="slide-container">
            {/* Card 1 */}
            {currentCardIndex === 0 && (
              <Card className="border-0">
                <Card.Header className="d-flex justify-content-between align-items-center border-0 shadow-0" style={{background:'#f6e9f7'}}>
                  <h5 className='mb-0'>Main Agreemnet</h5>
                </Card.Header>
                <Card.Body className="pt-5">
                  <Row className="mx-0">
                    <Col md={12} lg={4} className="pe-lg-3 border-end">
                      <div className="SghaTable border-0 pb-2 mb-3 sticky-top" >
                        <Button
                          icon="pi pi-pencil"
                          className="p-1 sigedit"
                          label="Edit"
                          tooltipOptions="left"
                          severity="danger"
                          text
                          onClick={() => setVisibleRight(true)}
                        />
                        <Table className="table">
                          <tbody>
                            <tr>
                              <td colspan="2" className="d-flex flex-column gap-2">
                                <span>An Agreement made between :</span>
                                <b className="mb-0">Malindo Airways SDN BHD</b>
                              </td>
                            </tr>
                            <tr>
                              <td colspan="2" className="d-flex flex-column gap-2">
                                <span>having its principal office at·</span>
                                <b className="mb-0">Petaling Jaya, Malaysia</b>
                              </td>
                            </tr>
                            <tr>
                              <td colspan="2">hereinafter referred to as the 'Carrier' or the 'Handling Company' as the case may be,</td>
                            </tr>
                            <tr>
                              <td colspan="2" className="d-flex flex-column gap-2">
                                <span>and:</span>
                                <b className="mb-0">INDOTHAI KOLKATA PRIVATE LIMITED</b>
                              </td>
                            </tr>
                            <tr>
                              <td colspan="2" className="d-flex flex-column gap-2">
                                <span>having its principal office at·</span>
                                <b className="mb-0">Kolkata, IN</b>
                              </td>
                            </tr>
                            <tr>
                              <td colspan="2">hereinafter referred to as the 'Handling Company' or the 'Carrier', as the case may be, the Carrier and/or the Handling Company may hereinafter be referred to as the "Party(ies)" Whereby all the parties agree as follows:</td>
                            </tr>
                          </tbody>
                        </Table>
                      </div>
                    </Col>
                    <Col md={12} lg={8} className="ps-lg-5">

                    </Col>
                  </Row>
                </Card.Body>
                <Card.Footer className="d-flex align-items-center justify-content-end bg-white shadow py-3">
                  <Button 
                    label="Next"
                    icon="pi pi-arrow-right"
                    severity="help"
                    className="py-2"
                    iconPos="right"
                    onClick={nextCard}
                  />
                </Card.Footer>
              </Card>
            )}

            {/* Card 2 with stepper */}
            {currentCardIndex === 1 && (
              <Card className="border-0 shadow-sm">
                <Card.Header className="d-flex align-items-center justify-content-center border-0 shadow-0" style={{background:'#f6e9f7'}}>
                  {/* <Button
                    tooltip="Previous"
                    tooltipOptions="left"
                    icon="pi pi-arrow-left"
                    severity="secondary"
                    outlined
                    className="p-1"
                    iconPos="left"
                    onClick={prevCard}
                    style={{height:'fit-content'}}
                  /> */}
                  <div className='d-flex justify-content-center align-items-center flex-column gap-2 mb-3'>
                    <h6>IATA Standard Ground Handling Agreement ANNEX A - Ground Handling Services</h6>
                    <div className="d-flex gap-4">
                      <div className="d-flex align-items-center">
                        <Checkbox 
                          inputId="ingredient1" 
                          name="servic" 
                          value="Comp" 
                          checked={true}   // always active
                        />
                        <label htmlFor="ingredient1" className="ms-2"><b>COMP</b></label>
                      </div>
      
                      <div className="d-flex align-items-center">
                        <Checkbox 
                          inputId="ingredient2" 
                          name="servic" 
                          value="Ramp" 
                          checked={false}   // always active
                        />
                        <label htmlFor="ingredient2" className="ms-2"><b>Ramp</b></label>
                      </div>
      
                      <div className="d-flex align-items-center">
                        <Checkbox 
                          inputId="ingredient3" 
                          name="servic" 
                          value="Cargo" 
                          checked={false}  // inactive
                        />
                        <label htmlFor="ingredient3" className="ms-2"><b>Cargo</b></label>
                      </div>
                    </div>
                  </div>
                  {/* <Button 
                    tooltip="Next"
                    tooltipOptions={{ position: "left" }}
                    icon="pi pi-arrow-right"
                    severity="help"
                    outlined
                    className="p-1"
                    iconPos="right"
                    onClick={nextCard}
                    style={{height:'fit-content'}}
                  /> */}
                </Card.Header>
                <Card.Body className="pt-5">
                  <Row className="mx-0">
                    <Col md={12} lg={4} className="pe-lg-3 border-end">
                      <div className="SghaTable border-0 pb-0 mb-3 sticky-top" >
                          <Table className="table">
                            <tbody>
                              <tr>
                                <td colspan="2" className="d-flex flex-column gap-2">
                                  <span>An Agreement made between :</span>
                                  <b className="mb-0 w-100">Malindo Airways SDN BHD</b>
                                </td>
                              </tr>
                              <tr>
                                <td colspan="2" className="d-flex flex-column gap-2">
                                  <span>having its principal office at·</span>
                                  <b className="mb-0 w-100">Petaling Jaya, Malaysia</b>
                                </td>
                              </tr>
                              <tr>
                                <td colspan="2">hereinafter referred to as the 'Carrier' or the 'Handling Company' as the case may be,</td>
                              </tr>
                              <tr>
                                <td colspan="2" className="d-flex flex-column gap-2">
                                  <span>and:</span>
                                  <b className="mb-0 w-100">INDOTHAI KOLKATA PRIVATE LIMITED</b>
                                </td>
                              </tr>
                              <tr>
                                <td colspan="2" className="d-flex flex-column gap-2">
                                  <span>having its principal office at·</span>
                                  <b className="mb-0 w-100">Kolkata, IN</b>
                                </td>
                              </tr>
                              <tr>
                                <td colspan="2">hereinafter referred to as the 'Handling Company' or the 'Carrier', as the case may be, the Carrier and/or the Handling Company may hereinafter be referred to as the "Party(ies)" Whereby all the parties agree as follows:</td>
                              </tr>
                            </tbody>
                          </Table>
                      </div>
                    </Col>
                    <Col md={12} lg={8} className="ps-lg-5">
                      <Accordion activeIndex={0}>
                        <AccordionTab 
                          header={
                            <div className="d-flex justify-content-between align-items-center">
                              <span>SECTION 1. MANAGEMENT AND ADMINISTRATIVE FUNCTIONS</span>
                              <span><i className="pi pi-check"></i></span>
                            </div>
                          }
                        >
                          <Card className="h-auto border-0 shadow-0">
                            <Card.Body>
                                <div className="vertical-stepper-container">
                        
                                  {/* Stepper Sidebar */}
                                  <div className="vertical-stepper-sidebar">
                                    <Steps
                                      model={steps}
                                      activeIndex={activeIndex}
                                      onSelect={(e) => setActiveIndex(e.index)}
                                      readOnly={false}
                                      orientation="vertical"
                                    />
                                    <div style={{ marginTop: "20px" }}>
                                      
                                    </div>
                                  </div>

                                  <div className="vertical-stepper-content" style={{ flex: 1, marginLeft: "20px" }}>
                                    <div className="step-content-box">
                                      <h6>{steps[activeIndex].label}</h6>
                                      <p>This is the content for {steps[activeIndex].label}</p>
                                    </div>
                                  </div>
                                </div>
                            </Card.Body>
                            <Card.Footer className="d-flex justify-content-between bg-white border-0 shadow-0">
                              <div className="w-75">
                                {!showInput ? (
                                  <Button 
                                    variant="outline-secondary" 
                                    onClick={handleAddClick}
                                    label="Add Comment"
                                    className="py-1"
                                    outlined
                                    severity="help"
                                  />
                                ) : (
                                  <InputGroup>
                                    <Form.Control
                                      placeholder="Write a comment..."
                                      value={comment}
                                      onChange={(e) => setComment(e.target.value)}
                                    />
                                    <Button 
                                      variant="primary" 
                                      onClick={handleSend}
                                      tooltip="Send"
                                      severity="help"
                                      icon="pi pi-send"
                                      className="py-2"
                                    />
                                    <Button 
                                      variant="danger" 
                                      onClick={handleCancel}
                                      tooltip="Cancel"
                                      icon="pi pi-times"
                                      severity="secondary"
                                      className="py-2"
                                    />
                                  </InputGroup>
                                )}
                              </div>
                              <div>
                                <Button
                                    icon="pi pi-chevron-left"
                                    tooltip='Prv'
                                    severity="warning"
                                    className="py-1 me-2"
                                    iconPos="left"
                                    onClick={prevStep}
                                    disabled={activeIndex === 0}
                                />
                                <Button
                                    icon="pi pi-chevron-right"
                                    severity="warning"
                                    tooltip='Next'
                                    tooltipOptions="left"
                                    className="py-1"
                                    iconPos="right"
                                    onClick={nextStep}
                                    disabled={activeIndex === steps.length - 1}
                                />
                              </div>
                            </Card.Footer>
                          </Card>
                        </AccordionTab>
                        <AccordionTab 
                            header={
                              <div className="d-flex justify-content-between align-items-center">
                                <span>SECTION 2. PASSENGER SERVICES</span>
                                <span><i className="pi pi-check"></i></span>
                              </div>
                            }
                        >
                          <p>NO Data</p>
                        </AccordionTab>
                          <AccordionTab
                            header={
                            <div className="d-flex justify-content-between align-items-center">
                              <span>SECTION 3. RAMP SERVICES</span>
                              <span><i className="pi pi-times"></i></span>
                            </div>
                          }
                          >
                          <p>NO Data</p>
                        </AccordionTab>
                          <AccordionTab
                            header={
                              <div className="d-flex justify-content-between align-items-center">
                                <span>SECTION 4. LOAD CONTROL AND FLIGHT OPERATIONS</span>
                                <span><i className="pi pi-times"></i></span>
                              </div>
                            }
                          >
                          <p>NO Data</p>
                        </AccordionTab>
                          <AccordionTab
                            header={
                              <div className="d-flex justify-content-between align-items-center">
                                <span>SECTION 5. CARGO AND MAIL SERVICES</span>
                                <span><i className="pi pi-times"></i></span>
                              </div>
                          }
                          >
                          <p>NO Data</p>
                        </AccordionTab>
                          <AccordionTab 
                            header={
                              <div className="d-flex justify-content-between align-items-center">
                                <span>SECTION 6. SUPPORT SERVICES</span>
                                <span><i className="pi pi-check"></i></span>
                              </div>
                            }
                          >
                          <p>NO Data</p>
                        </AccordionTab>
                          <AccordionTab 
                            header={
                              <div className="d-flex justify-content-between align-items-center">
                                <span>SECTION 7. SECURITY</span>
                                <span><i className="pi pi-check"></i></span>
                              </div>
                            }
                          >
                          <p>NO Data</p>
                        </AccordionTab>
                        <AccordionTab 
                          header={
                            <div className="d-flex justify-content-between align-items-center">
                                <span>SECTION 8. AIRCRAFT MAINTENANCE</span>
                                <span><i className="pi pi-check"></i></span>
                              </div>
                            }
                        >
                          <p>NO Data</p>
                        </AccordionTab>
                      </Accordion>
                    </Col>
                  </Row>
                </Card.Body>
                <Card.Footer className="d-flex align-items-center justify-content-between bg-white shadow py-3">
                  <Button
                    label="Previous"
                    icon="pi pi-arrow-left"
                    severity="secondary"
                    style={{opacity:'0.75'}}
                    className="py-2"
                    iconPos="left"
                    onClick={prevCard}
                  />
                  <Button 
                    label="Next"
                    icon="pi pi-arrow-right"
                    severity="help"
                    className="py-2"
                    iconPos="right"
                    onClick={nextCard}
                  />
                </Card.Footer>
              </Card>
            )}

            {/* Card 3 */}
            {currentCardIndex === 2 && (
              <Card className="border-0 shadow-sm">
                <Card.Header className="d-flex justify-content-between align-items-center border-0 shadow-0" style={{background:'#f6e9f7'}}>
                  <Button
                    tooltip="Previous"
                    tooltipOptions="left"
                    icon="pi pi-arrow-left"
                    severity="secondary"
                    outlined
                    className="p-1"
                    iconPos="left"
                    style={{height:'fit-content'}}
                    onClick={prevCard}
                  />
                  <div className='d-flex justify-content-center align-items-center flex-column gap-2 mb-3'>
                    <h6>IATA STANDARD GROUND HANDLING AGREEMENT ANNEX BX.X-Localion(s), Agreed Services and Charges</h6>
                    <div className="d-flex gap-4">
                      <div className="d-flex align-items-center">
                        <Checkbox 
                          inputId="ingredient1" 
                          name="servic" 
                          value="Comp" 
                          checked={true}   // always active
                          disabled         // disable checkbox
                        />
                        <label htmlFor="ingredient1" className="ms-2"><b>COMP</b></label>
                      </div>
      
                      <div className="d-flex align-items-center">
                        <Checkbox 
                          inputId="ingredient2" 
                          name="servic" 
                          value="Ramp" 
                          checked={true}   // always active
                          disabled         // disable checkbox
                        />
                        <label htmlFor="ingredient2" className="ms-2"><b>Ramp</b></label>
                      </div>
      
                      <div className="d-flex align-items-center">
                        <Checkbox 
                          inputId="ingredient3" 
                          name="servic" 
                          value="Cargo" 
                          checked={false}  // inactive
                          disabled         // disable checkbox
                        />
                        <label htmlFor="ingredient3" className="ms-2"><b>Cargo</b></label>
                      </div>
                    </div>
                  </div>
                  <div></div>
                </Card.Header>
                <Card.Body className="pt-5">
                  <Row className="mx-0">
                    <Col md={12} lg={4} className="pe-lg-3 border-end">
                      <div className="SghaTable border-0 pb-0 mb-3 sticky-top" >
                        <table className="table">
                          <tbody>
                            <tr>
                              <td colspan="3">
                                <span>to the Standard Ground Handling Agreement (SGHA) of January 2023</span>
                              </td>
                            </tr>
                            <tr>
                              <td colspan="3" className="">
                                <span className="d-block">between: </span>
                                <b className="mb-0">Malindo Airways SDN BHD</b>
                              </td>
                            </tr>
                            <tr>
                              <td colspan="3" className="">
                                <span className="d-block">having its principal office at:</span>
                                <b className="mb-0"></b>
                              </td>
                            </tr>
                            <tr>
                              <td colspan="3" className="">
                                <span className="d-block">having its principal office at·</span>
                                <b className="mb-0">Petaling Jaya, Malaysia</b>
                              </td>
                            </tr>
                            <tr>
                              <td colspan="3">hereinafter referred to as the 'Carrier'</td>
                              <b className="mb-0"></b>
                            </tr>
                            <tr>
                              <td colspan="3" className="">
                                <span className="d-block">and:</span>
                                <b className="mb-0">INDOTHAI KOLKATA PRIVATE LIMITED</b>
                              </td>
                            </tr>
                            <tr>
                              <td colspan="3" className="">
                                <span className="d-block">having its principal office at·</span>
                                <b className="mb-0">Kolkata, IN</b>
                              </td>
                            </tr>
                            <tr>
                              <td colspan="3">the Carrier and/or the Handling Company may hereinafter be referred to as the "Party(ies)" effective from:</td>
                            </tr>

                            <tr>
                              <td colspan="3" className="">
                                <span className="d-block">This Annex BX.X for </span>
                                <b className="mb-0"></b>
                              </td>
                            </tr>
                            <tr>
                              <td colspan="3" className="">
                                <span className="d-block">the location(s) :</span>
                                <b className="mb-0"></b>
                              </td>
                            </tr>
                            <tr>
                              <td colspan="3" className="">
                                <span className="d-block">is valid from:</span>
                                <b className="mb-0"></b>
                              </td>
                            </tr>
                            <tr>
                              <td colspan="3" className="">
                                <span className="d-block">and replaces : </span>
                                <b className="mb-0"></b>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </Col>
                    <Col md={12} lg={8} className="ps-lg-5">
                      <div>
                          {/* Steps header with horizontal scroll on small screens */}
                            <div className="steps-scroll overflow-x-auto" ref={stepsRef}>
                              <Steps model={items} activeIndex={activeIndex} readOnly={true} />
                            </div>

                          {/* Step Content */}
                          <div className="p-4 mt-4 rounded">
                            {activeIndex === 0 && (
                              <div>
                                <h6>Paragraph 1 - <b>Handling Services & Charges</b></h6>
                                <hr/>
                                <p className="mt-4"><b>1.1</b> The Handling Company shall provide the following services of the Annex A at the following rates:</p>
                                <Table bordered className="mb-0">
                                  <tbody>
                                    <tr>
                                      <th style={{ width: '180px' }}>Section 1</th>
                                      <td>
                                        <div className="d-flex flex-wrap gap-2">
                                            <Chip label="1.1.1 (a)" />
                                            <Chip label="1.1.2-1.1.4" />
                                            <Chip label="1.2.1," />
                                            <Chip label="1.2.2, 1.2.3 (a)-(d)(h) (all activities to be mutually agreed locally)"/>
                                            <Chip label="1.2.4, 1.2.5(c)" />
                                        </div>
                                      </td>
                                      <td style={{ width: '200px' }}>
                                        <p className="d-flex align-items-center gap-2 mb-0">
                                          Charges - 
                                          <span><b>1500</b></span>
                                        </p>
                                        
                                      </td>
                                    </tr>
                                  </tbody>
                                </Table>
                                <p><small className="text-secondary">The number of these sections/items to be listed as far as necessary depending of services contracted in this Annex B.</small></p>
                                <div>
                                  <h6>1.2</h6>
                                  <Table bordered className="mb-0">
                                    <thead>
                                      <tr>
                                        <th>Aircraft type</th>
                                        <th>Rate per turnaround (currency)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr>
                                          <td>Boeing 737</td>
                                          <td>INR 1500</td>
                                      </tr>
                                      <tr>
                                          <td>Dassault Falcon 8X</td>
                                          <td>USD 1500</td>
                                      </tr>
                                    </tbody>
                                  </Table>
                                  <p className="mt-4 mb-0"><b>1.3</b> Handling in case of Return To Ramp will not be charged extra, provided that a physical change of Load is not involved.</p>
                                  <p className="mt-2 mb-0"><b>1.4</b> Handling in case of Return To Ramp involving a physical change of Load will be charged at ................% of the above rates.</p>
                                  <p className="mt-2 mb-0">
                                    <b>1.5</b> Handling in case of Technical Landing for other than commercial purposes will be charged at% of the above rates, provided that a physical change of Load is not involved.

                                  </p>
                                </div>
                              </div>
                            )}
                            {activeIndex === 1 && (
                              <div>
                                <h6>Paragraph 1 - <b>Additional Services & Charges</b></h6>
                                <hr/>
                                <p className="mt-4"><b>2.1</b> All services not included in Paragraph 1 of this Annex will be charged for as follows:</p>
                                <Table bordered className="mb-0">
                                  <thead>
                                    <tr>
                                      <th>Sub-section</th>
                                      <th>Description of Service</th>
                                      <th>Per(Unit)</th>
                                      <th>Rate (currency)</th>
                                      <th style={{ width: "60px" }}>Action</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {rows.map((row, rowIndex) => (
                                      <tr key={rowIndex}>
                                        <td>
                                          <Form.Select
                                            value={row.description}
                                            onChange={(e) => handleChange(rowIndex, "description", e.target.value)}
                                          >
                                            <option value="">-- Select Service --</option>
                                            <option value="GPU">GPU</option>
                                            <option value="Air Starter Unit">Air Starter Unit</option>
                                            <option value="Push Back">Push Back</option>
                                            <option value="Toilet Service">Toilet Service</option>
                                            <option value="Water Service">Water Service</option>
                                            {/* Add more options here */}
                                          </Form.Select>
                                        </td>
                                        <td>
                                          <Form.Control
                                            type="text"
                                            value={row.subSection}
                                            onChange={(e) => handleChange(rowIndex, "subSection", e.target.value)}
                                            disabled
                                            className="border-0 bg-light"
                                          />
                                        </td>
                                        
                                        <td>
                                          <Form.Control
                                            type="text"
                                            value={row.perUnit}
                                            onChange={(e) => handleChange(rowIndex, "perUnit", e.target.value)}
                                            disabled
                                            className="border-0 bg-light"
                                            
                                          />
                                        </td>
                                        <td>
                                          <Form.Control
                                            type="text"
                                            value={row.rate}
                                            onChange={(e) => handleChange(rowIndex, "rate", e.target.value)}
                                            disabled
                                            className="border-0 bg-light"
                                          />
                                        </td>
                                        <td>
                                          <Button
                                            tooltip="Delete"
                                            icon="pi pi-times"
                                            text
                                            className="p-0"
                                            severity="danger"
                                            variant="danger"
                                            size="sm"
                                            onClick={() => removeRow(rowIndex)}
                                          />
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </Table>
                                <div className="mt-2 d-flex justify-content-between align-items-center">
                                  <p><small className="text-secondary">The number of these rows in the table can be extended as far as necessary.</small></p>
                                  <Button
                                    variant="success"
                                    icon="pi pi-plus"
                                    label="Service"
                                    className="py-1 px-2" 
                                    severity="help"
                                    onClick={addRow}
                                  />
                                </div>
                              </div>
                            )}
                            {activeIndex === 2 && (
                              <div>
                                <h6>Paragraph 3 - <b>Disbursements</b></h6>
                                <hr/>
                                <p className="mt-4">
                                  <b>3.1</b> Any disbursements made by the Handling Company on behalf of the Carrier will be reimbursed by the Carrier at cost price plus an accounting surcharge of................%. In order to claim such disbursements, the Handling Company shall provide 
                                  receipts, invoices or any reasonable evidence substantiating such disbursements.

                                </p>
                              </div>
                            )}
                            {activeIndex === 3 && (
                              <div>
                                <h6>Paragraph 4 - <b>Training</b></h6>
                                <hr/>
                                <p className="mt-4">
                                  <b>4.1</b> The provision of training will be covered as follows :
                                  <span className="border-bottom w-50 mx-auto ms-1"></span>
                                </p>
                              </div>
                            )}
                            {activeIndex === 4 && (
                              <div>
                                <h6>Paragraph 5 - <b>Limit of Liability</b></h6>
                                <hr/>
                                <p className="mt-4">
                                  <b>5.1</b> The limit of liability referred to in Sub-Article 8.5 of the Main Agreement shall be as follows :
                                </p>
                                <Table className="mb-0 custom-table">
                                  <thead>
                                    <tr>
                                      <th className="text-center">Aircraft Type</th>
                                      <th className="text-center">Limit (per incident)</th>
                                    </tr>
                                    <tr>
                                      <td className="text-center">Boeing 737</td>
                                      <td className="text-center"></td>
                                    </tr>
                                    <tr>
                                      <td className="text-center">Dassault Falcon 8X</td> 
                                      <td className="text-center"></td>
                                    </tr>
                                  </thead>
                                </Table>
                              </div>
                            )}
                            {activeIndex === 5 && (
                              <div>
                                <h6>Paragraph 6 - <b>Transfer of Services</b></h6>
                                <hr/>
                                <p className="mt-4 mb-0">
                                  <b>6.1</b>  In accordance with Sub-Article 3.1 of the Main Agreement, the Handling Company subcontracts the services of Annex A Section(s) 

                                </p>
                                <div className="d-flex align-items-end gap-2 mt-1">
                                    <span className="border-bottom me-1 pb-1 w-50">fghbth</span>
                                    <span>to</span>
                                    <span className="border-bottom ms-1 w-50 pb-1"></span>
                                </div>
                                <p className="mt-1 mb-0 text-secondary"><small>The number of these clauses can be extended as far as necessary.</small></p>
                              </div>
                            )}
                            {activeIndex === 6 && (
                              <div>
                                <h6>Paragraph 7 - <b>Payment</b></h6>
                                <hr/>
                                <p className="mt-4 mb-2">
                                  <b>7.1</b>  Notwithstanding Sub-Article
                                </p>
                                <p className="mb-2">
                                  <b>7.2</b>  of the Main Agreement, payment of account shall be effected 
                                  <span className="border-bottom ms-1 pb-1" style={{width:'280px', display:'inline-block'}}></span>
                                  With reference to Sub-Article
                                </p>
                                <p className="mb-2">
                                  <b>7.3</b>  the Parties establish the following payment terms:
                                </p>
                                <p className="mb-2">
                                  Handling Company will send invoices to (insert email/physical address).<br/>
                                  Notwithstanding Sub-Article 7.1 of the Main Agreement, the Handling Company shall submit invoices to the Carrier and the Carrier shall pay the Handling Company within (<span className="border-bottom text-center" style={{width:'100px', display:'inline-block'}}><b></b></span>) days of receipt of the invoice.
                                </p>
                                <p>
                                  In the event the Carrier disputes any charge or fee set forth in any invoice, Carrier shall pay the undisputed portion and notify the Handling Company of the discrepancy in billing. Both Parties shall then seek in good faith to resolve the disputed amount(s). Upon the resolution of any disputed amount the Carrier shall promptly pay the balance due to the Handling Company.
                                </p>
                                
                              </div>
                            )}
                            {activeIndex === 7 && (
                              <div>
                                <h6>Paragraph 8 - <b>Supervision & Administration</b></h6>
                                <hr/>
                                <p className="mt-4">
                                  <b>8.1</b> 0.1	The services of Annex A, Section 1, Sub-Section 1.3 covered by Sub-Paragraph 1.1 of this Annex B, refer only to the following services of Annex A which are performed for the Carrier by other organization(s) under cover of separate agreement(s):
                                  <br/>
                                  Section(s) <span className="border-bottom ms-1" style={{display:'inline-block', width:'90%'}}></span> 
                                  <br/>
                                  Section(s) <span className="border-bottom ms-1" style={{display:'inline-block', width:'90%'}}></span> 
                                </p>
                              </div>
                            )}
                            {activeIndex === 8 && (
                              <div>
                                <h6>Paragraph 9 - <b>Use of Yllow Pages</b></h6>
                                <hr/>
                                <p><small className="text-secondary">In the event that both Parties wish to incorporate AHM 811 "Yellow Pages”</small></p>
                                <p className="mt-4 mb-0">
                                  <b>9.1</b> 
                                  The following amendments to the "Definitions and Terminology", Main Agreement and Annex A reflected in "Yellow Pages" of AHM 811 edition
                                </p>
                                <p className="d-flex align-items-end gap-2 mt-1">
                                    <span className="border-bottom me-1 pb-1 w-50">fghbth</span>
                                    (Year <span className="border-bottom ms-1 w-25 pb-1"></span>) shall apply:
                                </p>
                                <p className="mb-2 text-secondary">For example:</p>
                                <ol>
                                  <li>Definitions and Terminology: e.g., nil or all</li>
                                  <li>Main Agreement: e.g., nil or all except Article x</li>
                                  <li>Annex A: e.g., nil or 3.6.x, 3.8.x, 6.6.x</li>
                                </ol>
                              </div>
                            )}
                            {activeIndex === 9 && (
                              <div>
                                <h6>Paragraph 10 - <b>Duration, Modification & Termination</b></h6>
                                <hr/>
                                <p>
                                  <small className="text-secondary">Any change to Article 11 of the Main Agreement, in particular to the duration of the Main Agreement, validity of rates or rights of termination shall be recorded below, notwithstanding the corresponding Sub-Articles of the Main Agreement.</small>
                                </p>
                                <p>
                                  <small className="mb-2">For example:</small>
                                </p>
                                <p className="mt-2 mb-0">
                                  <b>10.1</b> Duration
                                </p>
                                <p className="mt-1 mb-0">
                                  <b>10.1.1</b> Notwithstanding Sub-Article 11.4 and 11.5 of the Main Agreement 
                                  <span className="border-bottom ms-1" style={{display:'inline-block', width:'37%'}}></span>
                                </p>
                                <p className="mt-1 mb-0">
                                  <b>10.1.2</b> Notwithstanding Sub-Article 11.11 of the Main Agreement the rates contained in Paragraph 1 shall be 
                                  <span className="border-bottom ms-1" style={{display:'inline-block', width:'100%'}}></span>
                                </p>

                                <p className="mt-1 mb-0">
                                  <b>10.2</b> Modification
                                </p>
                                <p className="mt-1 mb-0">
                                  <b>10.2.1</b> 0.0.1	Any modification to this Annex B shall be made by a written amendment signed by both Parties.
                                </p>
                                <p className="mt-1 mb-0">
                                  <b>10.3</b> Termination
                                </p>
                                <p className="mt-1 mb-0">
                                  <b>10.3.1</b> Notwithstanding Sub-Paragraph 10.1.1 of this Annex B, this Annex B may be terminated on the following terms 
                                  <span className="border-bottom ms-1" style={{display:'inline-block', width:'100%'}}></span>
                                </p>
                                <p className="mt-1 mb-0">
                                  <b className="me-1">10.3.2</b>  
                                  The Carrier may terminate this Annex B, if the Handling Company fails to provide a consistently satisfactory level of service, the Carrier reserves the right to provide the Handling Company with written notice to the effect that correction is required within (.........) days. If the Handling Company fails to correct the situation within(.........) days, the Carrier may terminate the Agreement upon an additional (.........) days prior written notice. In accordance with Sub-Article 5.7 of the Main Agreement a consistent satisfactory level of service is defined in a separate “Service Level Agreement" (SLA) as an attachment to this Annex B.
                                </p>
                                <p className="mt-1 mb-0">
                                  <b className="me-1">10.3.3</b>  
                                  In the event of the Handling Company's material and sustained failure to perform the services as outlined in Sub-Article 5.7 of the Main Agreement, Carrier reserves the right to provide the Handling Company with written notice to the effect that correction is required within (.........) days. If the Handling Company fails to reasonably correct the situation within (.........) days, the Carrier may terminate the Agreement upon an additional (.........) days prior written notice.
                                </p>
                                <p>
                                  <small className="mt-1 text-secondary">The number of these clauses can be extended as far as necessary.</small>
                                </p>
                              </div>
                            )}
                            {activeIndex === 10 && (
                              <div>
                                <h6>Paragraph 11 - <b>Notification</b></h6>
                                <hr/>
                                <p className="mt-4 mb-2">
                                  <b>11.1</b> In accordance Sub-Article 11.3 of the Main Agreement, any notice or communication to be given hereunder shall be addressed to the respective Parties as follows:
                                </p>

                                <Table className="custom-table" >
                                  <tbody>
                                    <tr>
                                      <th className="label-col" style={{width:'210px'}}>To Carrier:</th>
                                      <td>
                                        <p>
                                          Carrier :  <span className="dots"></span><br />
                                          Street :  <span className="dots"></span><br />
                                          City, Country :  <span className="dots"></span><br />
                                          Telephone :  <span className="dots"></span><br />
                                          Fax : <span className="dots"></span><br />
                                          E-mail : <span className="dots"></span><br />
                                          Attn : <span className="dots"></span>
                                        </p>
                                      </td>
                                    </tr>
                                    <tr>
                                      <th className="label-col">To Handling Company:</th>
                                      <td>
                                        <p>
                                          The Handling Company : <span className="dots"></span><br />
                                          Street :  <span className="dots"></span><br />
                                          City, Country :  <span className="dots"></span><br />
                                          Telephone :  <span className="dots"></span><br />
                                          Fax : <span className="dots"></span><br />
                                          E-mail : <span className="dots"></span><br />
                                          Attn : <span className="dots"></span>
                                        </p>
                                      </td>
                                    </tr>
                                  </tbody>
                                </Table>
                                
                              </div>
                            )}
                            {activeIndex === 11 && (
                              <div>
                                <h6>Paragraph 12 - <b>Governing Law</b></h6>
                                <hr/>
                                <p className="mt-4 mb-2">
                                  <b>12.1</b> In accordance with Article 9 of the Main Agreement, this Annex B shall be governed by and interpreted in accordance with the laws of
                                  <span className="border-bottom ms-1" style={{display:'inline-block', width:'100%'}}></span>
                                </p>
                                <p className="mt-1 mb-2">
                                  <b>12.2</b> In accordance with Article 9 of the Main Agreement, courts for the resolution of disputes shall be the courts of
                                  <span className="border-bottom ms-1" style={{display:'inline-block', width:'100%'}}></span>
                                </p>

                                <Table bordered={false} className="mt-3 signTable">
                                  <tbody>
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
                                          <span>for and on behalf of</span> <span style={{borderBottom: "1px solid #ccc", width: "calc(100% - 140px)"}}></span>
                                        </div>
                                        
                                      </td>
                                      <td>
                                        <div className='d-flex align-items-center gap-2'>
                                          <span>for and on behalf of</span> <span style={{borderBottom: "1px solid #ccc", width: "calc(100% - 140px)"}}></span>
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
                                  </tbody>
                                </Table>

                              </div>
                            )}
                          </div>

                          {/* Navigation buttons */}
                          <div className="d-flex justify-content-end gap-3 mt-4">
                            {/* Hide Previous on first step */}
                              {activeIndex > 0 ? (
                                <Button
                                  
                                  icon="pi pi-arrow-left"
                                  onClick={() => setActiveIndex((prev) => prev - 1)}
                                  className="py-2"
                                  severity='warning'
                                />
                              ) : (
                                <span /> // keeps spacing consistent
                              )}

                              {/* Next/Finish button always enabled */}
                              <Button
                                label={activeIndex === items.length - 1 ? "Submit" : ""}
                                icon={activeIndex === items.length - 1 ? "pi pi-send" : "pi pi-arrow-right"}
                                iconPos="right"
                                onClick={handleNext}
                                className="py-2"
                                severity='warning'
                              />
                          </div>
                        </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            )}
          </div>
        </Col>
      </Row>
        <Sidebar visible={visibleRight} position="right"  dismissable={false} onHide={() => setVisibleRight(false)} style={{width: '400px'}} className="Sghasisbar">
          <h5 className="py-4 border-bottom mb-4">Edit Main Agreemnet</h5>
          <Form.Group className="mb-3" controlId="formBasicEmail">
            <Form.Label>An Agreement made between :</Form.Label>
            <Form.Control type="text" placeholder="Malindo Airways SDN BHD" />
          </Form.Group>
  
          <Form.Group className="mb-3" controlId="formBasicEmail">
            <Form.Label>having its principal office at :</Form.Label>
            <Form.Control type="text" placeholder="Petaling Jaya, Malaysia" />
          </Form.Group>
  
          <Form.Group className="mb-3" controlId="formBasicEmail">
            <Form.Label>hereinafter referred to as the 'Carrier' or the 'Handling Company' as the case may be, and:</Form.Label>
            <Form.Control type="text" placeholder="INDOTHAI KOLKATA PRIVATE LIMITED" />
          </Form.Group>
  
          <Form.Group className="mb-3" controlId="formBasicEmail">
            <Form.Label>having its principal office at·</Form.Label>
            <Form.Control type="text" placeholder="Kolkata, IN" />
          </Form.Group>
          <div className="d-flex justify-content-end gap-2">
            <Button
              icon="pi pi-times"
              label="Cancel"
              className="py-2"
              severity="secondary"
            />
            <Button
            icon="pi pi-check"
            label="Save"
            className="py-2"
            severity="success"
          />
          </div>
        </Sidebar>
    </>
  )
}

export default SGHA_Form