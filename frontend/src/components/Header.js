import React, { useState } from "react";
import { Container, Row, Col } from 'react-bootstrap';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { Avatar } from 'primereact/avatar';
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate, useLocation, NavLink } from 'react-router-dom';
const Header = () => {
    const { isAuthenticated, username, role, logout, imgUrl } = useAuth();
    const navigate = useNavigate();
    const [selectedAirport, setSelectedAirport] = useState(null);
    const cities = [
        { name: '(BBI) Biju Patnaik International Airport', code: 'BBI' },
        { name: '(VNS) Lal Bahadur Shastri International Airport', code: 'VNS' },
        { name: '(GAY) Gaya International Airport', code: 'GAY' },
        { name: '(CCJ) Calicut International Airport', code: 'CCJ' },
        { name: '(JAI) Jaipur International Airport', code: 'JAI' },
        { name: '(CCU) NSCBI International Airport', code: 'CCU' }
    ];

    const handleLogout = async () => {
        await logout();
        navigate('/', { replace: true });
    };

    return (
        <header className='upperheader'>
            <Container fluid className='position-relative p-0'>
                <Row className='mx-0 d-flex align-items-center justify-content-between'>
                    <Col md={6} lg={6} sm={6} className='p-0'>
                        <div className="d-flex align-items-center gap-2">
                            <img src={require("../assets/images/logo.png")} alt="Logo" className='brandLogo' />
                            <img src={require("../assets/images/indo_text.png")} alt="Logo" className='brandLogo' style={{width:'105px'}}/>
                            {/*<div className="dropPart">
                                 <small className="m-0 pe-3"><b className="text-muted">Change Airport</b></small>
                                
                                <Dropdown
                                    value={selectedAirport}
                                    onChange={(e) => setSelectedAirport(e.value)}
                                    options={cities}
                                    optionLabel="name"
                                    placeholder="Change Airport"
                                    className="custom_dropdown"
                                /> 
                            </div>*/}
                        </div>
                    </Col>
                    <Col md={6} lg={4} sm={6} className="p-0">
                        <div className='d-flex align-items-center justify-content-end gap-2'>
                            <div className="d-flex align-items-center gap-2">
                                <Avatar image={imgUrl} shape="circle" />
                                <h6 className="mb-0">{username}
                                    <small className="d-block" style={{ fontSize: '12px', color: '#ff8104', fontWeight: '500' }}>{role}</small>
                                </h6>
                            </div>
                            {/* <Button icon="pi pi-bell" rounded text severity="info" aria-label="Notification" tooltip="Notifications" tooltipOptions={{ position: 'bottom' }} /> */}
                            <Button icon="pi pi-sign-out" rounded text severity="danger" aria-label="Cancel" tooltip="Logout" tooltipOptions={{ position: 'bottom' }} onClick={handleLogout} />
                        </div>
                    </Col>
                </Row>
            </Container>
        </header>
    );
};

export default Header;