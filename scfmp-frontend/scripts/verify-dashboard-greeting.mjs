import assert from 'node:assert/strict';

const savedValues = new Map();
globalThis.localStorage = {
  getItem: (key) => savedValues.get(key) ?? null,
  setItem: (key, value) => savedValues.set(key, String(value)),
};
globalThis.document = { documentElement: { lang: '' } };

const { default: i18n } = await import('../src/i18n.js');
const { getDashboardGreeting } = await import('../src/utils/dashboardGreeting.js');

const renderGreeting = async ({ locale = 'en', ...context }) => {
  await i18n.changeLanguage(locale);
  const greeting = getDashboardGreeting(context);
  return i18n.t(greeting.key, greeting.values);
};

const organizationName = 'GASAKA TEA COOP';
const organizationGreeting = await renderGreeting({
  isSuperAdmin: false,
  firstName: 'John',
  organizationName,
});
assert.equal(organizationGreeting, `Welcome to ${organizationName}`);
assert.equal(organizationGreeting.includes('John'), false);

const superAdminGreeting = await renderGreeting({
  isSuperAdmin: true,
  firstName: 'John',
  organizationName,
});
assert.equal(superAdminGreeting, 'Welcome back, John');

for (const unresolvedName of [undefined, null, '', '   ']) {
  const fallbackGreeting = await renderGreeting({
    isSuperAdmin: false,
    firstName: 'John',
    organizationName: unresolvedName,
  });
  assert.equal(fallbackGreeting, 'Welcome back, John');
  assert.equal(/undefined|null|Welcome to\s*$/.test(fallbackGreeting), false);
}

const switchedGreeting = await renderGreeting({
  isSuperAdmin: false,
  firstName: 'John',
  organizationName: 'CYANIKA',
});
assert.equal(switchedGreeting, 'Welcome to CYANIKA');
assert.equal(
  await renderGreeting({ isSuperAdmin: false, firstName: 'John', organizationName }),
  `Welcome to ${organizationName}`,
);

const renamedOrganization = 'GASAKA TEA ORGANIZATION';
assert.equal(
  await renderGreeting({
    isSuperAdmin: false,
    firstName: 'John',
    organizationName: renamedOrganization,
  }),
  `Welcome to ${renamedOrganization}`,
);

const expectedLocalizedGreetings = {
  en: `Welcome to ${organizationName}`,
  rw: `Murakaza neza muri ${organizationName}`,
  fr: `Bienvenue à ${organizationName}`,
};
for (const [locale, expected] of Object.entries(expectedLocalizedGreetings)) {
  const localizedGreeting = await renderGreeting({
    locale,
    isSuperAdmin: false,
    firstName: 'John',
    organizationName,
  });
  assert.equal(localizedGreeting, expected);
  assert.equal(localizedGreeting.includes(organizationName), true);
}

const longOrganizationName = `RWANDA ${'COMMUNITY AGRICULTURE '.repeat(8).trim()} ORGANIZATION`;
assert.equal(
  await renderGreeting({
    isSuperAdmin: false,
    firstName: 'John',
    organizationName: longOrganizationName,
  }),
  `Welcome to ${longOrganizationName}`,
);

console.log('Dashboard greeting role, context, fallback, rename, and switching checks passed.');
console.log('Dashboard greeting translations passed for en, rw, and fr.');
