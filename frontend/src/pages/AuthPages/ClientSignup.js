import { useState, useRef, useEffect } from 'react';
import { Row, Container, Form, Col } from 'react-bootstrap';
import '../../assets/css/login.css';
import { Link } from 'react-router-dom';
import { Button } from 'primereact/button';
import { InputText } from "primereact/inputtext";
import { InputTextarea } from 'primereact/inputtextarea';       
import { Password } from 'primereact/password';
import { Divider } from 'primereact/divider';
import logo from '../../assets/images/footer_logo.png'
import { Stepper } from 'primereact/stepper';
import { StepperPanel } from 'primereact/stepperpanel';
import CustomToast from '../../components/CustomToast';
import axios from 'axios';
import config from '../../config';
import { useNavigate, useParams } from 'react-router-dom';
import { Dialog } from "primereact/dialog";
import { FcBrokenLink } from "react-icons/fc";
import { useDebounce } from 'use-debounce';
import { MultiSelect } from 'primereact/multiselect';
import { Tooltip } from 'primereact/tooltip';

const ClientSignup = () => {
    const navigate = useNavigate();
    const { token } = useParams(); // Extract token from URL parameters
    const [isActive, setIsActive] = useState(null); // Token validation status
    const [message, setMessage] = useState(""); // Response message
    const stepperRef = useRef(null);
    const toastRef = useRef(null);
    const [loading, setLoading] = useState(false);

    const showMessage = (severity, detail) => {
        const summary = severity.charAt(0).toUpperCase() + severity.slice(1);
        toastRef.current.show(severity, summary, detail);
    };

    // State Variable for sign up 
    const [companyName, setCompanyName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [Address2, setAddress2] = useState('');
    const [Address1, setAddress1] = useState('');
    const [city, setCity] = useState('');
    const [postcode, setPostcode] = useState('');
    const [stateName, setStateName] = useState('');
    const [country, setCountry] = useState('');
    const [password, setPassword] = useState('');
    const [cpassword, setcPassword] = useState('');

    const [pan, setPan] = useState('');
    const [gstin, setGstin] = useState('');
    const [operator, setOperator] = useState('');
    const [contactperson, setContactPerson] = useState('');
    const [otherdetails, setOtherdetails] = useState('');
    const [currentStep, setCurrentStep] = useState(0);

    const [airportOptions, setAirportOptions] = useState([]);
    const [selectedAirports, setSelectedAirports] = useState([]);
    const [airportSearchTerm, setAirportSearchTerm] = useState('');
    const [debouncedSearchTerm] = useDebounce(airportSearchTerm, 300);



useEffect(() => {
  const fetchAirports = async () => {
    try {
      const response = await axios.get(`${config.apiBASEURL}/airports/get-airports`, {
        params: { search: debouncedSearchTerm }
      });
      if (response.status === 200) {
        setAirportOptions(response.data);
      } else if (response.status === 204) {
        setAirportOptions([]);
      }
    } catch (error) {
      console.error('Error fetching airports:', error);
    }
  };

  if (debouncedSearchTerm) {
    fetchAirports();
  } else {
    setAirportOptions([]);
  }
}, [debouncedSearchTerm]);



    const validateStep1 = () => {
        return (
            companyName && email && phone &&
            Address1 && Address2 && city && postcode && stateName && password && cpassword
             && country
        );
    };

    const validateStep2 = () => {
        return (
            pan && gstin && operator && contactperson && otherdetails
        );
    };


    const handleNext = () => {
        let isValid = false;

        if (currentStep === 0) {
            isValid = validateStep1();
        } else if (currentStep === 1) {
            isValid = validateStep2();
        }

        if (!isValid) {
            showMessage('error', 'Please Fill all required fields before proceeding.');
            return;
        }

        // Go to next step
        setCurrentStep(prev => prev + 1);
        stepperRef.current.nextCallback();
    };



    const handleSubmit = async () => {
        if (!validateStep1() || !validateStep2()) {
            showMessage('error', 'Please Fill all required fields before proceeding.');
            return;
        }



        if (password !== cpassword) {
            showMessage('error', 'Passwords do not match.');
            return;
        }

        if (!selectedAirports.length) {
            showMessage('error', 'At least one airport must be selected.');
            return;
        }

        const airport_ids = selectedAirports.map(airport => airport.airport_id);



        const payload = {
            name: companyName,
            email,
            password,
            operator,
            contact_person: contactperson,
            phone,
            pan,
            gstin,
            address1: Address1,
            address2: Address2,
            city,
            pincode: postcode,
            state: stateName,
            country,
            other_details: otherdetails,
            Role_id: 4, // or whatever static/default role ID you want
            airport_ids
        };


        try {
            setLoading(true);
            const response = await axios.post(
            `${config.apiBASEURL}/ClientAuthRoutes/register-client/${token}`,
            payload
            );

            const result = response.data;

            if (response.status === 201) {
                showMessage('success', result.message || 'Client registered successfully!');
                setLoading(false);
                setTimeout(() => navigate('/Client_login'), 1000);
                // Reset form or redirect as needed
            } else {
                showMessage('error', result.message || 'Registration failed.');
                setLoading(false);
            }
        } catch (error) {
            console.error('Submit error:', error);
            showMessage('error', 'Something went wrong during submission.');
            setLoading(false);
        }
    };

    const header = <div className="font-bold mb-3">Pick a password</div>;
    const footer = (
        <>
            <Divider />
            <p className="mt-2">Suggestions</p>
            <ul className="pl-2 ml-2 mt-0 line-height-3">
                <li>At least one lowercase</li>
                <li>At least one uppercase</li>
                <li>At least one numeric</li>
                <li>Minimum 8 characters</li>
            </ul>
        </>
    );

    /*-------------OTP--------------*/

    // const [token, setTokens] = useState();

    // const customInput = ({ events, props }) => {
    //     return <><input {...events} {...props} type="text" className="custom-otp-input-sample" />
    //         {props.id === 2 && <div className="px-1">
    //         </div>}
    //     </>
    // };


  // Token validation useEffect
  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await axios.post(`${config.apiBASEURL}/ClientAuthRoutes/validate-link`, {
          encryptedToken: token,
        });
        setIsActive(response.data.isActive);
        setMessage(response.data.message);
        console.log(response.data.message);
      } catch (error) {
        console.error("Error validating token:", error);
        setIsActive(false);
        setMessage("An error occurred while validating the link.");
      }
    };

    validateToken();
  }, [token]);

  if (!isActive) {
    return (
      <Dialog visible={true} closable={false} header="Link Validation Error" style={{ width: '320px' }}>
        <div className="d-flex justify-content-center text-center align-items-center">
          <span style={{ fontSize: '70px', lineHeight: '1' }}><FcBrokenLink /></span>
          <p className="text-danger mb-0"><b>{message}</b></p>
        </div>
      </Dialog>
    );
  }






    return (
        <Container fluid className='signup-page position-relative p-0'>
            <div className='brand-logo' style={{ zIndex: 9 }}>
                <img src={logo} alt="Logo" style={{ width: '180px', height: 'auto', }} />
            </div>
            <Row className='mx-0 d-flex align-items-end justify-content-end'>
                <Col md={5} className='px-5 py-5 right-col'>
                    <Stepper ref={stepperRef} style={{ flexBasis: '50rem' }} className="newRegister">
                        <StepperPanel header="Company Details">
                            <div className="scroll-pannel mt-4">
                                <Row className='m-0 h-auto d-flex align-items-center'>
                                </Row>
                                <Row className='m-0 h-auto'>
                                    <Col md={12} lg={12} className='mb-3 p-0 pe-3'>
                                        <span className='fnameinp'>
                                            <label htmlFor="companyName"><i className='pi pi-user pe-2'></i>Company Name <span>*</span></label>
                                            <InputText
                                                type="text"
                                                name="companyName"
                                                required
                                                value={companyName}
                                                onChange={(e) => setCompanyName(e.target.value)}
                                            />
                                        </span>
                                    </Col>
                                </Row>
                                <Row className='h-auto m-0'>
                                    <Col md={6} lg={6} className='mb-3 p-0 pe-3'>
                                        <span className='fnameinp'>
                                            <label htmlFor="email"><i className='pi pi-envelope pe-2'></i>Email <span>*</span></label>
                                            <InputText
                                                type="email"
                                                name="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                            />
                                        </span>
                                    </Col>
                                    <Col md={6} lg={6} className='mb-3 p-0 pe-3'>
                                        <label htmlFor="phone"><i className='pi pi-phone pe-2'></i>Phone <span>*</span></label>
                                        <InputText
                                            type="number"
                                            name="phone"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            required
                                        />
                                    </Col>
                                </Row>
                                <Row className='h-auto m-0'>
                                    <Col md={6} lg={6} className='mb-3 p-0 pe-3'>
                                        <label htmlFor="password"><i className='pi pi-lock pe-2'></i>Password <span>*</span></label>
                                        <Password
                                            toggleMask
                                            className='w-100 d-block position-relative'
                                            required
                                            header={header}
                                            footer={footer}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                    </Col>
                                    <Col md={6} lg={6} className='mb-3 p-0 pe-3'>
                                        <span className='fnameinp'>
                                            <label htmlFor="cpassword"><i className='pi pi-lock pe-2'></i>Confirm Password <span>*</span></label>
                                            <InputText
                                                type="password"
                                                name="cpassword"
                                                required
                                                value={cpassword}
                                                onChange={(e) => setcPassword(e.target.value)}
                                            />
                                        </span>
                                    </Col>
                                </Row>
                                <Row className='h-auto m-0'>
                                    <Col md={12} lg={12} className='mb-3 p-0 pe-3'>
                                        <span className='fnameinp'>
                                            <label><i className='pi pi-map pe-2'></i>Address line 1 <span>*</span></label>
                                            <InputText
                                                type="text"
                                                name="address"
                                                required
                                                value={Address1}
                                                onChange={(e) => setAddress1(e.target.value)}
                                            />
                                        </span>
                                    </Col>
                                    <Col md={12} lg={12} className='mb-3 p-0 pe-3'>
                                        <span className='fnameinp'>
                                            <label><i className='pi pi-map pe-2'></i>Address line 2 <span>*</span></label>
                                            <InputText
                                                type="text"
                                                name="address"
                                                required
                                                value={Address2}
                                                onChange={(e) => setAddress2(e.target.value)}
                                            />
                                        </span>
                                    </Col>
                                    <Col md={4} lg={4} className='mb-3 p-0 pe-3'>
                                        <span className='fnameinp'>
                                            <label><i className='pi pi-building pe-2'></i>City <span>*</span></label>
                                            <InputText
                                                type="text"
                                                name="city"
                                                required
                                                value={city}
                                                onChange={(e) => setCity(e.target.value)}
                                            />
                                        </span>
                                    </Col>
                                    <Col md={4} lg={4} className='mb-3 p-0 pe-3'>
                                        <span className='fnameinp'>
                                            <label><i className='pi pi-map-marker pe-2'></i>Post Code <span>*</span></label>
                                            <InputText
                                                type="text"
                                                name="postcode"
                                                required
                                                value={postcode}
                                                onChange={(e) => setPostcode(e.target.value)}
                                            />
                                        </span>
                                    </Col>
                                    <Col md={4} lg={4} className='mb-3 p-0 pe-3'>
                                        <span className='fnameinp'>
                                            <label><i className='pi pi-building pe-2'></i>State <span>*</span></label>
                                            <InputText
                                                type="text"
                                                name="State"
                                                required
                                                value={stateName}
                                                onChange={(e) => setStateName(e.target.value)}
                                            />
                                        </span>
                                    </Col>
                                    <Col md={4} lg={4} className='mb-3 p-0 pe-3'>
                                        <span className='fnameinp'>
                                            <label><i className='pi pi-building pe-2'></i>Country <span>*</span></label>
                                            <InputText
                                                type="text"
                                                name="Country"
                                                 required
                                                value={country}
                                                onChange={(e) => setCountry(e.target.value)}
                                            />
                                        </span>
                                    </Col>
                                </Row>
                            </div>
                            <div className="d-flex pt-4 justify-content-end">
                                <Button
                                    label="Next"
                                    icon="pi pi-arrow-right"
                                    iconPos="right"
                                    onClick={handleNext}
                                    className='py-2 px-4'
                                    style={{ width: 'fit-content' }}
                                    severity='warning'
                                />
                            </div>
                        </StepperPanel>
                        <StepperPanel header="Company Info">
                            <div className="scroll-pannel mt-4">
                                <Row className='h-auto m-0'>
                                    <Col md={6} lg={6} className='mb-3 p-0 pe-1'>
                                        <span className='fnameinp'>
                                            <label>Pan card No.  <span>*</span></label>
                                            <InputText
                                                type="text"
                                                name="pan_card_no"
                                                required
                                                value={pan}
                                                onChange={(e) => setPan(e.target.value)}
                                            />
                                        </span>
                                    </Col>
                                    <Col md={6} lg={6} className='mb-3 p-0 pe-1'>
                                        <span className='fnameinp'>
                                            <label>Gstin. </label>
                                            <InputText
                                                type="text"
                                                name="Gstin"
                                                required
                                                value={gstin}
                                                onChange={(e) => setGstin(e.target.value)}
                                            />
                                        </span>
                                    </Col>
                                    <Col md={6} lg={6} className='mb-3 p-0 pe-1'>
                                        <span className='fnameinp'>
                                            <label>Operator. <span>*</span></label>
                                            <InputText
                                                type="text"
                                                name="operator"
                                                required
                                                value={operator}
                                                onChange={(e) => setOperator(e.target.value)}
                                            />
                                        </span>
                                    </Col>
                                    <Col md={6} lg={6} className='mb-3 p-0 pe-1'>
                                        <span className='fnameinp'>
                                            <label>Contact Person </label>
                                            <InputText
                                                type="text"
                                                name=""
                                                required
                                                value={contactperson}
                                                onChange={(e) => setContactPerson(e.target.value)}
                                            />
                                        </span>
                                    </Col>
                                    <Col md={12} lg={12} className='mb-3 p-0 pe-1'>
                                        <span className='fnameinp'>
                                            <label>Other Details</label>
                                            <InputTextarea 
                                                name="otherdetails"
                                                required
                                                value={otherdetails}
                                                onChange={(e) => setOtherdetails(e.target.value)}
                                                rows={4}
                                                style={{height:'auto'}}
                                            />
                                        </span>
                                    </Col>
                                    <Col md={12} lg={12} className='mb-3 p-0 pe-1'>
                                        <span className='fnameinp'>
                                            <label className='d-flex align-items-center'>Airports <span>*</span> 
                                                <span className='ms-3'>
                                                    <Tooltip target=".custom-target-icon" />
                                                    <i className='pi pi-info-circle text-warning custom-target-icon'
                                                        data-pr-tooltip="Please select at least one airport"
                                                        data-pr-position="right"
                                                        data-pr-at="right+5 top"
                                                        data-pr-my="left center-2"
                                                    >
                                                    </i>
                                                </span>
                                            </label>
                                            <MultiSelect
                                                value={selectedAirports}
                                                options={airportOptions}
                                                onChange={(e) => setSelectedAirports(e.value)}
                                                filter
                                                optionLabel={(option) => `${option.name} (${option.iata})`}
                                                placeholder="Select Airports"
                                                className="w-100 mt-3"
                                                onFilter={(e) => setAirportSearchTerm(e.filter)} // triggers debounced fetch
                                                display="chip"
                                                
                                            />

                                        </span>
                                        <div className='p-3 mt-4 text-white rounded-3' style={{border: '1px dashed #5a4d74'}}>
                                            <p>
                                                <small><em className='d-block mb-2'>NOTE : </em>
                                                <ol className='m-0'>
                                                    <li>Please select at least one airport</li>
                                                    <li>Scearch in the above feild based on </li>
                                                    <li>Airport Name</li>
                                                    <li>IATA code</li>
                                                    <li>Also multiple airports can be selected</li>
                                                </ol>
                                                </small>
                                            </p>
                                        </div>
                                    </Col>
                                </Row>
                            </div>
                            <div className="d-flex pt-4 justify-content-between">
                                <Button
                                    title="Back"
                                    severity="secondary"
                                    icon="pi pi-arrow-left"
                                    onClick={() => stepperRef.current.prevCallback()}
                                    className='py-2 px-3'
                                    style={{ width: 'fit-content' }}
                                />
                                <Button
                                    label="Save"
                                    icon="pi pi-save"
                                    iconPos="left"
                                    onClick={() => handleSubmit()}
                                    className='py-2 px-4'
                                    style={{ width: 'fit-content' }}
                                    severity='warning'
                                />
                            </div>
                        </StepperPanel>
                    </Stepper>
                    <p className='mt-4 text-center text-secondary'>Already have an account? <Link to='/Client_login' className='text-warning'>Login</Link></p>
                </Col>
            </Row>
            <CustomToast ref={toastRef} />
        </Container>
    )
}

export default ClientSignup;
