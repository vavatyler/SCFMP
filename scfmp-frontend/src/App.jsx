import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import MembersPage from './pages/MembersPage';
import MemberDetailPage from './pages/MemberDetailPage';
import FarmersPage from './pages/FarmersPage';
import ProductionPage from './pages/ProductionPage';
import FinancePage from './pages/FinancePage';
import InventoryPage from './pages/InventoryPage';
import DocumentsPage from './pages/DocumentsPage';
import CooperativesPage from './pages/CooperativesPage';
import UsersPage from './pages/UsersPage';
import TeamPage from './pages/TeamPage';
import SubscriptionPage from './pages/SubscriptionPage';
import FarmerGroupsPage from './pages/FarmerGroupsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import ContactPage from './pages/ContactPage';
import ProtectedRoute from './components/ProtectedRoute';
import { PERMISSIONS } from './config/permissions';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute permission={PERMISSIONS.DASHBOARD_VIEW}>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/members"
        element={
          <ProtectedRoute permission={PERMISSIONS.MEMBERS_VIEW}>
            <MembersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/members/:id"
        element={
          <ProtectedRoute permission={PERMISSIONS.MEMBERS_VIEW}>
            <MemberDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/farmers"
        element={
          <ProtectedRoute permission={PERMISSIONS.FARMERS_VIEW}>
            <FarmersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/production"
        element={
          <ProtectedRoute permission={PERMISSIONS.PRODUCTION_VIEW}>
            <ProductionPage />
          </ProtectedRoute>
        }
      />
      <Route path="/production/individual" element={<ProtectedRoute permission={PERMISSIONS.PRODUCTION_VIEW}><ProductionPage forcedMode="individual" /></ProtectedRoute>} />
      <Route path="/production/group" element={<ProtectedRoute permission={PERMISSIONS.PRODUCTION_VIEW}><ProductionPage forcedMode="group" /></ProtectedRoute>} />
      <Route path="/farmer-groups" element={<ProtectedRoute permission={PERMISSIONS.FARMERS_VIEW}><FarmerGroupsPage /></ProtectedRoute>} />
      <Route
        path="/finance"
        element={
          <ProtectedRoute permission={PERMISSIONS.FINANCE_VIEW}>
            <FinancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute permission={PERMISSIONS.INVENTORY_VIEW}>
            <InventoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents"
        element={
          <ProtectedRoute permission={PERMISSIONS.DOCUMENTS_VIEW}>
            <DocumentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cooperatives"
        element={
          <ProtectedRoute permission={PERMISSIONS.ORGANIZATIONS_VIEW}>
            <CooperativesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/team"
        element={
          <ProtectedRoute permission={PERMISSIONS.TEAM_VIEW}>
            <TeamPage />
          </ProtectedRoute>
        }
      />
      <Route path="/documents/categories" element={<ProtectedRoute permission={PERMISSIONS.DOCUMENTS_VIEW}><DocumentsPage forcedView="categories" /></ProtectedRoute>} />
      <Route path="/documents/expiring" element={<ProtectedRoute permission={PERMISSIONS.DOCUMENTS_VIEW}><DocumentsPage forcedStatus="expiring_soon" /></ProtectedRoute>} />
      <Route
        path="/contact"
        element={
          <ProtectedRoute>
            <ContactPage />
          </ProtectedRoute>
        }
      />
      <Route path="/staff" element={<ProtectedRoute permission={PERMISSIONS.USERS_VIEW}><UsersPage /></ProtectedRoute>} />
      <Route path="/subscription" element={<ProtectedRoute permission={PERMISSIONS.SETTINGS_VIEW}><SubscriptionPage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute permission={PERMISSIONS.REPORTS_VIEW}><ReportsPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute permission={PERMISSIONS.SETTINGS_VIEW}><SettingsPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
