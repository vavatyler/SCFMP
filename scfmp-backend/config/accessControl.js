const PERMISSIONS = Object.freeze({
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

const ALL_PERMISSIONS = Object.freeze(Object.values(PERMISSIONS));
const ALL_PERMISSION_SET = new Set(ALL_PERMISSIONS);

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
  cooperative_manager: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.TEAM_VIEW,
    PERMISSIONS.ORGANIZATIONS_VIEW,
    PERMISSIONS.ORGANIZATIONS_MANAGE,
    PERMISSIONS.FARMERS_VIEW,
    PERMISSIONS.FARMERS_MANAGE,
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.MEMBERS_MANAGE,
    PERMISSIONS.PRODUCTION_VIEW,
    PERMISSIONS.PRODUCTION_MANAGE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_MANAGE,
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_MANAGE,
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.DOCUMENTS_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_MANAGE,
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_MANAGE,
  ],
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

const MODULES = Object.freeze([
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

const parsePermissions = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
};

const getEffectivePermissions = (user) => {
  if (!user) return [];
  if (user.role === 'super_admin') return [...ALL_PERMISSIONS];
  const custom = parsePermissions(user.permissions);
  return custom === null ? [...(ROLE_PERMISSIONS[user.role] || [])] : custom.filter((item) => ALL_PERMISSION_SET.has(item));
};

const hasPermission = (user, permission) => getEffectivePermissions(user).includes(permission);

const getAccessibleModules = (userOrPermissions) => {
  const permissions = Array.isArray(userOrPermissions)
    ? userOrPermissions
    : getEffectivePermissions(userOrPermissions);
  return MODULES.filter((module) => permissions.includes(module.view)).map((module) => module.id);
};

const validatePermissions = (permissions) => (
  Array.isArray(permissions) && permissions.every((permission) => ALL_PERMISSION_SET.has(permission))
);

const requestPermissions = (req) => {
  const baseUrl = req.baseUrl || '';
  const isRead = req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS';
  const byBaseUrl = {
    '/api/dashboard': [PERMISSIONS.DASHBOARD_VIEW],
    '/api/cooperatives': [isRead ? PERMISSIONS.ORGANIZATIONS_VIEW : PERMISSIONS.ORGANIZATIONS_MANAGE],
    '/api/members': [isRead ? PERMISSIONS.MEMBERS_VIEW : PERMISSIONS.MEMBERS_MANAGE],
    '/api/farmers': [isRead ? PERMISSIONS.FARMERS_VIEW : PERMISSIONS.FARMERS_MANAGE],
    '/api/farmer-groups': [isRead ? PERMISSIONS.FARMERS_VIEW : PERMISSIONS.FARMERS_MANAGE],
    '/api/production': [isRead ? PERMISSIONS.PRODUCTION_VIEW : PERMISSIONS.PRODUCTION_MANAGE],
    '/api/inventory': [isRead ? PERMISSIONS.INVENTORY_VIEW : PERMISSIONS.INVENTORY_MANAGE],
    '/api/transactions': [isRead ? PERMISSIONS.FINANCE_VIEW : PERMISSIONS.FINANCE_MANAGE],
    '/api/loans': [isRead ? PERMISSIONS.FINANCE_VIEW : PERMISSIONS.FINANCE_MANAGE],
    '/api/documents': [isRead ? PERMISSIONS.DOCUMENTS_VIEW : PERMISSIONS.DOCUMENTS_MANAGE],
    '/api/team-members': [isRead ? PERMISSIONS.TEAM_VIEW : PERMISSIONS.TEAM_MANAGE],
    '/api/users': [isRead ? PERMISSIONS.USERS_VIEW : PERMISSIONS.USERS_MANAGE],
    '/api/subscriptions': [isRead ? PERMISSIONS.SETTINGS_VIEW : PERMISSIONS.SETTINGS_MANAGE],
  };
  if (baseUrl === '/api/auth' && req.path === '/register') return [PERMISSIONS.USERS_MANAGE];
  if (baseUrl === '/api/reports') {
    const reportModule = String(req.path || '').split('/').filter(Boolean)[0];
    const dataPermission = {
      finance: PERMISSIONS.FINANCE_VIEW,
      inventory: PERMISSIONS.INVENTORY_VIEW,
      members: PERMISSIONS.MEMBERS_VIEW,
      farmers: PERMISSIONS.FARMERS_VIEW,
      production: PERMISSIONS.PRODUCTION_VIEW,
    }[reportModule];
    return [PERMISSIONS.REPORTS_VIEW, ...(dataPermission ? [dataPermission] : [])];
  }
  return byBaseUrl[baseUrl] || [];
};

module.exports = {
  PERMISSIONS,
  ALL_PERMISSIONS,
  ROLE_PERMISSIONS,
  MODULES,
  getEffectivePermissions,
  getAccessibleModules,
  hasPermission,
  validatePermissions,
  requestPermissions,
};
