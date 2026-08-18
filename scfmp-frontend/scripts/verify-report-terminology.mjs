import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const savedValues = new Map();
globalThis.localStorage = {
  getItem: (key) => savedValues.get(key) ?? null,
  setItem: (key, value) => savedValues.set(key, String(value)),
};
globalThis.document = { documentElement: { lang: '' } };

const { default: i18n } = await import('../src/i18n.js');
const { buildReportHeaderRows, printReport } = await import('../src/utils/reportExport.js');

const organizationName = 'GASAKA TEA COOP';
const report = {
  metadata: {
    module: 'members',
    title: 'Members Report',
    cooperative: organizationName,
    generated_at: '2026-08-18T10:00:00.000Z',
    generated_by: 'Report Tester',
    record_count: 1,
    language: 'en',
  },
  columns: [
    { key: 'cooperative', label: 'Organization' },
    { key: 'organization_type', label: 'Organization Type' },
  ],
  rows: [{ cooperative: organizationName, organization_type: 'Cooperative' }],
};

const expectedTerms = {
  en: { organization: 'Organization', comparison: 'Organization comparison', type: 'Cooperative' },
  rw: { organization: 'Umuryango', comparison: 'Igereranya ry’imiryango', type: 'Koperative' },
  fr: { organization: 'Organisation', comparison: 'Comparaison des organisations', type: 'Coopérative' },
};

for (const [locale, expected] of Object.entries(expectedTerms)) {
  await i18n.changeLanguage(locale);
  assert.equal(i18n.t('reports.cooperative'), expected.organization);
  assert.equal(i18n.t('production.cooperativeComparison'), expected.comparison);
  assert.equal(i18n.t('organizationTypes.cooperative'), expected.type);
  assert.notEqual(i18n.t('reports.cooperative'), i18n.t('organizationTypes.cooperative'));

  const localizedReport = { ...report, metadata: { ...report.metadata, language: locale } };
  assert.equal(buildReportHeaderRows(localizedReport)[2][0], `${expected.organization}: ${organizationName}`);
}

let printHtml = '';
let printCalled = false;
globalThis.window = {
  open: () => ({
    document: { write: (html) => { printHtml += html; }, close: () => {} },
    focus: () => {},
    print: () => { printCalled = true; },
  }),
};
printReport(report);
assert.equal(printCalled, true);
assert.match(printHtml, />Organization<\/th>/);
assert.match(printHtml, new RegExp(`>${organizationName}<\\/td>`));
assert.match(printHtml, />Cooperative<\/td>/);

const reportApiSource = readFileSync(new URL('../src/api/reports.js', import.meta.url), 'utf8');
const reportActionsSource = readFileSync(new URL('../src/components/ReportActions.jsx', import.meta.url), 'utf8');
const reportExportSource = readFileSync(new URL('../src/utils/reportExport.js', import.meta.url), 'utf8');
assert.match(reportApiSource, /`\/reports\/\$\{moduleName\}`/);
assert.match(reportActionsSource, /filters\s*=\s*\{\}/);
assert.match(reportActionsSource, /language: i18n\.resolvedLanguage/);
assert.match(reportExportSource, /metadata\.cooperative/);
assert.doesNotMatch(reportExportSource, /metadata\.organization/);

console.log('Report UI/export terminology passed for en, rw, and fr.');
console.log('Organization name, Organization Type value, API path, and internal cooperative field checks passed.');
