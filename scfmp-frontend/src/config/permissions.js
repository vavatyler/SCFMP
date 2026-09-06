export const PERMISSIONS = Object.freeze({
  DASHBOARD_VIEW: 'dashboard.view',
  TEAM_VIEW: 'team.view',
  TEAM_MANAGE: 'team.manage',
  ORGANIZATIONS_VIEW: 'organizations.view',
  ORGANIZATIONS_MANAGE: 'organizations.manage',
  FARMERS_VIEW: 'farmers.view',
  FARMERS_MANAGE: 'farmers.manage',
  MEMBERS_VIEW: 'members.view',
  MEMBERS_MANAGE: 'members.manage',
  PRODUCTION_VIEW: 'production.view',
  PRODUCTION_MANAGE: 'production.manage',
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_MANAGE: 'inventory.manage',
  FINANCE_VIEW: 'finance.view',
  FINANCE_MANAGE: 'finance.manage',
  PAYROLL_VIEW: 'payroll.view',
  PAYROLL_MANAGE: 'payroll.manage',
  DOCUMENTS_VIEW: 'documents.view',
  DOCUMENTS_MANAGE: 'documents.manage',
  REPORTS_VIEW: 'reports.view',
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_MANAGE: 'settings.manage',
  USERS_VIEW: 'users.view',
  USERS_MANAGE: 'users.manage',
});

export const PERMISSION_MODULES = Object.freeze([
  { id: 'dashboard', view: PERMISSIONS.DASHBOARD_VIEW },
  { id: 'team', view: PERMISSIONS.TEAM_VIEW, manage: PERMISSIONS.TEAM_MANAGE },
  { id: 'organizations', view: PERMISSIONS.ORGANIZATIONS_VIEW, manage: PERMISSIONS.ORGANIZATIONS_MANAGE },
  { id: 'farmers', view: PERMISSIONS.FARMERS_VIEW, manage: PERMISSIONS.FARMERS_MANAGE },
  { id: 'members', view: PERMISSIONS.MEMBERS_VIEW, manage: PERMISSIONS.MEMBERS_MANAGE },
  { id: 'production', view: PERMISSIONS.PRODUCTION_VIEW, manage: PERMISSIONS.PRODUCTION_MANAGE },
  { id: 'inventory', view: PERMISSIONS.INVENTORY_VIEW, manage: PERMISSIONS.INVENTORY_MANAGE },
  { id: 'finance', view: PERMISSIONS.FINANCE_VIEW, manage: PERMISSIONS.FINANCE_MANAGE },
  { id: 'payroll', view: PERMISSIONS.PAYROLL_VIEW, manage: PERMISSIONS.PAYROLL_MANAGE },
  { id: 'documents', view: PERMISSIONS.DOCUMENTS_VIEW, manage: PERMISSIONS.DOCUMENTS_MANAGE },
  { id: 'reports', view: PERMISSIONS.REPORTS_VIEW },
  { id: 'settings', view: PERMISSIONS.SETTINGS_VIEW, manage: PERMISSIONS.SETTINGS_MANAGE },
  { id: 'users', view: PERMISSIONS.USERS_VIEW, manage: PERMISSIONS.USERS_MANAGE },
]);

export const ALL_PERMISSIONS = Object.freeze(
  PERMISSION_MODULES.flatMap((module) => [module.view, module.manage].filter(Boolean))
);

export const PLATFORM_ROLES = Object.freeze([
  'super_admin',
  'platform_admin',
  'technical_admin',
]);

export const ORGANIZATION_ROLES = Object.freeze([
  'cooperative_manager',
  'accountant',
  'field_officer',
  'farmer',
]);

export const SYSTEM_ROLES = Object.freeze([...PLATFORM_ROLES, ...ORGANIZATION_ROLES]);

export const SYSTEM_ROLE_LABELS = Object.freeze({
  super_admin: 'Super Admin',
  platform_admin: 'Platform Administrator',
  technical_admin: 'Technical Administrator',
  cooperative_manager: 'Cooperative Manager',
  accountant: 'Accountant',
  field_officer: 'Field Officer',
  farmer: 'Farmer',
});

const ROLE_PERMISSIONS = Object.freeze({
  super_admin: ALL_PERMISSIONS,
  platform_admin: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.TEAM_VIEW,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_MANAGE,
  ],
  technical_admin: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.TEAM_VIEW,
    PERMISSIONS.SETTINGS_VIEW,
  ],
  cooperative_manager: ALL_PERMISSIONS.filter((permission) => (
    !permission.startsWith('payroll.') && permission !== PERMISSIONS.TEAM_MANAGE
  )),
  accountant: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.TEAM_VIEW,
    PERMISSIONS.FARMERS_VIEW,
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.PRODUCTION_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_MANAGE,
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.DOCUMENTS_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.SETTINGS_VIEW,
  ],
  field_officer: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.TEAM_VIEW,
    PERMISSIONS.FARMERS_VIEW,
    PERMISSIONS.FARMERS_MANAGE,
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.MEMBERS_MANAGE,
    PERMISSIONS.PRODUCTION_VIEW,
    PERMISSIONS.PRODUCTION_MANAGE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_MANAGE,
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.DOCUMENTS_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.SETTINGS_VIEW,
  ],
  farmer: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.TEAM_VIEW,
    PERMISSIONS.FARMERS_VIEW,
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.PRODUCTION_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.SETTINGS_VIEW,
  ],
});

export const permissionsForRole = (role) => [...(ROLE_PERMISSIONS[role] || [])];

export const effectivePermissions = (user) => {
  if (!user) return [];
  if (user.role === 'super_admin') return [...ALL_PERMISSIONS];
  return Array.isArray(user.effective_permissions)
    ? user.effective_permissions
    : permissionsForRole(user.role);
};

export const hasPermission = (user, permission) => effectivePermissions(user).includes(permission);

export const accessibleModules = (permissions) => PERMISSION_MODULES
  .filter((module) => permissions.includes(module.view))
  .map((module) => module.id);
