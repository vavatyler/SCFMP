const fs = require('fs');
const path = require('path');
const { put, get, del } = require('@vercel/blob');
const { UPLOAD_DIR } = require('../middleware/uploadMiddleware');

const hasBlobCredentials = () => Boolean(
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

const saveUploadedFile = async (file, { cooperativeId, ownerType, ownerId }) => {
  if (!shouldUseBlob()) {
    return { storedName: file.filename, filePath: file.path, provider: 'local' };
  }
  if (!hasBlobCredentials()) {
    await unlinkIfPresent(file.path);
    throw new Error('Vercel Blob is not configured. Connect a Blob store before uploading documents.');
  }

  const pathname = `scfmp/${cooperativeId}/${ownerType}/${ownerId}/${file.filename}`;
  try {
    const body = await fs.promises.readFile(file.path);
    const blob = await put(pathname, body, {
      access: 'private',
      addRandomSuffix: false,
      contentType: file.mimetype,
    });
    return { storedName: blob.pathname, filePath: blob.url, provider: 'blob' };
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
  isBlobLocation,
  saveUploadedFile,
  openStoredFile,
  removeStoredFile,
  unlinkIfPresent,
};
