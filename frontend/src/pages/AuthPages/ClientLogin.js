import { useState, useRef } from 'react';
import { Row, Container, Form } from 'react-bootstrap';
import '../../assets/css/login.css';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { InputText } from "primereact/inputtext";
import { FloatLabel } from "primereact/floatlabel";
import { Password } from 'primereact/password';
import { Divider } from 'primereact/divider';
import { InputOtp } from 'primereact/inputotp';
import CustomToast from '../../components/CustomToast'
import axios from 'axios';
import config from '../../config';
import { useAuth } from '../../context/AuthContext';
const ClientLogin = () => {

  const toastRef = useRef(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handlePasswordViewToggle = () => {
    setShowPassword(!showPassword);
  };

  const showMessage = (severity, detail) => {
    const summary = severity.charAt(0).toUpperCase() + severity.slice(1);
    toastRef.current.show(severity, summary, detail);
  };


 
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(
        `${config.apiBASEURL}/AuthRoutes/user-login`,
        {
          email: email,
          password: password,
          loginType: 'Client',
        },
        { withCredentials: true }
      );

      const authData = response.data;
      login(authData); // Make sure this function is not blocking further execution

      // Show success message
      showMessage('success', `Welcome ${response.data.name}`);
      // ✅ Redirect after successful login
      navigate('/dashboard/home', { replace: true });
    } catch (error) {
      console.error('Error logging in:', error.response);
      showMessage('error', 'Invalid email or password');
    }
  };

  /*-------------OTP--------------*/

  const [token, setTokens] = useState();

  const customInput = ({ events, props }) => {
    return <><input {...events} {...props} type="text" className="custom-otp-input-sample" />
      {props.id === 2 && <div className="px-1">
      </div>}
    </>
  };

  return (
    <>
      <Container fluid className='login-page position-relative'>
        <div className='brand-logo'>
          <img src={require("../../assets/images/footer_logo.png")} alt="Logo" style={{ width: '180px', height: 'auto' }} />
        </div>
        <Row className='mx-0'>
          <div className='loginCard' >
            {/* <h4 className='mb-4 text-white'>Login</h4> */}
            <Form className='login-form' onSubmit={handleSubmit}>
              <FloatLabel>
                <InputText type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your Email"
                  required />
                <label htmlFor="email">Email</label>
              </FloatLabel>
              <FloatLabel>
                <Password type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  feedback={false}
                  toggleMask />
                <label htmlFor="password">Password</label>
              </FloatLabel>

              <div className="mb-3 d-flex justify-content-end">
                <Link to="/Clientpassreset">Forgot password?</Link>
              </div>

              <Button
                variant="primary"
                label='Login'
                className='w-100 loginbtn'

              />

              <div className="mt-3 text-center">

              </div>
            </Form>
          </div>

          {/* OTP */}

          <div className='loginCard OtpDiv d-none'>
            <div className="d-flex flex-column align-items-center">
              <h5 className="font-bold text-xl mb-2">Authenticate Your Account</h5>
              <p className="text-color-secondary block mb-5">Please enter the code sent to your phone.</p>
              <InputOtp value={token} onChange={(e) => setTokens(e.value)} length={6} inputTemplate={customInput} style={{ gap: 0 }} />
              <div className="d-flex justify-content-between mt-5 align-self-stretch">
                <Button
                  label="Resend Code"
                  text
                  className="p-0 px-2"
                  severity='warning'
                />
                <Button
                  label="Submit Code"
                  className='loginbtn'
                />
              </div>
            </div>
          </div>
        </Row>
      </Container>
      <CustomToast ref={toastRef} />
    </>
  )
}

export default ClientLogin;
