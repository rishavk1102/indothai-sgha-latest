import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Form} from 'react-bootstrap';
import { IoChevronBackOutline } from "react-icons/io5";
import { Fieldset } from 'primereact/fieldset';
import { InputTextarea } from "primereact/inputtextarea";
import { Button } from 'primereact/button';
import { InputText } from "primereact/inputtext";
import { Calendar } from 'primereact/calendar';
import Basic_details from '../components/form_FHR/Basic_details';
import Additional_equipment_details from '../components/form_FHR/Additional_equipment_details';
import Arrival_details from '../components/form_FHR/Arrival_details';
import Departure_details from '../components/form_FHR/Departure_details';
import Manpower_details from '../components/form_FHR/Manpower_details';
import Cargo_details from '../components/form_FHR/Cargo_details';



const Newfhr_add = () => {
  const [value, setValue] = useState('');
   const [date, setDate] = useState(null);

  return (
      <Row>
        <Col md={12} lg={12}>
            <Row className="mx-0 fhr_form bg-light p-3 mb-3" style={{borderRadius:'6px'}}>
                <Col lg={3} md={4}  className="px-2 position-relative">
                    <Form.Group className="mb-2">
                        <Form.Label>Issue Date</Form.Label>
                        <Calendar 
                            value={date} 
                            onChange={(e) => setDate(e.value)} 
                            dateFormat="dd/mm/yy" 
                            style={{ width: '100%' }} 
                        />
                    </Form.Group>
                </Col>
                <Col lg={3} md={4}  className="px-2">
                    <Form.Group className="mb-2">
                        <Form.Label>Category</Form.Label>
                        <Form.Select id="disabledSelect">
                            <option selected disabled>--- Select Category ---</option>
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col lg={3} md={4}  className="px-2">
                    <Form.Group className="mb-2">
                        <Form.Label>Service Provider</Form.Label>
                        <Form.Select id="disabledSelect">
                            <option selected disabled>--- Select Service Provider ---</option>
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col lg={3} md={4}  className="px-2">
                    <Form.Group className="mb-2">
                        <Form.Label>Airport</Form.Label>
                        <Form.Select id="disabledSelect">
                            <option selected disabled>--- Select Airport ---</option>
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col lg={3} md={4}  className="px-2">
                    <Form.Group className="mb-2">
                        <Form.Label>Service Provided To</Form.Label>
                        <Form.Select id="disabledSelect">
                            <option selected disabled>--- Select ---</option>
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col lg={3} md={4}  className="px-2">
                    <Form.Group className="mb-2">
                        <Form.Label>Airline</Form.Label>
                        <Form.Select id="disabledSelect">
                            <option selected disabled>--- Select Airline ---</option>
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col lg={3} md={4}  className="px-2">
                    <Form.Group className="mb-2">
                        <Form.Label>Aircraft Type</Form.Label>
                        <Form.Select id="disabledSelect">
                            <option selected disabled>--- Select Aircraft Type ---</option>
                        </Form.Select>
                    </Form.Group>
                </Col>
            </Row>
        </Col>

        <Basic_details/>
        <Arrival_details/>
        <Departure_details/>
        <Manpower_details/>
        <Cargo_details/> 
        <Additional_equipment_details /> 

        <Col md={12} lg={12} className="mt-4">
            <div className="allempList fhr_form">
                <h5 className="rol-title">Declaration</h5>
                <ul>
                    <li className="flex-nowrap w-100" style={{whiteSpace:'nowrap'}}>
                        I,
                        <span className="w-100"><InputText value={value} onChange={(e) => setValue(e.target.value)} className="w-100"/></span> 
                        on behalf of 
                        <span className="w-100"><InputText value={value} onChange={(e) => setValue(e.target.value)} className="w-100" /></span>
                        hereby
                    </li>
                    <li className="W-100 d-block pt-0">
                        certify that services asked for above were received from <b>IndoThai Bhubhaneswar Pvt Ltd</b> and I undertake to pay the charges on demand for the above services at the rated currently applicable and agree to abide by the terms and conditions in this respect.
                    </li>
                </ul>
            </div>
             <div className="allempList  fhr_form">
                <h5 className="rol-title">Remarks (Optional)</h5>
                <ul>
                    <li className="w-100">
                        <label>Any Remarks</label>
                        <InputTextarea value={value} onChange={(e) => setValue(e.target.value)} rows={5} className="w-100 mt-2 h-auto" />
                    </li>
                </ul>
            </div>
        </Col>
        <Col md={12} lg={12} className="mt-4 text-end">
            <Button
                label="Validate"
                icon="pi pi-shield"
                severity="success"
                className="py-2 me-2 text-white"
                style={{ fontSize: "14px" }}
            />
            <Button
                label="Create FHR"
                icon="pi pi-save"
                severity="warning text-white"
                className="py-2"
                style={{ fontSize: "14px" }}
            />
            
        </Col>

      </Row>
  );
};

export default Newfhr_add;