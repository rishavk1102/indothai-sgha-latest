import { useState, useRef, useEffect } from 'react';
import { Row, Container, Form } from 'react-bootstrap';
import '../../assets/css/login.css';
import { Link } from 'react-router-dom';
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
const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const toastRef = useRef(null);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prevCooldown) => prevCooldown - 1);
      }, 1000);
    } else {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const showMessage = (severity, detail) => {
    const summary = severity.charAt(0).toUpperCase() + severity.slice(1);
    toastRef.current.show(severity, summary, detail);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCooldown(60); // Set cooldown to 1 minute (60 seconds)
    showMessage('info', `You can request another reset link in ${cooldown} seconds.`);
    try {
      const response = await axios.post(`${config.apiBASEURL}/Forgot/forgot-password`, { email });
      showMessage('success', response.data);

    } catch (error) {
      showMessage('error', 'Error sending reset link');
    }
  };

  return (
    <>
      <Container fluid className='login-page position-relative'>
        <div className='brand-logo'>
          <img src={require("../../assets/images/footer_logo.png")} alt="Logo" style={{ width: '180px', height: 'auto' }} />
        </div>
        <Row className='mx-0'>
          <div className='loginCard'>
            {/* <h4 className='mb-4 text-white'>Login</h4> */}
            <Form onSubmit={handleSubmit} className='login-form'>
              <FloatLabel>
                <InputText
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={cooldown > 0}
                />
                <label htmlFor="email">Email</label>
              </FloatLabel>

              <Button
                variant="primary"
                type="submit"
                label={cooldown > 0 ? `Wait ${cooldown} seconds` : 'Send Reset Link'}
                className="w-100 loginbtn mt-4"
                disabled={cooldown > 0}
              />

            </Form>
          </div>
        </Row>
        <CustomToast ref={toastRef} />
      </Container>
    </>
  )
}

export default ForgotPassword

