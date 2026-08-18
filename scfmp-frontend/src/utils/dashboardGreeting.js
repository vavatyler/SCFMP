export const getDashboardGreeting = ({ isSuperAdmin, firstName, organizationName }) => {
  const hasOrganizationName =
    typeof organizationName === 'string' && organizationName.trim().length > 0;

  if (!isSuperAdmin && hasOrganizationName) {
    return {
      key: 'dashboard.organizationWelcome',
      values: { organization: organizationName },
    };
  }

  return {
    key: 'common.welcome',
    values: { name: firstName },
  };
};
