import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthGuard = ({ element: Component }) => {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  const path = location.pathname;

  // Publicly accessible routes
  const publicRoutes = ["/login", "/", "/signup", "/passreset", "/Client_login", "/test", "/Clientpassreset"];
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
      return <Navigate to="/dashboard/ClientDashboard" replace />;
    }
    return <Navigate to="/dashboard/Dashcommon" replace />;
  }

  // Else, allow rendering
  return <Component />;
};

export default AuthGuard;
