import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  ChevronDown,
  FileText,
  LogOut,
  Menu,
  MoreHorizontal,
  Settings,
  Sprout,
  UserRound,
  Bell,
  Wallet,
  Wheat,
  X,
  Boxes,
  TrendingUp,
  KeyRound,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useCooperative } from '../context/CooperativeContext';
import { PERMISSIONS } from '../config/permissions';
import { COMPANY_NAME, PRODUCT_NAME } from '../config/company';
import NotificationBell from './NotificationBell';
import CooperativeSwitcher from './CooperativeSwitcher';
import LanguageSwitcher from './LanguageSwitcher';
import ProfileAvatar from './ProfileAvatar';

const pathIsActive = (pathname, to) => pathname === to || pathname.startsWith(`${to}/`);

const makeSections = (can, t, user) => {
  const section = (id, label, icon, links) => ({
    id,
    label,
    icon,
    links: links.filter((item) => (!item.permission || can(item.permission)) && (!item.roles || item.roles.includes(user?.role))),
  });

  return [
    section('organizations', t('common.organizations'), Building2, [
      { to: '/cooperatives', label: t('common.organizations'), permission: PERMISSIONS.ORGANIZATIONS_VIEW, roles: ['super_admin', 'cooperative_manager'] },
      { to: '/team', label: t('common.team'), permission: PERMISSIONS.TEAM_VIEW },
      { to: '/members', label: t('common.members'), permission: PERMISSIONS.MEMBERS_VIEW },
    ]),
    section('farmers', t('common.farmers'), Wheat, [
      { to: '/farmers', label: t('common.farmers'), permission: PERMISSIONS.FARMERS_VIEW },
      { to: '/farmer-groups', label: t('common.farmerGroups'), permission: PERMISSIONS.FARMERS_VIEW },
    ]),
    section('production', t('common.production'), TrendingUp, [
      { to: '/production', label: t('navigation.productionOverview'), permission: PERMISSIONS.PRODUCTION_VIEW },
      { to: '/production/individual', label: t('common.individualProduction'), permission: PERMISSIONS.PRODUCTION_VIEW },
      { to: '/production/group', label: t('common.groupProduction'), permission: PERMISSIONS.PRODUCTION_VIEW },
    ]),
    section('inventory', t('common.inventory'), Boxes, [
      { to: '/inventory', label: t('navigation.inventoryOverview'), permission: PERMISSIONS.INVENTORY_VIEW },
    ]),
    section('finance', t('common.finance'), Wallet, [
      { to: '/finance', label: t('navigation.financeOverview'), permission: PERMISSIONS.FINANCE_VIEW },
    ]),
    section('documents', t('common.documents'), FileText, [
      { to: '/documents', label: t('navigation.documentsOverview'), permission: PERMISSIONS.DOCUMENTS_VIEW },
      { to: '/documents/categories', label: t('common.documentCategories'), permission: PERMISSIONS.DOCUMENTS_VIEW },
      { to: '/documents/expiring', label: t('common.expiringDocuments'), permission: PERMISSIONS.DOCUMENTS_VIEW },
    ]),
    section('reports', t('common.reports'), BarChart3, [
      { to: '/reports', label: t('navigation.reportsOverview'), permission: PERMISSIONS.REPORTS_VIEW },
    ]),
  ].filter((item) => item.links.length > 0);
};

const AppLink = ({ item, onNavigate, compact = false, dark = false }) => (
  <NavLink
    to={item.to}
    end={item.to === '/production' || item.to === '/documents'}
    onClick={onNavigate}
    role={compact ? 'menuitem' : undefined}
    className={({ isActive }) => `${dark ? 'nav-focus-ring' : 'focus-ring'} flex min-h-10 items-center whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-all duration-200 ${
      dark
        ? isActive
          ? 'bg-gradient-to-r from-gold-dark via-gold to-gold-light text-forest-dark shadow-sm hover:from-gold hover:via-gold-light hover:to-[#f3d994]'
          : 'text-paper/85 hover:bg-gradient-to-r hover:from-[#284A35] hover:via-[#386346] hover:to-[#896722] hover:text-white hover:shadow-md'
        : isActive ? 'bg-forest/10 text-forest' : 'text-ink-soft hover:bg-sand/50 hover:text-ink'
    }`}
  >
    {item.label}
  </NavLink>
);

