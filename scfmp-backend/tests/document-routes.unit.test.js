jest.mock('../middleware/authMiddleware', () => ({
  verifyToken: (req, res, next) => {
    req.user = {
      id: 1,
      role: req.get('x-test-role'),
      cooperative_id: Number(req.get('x-test-cooperative-id')) || null,
    };
    next();
  },
}));

jest.mock('../controllers/documentController', () => ({
  list: jest.fn((req, res) => res.status(200).json({ success: true })),
  classification: jest.fn((req, res) => res.status(200).json({ success: true })),
  stats: jest.fn((req, res) => res.status(200).json({ success: true })),
  upload: jest.fn(async (req, res) => {
    if (req.file?.path) await require('fs').promises.unlink(req.file.path);
    return res.status(201).json({ success: true });
  }),
  download: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateMetadata: jest.fn((req, res) => res.status(200).json({ success: true })),
  replaceFile: jest.fn((req, res) => res.status(200).json({ success: true })),
  setArchived: jest.fn((req, res) => res.status(200).json({ success: true })),
  remove: jest.fn((req, res) => res.status(200).json({ success: true })),
}));

const express = require('express');
const request = require('supertest');
const documentController = require('../controllers/documentController');
const { MAX_DOCUMENT_UPLOAD_BYTES } = require('../middleware/uploadMiddleware');
const documentRoutes = require('../routes/documentRoutes');

const app = express();
app.use(express.json());
app.use('/api/documents', documentRoutes);

const attachValidDocument = (requestBuilder) => requestBuilder
  .field('owner_type', 'member')
  .field('owner_id', '1')
  .attach('file', Buffer.from('test document'), {
    filename: 'report.pdf',
    contentType: 'application/pdf',
  });

describe('document route validation and RBAC', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(['super_admin', 'cooperative_manager', 'field_officer', 'accountant'])(
    'allows %s to upload a supported document',
    async (role) => {
      await attachValidDocument(
        request(app).post('/api/documents').set('x-test-role', role)
      ).expect(201);
      expect(documentController.upload).toHaveBeenCalledTimes(1);
    }
  );

  it.each(['farmer', 'unknown'])(
    'blocks %s before an upload reaches storage',
    async (role) => {
      await attachValidDocument(
        request(app).post('/api/documents').set('x-test-role', role)
      ).expect(403);
      expect(documentController.upload).not.toHaveBeenCalled();
    }
  );

  it('rejects an unsupported file before metadata is created', async () => {
    const response = await request(app)
      .post('/api/documents')
      .set('x-test-role', 'cooperative_manager')
      .field('owner_type', 'member')
      .field('owner_id', '1')
      .attach('file', Buffer.from('unsafe'), {
        filename: 'unsafe.exe',
        contentType: 'application/octet-stream',
      })
      .expect(400);

    expect(response.body.code).toBe('DOCUMENT_FILE_TYPE_UNSUPPORTED');
    expect(documentController.upload).not.toHaveBeenCalled();
  });

  it('rejects a file above the Vercel-safe limit before metadata is created', async () => {
    const response = await request(app)
      .post('/api/documents')
      .set('x-test-role', 'cooperative_manager')
      .field('owner_type', 'member')
      .field('owner_id', '1')
      .attach('file', Buffer.alloc(MAX_DOCUMENT_UPLOAD_BYTES + 1), {
        filename: 'large.pdf',
        contentType: 'application/pdf',
      })
      .expect(413);

    expect(response.body.code).toBe('DOCUMENT_FILE_TOO_LARGE');
    expect(documentController.upload).not.toHaveBeenCalled();
  });

  it('keeps document deletion limited to managers and Super Admin', async () => {
    await request(app).delete('/api/documents/1').set('x-test-role', 'field_officer').expect(403);
    await request(app).delete('/api/documents/1').set('x-test-role', 'accountant').expect(403);
    await request(app).delete('/api/documents/1').set('x-test-role', 'cooperative_manager').expect(200);
    await request(app).delete('/api/documents/1').set('x-test-role', 'super_admin').expect(200);
  });
});
