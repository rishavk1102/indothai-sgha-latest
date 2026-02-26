import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TabView, TabPanel } from 'primereact/tabview';
import { Row, Col, Breadcrumb} from "react-bootstrap";



const AdminDashboard = () => {

   const { isAuthenticated, role } = useAuth();
      
      
    return (
      <>
        <Row>
          <Col md={12} lg={6}>
            <Breadcrumb>
              <Breadcrumb.Item active>Dashboard</Breadcrumb.Item>
            </Breadcrumb>
          </Col>
        </Row>
      </>
    )
}

export default AdminDashboard
