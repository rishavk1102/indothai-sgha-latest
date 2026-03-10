import React, { useState, useEffect } from "react";
import { Row, Col, Badge, Breadcrumb, Card, Form } from "react-bootstrap";
import { Checkbox } from "primereact/checkbox";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Fieldset } from 'primereact/fieldset';
import { RadioButton } from "primereact/radiobutton";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { getSocket } from "../../context/socket";
import { useAuth } from "../../context/AuthContext";
import { Dialog } from 'primereact/dialog';
import GifLoder from '../../interfaces/GifLoder';
import { IoChevronBackOutline } from "react-icons/io5";
import { TabView, TabPanel } from 'primereact/tabview';
import api from '../../api/axios';

const Home = () => {
  const { role, roleId, userId } = useAuth(); // Get roleId from the context
  const PAGE_NAME = "Add New SGHA"; // Page name for permission checking
  const socket = getSocket();
  const [loading, setLoading] = useState(true);  // Block UI until all fetches succeed
  const [unauthorized, setUnauthorized] = useState(false); // Show Dialog if error
  const navigate = useNavigate();
  const [selectedCities, setSelectedCities] = useState([]);
  const [ingredient, setIngredient] = useState('');
  const [step, setStep] = useState(1); // 1 = airport selection, 2 = add business
  const [airports, setAirports] = useState([]);
  const [yearsWithStatus, setYearsWithStatus] = useState([]); // Same as employee side: years with templates[] per year

  // ✅ Fetch template years with individual templates per year (same as employee side)
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await api.get('/template_years/years-with-status');
        if (response.data && response.data.data) {
          setYearsWithStatus(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching template years:', error);
        setYearsWithStatus([]);
      }
    };

    fetchTemplates();
  }, []);

  // Flatten to dropdown options: each option = (year, templateName). Value: "year" or "year|templateName"
  const templateOptions = (() => {
    const opts = [];
    (yearsWithStatus || []).forEach((yearRecord) => {
      const year = yearRecord.year;
      const templates = yearRecord.templates && yearRecord.templates.length > 0
        ? yearRecord.templates.filter((t) => t.hasData)
        : yearRecord.hasData ? [{ templateName: null }] : [];
      templates.forEach((t) => {
        const name = t.templateName != null && String(t.templateName).trim() !== '' ? t.templateName : null;
        opts.push({
          value: name == null ? String(year) : `${year}|${name}`,
          label: name == null ? `${year} (Default)` : `${year} - ${name}`,
        });
      });
    });
    return opts;
  })();

  // ✅ Fetch Airports with Business included
  useEffect(() => {
    if (!socket) return;

    socket.emit("fetch-all-airports", {
      role_id: roleId,
      page_name: PAGE_NAME,
    });

    socket.on("fetch-all-airports-success", (data) => {
      setAirports(data);
      setLoading(false);
    });

    socket.on("fetch-all-airports-error", (error) => {
      const isPermissionError =
        error.message?.includes("Missing role_id") ||
        error.message?.includes("Page") ||
        error.message?.includes("Permission denied");

      if (isPermissionError) {
        setUnauthorized(true);
      } else {
        setAirports([]);
        console.warn("Airport fetch error:", error.message);
      }
      setLoading(false);
    });

    return () => {
      socket.off("fetch-all-airports-success");
      socket.off("fetch-all-airports-error");
    };
  }, [socket, roleId, PAGE_NAME]);


  const handleCitySelect = (airport) => {
    // Single selection (radio): set to this airport only
    setSelectedCities([airport]);
  };


  // Step 1 -> Step 2
  const handleNextStep1 = () => {
    setStep(2);
  };

  // Back to Step 1
  const handleBack = () => {
    setStep(1);
  };

  // Step 2 -> Agreement Page (pass template year, template name, and form data from Add New SGHA)
  const handleNextStep2 = () => {
    const first = selectedCities.length > 0 ? formData[selectedCities[0].airport_id] : null;
    const rawYear = first?.template_year;
    const rawName = first?.template_name;
    const templateYear = (rawYear != null && rawYear !== '') ? (parseInt(String(rawYear), 10) || 2025) : 2025;
    const templateName = (rawName != null && String(rawName).trim() !== '') ? String(rawName).trim() : null;
    console.log('[Home] Next → Agreement | templateYear:', templateYear, '| templateName:', templateName ?? '(null)', '| raw formData:', { template_year: rawYear, template_name: rawName });
    try {
      sessionStorage.setItem('sgha_agreement_template_year', String(templateYear));
      sessionStorage.setItem('sgha_agreement_template_name', templateName != null ? templateName : '');
    } catch (e) {
      // ignore
    }
    navigate(`/dashboard/agreement`, { state: { selectedCities, templateYear, templateName, formData } });
  };

  /*----------------------formsubmit------------------------*/

  const [isScheduleChecked, setIsScheduleChecked] = useState(false);
  const [isNonscheduleChecked, setIsNonscheduleChecked] = useState(false);
  const [showServicesFor, setShowServicesFor] = useState(false);
  const [showCompanyDetail, setShowCompanyDetail] = useState(false);
  const [value, setValue] = useState('');

  // Services state
  const [isCargoChecked, setIsCargoChecked] = useState(false);

  const [formData, setFormData] = useState({});

  const updateAirportData = (airport_id, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [airport_id]: {
        ...prev[airport_id],
        [field]: value,
      },
    }));
  };

  const handleFlightTypeChange = (airport_id, type, checked) => {
    updateAirportData(airport_id, type, checked);

    const schedule =
      type === "schedule" ? checked : formData[airport_id]?.schedule || false;
    const nonschedule =
      type === "nonschedule" ? checked : formData[airport_id]?.nonschedule || false;

    updateAirportData(airport_id, "showServicesFor", schedule || nonschedule);
  };

  const handleExclusiveCheckboxChange = (airport_id, type, checked) => {
    updateAirportData(airport_id, "ingredient", checked ? type : "");
    updateAirportData(
      airport_id,
      "showCompanyDetail",
      checked || formData[airport_id]?.isCargoChecked || false
    );
    
    // Save service type selection to localStorage for Annex A
    const serviceTypeMap = {
      "Ramp": { ramp: true, comp: false, cargo: false },
      "Comp": { ramp: false, comp: true, cargo: false }
    };
    
    if (checked && serviceTypeMap[type]) {
      // Get existing Annex A states or create new
      const existingStates = localStorage.getItem('sgha_annex_a_states');
      let states = existingStates ? JSON.parse(existingStates) : {};
      
      // Update service types - when one is checked, set the other to false
      const newServiceTypes = { ...serviceTypeMap[type] };
      
      // Preserve cargo state if it exists in the old state
      if (states.serviceTypes && states.serviceTypes.cargo !== undefined) {
        newServiceTypes.cargo = states.serviceTypes.cargo;
      }
      
      // Update service types while preserving all other state data
      states.serviceTypes = newServiceTypes;
      
      console.log('[Home] Saving service type to localStorage:', {
        type,
        serviceTypes: states.serviceTypes,
        hasExistingData: !!existingStates
      });
      
      // Save back to localStorage
      localStorage.setItem('sgha_annex_a_states', JSON.stringify(states));
      
      // Trigger custom event for same-tab updates
      window.dispatchEvent(new Event('annexAStatesUpdated'));
    } else if (!checked) {
      // When unchecking, ensure the other option is selected (they're mutually exclusive)
      // If Ramp is unchecked, Comp should be selected, and vice versa
      const otherType = type === "Ramp" ? "Comp" : "Ramp";
      const existingStates = localStorage.getItem('sgha_annex_a_states');
      let states = existingStates ? JSON.parse(existingStates) : {};
      
      if (!states.serviceTypes) {
        states.serviceTypes = { ramp: false, comp: true, cargo: false };
      } else {
        // Set the other type to true
        if (otherType === "Ramp") {
          states.serviceTypes.ramp = true;
          states.serviceTypes.comp = false;
        } else {
          states.serviceTypes.comp = true;
          states.serviceTypes.ramp = false;
        }
      }
      
      localStorage.setItem('sgha_annex_a_states', JSON.stringify(states));
      window.dispatchEvent(new Event('annexAStatesUpdated'));
    }
  };

  const handleCargoChange = (airport_id, checked) => {
    updateAirportData(airport_id, "isCargoChecked", checked);
    updateAirportData(
      airport_id,
      "showCompanyDetail",
      checked || (formData[airport_id]?.ingredient ?? "") !== ""
    );
    
    // Update cargo service type in localStorage for Annex A
    const existingStates = localStorage.getItem('sgha_annex_a_states');
    let states = existingStates ? JSON.parse(existingStates) : {};
    
    if (!states.serviceTypes) {
      // If no service types exist, default to COMP
      states.serviceTypes = { ramp: false, comp: true, cargo: checked };
    } else {
      states.serviceTypes.cargo = checked;
    }
    
    localStorage.setItem('sgha_annex_a_states', JSON.stringify(states));
    window.dispatchEvent(new Event('annexAStatesUpdated'));
  };


  const goBack = () => {
    navigate(-1); // This will take the user back to the previous page in history
  };


  const handleDialogHide = () => navigate(-1);

  // Check if all required fields (*) for the current airport tab have values
  const isTabValid = (airportId) => {
    const data = formData[airportId] || {};
    if (!data.applicable_for?.trim()) return false;
    if (!data.showCompanyDetail) return true; // Only "Applicable for" required when company section hidden
    return !!(
      data.company_name?.trim() &&
      data.email?.trim() &&
      data.phone_number?.trim() &&
      data.address_line_1?.trim() &&
      data.city?.trim() &&
      data.post_code?.trim() &&
      data.state?.trim() &&
      data.country?.trim() &&
      data.pan_card_no?.trim() &&
      data.gstn?.trim() &&
      data.contact_person?.trim() &&
      data.rate?.trim() &&
      data.template_year != null && String(data.template_year).trim() !== ''
    );
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
        <Col md={12} lg={6}>
          <Breadcrumb>
            <Breadcrumb.Item onClick={goBack}>
              <IoChevronBackOutline /> Back
            </Breadcrumb.Item>
            <Breadcrumb.Item active>Dashboard</Breadcrumb.Item>
          </Breadcrumb>
        </Col>
      </Row>

      {/* STEP 1 - Airport Selection */}
      {step === 1 && (
        <>
          <Row className="mx-0 mb-3">
            <div className="airport_list">
              <ul>
                {airports.map((airport) => {
                  const isSelected = selectedCities.some(
                    (item) => item.airport_id === airport.airport_id
                  );

                  return (
                    <li
                      key={airport.airport_id}
                      onClick={() => handleCitySelect(airport)}
                      style={{ cursor: "pointer" }}
                      className={isSelected ? "active" : ""}
                    >
                      <RadioButton
                        inputId={airport.airport_id.toString()}
                        name="airportSelect"
                        value={airport.airport_id}
                        onChange={() => handleCitySelect(airport)}
                        checked={isSelected}
                        onClick={(e) => e.stopPropagation()}
                        className="locationcheckbox"
                      />

                      {/* Show icon if available, fallback otherwise */}
                      {airport.icon ? (
                        <img
                          src={airport.icon}
                          alt={airport.city}
                        />
                      ) : (
                        <div className="placeholder-icon">✈️</div>
                      )}

                      <h6>
                        {airport.name} <span>({airport.iata})</span>
                      </h6>
                      <Badge>{airport.city}</Badge>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="d-flex justify-content-end mt-3 ueselect">
              <Button
                severity="warning"
                onClick={handleNextStep1}
                disabled={selectedCities.length === 0}
                label="Next"
                icon="pi pi-arrow-right"
                iconPos="right"
                className="py-2 px-4"
                style={{ width: "fit-content" }}
              />
            </div>
          </Row>
        </>
      )}

      {/* STEP 2 - Add Business */}
      {/* STEP 2 - Add Business */}
      {step === 2 && (
        <Row className="mx-0 mb-3">
          <div className="add_business ueselect">
            <div className="my-5">
              <TabView>
                {selectedCities.map((airport) => {
                  const data = formData[airport.airport_id] || {};
                  return (
                    <TabPanel
                      key={airport.airport_id}
                      header={
                        <div className="flex align-items-center gap-2">
                          <span>
                            <b>{airport.city}</b>
                            <small className="d-block mt-1">
                              {airport.name} ({airport.iata})
                            </small>
                          </span>
                        </div>
                      }
                    >
                      <Row className="mx-0 mb-3">
                        {/* Flight Type */}
                        <Col md={12} lg={4}>
                          <label className="mb-2">Flight Type</label>
                          <div className="d-flex justify-content-start border gap-4 p-3 mt-1">
                            <div className="flex align-items-center">
                              <Checkbox
                                inputId={`schedule-${airport.airport_id}`}
                                checked={data.schedule || false}
                                onChange={(e) =>
                                  handleFlightTypeChange(
                                    airport.airport_id,
                                    "schedule",
                                    e.checked
                                  )
                                }
                              />
                              <label htmlFor={`schedule-${airport.airport_id}`} className="ms-2">
                                Schedule
                              </label>
                            </div>
                            <div className="flex align-items-center">
                              <Checkbox
                                inputId={`nonschedule-${airport.airport_id}`}
                                checked={data.nonschedule || false}
                                onChange={(e) =>
                                  handleFlightTypeChange(
                                    airport.airport_id,
                                    "nonschedule",
                                    e.checked
                                  )
                                }
                              />
                              <label htmlFor={`nonschedule-${airport.airport_id}`} className="ms-2">
                                Non Schedule
                              </label>
                            </div>
                          </div>
                        </Col>
                        
                        {/* Services For */}
                        {data.showServicesFor && (
                          <Col md={12} lg={4}>
                            <label className="mb-2">Services For</label>
                            <div className="d-flex justify-content-start border gap-4 p-3 mt-1">
                              <div className="flex align-items-center">
                                <Checkbox
                                  inputId={`ramp-${airport.airport_id}`}
                                  checked={data.ingredient === "Ramp"}
                                  onChange={(e) =>
                                    handleExclusiveCheckboxChange(
                                      airport.airport_id,
                                      "Ramp",
                                      e.checked
                                    )
                                  }
                                />
                                <label htmlFor={`ramp-${airport.airport_id}`} className="ms-2">
                                  Ramp
                                </label>
                              </div>
                              <div className="flex align-items-center">
                                <Checkbox
                                  inputId={`comp-${airport.airport_id}`}
                                  checked={data.ingredient === "Comp"}
                                  onChange={(e) =>
                                    handleExclusiveCheckboxChange(
                                      airport.airport_id,
                                      "Comp",
                                      e.checked
                                    )
                                  }
                                />
                                <label htmlFor={`comp-${airport.airport_id}`} className="ms-2">
                                  COMP
                                </label>
                              </div>
                              <div className="flex align-items-center">
                                <Checkbox
                                  inputId={`cargo-${airport.airport_id}`}
                                  checked={data.isCargoChecked || false}
                                  onChange={(e) =>
                                    handleCargoChange(airport.airport_id, e.checked)
                                  }
                                />
                                <label htmlFor={`cargo-${airport.airport_id}`} className="ms-2">
                                  Cargo
                                </label>
                              </div>
                            </div>
                          </Col>
                        )}
                        <Col md={12} lg={4}>
                            <Form.Label>Applicable for <sup className="text-danger">*</sup></Form.Label>
                            <Form.Select 
                              style={{height: "58px"}}
                              value={data.applicable_for || ""}
                              onChange={(e) => updateAirportData(airport.airport_id, "applicable_for", e.target.value)}
                            >
                              <option value="" disabled>Please select</option>
                              <option value="Domestic">Domestic</option>
                              <option value="International">International</option>
                            </Form.Select>
                        </Col>
                        {/* Company Details */}
                        {data.showCompanyDetail && (
                          <Col md={12} lg={12} className="mt-3 companyDetai">
                            <Row className="mx-0">
                              <Col md={6} lg={4} className="d-flex flex-column gap-1 mb-3">
                                <label className="mb-2">
                                  Company Name <sup className="text-danger">*</sup>
                                </label>
                                <InputText
                                  placeholder="Enter Company Name"
                                  value={data.company_name || ""}
                                  onChange={(e) => updateAirportData(airport.airport_id, "company_name", e.target.value)}
                                />
                              </Col>
                              <Col md={6} lg={4} className="d-flex flex-column gap-1 mb-3">
                                <label className="mb-2">Email <sup className="text-danger">*</sup></label>
                                <InputText
                                  placeholder="Enter Email"
                                  value={data.email || ""}
                                  onChange={(e) => updateAirportData(airport.airport_id, "email", e.target.value)}
                                />
                              </Col>
                              <Col md={6} lg={4} className="d-flex flex-column gap-1 mb-3">
                                <label className="mb-2">Phone Number <sup className="text-danger">*</sup></label>
                                <InputText
                                  placeholder="Enter Phone No."
                                  value={data.phone_number || ""}
                                  onChange={(e) => updateAirportData(airport.airport_id, "phone_number", e.target.value)}
                                />
                              </Col>
                              <Col md={6} lg={6} className="d-flex flex-column gap-1 mb-3">
                                <label className="mb-2">Address line 1 <sup className="text-danger">*</sup></label>
                                <InputText
                                  placeholder="Enter Address line 1"
                                  value={data.address_line_1 || ""}
                                  onChange={(e) => updateAirportData(airport.airport_id, "address_line_1", e.target.value)}
                                />
                              </Col>
                              <Col md={6} lg={6} className="d-flex flex-column gap-1 mb-3">
                                <label className="mb-2">Address line 2</label>
                                <InputText
                                placeholder="Enter Address line 2"
                                value={data.address_line_2 || ""}
                                onChange={(e) => updateAirportData(airport.airport_id, "address_line_2", e.target.value)}
                              />
                              </Col>
                              <Col md={6} lg={3} className="d-flex flex-column gap-1 mb-3">
                                <label className="mb-2">City <sup className="text-danger">*</sup></label>
                                <InputText
                                  placeholder="Enter City"
                                  value={data.city || ""}
                                  onChange={(e) => updateAirportData(airport.airport_id, "city", e.target.value)}
                                />
                              </Col>
                              <Col md={6} lg={3} className="d-flex flex-column gap-1 mb-3">
                                <label className="mb-2">Post Code <sup className="text-danger">*</sup></label>
                                <InputText
                                  placeholder="Enter Post Code"
                                  value={data.post_code || ""}
                                  onChange={(e) => updateAirportData(airport.airport_id, "post_code", e.target.value)}
                                />
                              </Col>
                              <Col md={6} lg={3} className="d-flex flex-column gap-1 mb-3">
                                <label className="mb-2">State <sup className="text-danger">*</sup></label>
                                <InputText
                                  placeholder="Enter State"
                                  value={data.state || ""}
                                  onChange={(e) => updateAirportData(airport.airport_id, "state", e.target.value)}
                                />
                              </Col>
                              <Col md={6} lg={3} className="d-flex flex-column gap-1 mb-3">
                                <label className="mb-2">Country <sup className="text-danger">*</sup></label>
                                <InputText
                                  placeholder="Enter Country"
                                  value={data.country || ""}
                                  onChange={(e) => updateAirportData(airport.airport_id, "country", e.target.value)}
                                />
                              </Col>
                              <Col md={12} lg={6} className="mb-3 p-0">
                                <Row className="mx-0">
                                  <Col md={6} lg={6} className="d-flex flex-column gap-1 mb-3">
                                    <label className="mb-2">Pan card No. <sup className="text-danger">*</sup></label>
                                    <InputText
                                      placeholder="Enter Pan card No."
                                      value={data.pan_card_no || ""}
                                      onChange={(e) => updateAirportData(airport.airport_id, "pan_card_no", e.target.value)}
                                    />
                                  </Col>
                                  <Col md={6} lg={6} className="d-flex flex-column gap-1 mb-3">
                                    <label className="mb-2">Gstn. <sup className="text-danger">*</sup></label>
                                    <InputText
                                      placeholder="Enter Gstn. no."
                                      value={data.gstn || ""}
                                      onChange={(e) => updateAirportData(airport.airport_id, "gstn", e.target.value)}
                                    />
                                  </Col>
                                  <Col md={6} lg={6} className="d-flex flex-column gap-1 mb-3">
                                    <label className="mb-2">Contact Person <sup className="text-danger">*</sup></label>
                                    <InputText
                                      placeholder="Enter Contact Person"
                                      value={data.contact_person || ""}
                                      onChange={(e) => updateAirportData(airport.airport_id, "contact_person", e.target.value)}
                                    />
                                  </Col>
                                  <Col md={6} lg={6} className="">
                                      <Form.Label>Rate <sup className="text-danger">*</sup></Form.Label>
                                      <Form.Select
                                        style={{height: "50px"}}
                                        value={data.rate || ""}
                                        onChange={(e) => updateAirportData(airport.airport_id, "rate", e.target.value)}
                                      >
                                        <option value="" disabled>Please select</option>
                                        <option value="INR">INR</option>
                                        <option value="USD">USD</option>
                                      </Form.Select>
                                  </Col>
                                  <Col md={6} lg={6} className="d-flex flex-column gap-1">
                                      <Form.Label>Agreement Template <sup className="text-danger">*</sup></Form.Label>
                                      <Form.Select
                                        style={{height: "50px"}}
                                        value={
                                          data.template_year != null && data.template_year !== ''
                                            ? (data.template_name != null && String(data.template_name).trim() !== ''
                                                ? `${data.template_year}|${data.template_name}`
                                                : String(data.template_year))
                                            : ""
                                        }
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          if (!v) {
                                            setFormData((prev) => ({
                                              ...prev,
                                              [airport.airport_id]: { ...prev[airport.airport_id], template_year: "", template_name: null },
                                            }));
                                            return;
                                          }
                                          const pipe = v.indexOf("|");
                                          const year = pipe === -1 ? v : v.slice(0, pipe);
                                          const name = pipe === -1 ? null : v.slice(pipe + 1);
                                          setFormData((prev) => ({
                                            ...prev,
                                            [airport.airport_id]: { ...prev[airport.airport_id], template_year: year, template_name: name },
                                          }));
                                        }}
                                      >
                                        <option value="" disabled>Please select</option>
                                        {templateOptions.map((opt) => (
                                          <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                          </option>
                                        ))}
                                      </Form.Select>
                                  </Col>
                                </Row>
                              </Col>
                              <Col md={12} lg={6} className="mb-3 d-flex flex-column gap-1">
                                <label className="mb-2">Other Details</label>
                                <InputTextarea
                                  value={data.value || ""}
                                  onChange={(e) =>
                                    updateAirportData(airport.airport_id, "value", e.target.value)
                                  }
                                  rows={6}
                                />
                              </Col>
                            </Row>
                          </Col>
                        )}
                      </Row>

                      {/* Navigation Buttons */}
                      <div className="border-0 bg-transparent d-flex justify-content-end">
                        <Button
                          severity="secondary"
                          onClick={handleBack}
                          tooltip="Back"
                          icon="pi pi-arrow-left"
                          className="py-2 px-4 me-2"
                        />
                        <Button
                          severity="warning"
                          onClick={handleNextStep2}
                          label="Next"
                          icon="pi pi-arrow-right"
                          iconPos="right"
                          className="py-2 px-4"
                          disabled={!isTabValid(airport.airport_id)}
                        ></Button>
                      </div>
                    </TabPanel>
                  );
                })}
              </TabView>
            </div>
          </div>
        </Row>
      )}

    </>
  );
};

export default Home;
