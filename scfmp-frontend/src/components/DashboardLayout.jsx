import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import CooperativeSwitcher from './CooperativeSwitcher';

const DashboardLayout = ({ title, subtitle, children }) => {
  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-sand/70 px-8 py-3">
          <CooperativeSwitcher />
          <NotificationBell />
        </div>
        <div className="mx-auto max-w-6xl px-8 py-8">
          {(title || subtitle) && (
            <div className="mb-8">
              {title && <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>}
              {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
