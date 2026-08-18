import assert from 'node:assert/strict';

const savedValues = new Map();
globalThis.localStorage = {
  getItem: (key) => savedValues.get(key) ?? null,
  setItem: (key, value) => savedValues.set(key, String(value)),
};
globalThis.document = { documentElement: { lang: '' } };

const { default: i18n } = await import('../src/i18n.js');
const {
  DOCUMENT_DELETE_ROLES,
  DOCUMENT_UPLOAD_MAX_BYTES,
  DOCUMENT_UPLOAD_ROLES,
  getDocumentFileValidationKey,
  getDocumentUploadErrorKey,
} = await import('../src/utils/documentUpload.js');

const file = (name, size, type) => ({ name, size, type });

assert.equal(DOCUMENT_UPLOAD_MAX_BYTES, 4 * 1024 * 1024);
assert.equal(getDocumentFileValidationKey(null), 'documents.chooseFile');
assert.equal(getDocumentFileValidationKey(file('report.pdf', 1024, 'application/pdf')), '');
assert.equal(getDocumentFileValidationKey(file('photo.JPG', 1024, 'image/jpeg')), '');
assert.equal(
  getDocumentFileValidationKey(file('large.pdf', DOCUMENT_UPLOAD_MAX_BYTES + 1, 'application/pdf')),
  'documents.fileTooLarge',
);
assert.equal(
  getDocumentFileValidationKey(file('malware.exe', 1024, 'application/octet-stream')),
  'documents.fileTypeUnsupported',
);
assert.equal(
  getDocumentFileValidationKey(file(`${'a'.repeat(252)}.pdf`, 1024, 'application/pdf')),
  'documents.fileNameTooLong',
);

assert.deepEqual(DOCUMENT_UPLOAD_ROLES, ['super_admin', 'cooperative_manager', 'field_officer', 'accountant']);
assert.deepEqual(DOCUMENT_DELETE_ROLES, ['super_admin', 'cooperative_manager']);

const errorCases = {
  DOCUMENT_FILE_TOO_LARGE: 'documents.fileTooLarge',
  DOCUMENT_FILE_TYPE_UNSUPPORTED: 'documents.fileTypeUnsupported',
  DOCUMENT_FILE_NAME_TOO_LONG: 'documents.fileNameTooLong',
  DOCUMENT_STORAGE_UNAVAILABLE: 'documents.storageUnavailable',
  DOCUMENT_STORAGE_UPLOAD_FAILED: 'documents.storageUploadFailed',
};
for (const [code, expectedKey] of Object.entries(errorCases)) {
  assert.equal(getDocumentUploadErrorKey({ response: { data: { code } } }), expectedKey);
}
assert.equal(getDocumentUploadErrorKey({}), 'documents.uploadError');

const translatedKeys = [
  'documents.fileTypes',
  'documents.uploaded',
  'documents.fileTooLarge',
  'documents.fileTypeUnsupported',
  'documents.fileNameTooLong',
  'documents.storageUnavailable',
  'documents.storageUploadFailed',
];
for (const locale of ['en', 'rw', 'fr']) {
  await i18n.changeLanguage(locale);
  for (const key of translatedKeys) {
    const value = i18n.t(key);
    assert.notEqual(value, key, `${locale} is missing ${key}`);
    assert.notEqual(value.trim(), '', `${locale}.${key} is empty`);
  }
}

console.log('Document file validation, role visibility, and API error mapping checks passed.');
console.log('Document upload messages passed for en, rw, and fr.');
