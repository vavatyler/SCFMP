import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const savedValues = new Map();
globalThis.localStorage = {
  getItem: (key) => savedValues.get(key) ?? null,
  setItem: (key, value) => savedValues.set(key, String(value)),
};
globalThis.document = { documentElement: { lang: '' } };

const { default: i18n } = await import('../src/i18n.js');
const { buildOrganizationPayload, createEmptyOrganizationForm } = await import('../src/utils/organizationForm.js');
const { buildMemberPayload, createEmptyMemberForm } = await import('../src/utils/memberForm.js');
const { buildFarmerPayload, createEmptyFarmerForm } = await import('../src/utils/farmerForm.js');

const locales = ['en', 'rw', 'fr'];
const affectedFiles = [
  '../src/pages/CooperativesPage.jsx',
  '../src/pages/MembersPage.jsx',
  '../src/pages/MemberDetailPage.jsx',
  '../src/pages/FarmersPage.jsx',
  '../src/pages/ProductionPage.jsx',
  '../src/components/MemberFormFields.jsx',
  '../src/components/FarmSizeFields.jsx',
  '../src/components/RwandaPhoneInput.jsx',
  '../src/components/RwandaLocationFields.jsx',
];

const sources = affectedFiles.map((file) => readFileSync(new URL(file, import.meta.url), 'utf8'));
const requiredKeys = new Set([
  'common.save', 'common.cancel', 'common.edit', 'common.delete', 'common.loading',
  'common.status', 'common.farmer', 'common.optional', 'common.saving',
  ...['cooperative', 'farmer_group', 'sme', 'school', 'association', 'ngo', 'other']
    .map((value) => `organizationTypes.${value}`),
  ...['notSpecified', 'male', 'female', 'other'].map((value) => `members.gender.${value}`),
  ...[
    'district', 'sector', 'cell', 'village',
    'selectDistrict', 'selectSector', 'selectCell', 'selectVillage',
    'selectDistrictFirst', 'selectSectorFirst', 'selectCellFirst',
    'loadingDistricts', 'loadingSectors', 'loadingCells', 'loadingVillages',
    'savedValue', 'loadError', 'incomplete', 'farmerIncomplete', 'legacyPreserved',
  ].map((value) => `locations.${value}`),
]);

const literalTranslationCall = /\bt\(\s*['"]([^'"]+)['"]/g;
sources.forEach((source) => {
  for (const match of source.matchAll(literalTranslationCall)) requiredKeys.add(match[1]);
});

const forbiddenHardCodedText = />\s*(?:Save|Cancel|Edit|Add Organization|Edit Organization|Add Member|First Name|Last Name|Crop Type|Farm Size|Select District|Select Sector|Select Cell|Select Village)\s*</i;
affectedFiles.forEach((file, index) => {
  assert.equal(forbiddenHardCodedText.test(sources[index]), false, `${file} contains affected hard-coded UI text`);
});

for (const locale of locales) {
  await i18n.changeLanguage(locale);
  assert.equal(i18n.resolvedLanguage, locale);
  assert.equal(document.documentElement.lang, locale);
  assert.equal(localStorage.getItem('scfmp_language'), locale);

  for (const key of requiredKeys) {
    const value = i18n.getResource(locale, 'translation', key);
    assert.equal(typeof value, 'string', `${locale} is missing ${key}`);
    assert.notEqual(value.trim(), '', `${locale} has an empty ${key}`);
    assert.equal(value.includes('\uFFFD'), false, `${locale}.${key} contains a replacement character`);
    assert.notEqual(i18n.t(key), key, `${locale}.${key} renders its key`);
  }
}

const organizationForm = {
  ...createEmptyOrganizationForm(),
  organization_type: 'farmer_group',
  name: 'Nyagatare Growers',
  district: 'Nyagatare',
  sector: 'Rwimiyaga',
  cell: 'Gacundezi',
};
const memberForm = {
  ...createEmptyMemberForm(),
  first_name: 'Aline',
  last_name: 'Uwase',
  gender: 'female',
};
const farmerForm = {
  ...createEmptyFarmerForm(),
  crop_type: 'Coffee',
  district: 'Nyamagabe',
  sector: 'Buruhukiro',
  cell: 'Bushigishigi',
  village: 'Giharayumbu',
};
const initialFormData = JSON.stringify({ organizationForm, memberForm, farmerForm });

for (const locale of ['en', 'rw', 'fr', 'en']) {
  await i18n.changeLanguage(locale);
  assert.equal(buildOrganizationPayload(organizationForm).organization_type, 'farmer_group');
  assert.equal(buildMemberPayload(memberForm).gender, 'female');
  const farmerPayload = buildFarmerPayload(farmerForm);
  assert.equal(farmerPayload.crop_type, 'Coffee');
  assert.equal(farmerPayload.district, 'Nyamagabe');
  assert.equal(farmerPayload.village, 'Giharayumbu');
  assert.equal(JSON.stringify({ organizationForm, memberForm, farmerForm }), initialFormData);
}

console.log(`Verified ${requiredKeys.size} affected form translation keys across en, rw, and fr.`);
console.log('Runtime switching and stable enum/dynamic-data payload checks passed.');
