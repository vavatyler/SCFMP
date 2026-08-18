const fs = require('fs');
const path = require('path');
const { put, get, del } = require('@vercel/blob');
const { UPLOAD_DIR } = require('../middleware/uploadMiddleware');

const STORAGE_ERROR_CODES = {
  unavailable: 'DOCUMENT_STORAGE_UNAVAILABLE',
  uploadFailed: 'DOCUMENT_STORAGE_UPLOAD_FAILED',
};

class DocumentStorageError extends Error {
  constructor(code, message, cause) {
    super(message, cause ? { cause } : undefined);
    this.name = 'DocumentStorageError';
    this.code = code;
  }
}

// New Vercel projects use a short-lived OIDC token supplied to the Function
// request context. BLOB_STORE_ID is therefore sufficient evidence that a store
// is connected; @vercel/blob resolves the rotating token at call time.
const hasBlobConfiguration = () => Boolean(
  process.env.BLOB_READ_WRITE_TOKEN
  || process.env.BLOB_STORE_ID
);

const shouldUseBlob = () => process.env.DOCUMENT_STORAGE === 'blob' || Boolean(process.env.VERCEL);

const isBlobLocation = (location = '') => (
  /^https:\/\//i.test(location) && location.includes('.blob.vercel-storage.com/')
);

const unlinkIfPresent = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
};

const isBlobCredentialError = (error) => (
  /blob credentials|read-write token|oidcToken.*storeId|unauthorized|forbidden/i
    .test(error?.message || '')
);

const storageOperationError = (error) => {
  if (isBlobCredentialError(error)) {
    return new DocumentStorageError(
      STORAGE_ERROR_CODES.unavailable,
      'Document storage is unavailable. Connect a private Vercel Blob store to this project and redeploy.',
      error
    );
  }
  return new DocumentStorageError(
    STORAGE_ERROR_CODES.uploadFailed,
    'The document could not be stored. Please try again.',
    error
  );
};

const saveUploadedFile = async (file, { cooperativeId, ownerType, ownerId }) => {
  if (!shouldUseBlob()) {
    return { storedName: file.filename, filePath: file.path, provider: 'local' };
  }
  if (!hasBlobConfiguration()) {
    await unlinkIfPresent(file.path);
    throw new DocumentStorageError(
      STORAGE_ERROR_CODES.unavailable,
      'Document storage is unavailable. Connect a private Vercel Blob store to this project and redeploy.'
    );
  }

  const pathname = `scfmp/${cooperativeId}/${ownerType}/${ownerId}/${file.filename}`;
  try {
    const body = await fs.promises.readFile(file.path);
    try {
      const blob = await put(pathname, body, {
        access: 'private',
        addRandomSuffix: false,
        contentType: file.mimetype,
      });
      return { storedName: blob.pathname, filePath: blob.url, provider: 'blob' };
    } catch (error) {
      throw storageOperationError(error);
    }
  } finally {
    await unlinkIfPresent(file.path);
  }
};

const openStoredFile = async (filePath) => {
  if (!isBlobLocation(filePath)) return null;
  return get(filePath, { access: 'private' });
};

const removeStoredFile = async ({ file_path: filePath }) => {
  if (isBlobLocation(filePath)) {
    await del(filePath);
    return;
  }

  // Legacy/local records may only delete files inside SCFMP's configured upload folder.
  const resolvedFile = path.resolve(filePath);
  const resolvedUploadRoot = `${path.resolve(UPLOAD_DIR)}${path.sep}`;
  if (!resolvedFile.startsWith(resolvedUploadRoot)) {
    throw new Error('Refusing to delete a file outside the configured upload directory');
  }
  await unlinkIfPresent(resolvedFile);
};

module.exports = {
  STORAGE_ERROR_CODES,
  DocumentStorageError,
  hasBlobConfiguration,
  isBlobLocation,
  saveUploadedFile,
  openStoredFile,
  removeStoredFile,
  unlinkIfPresent,
};
