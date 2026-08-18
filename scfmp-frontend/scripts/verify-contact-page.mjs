import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const savedValues = new Map();
globalThis.localStorage = {
  getItem: (key) => savedValues.get(key) ?? null,
  setItem: (key, value) => savedValues.set(key, String(value)),
};
globalThis.document = { documentElement: { lang: '' } };

const { default: i18n } = await import('../src/i18n.js');
const {
  COMPANY_CONTACT,
  COMPANY_EMAIL,
  COMPANY_PHONE,
  createCompanyContact,
} = await import('../src/config/company.js');

assert.equal(COMPANY_EMAIL, 'info@smartdigitalsolutions.com');
assert.equal(COMPANY_PHONE, '+250 789 329 052');
assert.deepEqual(COMPANY_CONTACT, {
  email: 'info@smartdigitalsolutions.com',
  phone: '+250 789 329 052',
  emailUrl: 'mailto:info@smartdigitalsolutions.com',
  phoneUrl: 'tel:+250789329052',
  whatsappUrl: 'https://wa.me/250789329052',
});

// A safe alternate configuration proves Call and WhatsApp derive from one phone source.
const alternateContact = createCompanyContact({
  email: 'support@example.com',
  phone: '+250 (788) 111-222',
});
assert.equal(alternateContact.phone, '+250 (788) 111-222');
assert.equal(alternateContact.phoneUrl, 'tel:+250788111222');
assert.equal(alternateContact.whatsappUrl, 'https://wa.me/250788111222');
assert.equal(alternateContact.emailUrl, 'mailto:support@example.com');

const requiredTranslationKeys = [
  'common.contact',
  'contact.title',
  'contact.email',
  'contact.emailAction',
  'contact.phone',
  'contact.phoneAction',
  'contact.whatsapp',
  'contact.whatsappAction',
];

for (const locale of ['en', 'rw', 'fr']) {
  await i18n.changeLanguage(locale);
  for (const key of requiredTranslationKeys) {
    const value = i18n.getResource(locale, 'translation', key);
    assert.equal(typeof value, 'string', `${locale} is missing ${key}`);
    assert.notEqual(value.trim(), '', `${locale}.${key} is empty`);
    assert.notEqual(i18n.t(key), key, `${locale}.${key} renders its key`);
  }
  assert.equal(COMPANY_CONTACT.email, COMPANY_EMAIL);
  assert.equal(COMPANY_CONTACT.phone, COMPANY_PHONE);
}

const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const sidebarSource = readFileSync(new URL('../src/components/Sidebar.jsx', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('../src/pages/ContactPage.jsx', import.meta.url), 'utf8');

assert.match(appSource, /path=["']\/contact["']/);
assert.match(appSource, /<ProtectedRoute>[\s\S]*?<ContactPage\s*\/>[\s\S]*?<\/ProtectedRoute>/);
assert.match(sidebarSource, /to:\s*["']\/contact["'][\s\S]*?roles:\s*null/);
assert.match(pageSource, /COMPANY_CONTACT\.email/);
assert.equal((pageSource.match(/COMPANY_CONTACT\.phone\b/g) ?? []).length, 2);
assert.match(pageSource, /target=\{external \? ['"]_blank['"]/);
assert.match(pageSource, /noopener noreferrer/);
assert.match(pageSource, /grid-cols-1[\s\S]*?md:grid-cols-3/);
assert.match(pageSource, /min-h-11/);
assert.doesNotMatch(pageSource, /info@smartdigitalsolutions\.com|\+250 789 329 052/);
assert.doesNotMatch(pageSource, /<form\b|fetch\(|axios\.|XMLHttpRequest/);

console.log('Contact email, phone, WhatsApp, normalization, route, and navigation checks passed.');
console.log('Contact translations passed for en, rw, and fr with language-independent contact values.');
