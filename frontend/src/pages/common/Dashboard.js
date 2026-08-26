import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from '../../components/Layout';
import ProtectedRoute, { ClientOnlyRoute, EmployeeRoute } from '../../interfaces/PrivateRoute';
import { useAuth } from '../../context/AuthContext';
import { CLIENT_ROUTES } from '../../utils/clientWorkspace';
import { EMPLOYEE_HOME, EMPLOYEE_ROUTES } from '../../utils/employeeWorkspace';
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
import TemplatesHub from '../Admin/TemplatesHub';
import VerifyEmployee from '../Admin/VerifyEmployee';
import Add_Section_Template from '../AnnexA/Add_Section_Template';
import Edit_Section_Template from '../AnnexA/Edit_Section_Template';
import Section_Template_list from '../AnnexA/Section_Template_list';
import Agreement from '../Client/Agreement';
import Home from '../Client/Home';
import Sgha_reportsummary from '../Client/Sgha_reportsummary';
import EditEmploymentletter from '../MainAgreement/EditEmploymentletter';
import Employmentletter from '../MainAgreement/Employmentletter';
import Letter_template from '../MainAgreement/Letter_template';
import ClientSGHA_List from '../SGHA/ClientSGHA_List';
import SGHA_List from '../SGHA/SGHA_List';
import Employelist from './Employelist';

import CompanyAircraft from '../Admin/CompanyAircraft';
import SGHA_Add from '../AnnexA/SGHA_Add';
import ClientDashboard from '../Client/ClientDashboard';
import PdfUploads from '../Admin/PdfUploads';

const RoleHomeRedirect = () => {
  const { role } = useAuth();
  if (role === 'Client') {
    return <Navigate to={CLIENT_ROUTES.hub} replace />;
  }
  return <Navigate to={EMPLOYEE_HOME} replace />;
};

const ClientDashboardAlias = () => {
  const { role } = useAuth();
  if (role === 'Client') {
    return <Navigate to={CLIENT_ROUTES.hub} replace />;
  }
  return <Navigate to={EMPLOYEE_HOME} replace />;
};

const LegacySghaFormRedirect = () => {
  const { role } = useAuth();
  if (role === 'Client') {
    return <Navigate to={CLIENT_ROUTES.newSgha} replace />;
  }
  return <Navigate to={EMPLOYEE_ROUTES.templates} replace />;
};

const DirectoryRedirect = () => <Navigate to={EMPLOYEE_ROUTES.directory} replace />;

const Dashboard = () => {
  return (
    <Layout>
      <Routes>
        <Route index element={<ProtectedRoute element={RoleHomeRedirect} />} />
        <Route path="Dashcommon" element={<EmployeeRoute element={AdminDashboard} />} />
        <Route path="all_users" element={<EmployeeRoute element={DirectoryRedirect} />} />
        <Route path="Clients" element={<EmployeeRoute element={Clients} />} />
        <Route path="clients" element={<Navigate to={EMPLOYEE_ROUTES.clients} replace />} />
        <Route path="airlines" element={<EmployeeRoute element={Airlines} />} />
        <Route path="categories" element={<EmployeeRoute element={Categories} />} />

        <Route path="verifyemployee" element={<EmployeeRoute element={VerifyEmployee} />} />
        <Route path="employeelist" element={<EmployeeRoute element={Employelist} />} />
        <Route
          path="associateedit/:user_id"
          element={<EmployeeRoute element={EmployeeEdit} />}
        />

        <Route path="roles_permissions" element={<EmployeeRoute element={Roles_permissions} />} />
        <Route path="headquarters" element={<EmployeeRoute element={Headquarters} />} />
        <Route path="airports" element={<EmployeeRoute element={Airports} />} />
        <Route path="aircraft-types/:airline_id" element={<EmployeeRoute element={Aircraft_types} />} />
        <Route path="client_link_list" element={<EmployeeRoute element={ClientLinksPage} />} />

        <Route path="templates" element={<EmployeeRoute element={TemplatesHub} />} />
        <Route path="view_agreement" element={<EmployeeRoute element={Letter_template} />} />
        <Route path="editagreement/:template_id" element={<EmployeeRoute element={EditEmploymentletter} />} />
        <Route path="addagreement" element={<EmployeeRoute element={Employmentletter} />} />

        <Route path="view_sgha_template" element={<EmployeeRoute element={SGHA_List} />} />
        <Route path="sectiontemplatelist" element={<EmployeeRoute element={Section_Template_list} />} />
        <Route path="add_template" element={<EmployeeRoute element={Add_Section_Template} />} />
        <Route path="editsection/:SGHA_T_id" element={<EmployeeRoute element={Edit_Section_Template} />} />

        <Route path="sgha_list" element={<ClientOnlyRoute element={ClientSGHA_List} />} />
        <Route path="AircraftCategory" element={<EmployeeRoute element={AircraftCategory} />} />
        <Route path="flight_type" element={<EmployeeRoute element={FlightType} />} />

        <Route path="sgha_form" element={<ProtectedRoute element={LegacySghaFormRedirect} />} />
        <Route path="client_dashboard" element={<ProtectedRoute element={ClientDashboardAlias} />} />
        <Route path="services_price" element={<EmployeeRoute element={Services_Price} />} />

        <Route path="additional_charge" element={<EmployeeRoute element={AdditionalCharges} />} />

        <Route path="agreed_services_charges" element={<EmployeeRoute element={AgreedServicesCharges} />} />

        <Route path="CompanyAircraft" element={<EmployeeRoute element={CompanyAircraft} />} />
        <Route path="createSGHATemplate" element={<EmployeeRoute element={SGHA_Add} />} />
        <Route path="pdfUploads" element={<EmployeeRoute element={PdfUploads} />} />

        <Route path="home" element={<ClientOnlyRoute element={Home} />} />
        <Route path="agreement" element={<ClientOnlyRoute element={Agreement} />} />
        <Route path="reportsummary" element={<ClientOnlyRoute element={Sgha_reportsummary} />} />
        <Route path="ClientDashboard" element={<ClientOnlyRoute element={ClientDashboard} />} />

        <Route path="*" element={<ProtectedRoute element={RoleHomeRedirect} />} />
      </Routes>
    </Layout>
  );
};

export default Dashboard;
