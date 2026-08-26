import React from 'react';
import { Navigate } from 'react-router-dom';
import { CLIENT_HOME } from '../../utils/clientWorkspace';

const Client_Dashboard = () => {
    return <Navigate to={CLIENT_HOME} replace />;
};

export default Client_Dashboard;
