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
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/members"
        element={
          <ProtectedRoute>
            <MembersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/members/:id"
        element={
          <ProtectedRoute>
            <MemberDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/farmers"
        element={
          <ProtectedRoute>
            <FarmersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/production"
        element={
          <ProtectedRoute>
            <ProductionPage />
          </ProtectedRoute>
        }
      />
      <Route path="/production/individual" element={<ProtectedRoute><ProductionPage forcedMode="individual" /></ProtectedRoute>} />
      <Route path="/production/group" element={<ProtectedRoute><ProductionPage forcedMode="group" /></ProtectedRoute>} />
      <Route path="/farmer-groups" element={<ProtectedRoute><FarmerGroupsPage /></ProtectedRoute>} />
      <Route
        path="/finance"
        element={
          <ProtectedRoute>
            <FinancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <InventoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents"
        element={
          <ProtectedRoute>
            <DocumentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cooperatives"
        element={
          <ProtectedRoute>
            <CooperativesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/team"
        element={
          <ProtectedRoute>
            <TeamPage />
          </ProtectedRoute>
        }
      />
      <Route path="/documents/categories" element={<ProtectedRoute><DocumentsPage forcedView="categories" /></ProtectedRoute>} />
      <Route path="/documents/expiring" element={<ProtectedRoute><DocumentsPage forcedStatus="expiring_soon" /></ProtectedRoute>} />
      <Route
        path="/contact"
        element={
          <ProtectedRoute>
            <ContactPage />
          </ProtectedRoute>
        }
      />
      <Route path="/staff" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
      <Route path="/subscription" element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