const DropdownSection = ({ item, open, onToggle, onNavigate, mobile = false, active, dark = false }) => {
  const Icon = item.icon;
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const triggerStyles = dark
    ? active || open
      ? 'bg-gradient-to-r from-gold-dark via-gold to-gold-light text-forest-dark shadow-sm hover:from-gold hover:via-gold-light hover:to-[#f3d994]'
      : 'text-paper/85 hover:bg-gradient-to-r hover:from-[#284A35] hover:via-[#386346] hover:to-[#896722] hover:text-white hover:shadow-md'
    : active || open
      ? 'bg-forest/10 text-forest'
      : 'text-ink-soft hover:bg-sand/50 hover:text-ink';

  const handleTriggerKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) onToggle();
      requestAnimationFrame(() => menuRef.current?.querySelector('[role="menuitem"]')?.focus());
    }
  };

  const handleMenuKeyDown = (event) => {
    const menuItems = [...(menuRef.current?.querySelectorAll('[role="menuitem"]') || [])];
    const currentIndex = menuItems.indexOf(document.activeElement);
    let nextIndex;

    if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % menuItems.length;
    else if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + menuItems.length) % menuItems.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = menuItems.length - 1;
    else if (event.key === 'Escape') {
      event.preventDefault();
      onToggle();
      triggerRef.current?.focus();
      return;
    } else return;

    if (menuItems.length) {
      event.preventDefault();
      menuItems[nextIndex].focus();
    }
  };

  return (
    <div className={mobile ? 'border-b border-sand/80 py-2 last:border-0' : 'relative'}>
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggle}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`${dark ? 'nav-focus-ring' : 'focus-ring'} flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-sm font-medium transition-all duration-200 ${triggerStyles} ${mobile ? 'w-full justify-between px-3 text-left' : ''}`}
      >
        <span className="flex items-center gap-2">{mobile && <Icon className="h-4 w-4" />}{item.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          onKeyDown={handleMenuKeyDown}
          className={mobile
            ? 'mt-1 grid gap-1 pl-6'
            : 'absolute left-0 top-full z-50 mt-2 min-w-52 rounded-xl border border-sand bg-white p-1.5 shadow-xl'}
        >
          {item.links.map((link) => <AppLink key={`${item.id}-${link.to}-${link.label}`} item={link} onNavigate={onNavigate} compact />)}
        </div>
      )}
    </div>
  );
};

