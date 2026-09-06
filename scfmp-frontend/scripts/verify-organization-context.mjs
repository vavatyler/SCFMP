import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const app = read('../src/App.jsx');
const context = read('../src/context/CooperativeContext.jsx');
const selector = read('../src/components/CooperativeSwitcher.jsx');
const emptyState = read('../src/components/NoOrganizationSelectedState.jsx');
const dashboard = read('../src/pages/DashboardPage.jsx');
const client = read('../src/api/client.js');
const team = read('../src/pages/TeamPage.jsx');

for (const route of [
  '/members', '/farmers', '/production', '/farmer-groups', '/finance', '/inventory',
  '/documents', '/staff', '/reports',
]) {
  const routeStart = app.indexOf(`path="${route}"`);
  assert.notEqual(routeStart, -1, `${route} route is missing`);
  assert.notEqual(app.indexOf('<OrganizationRoute', routeStart), -1, `${route} is not organization guarded`);
}

for (const route of ['/team', '/subscription', '/settings']) {
  const routeStart = app.indexOf(`path="${route}"`);
  const routeEnd = app.indexOf('<Route', routeStart + 6);
  const routeSource = app.slice(routeStart, routeEnd === -1 ? undefined : routeEnd);
  assert.equal(routeSource.includes('OrganizationRoute'), false, `${route} must remain platform-level`);
}

assert.equal(context.includes('data[0]'), false, 'organization context must not auto-select the first organization');
assert.equal(context.includes('localStorage.removeItem(ACTIVE_ORGANIZATION_STORAGE_KEY)'), true);
assert.equal(context.includes('activeOrganizations.some'), true, 'persisted selection must be re-authorized');
assert.equal(context.includes("organization.status !== 'inactive'"), true);
assert.equal(selector.includes('organizationContext.noneSelected'), true);
assert.equal(selector.includes('role="listbox"'), true);
assert.equal(selector.includes('sm:max-w-[18rem]'), true, 'selector must constrain long names responsively');
assert.equal(emptyState.includes('requestOrganizationSelection'), true, 'empty-state action must open the shared selector');
assert.equal(dashboard.includes('NoOrganizationSelectedState'), true);
assert.equal(dashboard.includes('summaryOrganizationId'), true, 'dashboard must guard against stale organization data');
assert.equal(client.includes("config.headers['X-Organization-Id']"), true, 'selected context must be sent to the API');
assert.equal(team.includes("listUsers({ account_scope: 'platform' })"), true);
assert.equal(team.includes('PLATFORM_ROLES.map'), true);
assert.equal(team.includes('ORGANIZATION_ROLES'), false);

const savedValues = new Map();
globalThis.localStorage = {
  getItem: (key) => savedValues.get(key) ?? null,
  setItem: (key, value) => savedValues.set(key, String(value)),
};
globalThis.document = { documentElement: { lang: '' } };
const { default: i18n } = await import('../src/i18n.js');
const translationKeys = [
  'organizationContext.organization', 'organizationContext.noneSelected',
  'organizationContext.currentOrganization', 'organizationContext.selectOrganization',
  'organizationContext.dashboardDescription', 'organizationContext.farmersDescription',
  'organizationContext.membersDescription', 'organizationContext.productionDescription',
  'organizationContext.documentsDescription', 'team.manageSystemAccess', 'team.platformRole',
  'team.accessibleModules', 'team.accountActivationStatus',
];
for (const locale of ['en', 'rw', 'fr']) {
  await i18n.changeLanguage(locale);
  for (const key of translationKeys) {
    const value = i18n.getResource(locale, 'translation', key);
    assert.equal(typeof value, 'string', `${locale} is missing ${key}`);
    assert.notEqual(value.trim(), '', `${locale}.${key} is empty`);
  }
}

console.log('Organization route, persistence, selector, stale-data, Team separation, and API context checks passed.');
console.log('Organization-context translations passed for en, rw, and fr.');
