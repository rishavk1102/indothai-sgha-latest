import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GifLoder from './GifLoder';

const ProtectedRoute = ({ element: Component }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loderDiv">
        <GifLoder />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return <Component />;
};

export default ProtectedRoute;