const ProfileMenu = ({ user, organizationName, can, onChangePassword, logout }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ');

  useEffect(() => {
    const close = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const profileLinks = [
    { to: '/profile', label: t('common.myProfile'), icon: UserRound },
    ...(can(PERMISSIONS.SETTINGS_VIEW) ? [{ to: '/settings', label: t('common.accountSettings'), icon: Settings }] : []),
    { to: '/notifications', label: t('common.notifications'), icon: Bell },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="focus-ring flex min-h-10 max-w-44 items-center gap-2 rounded-lg border border-sand bg-white px-2 py-1.5 text-left text-sm text-ink hover:bg-sand/30 sm:max-w-56 sm:px-2.5"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('navigation.profileMenu', { name: fullName })}
      >
        <ProfileAvatar user={user} size="h-7 w-7" />
        <span className="hidden min-w-0 sm:block"><span className="block max-w-28 truncate font-medium">{fullName || t('common.profile')}</span>{user?.official_role && <span className="block max-w-28 truncate text-[11px] text-ink-soft">{user.official_role}</span>}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-soft" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(18rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-sand bg-white shadow-xl" role="menu">
          <div className="flex items-center gap-3 border-b border-sand px-4 py-3">
            <ProfileAvatar user={user} size="h-10 w-10" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{fullName}</p>
              {user?.official_role && <p className="truncate text-xs text-forest">{user.official_role}</p>}
              {organizationName && <p className="truncate text-xs text-ink-soft">{organizationName}</p>}
            </div>
          </div>
          {profileLinks.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} role="menuitem" onClick={() => setOpen(false)} className="focus-ring flex min-h-11 items-center gap-3 px-4 text-sm text-ink-soft hover:bg-sand/30 hover:text-ink">
              <Icon className="h-4 w-4" />{label}
            </Link>
          ))}
          <div className="border-t border-sand p-1.5">
            <button type="button" role="menuitem" onClick={() => { setOpen(false); onChangePassword(); }} className="focus-ring flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-ink-soft hover:bg-sand/30 hover:text-ink">
              <KeyRound className="h-4 w-4" />{t('common.changePassword')}
            </button>
            <button type="button" role="menuitem" onClick={logout} className="focus-ring flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-clay hover:bg-clay/5">
              <LogOut className="h-4 w-4" />{t('common.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const AgriBridgeNavigation = ({ onChangePassword }) => {
  const { t } = useTranslation();
  const { user, can, logout } = useAuth();
  const { activeCooperative } = useCooperative();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef(null);
  const mobileTriggerRef = useRef(null);
  const mobileDialogRef = useRef(null);
  const sections = useMemo(() => makeSections(can, t, user), [can, t, user]);
  const dashboardLink = can(PERMISSIONS.DASHBOARD_VIEW)
    ? { to: '/dashboard', label: t('common.dashboard') }
    : null;
  const moreLinks = [
    { to: '/notifications', label: t('common.notifications') },
    ...(can(PERMISSIONS.SETTINGS_VIEW) ? [{ to: '/settings', label: t('common.settings') }] : []),
    ...(can(PERMISSIONS.USERS_VIEW) && ['super_admin', 'cooperative_manager'].includes(user?.role)
      ? [{ to: '/staff', label: t('common.userManagement') }]
      : []),
    { to: '/contact', label: t('common.contact') },
    ...(user?.role === 'super_admin' || user?.role === 'cooperative_manager'
      ? [{ to: '/subscription', label: t('common.subscription') }]
      : []),
  ];
  const primarySections = sections.filter((item) => ['organizations', 'farmers'].includes(item.id));
  const secondarySections = sections.filter((item) => !['organizations', 'farmers'].includes(item.id));
  const isMoreActive = [...moreLinks, ...secondarySections.flatMap((item) => item.links)]
    .some((item) => pathIsActive(location.pathname, item.to));
  const currentMobileLink = [
    ...(dashboardLink ? [dashboardLink] : []),
    ...sections.flatMap((item) => item.links),
    ...moreLinks,
  ].sort((first, second) => second.to.length - first.to.length)
    .find((item) => pathIsActive(location.pathname, item.to));

  useEffect(() => {
    setOpenMenu('');
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const closeOutside = (event) => {
      if (!menuRef.current?.contains(event.target) && !mobileDialogRef.current?.contains(event.target)) setOpenMenu('');
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOpenMenu('');
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusableItems = () => [...(mobileDialogRef.current?.querySelectorAll(focusableSelector) || [])];
    focusableItems()[0]?.focus();

    const keepFocusInDialog = (event) => {
      if (event.key !== 'Tab') return;
      const items = focusableItems();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const closeOnDesktopResize = () => {
      if (window.matchMedia('(min-width: 768px)').matches) setMobileOpen(false);
    };

    document.addEventListener('keydown', keepFocusInDialog);
    window.addEventListener('resize', closeOnDesktopResize);
    return () => {
      document.removeEventListener('keydown', keepFocusInDialog);
      window.removeEventListener('resize', closeOnDesktopResize);
      document.body.style.overflow = previousOverflow;
      if (!window.matchMedia('(min-width: 768px)').matches) mobileTriggerRef.current?.focus();
    };
  }, [mobileOpen]);

  const toggleMenu = (id) => setOpenMenu((current) => current === id ? '' : id);
  const closeMenus = () => setOpenMenu('');
  const brandTarget = dashboardLink?.to || '/profile';

  return (
    <div className="w-full" ref={menuRef}>
      <div className="mx-auto w-full max-w-screen-2xl px-3 py-2.5 sm:px-5 lg:px-7">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <Link to={brandTarget} className="focus-ring flex min-w-0 shrink-0 items-center gap-2 rounded-lg" aria-label={`${PRODUCT_NAME} by ${COMPANY_NAME}`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-forest text-gold"><Sprout className="h-5 w-5" strokeWidth={1.8} /></span>
            <span className="min-w-0 max-[380px]:hidden"><span className="block truncate font-display text-base font-semibold leading-5 text-forest">{PRODUCT_NAME}</span><span className="hidden max-w-40 truncate text-[10px] text-ink-soft 2xl:block">{COMPANY_NAME}</span></span>
          </Link>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <span className="shrink-0"><LanguageSwitcher compact /></span>
            <NotificationBell />
            <ProfileMenu user={user} organizationName={activeCooperative?.name} can={can} onChangePassword={onChangePassword} logout={logout} />
          </div>
        </div>
      </div>

      <div className="relative z-10 isolate bg-forest-dark text-paper">
        <div className="landing-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_50%,rgba(201,154,61,.16),transparent_20rem),radial-gradient(circle_at_12%_100%,rgba(47,82,64,.55),transparent_25rem)]" />
          <div className="absolute -right-20 -top-10 h-40 w-40 rounded-full border border-white/10" />
          <div className="absolute right-8 top-1/2 hidden -translate-y-1/2 sm:block">
            <div className="landing-orbit relative h-24 w-24 rounded-full border border-dashed border-gold-light/40">
              <span className="absolute -left-1 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-gold-light shadow-[0_0_22px_6px_rgba(224,188,111,.42)]" />
            </div>
          </div>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-screen-2xl px-3 py-2 sm:px-5 lg:px-7">
          <nav className="hidden min-w-0 flex-wrap items-center gap-1 md:flex xl:hidden" aria-label={t('navigation.primary')}>
            {dashboardLink && <AppLink item={dashboardLink} onNavigate={closeMenus} dark />}
            {primarySections.map((item) => <DropdownSection key={item.id} item={item} open={openMenu === item.id} onToggle={() => toggleMenu(item.id)} onNavigate={closeMenus} active={item.links.some((link) => pathIsActive(location.pathname, link.to))} dark />)}
            <DropdownSection
              item={{ id: 'more', label: t('common.more'), icon: MoreHorizontal, links: [...secondarySections.flatMap((item) => item.links), ...moreLinks] }}
              open={openMenu === 'tablet-more'}
              onToggle={() => toggleMenu('tablet-more')}
              onNavigate={closeMenus}
              active={isMoreActive}
              dark
            />
          </nav>

          <nav className="hidden min-w-0 flex-wrap items-center gap-1 xl:flex" aria-label={t('navigation.primary')}>
            {dashboardLink && <AppLink item={dashboardLink} onNavigate={closeMenus} dark />}
            {sections.map((item) => <DropdownSection key={item.id} item={item} open={openMenu === item.id} onToggle={() => toggleMenu(item.id)} onNavigate={closeMenus} active={item.links.some((link) => pathIsActive(location.pathname, link.to))} dark />)}
            {moreLinks.length > 0 && <DropdownSection item={{ id: 'more', label: t('common.more'), icon: MoreHorizontal, links: moreLinks }} open={openMenu === 'more'} onToggle={() => toggleMenu('more')} onNavigate={closeMenus} active={isMoreActive} dark />}
          </nav>

          <div className="flex min-h-10 items-center justify-between gap-2 md:hidden">
            <button
              ref={mobileTriggerRef}
              type="button"
              onClick={() => setMobileOpen(true)}
              className="nav-focus-ring flex min-h-10 items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 text-sm font-medium text-paper/90 transition-all duration-200 hover:bg-gradient-to-r hover:from-[#284A35] hover:via-[#386346] hover:to-[#896722] hover:text-white hover:shadow-md"
              aria-label={t('common.menu')}
              aria-expanded={mobileOpen}
            >
              <Menu className="h-4 w-4" />
              {t('common.menu')}
            </button>
            <span className="min-w-0 truncate text-xs font-medium text-paper/65">{currentMobileLink?.label || t('common.dashboard')}</span>
          </div>
        </div>
      </div>

      {user?.role === 'super_admin' && (
        <div className="mx-auto mt-2 w-full max-w-screen-2xl border-b border-sand/70 px-3 pb-2 sm:px-5 lg:px-7">
          <CooperativeSwitcher />
        </div>
      )}

      {mobileOpen && createPortal(
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label={t('navigation.mobileMenu')}>
          <button type="button" className="absolute inset-0 h-full w-full bg-ink/45" onClick={() => setMobileOpen(false)} aria-label={t('common.close')} />
          <div id="agribridge-mobile-navigation" ref={mobileDialogRef} className="absolute inset-y-0 left-0 flex w-[min(21rem,calc(100vw-2.5rem))] flex-col overscroll-contain bg-paper shadow-2xl">
            <div className="flex items-center justify-between border-b border-sand px-4 py-4">
              <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest text-gold"><Sprout className="h-5 w-5" /></span><div><p className="font-display text-base font-semibold text-forest">{PRODUCT_NAME}</p><p className="text-[11px] text-ink-soft">{COMPANY_NAME}</p></div></div>
              <button type="button" onClick={() => setMobileOpen(false)} className="focus-ring flex h-10 w-10 items-center justify-center rounded-lg border border-sand bg-white text-ink" aria-label={t('common.close')}><X className="h-5 w-5" /></button>
            </div>
            <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3" aria-label={t('navigation.primary')}>
              {dashboardLink && <div className="mb-2"><AppLink item={dashboardLink} onNavigate={() => setMobileOpen(false)} /></div>}
              {[...sections, ...(moreLinks.length ? [{ id: 'more', label: t('common.more'), icon: MoreHorizontal, links: moreLinks }] : [])].map((item) => (
                <DropdownSection key={item.id} item={item} open={openMenu === `mobile-${item.id}`} onToggle={() => toggleMenu(`mobile-${item.id}`)} onNavigate={() => setMobileOpen(false)} mobile active={item.links.some((link) => pathIsActive(location.pathname, link.to))} />
              ))}
            </nav>
            <div className="border-t border-sand p-3">
              <Link to="/profile" onClick={() => setMobileOpen(false)} className="focus-ring flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-ink-soft hover:bg-sand/50"><UserRound className="h-4 w-4" />{t('common.myProfile')}</Link>
              <button type="button" onClick={() => { setMobileOpen(false); onChangePassword(); }} className="focus-ring flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium text-ink-soft hover:bg-sand/50"><KeyRound className="h-4 w-4" />{t('common.changePassword')}</button>
              <button type="button" onClick={logout} className="focus-ring flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium text-clay hover:bg-clay/5"><LogOut className="h-4 w-4" />{t('common.logout')}</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

export default AgriBridgeNavigation;
