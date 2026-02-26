import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from '../../components/Layout';
import ProtectedRoute from '../../interfaces/PrivateRoute';
import AdditionalCharges from '../Admin/AdditionalCharges';
import AdminDashboard from '../Admin/AdminDashboard';
import AgreedServicesCharges from '../Admin/AgreedServicesCharges';
import Aircraft_types from '../Admin/Aircraft_types';
import AircraftCategory from '../Admin/AircraftCategory';
import Airlines from '../Admin/Airlines';
import Airports from '../Admin/Airports';
import Categories from '../Admin/Categories';
import ClientLinksPage from '../Admin/ClientLinksPage';
import Clients from '../Admin/Clients';
import EmployeeEdit from '../Admin/EmployeeEdit';
import FlightType from '../Admin/FlightType';
import Headquarters from '../Admin/Headquarters';
import Roles_permissions from '../Admin/Roles_permissions';
import Services_Price from '../Admin/Services_Price';
import VerifyEmployee from '../Admin/VerifyEmployee';
import Add_Section_Template from '../AnnexA/Add_Section_Template';
import Edit_Section_Template from '../AnnexA/Edit_Section_Template';
import Section_Template_list from '../AnnexA/Section_Template_list';
import Agreement from '../Client/Agreement';
import Home from '../Client/Home';
import Sgha_reportsummary from '../Client/Sgha_reportsummary';
import Client_Dashboard from '../Dashboard/Client_Dashboard';
import EditEmploymentletter from '../MainAgreement/EditEmploymentletter';
import Employmentletter from '../MainAgreement/Employmentletter';
import ClientSGHA_List from '../SGHA/ClientSGHA_List';
import SGHA_Form from '../SGHA/SGHA_Form';
import SGHA_List from '../SGHA/SGHA_List';
import Employelist from './Employelist';
import Users from './Users';

import CompanyAircraft from '../Admin/CompanyAircraft';
import SGHA_Add from '../AnnexA/SGHA_Add';
import ClientDashboard from '../Client/ClientDashboard';
import Sgha_list from '../NewSGHA/Sgha_list';
import PdfUploads from '../Admin/PdfUploads';
const Dashboard = () => {
  // const role = sessionStorage.getItem('role');
  // const userType = role === 'Client' ? 'Client' : 'User'; // explicit

  // // Run session check
  // useSessionCheck(userType);

  return (
    <Layout>
      <Routes>

        <Route path="Dashcommon" element={<ProtectedRoute element={AdminDashboard} />} />
        <Route path="all_users" element={<ProtectedRoute element={Users} />} />
        <Route path="Clients" element={<ProtectedRoute element={Clients} />} />
        <Route path="airlines" element={<ProtectedRoute element={Airlines} />} />
        <Route path="categories" element={<ProtectedRoute element={Categories} />} />

        <Route path="verifyemployee" element={<ProtectedRoute element={VerifyEmployee} />} />
        <Route path="employeelist" element={<ProtectedRoute element={Employelist} />} />
        <Route
          path="associateedit/:user_id"
          element={<ProtectedRoute element={EmployeeEdit} />}
        />

        <Route path="/roles_permissions" element={<ProtectedRoute element={Roles_permissions} />} />
        <Route path="/headquarters" element={<ProtectedRoute element={Headquarters} />} />
        <Route path="/airports" element={<ProtectedRoute element={Airports} />} />
        <Route path="/aircraft-types/:airline_id" element={<ProtectedRoute element={Aircraft_types} />} />
        <Route path="/categories" element={<ProtectedRoute element={Categories} />} />
        <Route path="/client_link_list" element={<ProtectedRoute element={ClientLinksPage} />} />

        <Route path="view_agreement" element={<ProtectedRoute element={Sgha_list} />} />
        <Route path="editagreement/:template_id" element={<ProtectedRoute element={EditEmploymentletter} />} />
        <Route path="addagreement" element={<ProtectedRoute element={Employmentletter} />} />


        <Route path="view_sgha_template" element={<ProtectedRoute element={SGHA_List} />} />
        <Route path="sectiontemplatelist" element={<ProtectedRoute element={Section_Template_list} />} />
        <Route path="add_template" element={<ProtectedRoute element={Add_Section_Template} />} />
        <Route path="editsection/:SGHA_T_id" element={<ProtectedRoute element={Edit_Section_Template} />} />


        <Route path="sgha_list" element={<ProtectedRoute element={ClientSGHA_List} />} />
        <Route path="AircraftCategory" element={<ProtectedRoute element={AircraftCategory} />} />
        <Route path="flight_type" element={<ProtectedRoute element={FlightType} />} />


        <Route path="sgha_form" element={<ProtectedRoute element={SGHA_Form} />} />
        <Route path="client_dashboard" element={<ProtectedRoute element={Client_Dashboard} />} />
        <Route path="services_price" element={<ProtectedRoute element={Services_Price} />} />

        <Route path='additional_charge' element={<ProtectedRoute element={AdditionalCharges} />} />

        <Route path='agreed_services_charges' element={<ProtectedRoute element={AgreedServicesCharges} />} />

        <Route path='CompanyAircraft' element={<ProtectedRoute element={CompanyAircraft} />} />
        <Route path='createSGHATemplate' element={<SGHA_Add />} />
        <Route path='pdfUploads' element={<ProtectedRoute element={PdfUploads} />} />



        {/* <!-------Client-------> */}

        <Route path='home' element={<ProtectedRoute element={Home} />} />
        <Route path='agreement' element={<ProtectedRoute element={Agreement} />} />
        <Route path='reportsummary' element={<ProtectedRoute element={Sgha_reportsummary} />} />

        <Route path="ClientDashboard" element={<ProtectedRoute element={ClientDashboard} />} />


      </Routes>
    </Layout>
  );
};

export default Dashboard;