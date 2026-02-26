import { useState, useRef } from 'react';
import { Row, Container, Form } from 'react-bootstrap';
import '../../assets/css/login.css';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Password } from 'primereact/password';
import { FloatLabel } from 'primereact/floatlabel';
import { Divider } from 'primereact/divider';
import CustomToast from '../../components/CustomToast';
import axios from 'axios';
import config from '../../config';

const ResetPassword = () => {
  const { token } = useParams(); // 🔹 Get token from URL
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const toastRef = useRef(null);

  // 🔹 Toast message helper
  const showMessage = (severity, detail) => {
    const summary = severity.charAt(0).toUpperCase() + severity.slice(1);
    toastRef.current.show(severity, summary, detail);
  };

  // 🔹 Password field header & footer (PrimeReact Password suggestions)
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

  // 🔹 Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      showMessage('warn', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      showMessage('error', 'Passwords do not match');
      return;
    }

    try {
      await axios.post(`${config.apiBASEURL}/Forgot/reset-password/${token}`, { password });
      showMessage('success', 'Password has been reset successfully');

      setTimeout(() => navigate('/Graphe/login'), 3000);
    } catch (error) {
      console.error(error);
      showMessage('error', error.response?.data || 'Error resetting password');
    }
  };

  return (
    <>
      <Container fluid className="login-page position-relative">
        <CustomToast ref={toastRef} />
        <div className="brand-logo">
          <img
            src={require('../../assets/images/footer_logo.png')}
            alt="Logo"
            style={{ width: '180px', height: 'auto' }}
          />
        </div>

        <Row className="mx-0">
          <div className="loginCard pt-3">
            <Form className="login-form" onSubmit={handleSubmit}>
              <FloatLabel>
                <Password
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  header={header}
                  footer={footer}
                  toggleMask
                  feedback={true}
                  required
                />
                <label htmlFor="password">Password</label>
              </FloatLabel>

              <FloatLabel>
                <Password
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  feedback={false}
                  toggleMask
                  required
                />
                <label htmlFor="confirmPassword">Confirm Password</label>
              </FloatLabel>

              <Button
                type="submit"
                label="Reset Password"
                className="w-100 loginbtn mt-5"
              />
            </Form>
          </div>
        </Row>
      </Container>
    </>
  );
};

export default ResetPassword;



// import { useState } from 'react';
// import { Row, Container, Form} from 'react-bootstrap';
// import '../../assets/css/login.css';
// import { Link } from 'react-router-dom';
// import { Button } from 'primereact/button';
// import { InputText } from "primereact/inputtext";
// import { FloatLabel } from "primereact/floatlabel";
// import { Password } from 'primereact/password';
// import { Divider } from 'primereact/divider';
// import { InputOtp } from 'primereact/inputotp';
// import config from '../../config';
// import CustomToast from '../../components/CustomToast';
// const ResetPassword = () => {
//  const { token } = useParams();  // Get the token from the URL params
//     const navigate = useNavigate();
//     const [password, setPassword] = useState('');
//     const [confirmPassword, setConfirmPassword] = useState('');
//     const [showPassword, setShowPassword] = useState(false);
//     const [showConfirmPassword, setShowConfirmPassword] = useState(false);
//     const toastRef = useRef(null);

//     const showMessage = (severity, detail) => {
//         const summary = severity.charAt(0).toUpperCase() + severity.slice(1);
//         toastRef.current.show(severity, summary, detail);
//     };


//   const header = <div className="font-bold mb-3">Pick a password</div>;
//     const footer = (
//         <>
//             <Divider />
//             <p className="mt-2">Suggestions</p>
//             <ul className="pl-2 ml-2 mt-0 line-height-3">
//                 <li>At least one lowercase</li>
//                 <li>At least one uppercase</li>
//                 <li>At least one numeric</li>
//                 <li>Minimum 8 characters</li>
//             </ul>
//         </>
//     );

//     /*-------------OTP--------------*/

//     const [token, setTokens] = useState();

//     const customInput = ({events, props}) => {
//         return <><input {...events} {...props} type="text" className="custom-otp-input-sample" />
//             {props.id === 2 && <div className="px-1">
//             </div>}
//         </>
//     };

//   return (
//     <>
//       <Container fluid className='login-page position-relative'>
//           <div className='brand-logo'>
//             <img src={require("../../assets/images/footer_logo.png")} alt="Logo" style={{ width: '180px', height: 'auto' }} />
//           </div>
//           <Row className='mx-0'>
//             <div className='loginCard pt-3'>
//               {/* <h4 className='mb-4 text-white'>Login</h4> */}
//               <Form className='login-form'>
//                 <FloatLabel>
//                   <Password value={value} onChange={(e) => setValue(e.target.value)} header={header} footer={footer} toggleMask/>
//                   <label htmlFor="password">Password</label>
//                 </FloatLabel>
//                 <FloatLabel>
//                   <Password value={value2} onChange={(e) => setValue2(e.target.value)} feedback={false} toggleMask/>
//                   <label htmlFor="password">Confirm Password</label>
//                 </FloatLabel>

//                 <Button
//                   variant="primary"
//                   label='Submit'
//                   className='w-100 loginbtn mt-5'

//                 />
//               </Form>
//             </div>

//             {/* OTP */}

//             <div className='loginCard OtpDiv d-none'>
//               <div className="d-flex flex-column align-items-center">
//                 <h5 className="font-bold text-xl mb-2">Authenticate Your Account</h5>
//                 <p className="text-color-secondary block mb-5">Please enter the code sent to your phone.</p>
//                 <InputOtp value={token} onChange={(e) => setTokens(e.value)} length={6} inputTemplate={customInput} style={{gap: 0}}/>
//                 <div className="d-flex justify-content-between mt-5 align-self-stretch">
//                     <Button
//                       label="Resend Code"
//                       text
//                       className="p-0 px-2"
//                       severity='warning'
//                     />
//                     <Button
//                       label="Submit Code"
//                       className='loginbtn'
//                     />
//                 </div>
//               </div>
//             </div>
//           </Row>
//       </Container>
//     </>
//   )
// }

// export default ResetPassword
