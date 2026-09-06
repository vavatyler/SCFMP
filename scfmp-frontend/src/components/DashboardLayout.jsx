import { useEffect, useRef, useState } from 'react';
import { ChevronDown, KeyRound, LogOut, Menu, UserRound, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import CooperativeSwitcher from './CooperativeSwitcher';
import LanguageSwitcher from './LanguageSwitcher';
import ChangePasswordModal from './ChangePasswordModal';
import { useAuth } from '../context/AuthContext';
import { COMPANY_NAME, PRODUCT_NAME } from '../config/company';
import { SYSTEM_ROLE_LABELS } from '../config/permissions';

const DashboardLayout = ({ title, subtitle, children }) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const close = (event) => {
      if (!menuRef.current?.contains(event.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <button
          className="fixed inset-0 z-30 bg-ink/45 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label={t('common.close')}
        />
      )}
      <main className="min-w-0 flex-1 overflow-y-auto">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-sand/70 bg-paper/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setSidebarOpen((open) => !open)}
              className="focus-ring rounded-lg border border-sand bg-white p-2 text-ink lg:hidden"
              aria-label={sidebarOpen ? t('common.close') : t('common.menu')}
              aria-expanded={sidebarOpen}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <CooperativeSwitcher />
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <LanguageSwitcher compact />
            <NotificationBell />
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setUserMenuOpen((open) => !open)}
                className="focus-ring flex min-h-10 items-center gap-2 rounded-lg border border-sand bg-white px-2.5 py-2 text-sm text-ink hover:bg-sand/20"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                <UserRound className="h-4 w-4 text-forest" />
                <span className="hidden max-w-28 truncate sm:block">{user?.first_name}</span>
                <ChevronDown className="h-3.5 w-3.5 text-ink-soft" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-sand bg-white shadow-lg" role="menu">
                  <div className="border-b border-sand px-4 py-3">
                    <p className="truncate text-sm font-medium text-ink">{user?.first_name} {user?.last_name}</p>
                    {user?.official_role && <p className="truncate text-xs text-forest">{user.official_role}</p>}
                    <p className="truncate text-xs text-ink-soft">{t('team.systemRole')}: {SYSTEM_ROLE_LABELS[user?.role] || user?.role}</p>
                  </div>
                  <button
                    role="menuitem"
                    onClick={() => { setPasswordOpen(true); setUserMenuOpen(false); }}
                    className="flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left text-sm text-ink-soft hover:bg-sand/30 hover:text-ink"
                  >
                    <KeyRound className="h-4 w-4" /> {t('common.changePassword')}
                  </button>
                  <button
                    role="menuitem"
                    onClick={logout}
                    className="flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left text-sm text-clay hover:bg-clay/5"
                  >
                    <LogOut className="h-4 w-4" /> {t('common.logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {(title || subtitle) && (
            <div className="mb-6 sm:mb-8">
              {title && <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>}
              {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
            </div>
          )}
          {children}
        </div>
        <footer className="border-t border-sand/70 px-4 py-5 text-center text-xs text-ink-soft sm:px-6">
          © 2026 {PRODUCT_NAME} · {COMPANY_NAME}
        </footer>
      </main>
      <ChangePasswordModal isOpen={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  );
};

export default DashboardLayout;
