const fs = require('fs');
const { put } = require('@vercel/blob');

const shouldUseBlob = () => process.env.DOCUMENT_STORAGE === 'blob' || Boolean(process.env.VERCEL);

const saveTeamPhoto = async (file, request) => {
  if (!shouldUseBlob()) {
    return `${request.protocol}://${request.get('host')}/uploads/${file.filename}`;
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    await fs.promises.unlink(file.path).catch(() => undefined);
    const error = new Error('Profile image storage is unavailable');
    error.code = 'TEAM_PHOTO_STORAGE_UNAVAILABLE';
    throw error;
  }

  try {
    const body = await fs.promises.readFile(file.path);
    const blob = await put(`scfmp/team/${file.filename}`, body, {
      access: 'public',
      addRandomSuffix: false,
      contentType: file.mimetype,
    });
    return blob.url;
  } finally {
    await fs.promises.unlink(file.path).catch(() => undefined);
  }
};

module.exports = { saveTeamPhoto };