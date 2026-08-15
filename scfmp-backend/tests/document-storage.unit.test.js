const path = require('path');
const {
  isBlobLocation,
  removeStoredFile,
} = require('../services/documentStorageService');

describe('Document storage safety', () => {
  it('recognizes Vercel Blob URLs without treating ordinary URLs as stored blobs', () => {
    expect(isBlobLocation('https://store.private.blob.vercel-storage.com/scfmp/file.pdf')).toBe(true);
    expect(isBlobLocation('https://example.com/file.pdf')).toBe(false);
    expect(isBlobLocation('C:\\uploads\\file.pdf')).toBe(false);
  });

  it('refuses local deletion outside the configured upload directory', async () => {
    const outsidePath = path.resolve(process.cwd(), '..', 'outside-upload.txt');
    await expect(removeStoredFile({ file_path: outsidePath })).rejects.toThrow(/outside the configured upload directory/i);
  });
});
