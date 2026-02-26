import { useState, useRef } from 'react';
import { Row, Container, Form, Col } from 'react-bootstrap';
import '../../assets/css/login.css';
import { Link } from 'react-router-dom';
import { Button } from 'primereact/button';
import { InputText } from "primereact/inputtext";
import { FloatLabel } from "primereact/floatlabel";
import { Password } from 'primereact/password';
import { Divider } from 'primereact/divider';
import { InputOtp } from 'primereact/inputotp';
import myVideo from '../../assets/images/Indo_Thai_3D.mp4';
import logo from '../../assets/images/footer_logo.png'
import { FileUpload } from 'primereact/fileupload';
import { Stepper } from 'primereact/stepper';
import { StepperPanel } from 'primereact/stepperpanel';
import { RadioButton } from "primereact/radiobutton";
import { InputNumber } from 'primereact/inputnumber';
import { Image } from 'primereact/image';
import CustomToast from '../../components/CustomToast';
import signupbanner from '../../assets/images/lcs7.jpg';
import axios from 'axios';
import config from '../../config';
import { useNavigate } from 'react-router-dom';
import { Calendar } from 'primereact/calendar';

const Signup = () => {
    const navigate = useNavigate();
    const stepperRef = useRef(null);
    const toastRef = useRef(null);
    const fileUploadRef = useRef(null);
    const imageUploadRef = useRef(null);
    const [loading, setLoading] = useState(false);

    const showMessage = (severity, detail) => {
        const summary = severity.charAt(0).toUpperCase() + severity.slice(1);
        toastRef.current.show(severity, summary, detail);
    };

    // State Variable for sign up 
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [personal_email, setPersonalEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [alternate_no, setAlternateNo] = useState('');
    const [Address2, setAddress2] = useState('');
    const [Address1, setAddress1] = useState('');
    const [city, setCity] = useState('');
    const [postcode, setPostcode] = useState('');
    const [stateName, setStateName] = useState('');
    const [gender, setGender] = useState('');
    const [password, setPassword] = useState('');
    const [cpassword, setcPassword] = useState('');

    const [profileImage, setProfileImage] = useState(null);
    const [uploadedFiles, setUploadedFiles] = useState([]);


    const [aadhar, setAadhar] = useState('');
    const [pan, setPan] = useState('');
    const [passport, setPassport] = useState('');
    const [nationality, setNationality] = useState('');
    const [religion, setReligion] = useState('');
    const [maritalStatus, setMaritalStatus] = useState('');
    const [spouseEmployment, setSpouseEmployment] = useState('');
    const [childrenCount, setChildrenCount] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');

    const [emergencyName, setEmergencyName] = useState('');
    const [emergencyRelation, setEmergencyRelation] = useState('');
    const [emergencyPhone, setEmergencyPhone] = useState('');


    const [bankName, setBankName] = useState('');
    const [bankAccount, setBankAccount] = useState('');
    const [accountHolder, setAccountHolder] = useState('');
    const [ifscCode, setIfscCode] = useState('');
    const [branchName, setBranchName] = useState('');
    const [upiId, setUpiId] = useState('');


    const [currentStep, setCurrentStep] = useState(0);





    const handleProfileImageUpload = (e) => {
        if (e.files && e.files.length > 0) {
            const selectedFile = e.files[0];
            setProfileImage(selectedFile);

            // Manually reset the file input
            if (imageUploadRef.current) {
                imageUploadRef.current.clear();
            }
        }
    };


    /*-------------- Document File Upload Functions ---------------*/
    const onSelect = (e) => {
        const selectedFiles = e.files;
        const combinedFiles = [...uploadedFiles, ...selectedFiles];

        if (combinedFiles.length > 2) {
            showMessage('error', 'You can only upload up to 2 images');
        }

        // Only keep max 2
        const updatedFiles = combinedFiles.slice(0, 2);
        setUploadedFiles(updatedFiles);

        // Clear file input manually using ref
        if (fileUploadRef.current) {
            fileUploadRef.current.clear();
        }
    };


    const onRemove = (file) => {
        setUploadedFiles((prevFiles) => prevFiles.filter((f) => f !== file));
        showMessage('success', 'Image removed successfully');
    };


    const validateStep1 = () => {
        return (
            firstName && lastName && email && phone &&
            Address1 && Address2 && city && postcode && stateName &&
            gender && password && cpassword
        );
    };

    const validateStep2 = () => {
        return (
            aadhar && pan && nationality &&
            religion && maritalStatus && emergencyName && emergencyRelation && emergencyPhone && dateOfBirth
        );
    };

    const validateStep3 = () => {
        return (
            bankName && bankAccount && accountHolder &&
            ifscCode && branchName && upiId
        );
    };

    const handleNext = () => {
        let isValid = false;

        if (currentStep === 0) {
            isValid = validateStep1();
        } else if (currentStep === 1) {
            isValid = validateStep2();
        } else if (currentStep === 2) {
            isValid = validateStep3();
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
        if (!validateStep1() || !validateStep2() || !validateStep3()) {
            showMessage('error', 'Please Fill all required fields before proceeding.');
            return;
        }

        if (!profileImage) {
            showMessage('error', 'Please upload a profile image.');
            return;
        }

        if (uploadedFiles.length === 0) {
            showMessage('error', 'Please upload at least one document.');
            return;
        }

        if (password !== cpassword) {
            showMessage('error', 'Passwords do not match.');
            return;
        }

        const formData = new FormData();

        // Step 1: User basic info
        formData.append('first_name', firstName);
        formData.append('last_name', lastName);
        formData.append('email', email);
        formData.append('personal_email', personal_email);
        formData.append('password', password);

        formData.append('phone', phone);
        formData.append('alternate_no', alternate_no);
        formData.append('Address1', Address1);
        formData.append('Address2', Address2);
        formData.append('City', city);
        formData.append('State', stateName);
        formData.append('gender', gender);

        // Step 2: Personal Info
        formData.append('aadhar_no', aadhar);
        formData.append('pan_card_no', pan);
        formData.append('passport_no', passport);
        formData.append('nationality', nationality);
        formData.append('religion', religion);
        formData.append('marital_status', maritalStatus);
        formData.append('employment_of_spouse', spouseEmployment);
        formData.append('no_of_children', childrenCount);
        if (dateOfBirth) {
            const formattedDOB = dateOfBirth.toISOString().split('T')[0]; // Ensures only date, no time
            formData.append('date_of_birth', formattedDOB);
        }

        // Step 3: Bank Info
        formData.append('bank_name', bankName);
        formData.append('bank_account_no', bankAccount);
        formData.append('account_holder_name', accountHolder);
        formData.append('ifsc_code', ifscCode);
        formData.append('branch_name', branchName);
        formData.append('upi_id', upiId);

        // Emergency Contact
        formData.append('emergency_name', emergencyName);
        formData.append('emergency_relation', emergencyRelation);
        formData.append('emergency_phone', emergencyPhone);

        // Files
        formData.append('profile_image', profileImage); // profile image

        uploadedFiles.forEach((file, index) => {
            formData.append('documents', file);
        });

        try {
            setLoading(true);
            const response = await axios.post(`${config.apiBASEURL}/AuthRoutes/register`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const result = response.data;

            if (response.status === 201) {
                showMessage('success', result.message || 'User registered successfully!');
                setLoading(false);
                setTimeout(() => navigate('/login'), 1000);
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

    const [token, setTokens] = useState();

    const customInput = ({ events, props }) => {
        return <><input {...events} {...props} type="text" className="custom-otp-input-sample" />
            {props.id === 2 && <div className="px-1">
            </div>}
        </>
    };


    return (
        <Container fluid className='signup-page position-relative p-0'>
            <div className='brand-logo' style={{ zIndex: 9 }}>
                <img src={logo} alt="Logo" style={{ width: '180px', height: 'auto', }} />
            </div>
            <Row className='mx-0 d-flex align-items-end justify-content-end'>
                <Col md={5} className='px-5 py-5 right-col'>
                    <Stepper ref={stepperRef} style={{ flexBasis: '50rem' }} className="newRegister">
                        <StepperPanel header="Basic Info">
                            <div className="scroll-pannel mt-4">
                                <Row className='m-0 h-auto d-flex align-items-center'>
                                    <Col md={6} lg={3} className='position-relative pb-2'>
                                        <div className='position-relative' style={{ width: '100px' }}>
                                            <img
                                                src={
                                                    profileImage
                                                        ? URL.createObjectURL(profileImage)
                                                        : require('../../assets/images/no_user.png')
                                                }
                                                alt='Profile Preview'
                                                style={{
                                                    width: '100px',
                                                    height: '100px',
                                                    background: 'rgb(61 61 61)',
                                                    border: '1px solid rgb(61, 61, 61)',
                                                    objectFit: 'cover'
                                                }}
                                                className='rounded-circle'
                                            />

                                            <FileUpload
                                                ref={imageUploadRef}
                                                mode='basic'
                                                name='profileImage'
                                                accept='image/*'
                                                maxFileSize={3000000} // 300KB
                                                customUpload
                                                auto
                                                uploadHandler={handleProfileImageUpload}
                                                className='FlUpload text-light newRegphoto'
                                                style={{
                                                    position: 'absolute',
                                                    width: '25px',
                                                    height: '25px',
                                                    bottom: '0px',
                                                    right: '0px',
                                                    zIndex: 2,
                                                }}
                                            />

                                        </div>
                                    </Col>
                                    <Col md={6} lg={4} className='mb-3 p-0 pe-1'>
                                        <label><i className='pi pi-mars pe-3 mb-3'></i>Gender</label>
                                        <div className="d-flex gap-3">
                                            <div className="d-flex align-items-center ">
                                                <RadioButton inputId="gender1" value="Male" name="gender" onChange={(e) => setGender(e.value)} checked={gender === "Male"} />
                                                <label htmlFor="ingredient1" className="ms-2">Male</label>
                                            </div>
                                            <div className="d-flex align-items-center">
                                                <RadioButton inputId="gender2" value="Female" name="gender" onChange={(e) => setGender(e.value)} checked={gender === "Female"} />
                                                <label htmlFor="ingredient2" className="ms-2">Female</label>
                                            </div>
                                        </div>
                                    </Col>
                                </Row>
                                <Row className='m-0 h-auto'>
                                    <Col md={6} lg={6} className='mb-3 p-0 pe-3'>
                                        <span className='fnameinp'>
                                            <label htmlFor="firstName"><i className='pi pi-user pe-2'></i>First Name <span>*</span></label>
                                            <InputText
                                                type="text"
                                                name="firstName"
                                                required
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                            />
                                        </span>
                                    </Col>
                                    <Col md={6} lg={6} className='mb-3 p-0 pe-3'>
                                        <span className='fnameinp'>
                                            <label htmlFor="lastName"><i className='pi pi-user pe-2'></i>Last Name <span>*</span></label>
                                            <InputText
                                                type="text"
                                                name="lastName"
                                                required
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
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
                                        <span className='fnameinp'>
                                            <label htmlFor="email"><i className='pi pi-envelope pe-2'></i>Personal Email <span>*</span></label>
                                            <InputText
                                                type="email"
                                                name="email"
                                                required
                                                value={personal_email}
                                                onChange={(e) => setPersonalEmail(e.target.value)}
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
                                    <Col md={6} lg={6} className='mb-3 p-0 pe-3'>
                                        <label htmlFor="phone"><i className='pi pi-phone pe-2'></i>Alternate No <span>*</span></label>
                                        <InputText
                                            type="number"
                                            name="phone"
                                            value={alternate_no}
                                            onChange={(e) => setAlternateNo(e.target.value)}
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
                                </Row>
                                <Col md={12} lg={12}>
                                    <div className='sign_image'>
                                        <div className='d-flex justify-content-between align-items-center'>
                                            <label htmlFor="documents"><i className='pi pi-file pe-2'></i>Documents<span>*</span></label>
                                            <span>
                                                <FileUpload
                                                    ref={fileUploadRef}
                                                    mode="basic"
                                                    name="documents"
                                                    accept="image/*"
                                                    maxFileSize={2000000}
                                                    auto
                                                    multiple
                                                    customUpload
                                                    uploadHandler={() => { }}
                                                    onSelect={onSelect}
                                                    className="custom-browse-button2"
                                                />

                                            </span>
                                        </div>
                                        <ul className='up-document-table'>
                                            {uploadedFiles.map((file, index) => (
                                                <li key={index} style={{ position: 'relative' }}>
                                                    <Image src={URL.createObjectURL(file)} alt={`Uploaded Image ${index + 1}`} preview />
                                                    <Button
                                                        type="button"
                                                        onClick={() => onRemove(file)}
                                                        className='position-absolute p-0'
                                                        icon="pi pi-times"
                                                        severity='danger'
                                                        text
                                                        style={{ fontSize: '12px', zIndex: 2, top: '0px', right: '-10px' }}
                                                    />

                                                </li>
                                            ))}
                                        </ul>
                                        <small><em>Info : </em>voter  / Pan / Adhar card Image (file size should be less than 2 MB, and only 2 images allowed)</small>
                                    </div>
                                </Col>

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
                        <StepperPanel header="Personal Info">
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
                                            <label>Passport No. </label>
                                            <InputText
                                                type="text"
                                                name="passport_no"
                                                required
                                                value={passport}
                                                onChange={(e) => setPassport(e.target.value)}
                                            />
                                        </span>
                                    </Col>
                                    <Col md={6} lg={6} className='mb-3 p-0 pe-1'>
                                        <span className='fnameinp'>
                                            <label>Aadhar No. <span>*</span></label>
                                            <InputText
                                                type="text"
                                                name="aadhar_no"
                                                required
                                                value={aadhar}
                                                onChange={(e) => setAadhar(e.target.value)}
                                            />
                                        </span>
                                    </Col>
                                    <Col md={6} lg={6} className='mb-3 p-0 pe-1'>
                                        <span className='fnameinp'>
                                            <label>Nationality </label>
                                            <InputText
                                                type="text"
                                                name=""
                                                required
                                                value={nationality}
                                                onChange={(e) => setNationality(e.target.value)}
                                            />
                                        </span>
                                    </Col>
                                    <Col md={6} lg={6} className='mb-3 p-0 pe-1'>
                                        <span className='fnameinp'>
                                            <label>Religion </label>
                                            <InputText
                                                type="text"
                                                name=""
                                                required
                                                value={religion}
                                                onChange={(e) => setReligion(e.target.value)}
                                            />
                                        </span>
                                    </Col>
                                    <Col md={6} lg={4} className='mb-3 p-0 pe-1'>
                                        <span className='fnameinp'>
                                            <label>Date of Birth <span>*</span></label>
                                            <Calendar
                                                value={dateOfBirth}
                                                onChange={(e) => setDateOfBirth(e.value)}
                                                dateFormat="dd-mm-yy"
                                                className='mt-0 w-100'
                                                maxDate={new Date()}
                                                required
                                            />
                                        </span>
                                    </Col>
                                    <Col md={6} lg={6} className='mb-3 p-0 pe-1'>
                                        <span className='fnameinp'>
                                            <label><i className='pi pi-heart-fill pe-2'></i>Marital Status <span>*</span></label>
                                            <div className="d-flex pt-4 gap-3">
                                                <div className="d-flex align-items-center">
                                                    <RadioButton inputId="marital1" value="Single" name="maritalStatus" onChange={(e) => setMaritalStatus(e.value)} checked={maritalStatus === "Single"} />
                                                    <label htmlFor="marital1" className="ms-2">Single</label>
                                                </div>
                                                <div className="d-flex align-items-center">
                                                    <RadioButton inputId="marital2" value="Married" name="maritalStatus" onChange={(e) => setMaritalStatus(e.value)} checked={maritalStatus === "Married"} />
                                                    <label htmlFor="marital2" className="ms-2">Married</label>
                                                </div>
                                                <div className="d-flex align-items-center">
                                                    <RadioButton inputId="marital3" value="Other" name="maritalStatus" onChange={(e) => setMaritalStatus(e.value)} checked={maritalStatus === "Other"} />
                                                    <label htmlFor="marital3" className="ms-2">Other</label>
                                                </div>
                                            </div>
                                        </span>
                                    </Col>

                                    <Col md={6} lg={6} className='mb-3 p-0 pe-1'>
                                        <span className='fnameinp'>
                                            <label>No. of children </label>
                                            <InputText
                                                type="text"
                                                name=""
                                                required
                                                value={childrenCount}
                                                onChange={(e) => setChildrenCount(e.target.value)}
                                            />
                                        </span>
                                    </Col>
                                </Row>
                                <Row className='h-auto m-0 pt-4 pb-4 border-top'>
                                    <h6 className='fw-bold text-white p-0 mb-3'>Emergency Contact</h6>
                                    <Col md={6} lg={4} className='mb-3 p-0 pe-1'>
                                        <span className='fnameinp'>
                                            <label>Name <span>*</span></label>
                                            <InputText
                                                type="text"
                                                name=""
                                                required
                                                value={emergencyName}
                                                onChange={(e) => setEmergencyName(e.target.value)}
                                            />
                                        </span>
                                    </Col>
                                    <Col md={6} lg={4} className='mb-3 p-0 pe-1'>
                                        <span className='fnameinp'>
                                            <label>Relationship <span>*</span></label>
                                            <InputText
                                                type="text"
                                                name=""
                                                required
                                                value={emergencyRelation}
                                                onChange={(e) => setEmergencyRelation(e.target.value)}
                                            />
                                        </span>
                                    </Col>
                                    <Col md={6} lg={4} className='mb-3 p-0 pe-1'>
                                        <span className='fnameinp'>
                                            <label>Phone No. <span>*</span></label>
                                            <InputText
                                                type="number"
                                                name=""
                                                required
                                                value={emergencyPhone}
                                                onChange={(e) => setEmergencyPhone(e.target.value)}
                                            />
                                        </span>
                                    </Col>
                                </Row>
                            </div>
                            <div className="d-flex pt-4 justify-content-between">
                                <Button
                                    title="Back"
                                    severity="secondary"
                                    icon="pi pi-arrow-left"
                                    onClick={() => {
                                        setCurrentStep(prev => prev - 1); // update local tracker
                                        stepperRef.current.prevCallback(); // go back
                                    }}
                                    className='py-2 px-3'
                                    style={{ width: 'fit-content' }}
                                />
                                <Button
                                    label="Next"
                                    icon="pi pi-arrow-right"
                                    iconPos="right"
                                    onClick={handleNext} // validation before step change
                                    className='py-2 px-4'
                                    style={{ width: 'fit-content' }}
                                    severity='warning'
                                />
                            </div>
                        </StepperPanel>
                        <StepperPanel header="Bank Info">
                            <div className="scroll-pannel mt-4">
                                <Row className='h-auto m-0'>
                                    <Col md={6} lg={6} className='mb-3 p-0 pe-1'>
                                        <span className='fnameinp'>
                                            <label>Bank Name.  <span>*</span></label>
                                            <InputText
                                                type="text"
                                                name="pan_card_no"
                                                required
                                                value={bankName}
                                                onChange={(e) => setBankName(e.target.value)}
                                            />
                                        </span>
                                    </Col>
                                    <Col md={6} lg={6} className='mb-3 p-0 pe-1'>
                                        <span className='fnameinp'>
                                            <label>Bank Account No. <span>*</span></label>
                                            <InputText
                                                type="text"
                                                name="passport_no"
                                                required
                                                value={bankAccount}
                                                onChange={(e) => setBankAccount(e.target.value)}
                                            />
                                        </span>
                                    </Col>
                                    <Col md={6} lg={6} className='mb-3 p-0 pe-1'>
                                        <span className='fnameinp'>
                                            <label>Account Holders Name <span>*</span></label>
                                            <InputText
                                                type="text"
                                                name="passport_no"
                                                required
                                                value={accountHolder}
                                                onChange={(e) => setAccountHolder(e.target.value)}
                                            />
                                        </span>
                                    </Col>
                                    <Col md={6} lg={6} className='mb-3 p-0 pe-1'>
                                        <span className='fnameinp'>
                                            <label>IFSC Code <span>*</span></label>
                                            <InputText
                                                type="text"
                                                name="passport_no"
                                                required
                                                value={ifscCode}
                                                onChange={(e) => setIfscCode(e.target.value)}
                                            />
                                        </span>
                                    </Col>
                                    <Col md={6} lg={6} className='mb-3 p-0 pe-1'>
                                        <span className='fnameinp'>
                                            <label>Branch Name <span>*</span></label>
                                            <InputText
                                                type="text"
                                                name="passport_no"
                                                required
                                                value={branchName}
                                                onChange={(e) => setBranchName(e.target.value)}
                                            />
                                        </span>
                                    </Col>
                                    <Col md={6} lg={6} className='mb-3 p-0 pe-1'>
                                        <span className='fnameinp'>
                                            <label>UPI Id </label>
                                            <InputText
                                                type="text"
                                                name="passport_no"
                                                required
                                                value={upiId}
                                                onChange={(e) => setUpiId(e.target.value)}
                                            />
                                        </span>
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
                    <p className='mt-4 text-center text-secondary'>Already have an account? <Link to='/login' className='text-warning'>Login</Link></p>
                </Col>
            </Row>
            <CustomToast ref={toastRef} />
        </Container>
    )
}

export default Signup
