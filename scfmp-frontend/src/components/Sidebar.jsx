import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Sprout,
  Users,
  Wheat,
  TrendingUp,
  Wallet,
  Boxes,
  FileText,
  Building2,
  UserCog,
  KeyRound,
  LogOut,
  ContactRound,
  UsersRound,
  CreditCard,
  Settings,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ChangePasswordModal from './ChangePasswordModal';
import { PRODUCT_NAME } from '../config/company';

// `roles: null` means every logged-in role can see it.
const NAV_ITEMS = [
  { to: '/dashboard', labelKey: 'common.dashboard', icon: LayoutDashboard, roles: null },
  { to: '/cooperatives', labelKey: 'common.organizations', icon: Building2, roles: ['super_admin', 'cooperative_manager'] },
  { to: '/members', labelKey: 'common.members', icon: Users, roles: null },
  { to: '/farmers', labelKey: 'common.farmers', icon: Wheat, roles: null },
  { to: '/farmer-groups', labelKey: 'common.farmerGroups', icon: UsersRound, roles: null },
  { to: '/production', labelKey: 'common.production', icon: TrendingUp, roles: null },
  { to: '/production/individual', labelKey: 'common.individualProduction', icon: Sprout, roles: null, child: true },
  { to: '/production/group', labelKey: 'common.groupProduction', icon: UsersRound, roles: null, child: true },
  { to: '/finance', labelKey: 'common.finance', icon: Wallet, roles: null },
  { to: '/inventory', labelKey: 'common.inventory', icon: Boxes, roles: null },
  { to: '/documents', labelKey: 'common.documents', icon: FileText, roles: null },
  { to: '/documents/categories', labelKey: 'common.documentCategories', icon: FileText, roles: null, child: true },
  { to: '/documents/expiring', labelKey: 'common.expiringDocuments', icon: FileText, roles: null, child: true },
  { to: '/reports', labelKey: 'common.reports', icon: BarChart3, roles: null },
  { to: '/team', labelKey: 'common.team', icon: UserCog, roles: null },
  { to: '/staff', labelKey: 'common.staffAccounts', icon: UsersRound, roles: ['super_admin', 'cooperative_manager'] },
  { to: '/subscription', labelKey: 'common.subscription', icon: CreditCard, roles: ['super_admin', 'cooperative_manager'] },
  { to: '/settings', labelKey: 'common.settings', icon: Settings, roles: null },
  { to: '/contact', labelKey: 'common.contact', icon: ContactRound, roles: null },
];

const Sidebar = ({ isOpen = false, onClose = () => {} }) => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role));

  return (
    <aside className={`fixed inset-y-0 left-0 z-40 flex h-screen w-64 flex-col bg-forest text-paper shadow-xl transition-transform lg:sticky lg:top-0 lg:w-60 lg:translate-x-0 lg:shadow-none ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center gap-2.5 px-5 py-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/15">
          <Sprout className="h-4 w-4 text-gold" strokeWidth={1.75} />
        </div>
        <span className="font-display text-base font-semibold">{PRODUCT_NAME}</span>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
        {visibleItems.map(({ to, labelKey, icon: Icon, child }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            end={to === '/production' || to === '/documents'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg py-2.5 pr-3 text-sm font-medium transition-colors ${child ? 'pl-8 text-xs' : 'pl-3'} ${
                isActive
                  ? 'bg-white/10 text-paper'
                  : 'text-paper/65 hover:bg-white/5 hover:text-paper'
              }`
            }
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        <div className="mb-3 px-3">
          <p className="truncate text-sm font-medium text-paper">
            {user?.first_name} {user?.last_name}
          </p>
          <p className="truncate text-xs capitalize text-paper/50">
            {user?.role?.replace('_', ' ')}
          </p>
        </div>
        <button
          onClick={() => setIsPasswordModalOpen(true)}
          className="focus-ring flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-paper/65 transition-colors hover:bg-white/5 hover:text-paper"
        >
          <KeyRound className="h-4 w-4" strokeWidth={1.75} />
          {t('common.changePassword')}
        </button>
        <button
          onClick={logout}
          className="focus-ring flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-paper/65 transition-colors hover:bg-white/5 hover:text-paper"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          {t('common.logout')}
        </button>
      </div>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </aside>
  );
};

export default Sidebar;
