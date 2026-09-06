const TEAM_ROLES = Object.freeze({
  FOUNDER_CEO: 'Founder & CEO',
  COFOUNDER_IT_LEAD: 'Co-Founder & IT Lead',
  VOLUNTEER_FIELD_SUPPORT: 'Volunteer — AgriBridge & Field Systems Support',
});

const TEAM_ROLE_VALUES = Object.freeze(Object.values(TEAM_ROLES));

const isOfficialTeamRole = (value) => TEAM_ROLE_VALUES.includes(value);

module.exports = { TEAM_ROLES, TEAM_ROLE_VALUES, isOfficialTeamRole };
