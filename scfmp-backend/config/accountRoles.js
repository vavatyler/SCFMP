const ACCOUNT_SCOPES = Object.freeze({
  PLATFORM: 'platform',
  ORGANIZATION: 'organization',
});

const PLATFORM_ROLES = Object.freeze(['super_admin', 'platform_admin', 'technical_admin']);
const ORGANIZATION_ROLES = Object.freeze(['cooperative_manager', 'accountant', 'field_officer', 'farmer']);
const ALL_ACCOUNT_ROLES = Object.freeze([...PLATFORM_ROLES, ...ORGANIZATION_ROLES]);

const isPlatformRole = (role) => PLATFORM_ROLES.includes(role);
const isOrganizationRole = (role) => ORGANIZATION_ROLES.includes(role);
const accountScopeForRole = (role) => (isPlatformRole(role) ? ACCOUNT_SCOPES.PLATFORM : ACCOUNT_SCOPES.ORGANIZATION);

module.exports = {
  ACCOUNT_SCOPES,
  PLATFORM_ROLES,
  ORGANIZATION_ROLES,
  ALL_ACCOUNT_ROLES,
  isPlatformRole,
  isOrganizationRole,
  accountScopeForRole,
};
