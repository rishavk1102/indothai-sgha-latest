import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CLIENT_HOME } from '../utils/clientWorkspace';
import { EMPLOYEE_HOME } from '../utils/employeeWorkspace';
import GifLoder from './GifLoder';

const AuthLoader = () => (
  <div className="loderDiv">
    <GifLoder />
  </div>
);

const ProtectedRoute = ({ element: Component }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <AuthLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Component />;
};

export const EmployeeRoute = ({ element: Component }) => {
  const { isAuthenticated, loading, role } = useAuth();

  if (loading) {
    return <AuthLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (role === 'Client') {
    return <Navigate to={CLIENT_HOME} replace />;
  }

  return <Component />;
};

export const ClientOnlyRoute = ({ element: Component }) => {
  const { isAuthenticated, loading, role } = useAuth();

  if (loading) {
    return <AuthLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (role !== 'Client') {
    return <Navigate to={EMPLOYEE_HOME} replace />;
  }

  return <Component />;
};

export default ProtectedRoute;
