const fs = require('fs');
const { Readable } = require('stream');
const { put } = require('@vercel/blob');
const { openStoredFile } = require('./documentStorageService');

const shouldUseBlob = () => process.env.DOCUMENT_STORAGE === 'blob' || Boolean(process.env.VERCEL);

const saveTeamPhoto = async (file, request) => {
  if (!shouldUseBlob()) {
    return `${request.protocol}://${request.get('host')}/uploads/${file.filename}`;
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    await fs.promises.unlink(file.path).catch(() => undefined);
    const error = new Error('Profile image storage is unavailable');
    error.code = 'TEAM_PHOTO_STORAGE_UNAVAILABLE';
    error.status = 503;
    throw error;
  }

  try {
    const body = await fs.promises.readFile(file.path);
    try {
      const blob = await put(`scfmp/team/${file.filename}`, body, {
        access: 'private',
        addRandomSuffix: false,
        contentType: file.mimetype,
      });
      return blob.url;
    } catch (cause) {
      const error = new Error('Profile image could not be stored');
      error.code = 'TEAM_PHOTO_STORAGE_UPLOAD_FAILED';
      error.status = 502;
      error.cause = cause;
      throw error;
    }
  } finally {
    await fs.promises.unlink(file.path).catch(() => undefined);
  }
};

const streamStoredTeamPhoto = async (photoUrl, response) => {
  if (!/^https:\/\//i.test(photoUrl)) return false;
  const result = await openStoredFile(photoUrl);
  if (!result || result.statusCode !== 200) return false;
  response.type(result.blob.contentType || 'application/octet-stream');
  response.setHeader('Content-Length', String(result.blob.size));
  response.setHeader('Cache-Control', 'public, max-age=3600');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  await require('stream').promises.pipeline(Readable.fromWeb(result.stream), response);
  return true;
};

module.exports = { saveTeamPhoto, streamStoredTeamPhoto };