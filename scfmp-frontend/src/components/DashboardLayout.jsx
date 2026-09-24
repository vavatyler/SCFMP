import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AgriBridgeNavigation from './AgriBridgeNavigation';
import ChangePasswordModal from './ChangePasswordModal';

const DashboardLayout = ({ title, subtitle, children }) => {
  const { t } = useTranslation();
  const [passwordOpen, setPasswordOpen] = useState(false);

  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-paper">
      <header className="sticky top-0 z-40 border-b border-sand/70 bg-paper/95 backdrop-blur">
        <AgriBridgeNavigation onChangePassword={() => setPasswordOpen(true)} />
      </header>
      <main className="flex min-w-0 flex-1 flex-col overflow-x-clip">
        <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {(title || subtitle) && (
            <div className="mb-6 sm:mb-8">
              {title && <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>}
              {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
            </div>
          )}
          {children}
        </div>
        <footer className="border-t border-sand/70 px-4 py-5 text-center text-xs leading-5 text-ink-soft sm:px-6">
          <p>© 2026 SmartBridge Technologies Ltd. All rights reserved.</p>
          <p>{t('common.productTagline')}</p>
        </footer>
      </main>
      <ChangePasswordModal isOpen={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  );
};

export default DashboardLayout;
