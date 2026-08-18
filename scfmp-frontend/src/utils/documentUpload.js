export const DOCUMENT_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;
export const DOCUMENT_UPLOAD_ROLES = ['super_admin', 'cooperative_manager', 'field_officer', 'accountant'];
export const DOCUMENT_DELETE_ROLES = ['super_admin', 'cooperative_manager'];

const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.txt',
]);
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);

export const DOCUMENT_UPLOAD_ACCEPT = [...ALLOWED_EXTENSIONS].join(',');

const fileNameBytes = (name = '') => new TextEncoder().encode(name).length;

export const getDocumentFileValidationKey = (file) => {
  if (!file) return 'documents.chooseFile';
  if (fileNameBytes(file.name) > 255) return 'documents.fileNameTooLong';
  if (file.size > DOCUMENT_UPLOAD_MAX_BYTES) return 'documents.fileTooLarge';

  const extensionIndex = file.name.lastIndexOf('.');
  const extension = extensionIndex >= 0 ? file.name.slice(extensionIndex).toLowerCase() : '';
  const hasUnsupportedMimeType = file.type && !ALLOWED_MIME_TYPES.has(file.type);
  if (!ALLOWED_EXTENSIONS.has(extension) || hasUnsupportedMimeType) {
    return 'documents.fileTypeUnsupported';
  }
  return '';
};

const UPLOAD_ERROR_KEYS = {
  DOCUMENT_FILE_REQUIRED: 'documents.chooseFile',
  DOCUMENT_FILE_TOO_LARGE: 'documents.fileTooLarge',
  DOCUMENT_FILE_TYPE_UNSUPPORTED: 'documents.fileTypeUnsupported',
  DOCUMENT_FILE_NAME_TOO_LONG: 'documents.fileNameTooLong',
  DOCUMENT_STORAGE_UNAVAILABLE: 'documents.storageUnavailable',
  DOCUMENT_STORAGE_UPLOAD_FAILED: 'documents.storageUploadFailed',
};

export const getDocumentUploadErrorKey = (error) => (
  UPLOAD_ERROR_KEYS[error?.response?.data?.code] || 'documents.uploadError'
);
