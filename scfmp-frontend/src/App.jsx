import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ProtectedRoute from './components/ProtectedRoute';
import OrganizationRoute from './components/OrganizationRoute';
import { PERMISSIONS } from './config/permissions';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const MembersPage = lazy(() => import('./pages/MembersPage'));
const MemberDetailPage = lazy(() => import('./pages/MemberDetailPage'));
const FarmersPage = lazy(() => import('./pages/FarmersPage'));
const ProductionPage = lazy(() => import('./pages/ProductionPage'));
const FinancePage = lazy(() => import('./pages/FinancePage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'));
const CooperativesPage = lazy(() => import('./pages/CooperativesPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const TeamPage = lazy(() => import('./pages/TeamPage'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const FarmerGroupsPage = lazy(() => import('./pages/FarmerGroupsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));

function App() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-paper text-sm text-ink-soft">Loading…</div>}>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
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
            <OrganizationRoute titleKey="common.members" descriptionKey="membersDescription"><MembersPage /></OrganizationRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/members/:id"
        element={
          <ProtectedRoute permission={PERMISSIONS.MEMBERS_VIEW}>
            <OrganizationRoute titleKey="common.members" descriptionKey="membersDescription"><MemberDetailPage /></OrganizationRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/farmers"
        element={
          <ProtectedRoute permission={PERMISSIONS.FARMERS_VIEW}>
            <OrganizationRoute titleKey="common.farmers" descriptionKey="farmersDescription"><FarmersPage /></OrganizationRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/production"
        element={
          <ProtectedRoute permission={PERMISSIONS.PRODUCTION_VIEW}>
            <OrganizationRoute titleKey="common.production" descriptionKey="productionDescription"><ProductionPage /></OrganizationRoute>
          </ProtectedRoute>
        }
      />
      <Route path="/production/individual" element={<ProtectedRoute permission={PERMISSIONS.PRODUCTION_VIEW}><OrganizationRoute titleKey="common.individualProduction" descriptionKey="productionDescription"><ProductionPage forcedMode="individual" /></OrganizationRoute></ProtectedRoute>} />
      <Route path="/production/group" element={<ProtectedRoute permission={PERMISSIONS.PRODUCTION_VIEW}><OrganizationRoute titleKey="common.groupProduction" descriptionKey="productionDescription"><ProductionPage forcedMode="group" /></OrganizationRoute></ProtectedRoute>} />
      <Route path="/farmer-groups" element={<ProtectedRoute permission={PERMISSIONS.FARMERS_VIEW}><OrganizationRoute titleKey="common.farmerGroups" descriptionKey="groupsDescription"><FarmerGroupsPage /></OrganizationRoute></ProtectedRoute>} />
      <Route
        path="/finance"
        element={
          <ProtectedRoute permission={PERMISSIONS.FINANCE_VIEW}>
            <OrganizationRoute titleKey="common.finance" descriptionKey="financeDescription"><FinancePage /></OrganizationRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute permission={PERMISSIONS.INVENTORY_VIEW}>
            <OrganizationRoute titleKey="common.inventory" descriptionKey="inventoryDescription"><InventoryPage /></OrganizationRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents"
        element={
          <ProtectedRoute permission={PERMISSIONS.DOCUMENTS_VIEW}>
            <OrganizationRoute titleKey="common.documents" descriptionKey="documentsDescription"><DocumentsPage /></OrganizationRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cooperatives"
        element={
          <ProtectedRoute permission={PERMISSIONS.ORGANIZATIONS_VIEW} roles={['super_admin', 'cooperative_manager']}>
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
      <Route path="/documents/categories" element={<ProtectedRoute permission={PERMISSIONS.DOCUMENTS_VIEW}><OrganizationRoute titleKey="common.documentCategories" descriptionKey="documentsDescription"><DocumentsPage forcedView="categories" /></OrganizationRoute></ProtectedRoute>} />
      <Route path="/documents/expiring" element={<ProtectedRoute permission={PERMISSIONS.DOCUMENTS_VIEW}><OrganizationRoute titleKey="common.expiringDocuments" descriptionKey="documentsDescription"><DocumentsPage forcedStatus="expiring_soon" /></OrganizationRoute></ProtectedRoute>} />
      <Route
        path="/contact"
        element={
          <ProtectedRoute>
            <ContactPage />
          </ProtectedRoute>
        }
      />
      <Route path="/staff" element={<ProtectedRoute permission={PERMISSIONS.USERS_VIEW} roles={['super_admin', 'cooperative_manager']}><OrganizationRoute titleKey="common.staffAccounts" descriptionKey="staffDescription"><UsersPage /></OrganizationRoute></ProtectedRoute>} />
      <Route path="/subscription" element={<ProtectedRoute permission={PERMISSIONS.SETTINGS_VIEW} roles={['super_admin', 'cooperative_manager']}><SubscriptionPage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute permission={PERMISSIONS.REPORTS_VIEW}><OrganizationRoute titleKey="common.reports" descriptionKey="reportsDescription"><ReportsPage /></OrganizationRoute></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute permission={PERMISSIONS.SETTINGS_VIEW}><SettingsPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </Suspense>
  );
}

export default App;
