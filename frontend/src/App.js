import 'primeicons/primeicons.css';
import React from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import '././assets/css/responsive.css';
import './assets/css/common_style.css';
import './App.css';
import Login from './pages/AuthPages/Login';
import Signup from './pages/AuthPages/Signup';
// import Dashboard from './pages/common/Dashboard';
// // import Newuser from './pages/common/Newuser';
import { AuthProvider } from './context/AuthContext';
import AuthGuard from './interfaces/AuthGuard';
import ClientForgotPassword from './pages/AuthPages/ClientForgotPassword';
import ClientLogin from './pages/AuthPages/ClientLogin';
import ClientResetPassword from './pages/AuthPages/ClientResetPassword';
import ClientSignup from './pages/AuthPages/ClientSignup';
import ForgotPassword from './pages/AuthPages/ForgotPassword';
import Home from './pages/AuthPages/Home';
import ResetPassword from './pages/AuthPages/ResetPassword';
import Testpage from './pages/AuthPages/Testpage';
import Dashboard from './pages/common/Dashboard';

// import 'primeicons/primeicons.css';
// import Signup_new from './pages/defaultpages/Signup_new';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/test" element={<AuthGuard element={Testpage} />} />
          <Route path="/" element={<AuthGuard element={Home} />} />
          <Route
            path="/Client_signup/:token"
            element={<AuthGuard element={ClientSignup} />}
          />
          <Route path="/Client_login" element={<AuthGuard element={ClientLogin} />} />
          <Route path="/login" element={<AuthGuard element={Login} />} />
          <Route path="/signup" element={<AuthGuard element={Signup} />} />
          <Route path="/passreset" element={<AuthGuard element={ForgotPassword} />} />
          <Route path="/resetpassword/:token" element={<AuthGuard element={ResetPassword} />} />
          <Route path="/Client_resetpassword/:token" element={<AuthGuard element={ClientResetPassword} />} />
          <Route path='/Clientpassreset' element={<AuthGuard element={ClientForgotPassword} />} />

          <Route
            path="/dashboard/*"
            element={<Dashboard />}
          />

          {/* <Route path="/newuser/*" element={<ProtectedRoute element={Newuser} allowedRoles={['Unverified']}/>} /> */}
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;