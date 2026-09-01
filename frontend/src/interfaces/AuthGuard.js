import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CLIENT_HOME } from '../utils/clientWorkspace';
import { EMPLOYEE_HOME } from '../utils/employeeWorkspace';

const AuthGuard = ({ element: Component }) => {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  const path = location.pathname;

  // Publicly accessible routes
  const publicRoutes = ["/login", "/", "/signup", "/passreset", "/Client_login", "/Clientpassreset"];
  const isPublic = publicRoutes.includes(path)
    || path.startsWith("/Client_resetpassword/")    // ✅ Client reset password
    || path.startsWith("/resetpassword/") ||
    path.startsWith("/Client_signup/");

  // If NOT authenticated and trying to access a protected route
  if (!isAuthenticated && !isPublic) {
    return <Navigate to="/" replace />;
  }

  // If authenticated and trying to access login-related or root routes
  if (isAuthenticated && isPublic) {
    if (role === "Client") {
      return <Navigate to={CLIENT_HOME} replace />;
    }
    return <Navigate to={EMPLOYEE_HOME} replace />;
  }

  // Else, allow rendering
  return <Component />;
};

export default AuthGuard;
