import { ThemeProvider, CssBaseline } from '@mui/material';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import theme from './theme';
import { AuthProvider } from './hooks/useAuth';

import AuthLayout from './layouts/AuthLayout';
import AccountLayout from './layouts/AccountLayout';
import RemoteLayout from './layouts/RemoteLayout';

import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';

import AccountHome from './pages/account/Home';
import Surgeries from './pages/account/Surgeries';
import SurgeryDetail from './pages/account/SurgeryDetail';
import Team from './pages/account/Team';
import Patients from './pages/account/Patients';
import PatientDetail from './pages/account/PatientDetail';
import Settings from './pages/account/Settings';

import AdminAccounts from './pages/admin/Accounts';
import AdminSurgeries from './pages/admin/AdminSurgeries';
import GlobalDefaults from './pages/admin/GlobalDefaults';
import AdminCompanyLayout from './layouts/AdminCompanyLayout';
import CompanyHome from './pages/admin/CompanyHome';
import CompanySurgeries from './pages/admin/CompanySurgeries';
import CompanyPatients from './pages/admin/CompanyPatients';
import CompanyTeam from './pages/admin/CompanyTeam';

import RemoteHome from './pages/remote/RemoteHome';
import RemoteSurgeries from './pages/remote/RemoteSurgeries';
import RemoteSettings from './pages/remote/RemoteSettings';
import CountingInterface from './pages/remote/CountingInterface';
import AppTests from './pages/dev/AppTests';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
            </Route>

            <Route path="/app-tests" element={<AppTests />} />

            <Route element={<AccountLayout />}>
              <Route path="/dashboard" element={<AccountHome />} />
              <Route path="/dashboard/surgeries" element={<Surgeries />} />
              <Route path="/dashboard/surgeries/:id" element={<SurgeryDetail />} />
              <Route path="/dashboard/patients" element={<Patients />} />
              <Route path="/dashboard/patients/:id" element={<PatientDetail />} />
              <Route path="/dashboard/team" element={<Team />} />
              <Route path="/dashboard/settings" element={<Settings />} />
              <Route path="/admin/accounts" element={<AdminAccounts />} />
              <Route path="/admin/surgeries" element={<AdminSurgeries />} />
              <Route path="/admin/defaults" element={<GlobalDefaults />} />
            </Route>

            <Route element={<AdminCompanyLayout />}>
              <Route path="/admin/clinics/:accountId" element={<CompanyHome />} />
              <Route path="/admin/clinics/:accountId/surgeries" element={<CompanySurgeries />} />
              <Route path="/admin/clinics/:accountId/surgeries/:id" element={<SurgeryDetail />} />
              <Route path="/admin/clinics/:accountId/patients" element={<CompanyPatients />} />
              <Route path="/admin/clinics/:accountId/team" element={<CompanyTeam />} />
              <Route path="/admin/clinics/:accountId/settings" element={<Settings />} />
            </Route>

            <Route element={<RemoteLayout />}>
              <Route path="/remote" element={<RemoteHome />} />
              <Route path="/remote/surgeries" element={<RemoteSurgeries />} />
              <Route path="/remote/surgeries/:id" element={<CountingInterface />} />
              <Route path="/remote/settings" element={<RemoteSettings />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
