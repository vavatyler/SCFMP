import { NavLink } from 'react-router-dom';
import { useState } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ChangePasswordModal from './ChangePasswordModal';

// `roles: null` means every logged-in role can see it.
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: null },
  { to: '/cooperatives', label: 'Cooperatives', icon: Building2, roles: ['super_admin'] },
  { to: '/members', label: 'Members', icon: Users, roles: null },
  { to: '/farmers', label: 'Farmers', icon: Wheat, roles: null },
  { to: '/production', label: 'Production', icon: TrendingUp, roles: null },
  { to: '/finance', label: 'Finance', icon: Wallet, roles: null },
  { to: '/inventory', label: 'Inventory', icon: Boxes, roles: null },
  { to: '/documents', label: 'Documents', icon: FileText, roles: null },
  { to: '/team', label: 'Team', icon: UserCog, roles: ['super_admin', 'cooperative_manager'] },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role));

  return (
    <aside className="flex h-screen w-60 flex-col bg-forest text-paper">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/15">
          <Sprout className="h-4 w-4 text-gold" strokeWidth={1.75} />
        </div>
        <span className="font-display text-base font-semibold">SCFMP</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {visibleItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/10 text-paper'
                  : 'text-paper/65 hover:bg-white/5 hover:text-paper'
              }`
            }
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            {label}
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
          Change password
        </button>
        <button
          onClick={logout}
          className="focus-ring flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-paper/65 transition-colors hover:bg-white/5 hover:text-paper"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          Log out
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
