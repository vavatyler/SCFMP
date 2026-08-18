jest.mock('../models', () => ({
  Document: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
  Cooperative: { findByPk: jest.fn() },
  Member: { findByPk: jest.fn(), findOne: jest.fn() },
  Farmer: { findByPk: jest.fn(), findOne: jest.fn() },
  Loan: { findByPk: jest.fn(), findAll: jest.fn() },
}));

jest.mock('../services/auditService', () => ({
  recordAuditEvent: jest.fn().mockResolvedValue(null),
}));

jest.mock('../services/documentStorageService', () => ({
  STORAGE_ERROR_CODES: {
    unavailable: 'DOCUMENT_STORAGE_UNAVAILABLE',
    uploadFailed: 'DOCUMENT_STORAGE_UPLOAD_FAILED',
  },
  isBlobLocation: jest.fn((location) => location.startsWith('https://')),
  saveUploadedFile: jest.fn(),
  openStoredFile: jest.fn(),
  removeStoredFile: jest.fn(),
  unlinkIfPresent: jest.fn(),
}));

const models = require('../models');
const storage = require('../services/documentStorageService');
const controller = require('../controllers/documentController');

const createResponse = () => {
  const response = {
    statusCode: 200,
    body: null,
    headersSent: false,
    status: jest.fn((statusCode) => {
      response.statusCode = statusCode;
      return response;
    }),
    json: jest.fn((body) => {
      response.body = body;
      return response;
    }),
    download: jest.fn(),
    type: jest.fn(() => response),
    attachment: jest.fn(() => response),
    setHeader: jest.fn(),
    end: jest.fn(),
  };
  return response;
};

const uploadedFile = {
  path: 'temporary-upload.pdf',
  filename: 'unique-upload.pdf',
  originalname: 'report.pdf',
  mimetype: 'application/pdf',
  size: 2048,
};

describe('document controller storage and organization isolation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('scopes organization users to their own document records', async () => {
    models.Document.findAll.mockResolvedValue([]);
    const response = createResponse();

    await controller.list({
      user: { id: 1, role: 'cooperative_manager', cooperative_id: 7 },
      query: { cooperative_id: '99', owner_type: 'member' },
    }, response);

    expect(models.Document.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { cooperative_id: 7, owner_type: 'member' },
    }));
    expect(response.statusCode).toBe(200);
  });

  it('uses the selected organization scope for Super Admin listing', async () => {
    models.Document.findAll.mockResolvedValue([]);
    const response = createResponse();

    await controller.list({
      user: { id: 1, role: 'super_admin', cooperative_id: null },
      query: { cooperative_id: '9' },
    }, response);

    expect(models.Document.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { cooperative_id: 9 },
    }));
  });

  it('blocks a cross-organization upload before Blob storage or metadata creation', async () => {
    models.Member.findByPk.mockResolvedValue({ id: 11, cooperative_id: 8 });
    const response = createResponse();

    await controller.upload({
      file: uploadedFile,
      body: { owner_type: 'member', owner_id: '11' },
      user: { id: 1, role: 'cooperative_manager', cooperative_id: 7 },
    }, response);

    expect(response.statusCode).toBe(403);
    expect(storage.saveUploadedFile).not.toHaveBeenCalled();
    expect(models.Document.create).not.toHaveBeenCalled();
    expect(storage.unlinkIfPresent).toHaveBeenCalledWith(uploadedFile.path);
  });

  it('saves existing metadata only after a private Blob upload succeeds', async () => {
    models.Member.findByPk.mockResolvedValue({ id: 11, cooperative_id: 7 });
    storage.saveUploadedFile.mockResolvedValue({
      storedName: 'scfmp/7/member/11/unique-upload.pdf',
      filePath: 'https://store.private.blob.vercel-storage.com/scfmp/7/member/11/unique-upload.pdf',
      provider: 'blob',
    });
    const document = { id: 31, original_name: 'report.pdf' };
    models.Document.create.mockResolvedValue(document);
    const response = createResponse();

    await controller.upload({
      file: uploadedFile,
      body: { owner_type: 'member', owner_id: '11', description: 'Quarterly report' },
      user: { id: 5, role: 'cooperative_manager', cooperative_id: 7 },
    }, response);

    expect(models.Document.create).toHaveBeenCalledWith(expect.objectContaining({
      cooperative_id: 7,
      owner_type: 'member',
      owner_id: 11,
      original_name: 'report.pdf',
      stored_name: 'scfmp/7/member/11/unique-upload.pdf',
      uploaded_by: 5,
    }));
    expect(response.statusCode).toBe(201);
    expect(response.body.data).toBe(document);
  });

  it('returns a safe service-unavailable response for missing Blob configuration', async () => {
    models.Member.findByPk.mockResolvedValue({ id: 11, cooperative_id: 7 });
    storage.saveUploadedFile.mockRejectedValue(Object.assign(
      new Error('Document storage is unavailable.'),
      { code: storage.STORAGE_ERROR_CODES.unavailable }
    ));
    const response = createResponse();

    await controller.upload({
      file: uploadedFile,
      body: { owner_type: 'member', owner_id: '11' },
      user: { id: 1, role: 'cooperative_manager', cooperative_id: 7 },
    }, response);

    expect(response.statusCode).toBe(503);
    expect(response.body.code).toBe('DOCUMENT_STORAGE_UNAVAILABLE');
    expect(response.body).not.toHaveProperty('stack');
  });

  it('removes an uploaded Blob when metadata persistence fails', async () => {
    models.Member.findByPk.mockResolvedValue({ id: 11, cooperative_id: 7 });
    const storedFile = {
      storedName: 'scfmp/7/member/11/unique-upload.pdf',
      filePath: 'https://store.private.blob.vercel-storage.com/scfmp/7/member/11/unique-upload.pdf',
    };
    storage.saveUploadedFile.mockResolvedValue(storedFile);
    models.Document.create.mockRejectedValue(new Error('database unavailable'));
    const response = createResponse();

    await controller.upload({
      file: uploadedFile,
      body: { owner_type: 'member', owner_id: '11' },
      user: { id: 1, role: 'cooperative_manager', cooperative_id: 7 },
    }, response);

    expect(storage.removeStoredFile).toHaveBeenCalledWith({ file_path: storedFile.filePath });
    expect(response.statusCode).toBe(500);
    expect(response.body.code).toBe('DOCUMENT_METADATA_SAVE_FAILED');
  });

  it('blocks cross-organization downloads and preserves legacy local download handling', async () => {
    models.Document.findByPk.mockResolvedValueOnce({
      id: 31,
      cooperative_id: 8,
      file_path: 'https://store.private.blob.vercel-storage.com/other.pdf',
    });
    const blockedResponse = createResponse();
    await controller.download({
      params: { id: '31' },
      user: { id: 1, role: 'cooperative_manager', cooperative_id: 7 },
    }, blockedResponse);
    expect(blockedResponse.statusCode).toBe(403);
    expect(storage.openStoredFile).not.toHaveBeenCalled();

    models.Document.findByPk.mockResolvedValueOnce({
      id: 32,
      cooperative_id: 7,
      file_path: 'uploads/legacy.pdf',
      original_name: 'legacy.pdf',
    });
    const legacyResponse = createResponse();
    await controller.download({
      params: { id: '32' },
      user: { id: 1, role: 'cooperative_manager', cooperative_id: 7 },
    }, legacyResponse);
    expect(legacyResponse.download).toHaveBeenCalledWith('uploads/legacy.pdf', 'legacy.pdf');
  });
});
