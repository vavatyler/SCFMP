import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const ProtectedRoute = ({ children, permission }) => {
  const { isAuthenticated, isLoading, can } = useAuth();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-paper">
        <div className="text-ink-soft font-sans text-sm">Loading…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (permission && !can(permission)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper p-6">
        <div className="max-w-md rounded-xl bg-white p-8 text-center shadow-card">
          <h1 className="font-display text-xl font-semibold text-ink">{t('access.deniedTitle')}</h1>
          <p className="mt-2 text-sm text-ink-soft">{t('access.deniedBody')}</p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
