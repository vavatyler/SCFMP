jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
}));

const fs = require('fs');
const os = require('os');
const path = require('path');
const blobClient = require('@vercel/blob');
const {
  STORAGE_ERROR_CODES,
  hasBlobConfiguration,
  isBlobLocation,
  openStoredFile,
  removeStoredFile,
  saveUploadedFile,
} = require('../services/documentStorageService');

const BLOB_ENVIRONMENT_KEYS = [
  'DOCUMENT_STORAGE',
  'BLOB_READ_WRITE_TOKEN',
  'BLOB_STORE_ID',
  'VERCEL_OIDC_TOKEN',
  'VERCEL',
];
const originalEnvironment = Object.fromEntries(
  BLOB_ENVIRONMENT_KEYS.map((key) => [key, process.env[key]])
);

const createTemporaryUpload = (content = 'test') => {
  const filePath = path.join(os.tmpdir(), `scfmp-blob-${Date.now()}-${Math.random()}.txt`);
  fs.writeFileSync(filePath, content);
  return {
    path: filePath,
    filename: path.basename(filePath),
    originalname: 'test.txt',
    mimetype: 'text/plain',
    size: Buffer.byteLength(content),
  };
};

describe('Document storage safety', () => {
  beforeEach(() => {
    BLOB_ENVIRONMENT_KEYS.forEach((key) => delete process.env[key]);
    jest.clearAllMocks();
  });

  afterAll(() => {
    Object.entries(originalEnvironment).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  });

  it('recognizes Vercel Blob URLs without treating ordinary URLs as stored blobs', () => {
    expect(isBlobLocation('https://store.private.blob.vercel-storage.com/scfmp/file.pdf')).toBe(true);
    expect(isBlobLocation('https://example.com/file.pdf')).toBe(false);
    expect(isBlobLocation('C:\\uploads\\file.pdf')).toBe(false);
  });

  it('accepts either a read-write token or a connected OIDC store configuration', () => {
    expect(hasBlobConfiguration()).toBe(false);
    process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
    expect(hasBlobConfiguration()).toBe(true);
    delete process.env.BLOB_READ_WRITE_TOKEN;
    process.env.BLOB_STORE_ID = 'store_test';
    expect(hasBlobConfiguration()).toBe(true);
  });

  it('refuses local deletion outside the configured upload directory', async () => {
    const outsidePath = path.resolve(process.cwd(), '..', 'outside-upload.txt');
    await expect(removeStoredFile({ file_path: outsidePath })).rejects.toThrow(/outside the configured upload directory/i);
  });

  it('removes the temporary upload and reports missing Blob configuration clearly', async () => {
    const temporaryUpload = createTemporaryUpload();
    process.env.DOCUMENT_STORAGE = 'blob';

    await expect(saveUploadedFile(
      temporaryUpload,
      { cooperativeId: 1, ownerType: 'member', ownerId: 1 }
    )).rejects.toMatchObject({ code: STORAGE_ERROR_CODES.unavailable });

    expect(fs.existsSync(temporaryUpload.path)).toBe(false);
    expect(blobClient.put).not.toHaveBeenCalled();
  });

  it('uploads a private Blob with an OIDC store binding and removes the temporary file', async () => {
    const temporaryUpload = createTemporaryUpload('document content');
    process.env.DOCUMENT_STORAGE = 'blob';
    process.env.BLOB_STORE_ID = 'store_test';
    blobClient.put.mockResolvedValue({
      pathname: `scfmp/7/member/11/${temporaryUpload.filename}`,
      url: `https://test.private.blob.vercel-storage.com/scfmp/7/member/11/${temporaryUpload.filename}`,
    });

    const storedFile = await saveUploadedFile(
      temporaryUpload,
      { cooperativeId: 7, ownerType: 'member', ownerId: 11 }
    );

    expect(blobClient.put).toHaveBeenCalledWith(
      `scfmp/7/member/11/${temporaryUpload.filename}`,
      expect.any(Buffer),
      expect.objectContaining({ access: 'private', addRandomSuffix: false, contentType: 'text/plain' })
    );
    expect(storedFile).toEqual(expect.objectContaining({ provider: 'blob' }));
    expect(fs.existsSync(temporaryUpload.path)).toBe(false);
  });

  it('cleans the temporary file and returns a safe code when the provider rejects an upload', async () => {
    const temporaryUpload = createTemporaryUpload();
    process.env.DOCUMENT_STORAGE = 'blob';
    process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
    blobClient.put.mockRejectedValue(new Error('provider request failed'));

    await expect(saveUploadedFile(
      temporaryUpload,
      { cooperativeId: 1, ownerType: 'member', ownerId: 1 }
    )).rejects.toMatchObject({ code: STORAGE_ERROR_CODES.uploadFailed });

    expect(fs.existsSync(temporaryUpload.path)).toBe(false);
  });

  it('retrieves and deletes existing private Blob URLs through the official SDK', async () => {
    const filePath = 'https://test.private.blob.vercel-storage.com/scfmp/7/member/11/file.pdf';
    const blobResult = { statusCode: 200, blob: { size: 4 } };
    blobClient.get.mockResolvedValue(blobResult);

    await expect(openStoredFile(filePath)).resolves.toBe(blobResult);
    expect(blobClient.get).toHaveBeenCalledWith(filePath, { access: 'private' });

    await removeStoredFile({ file_path: filePath });
    expect(blobClient.del).toHaveBeenCalledWith(filePath);
  });
});
