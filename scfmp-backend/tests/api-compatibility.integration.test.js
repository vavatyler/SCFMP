const express = require('express');
const request = require('supertest');
const { buildTestDb } = require('./testDbHelper');

const mockModels = {};

jest.mock('../models', () => mockModels);
jest.mock('../middleware/authMiddleware', () => ({
  verifyToken: (req, res, next) => {
    const role = req.get('x-test-role');
    if (!role) return res.status(401).json({ success: false, message: 'No token provided' });
    req.user = {
      id: 101,
      role,
      cooperative_id: Number(req.get('x-test-cooperative-id')) || null,
      first_name: 'API',
      last_name: 'Tester',
      preferred_language: 'en',
    };
    return next();
  },
}));
jest.mock('../services/auditService', () => ({
  recordAuditEvent: jest.fn().mockResolvedValue(null),
}));
jest.mock('../services/documentStorageService', () => ({
  STORAGE_ERROR_CODES: {
    unavailable: 'DOCUMENT_STORAGE_UNAVAILABLE',
    uploadFailed: 'DOCUMENT_STORAGE_UPLOAD_FAILED',
  },
  isBlobLocation: jest.fn((location) => String(location).startsWith('https://')),
  saveUploadedFile: jest.fn(async (file, context) => {
    await require('fs').promises.unlink(file.path);
    return {
      storedName: `scfmp/${context.cooperativeId}/${context.ownerType}/${context.ownerId}/compatibility.pdf`,
      filePath: 'https://private.example.test/compatibility.pdf',
    };
  }),
  openStoredFile: jest.fn(async () => ({
    statusCode: 200,
    blob: { contentType: 'application/pdf', size: 3 },
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue(Uint8Array.from([80, 68, 70]));
        controller.close();
      },
    }),
  })),
  removeStoredFile: jest.fn().mockResolvedValue(undefined),
  unlinkIfPresent: jest.fn(async (filePath) => {
    await require('fs').promises.unlink(filePath).catch(() => {});
  }),
}));

const authHeaders = (role, cooperativeId = null) => {
  const headers = { 'x-test-role': role };
  if (cooperativeId) headers['x-test-cooperative-id'] = String(cooperativeId);
  return headers;
};

const withHeaders = (requestBuilder, headers) => {
  Object.entries(headers).forEach(([name, value]) => requestBuilder.set(name, value));
  return requestBuilder;
};

describe('Tasks 1-15 API compatibility matrix', () => {
  let app;
  let sequelize;
  let models;
  let organizationA;
  let organizationB;
  let memberA;
  let memberB;
  let legacyFarmer;
  let otherOrganizationFarmer;
  let legacyDocument;

  beforeAll(async () => {
    ({ sequelize, models } = await buildTestDb());
    Object.assign(mockModels, models, { sequelize });

    organizationA = await models.Cooperative.create({
      name: 'Compatibility Organization A',
      organization_type: 'cooperative',
    });
    organizationB = await models.Cooperative.create({
      name: 'Compatibility Organization B',
      organization_type: 'association',
    });
    await models.User.create({
      id: 101,
      cooperative_id: organizationA.id,
      first_name: 'API',
      last_name: 'Tester',
      email: 'api-compatibility@example.test',
      password_hash: 'TestPassword1',
      role: 'cooperative_manager',
    }, { hooks: false });
    memberA = await models.Member.create({
      cooperative_id: organizationA.id,
      first_name: 'Legacy',
      last_name: 'Member',
    });
    memberB = await models.Member.create({
      cooperative_id: organizationB.id,
      first_name: 'Other',
      last_name: 'Member',
    });
    legacyFarmer = await models.Farmer.create({
      member_id: memberA.id,
      crop_type: 'Tea',
      location: 'Legacy free-text location',
    });
    otherOrganizationFarmer = await models.Farmer.create({
      member_id: memberB.id,
      crop_type: 'Potatoes',
      location: 'Other organization location',
    });
    legacyDocument = await models.Document.create({
      cooperative_id: organizationA.id,
      owner_type: 'member',
      owner_id: memberA.id,
      title: 'Legacy document',
      category: 'other',
      document_type: 'other',
      original_name: 'legacy.pdf',
      stored_name: 'legacy.pdf',
      file_path: 'https://private.example.test/legacy.pdf',
      mime_type: 'application/pdf',
      file_size: 3,
      uploaded_by: 101,
    });

    app = express();
    app.use(express.json());
    app.use('/api/auth', require('../routes/authRoutes'));
    app.use('/api/cooperatives', require('../routes/cooperativeRoutes'));
    app.use('/api/members', require('../routes/memberRoutes'));
    app.use('/api/farmers', require('../routes/farmerRoutes'));
    app.use('/api/locations', require('../routes/locationRoutes'));
    app.use('/api/documents', require('../routes/documentRoutes'));
    app.use('/api/reports', require('../routes/reportRoutes'));
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('preserves authentication and the /api/cooperatives route family', async () => {
    await request(app).get('/api/cooperatives').expect(401);
    await request(app).get('/api/organizations').expect(404);

    const listResponse = await withHeaders(
      request(app).get('/api/cooperatives'),
      authHeaders('super_admin')
    ).expect(200);
    expect(listResponse.body).toEqual(expect.objectContaining({
      success: true,
      data: expect.any(Array),
    }));

    const ownResponse = await withHeaders(
      request(app).get(`/api/cooperatives/${organizationA.id}`),
      authHeaders('cooperative_manager', organizationA.id)
    ).expect(200);
    expect(ownResponse.body.data.id).toBe(organizationA.id);

    await withHeaders(
      request(app).get(`/api/cooperatives/${organizationB.id}`),
      authHeaders('cooperative_manager', organizationA.id)
    ).expect(403);
  });

  it('supports old and new organization payloads without changing response envelopes', async () => {
    const oldPayloadResponse = await withHeaders(
      request(app).post('/api/cooperatives'),
      authHeaders('super_admin')
    ).send({ name: 'Old Client Organization' }).expect(201);
    expect(oldPayloadResponse.body).toEqual(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        name: 'Old Client Organization',
        organization_type: 'cooperative',
      }),
    }));

    const newPayloadResponse = await withHeaders(
      request(app).post('/api/cooperatives'),
      authHeaders('super_admin')
    ).send({
      name: 'New Client SME',
      organization_type: 'sme',
      registration_number: 'SME-COMPAT-01',
      district: 'Nyamagabe',
      sector: 'Buruhukiro',
      cell: 'Bushigishigi',
      phone: '0789329052',
      email: 'sme@example.test',
    }).expect(201);
    expect(newPayloadResponse.body.data).toEqual(expect.objectContaining({
      organization_type: 'sme',
      registration_number: 'SME-COMPAT-01',
      phone: '+250789329052',
      email: 'sme@example.test',
    }));

    const updated = await withHeaders(
      request(app).put(`/api/cooperatives/${organizationA.id}`),
      authHeaders('cooperative_manager', organizationA.id)
    ).send({ name: 'Compatibility Organization A Updated' }).expect(200);
    expect(updated.body.data).toEqual(expect.objectContaining({
      id: organizationA.id,
      name: 'Compatibility Organization A Updated',
    }));

    const invalid = await withHeaders(
      request(app).post('/api/cooperatives'),
      authHeaders('super_admin')
    ).send({ name: 'Invalid Organization', organization_type: 'company' }).expect(422);
    expect(invalid.body).toEqual(expect.objectContaining({
      success: false,
      message: 'Validation failed',
      errors: expect.arrayContaining([expect.objectContaining({ field: 'organization_type' })]),
    }));

    await withHeaders(
      request(app).delete(`/api/cooperatives/${oldPayloadResponse.body.data.id}`),
      authHeaders('super_admin')
    ).expect(200);
  });

  it('preserves member list, detail, old create, new create, and update contracts', async () => {
    const scopedList = await withHeaders(
      request(app).get('/api/members').query({ cooperative_id: organizationB.id }),
      authHeaders('cooperative_manager', organizationA.id)
    ).expect(200);
    expect(scopedList.body).toEqual(expect.objectContaining({
      success: true,
      data: expect.any(Array),
      pagination: expect.objectContaining({ total: expect.any(Number) }),
    }));
    expect(scopedList.body.data.every((member) => member.cooperative_id === organizationA.id)).toBe(true);

    const detail = await withHeaders(
      request(app).get(`/api/members/${memberA.id}`),
      authHeaders('cooperative_manager', organizationA.id)
    ).expect(200);
    expect(detail.body.data.id).toBe(memberA.id);

    const oldMember = await withHeaders(
      request(app).post('/api/members'),
      authHeaders('cooperative_manager', organizationA.id)
    ).send({ first_name: 'Old', last_name: 'Client' }).expect(201);
    expect(oldMember.body.data).toEqual(expect.objectContaining({
      first_name: 'Old',
      last_name: 'Client',
      cooperative_id: organizationA.id,
    }));

    const newMember = await withHeaders(
      request(app).post('/api/members'),
      authHeaders('cooperative_manager', organizationA.id)
    ).send({
      first_name: 'New',
      last_name: 'Client',
      gender: 'female',
      phone: '789329052',
      address: 'Kigali',
      membership_date: '2026-08-18',
    }).expect(201);
    expect(newMember.body.data).toEqual(expect.objectContaining({
      phone: '+250789329052',
      address: 'Kigali',
      membership_date: '2026-08-18',
    }));

    const updated = await withHeaders(
      request(app).put(`/api/members/${newMember.body.data.id}`),
      authHeaders('cooperative_manager', organizationA.id)
    ).send({ address: 'Musanze', cooperative_id: organizationB.id }).expect(200);
    expect(updated.body.data).toEqual(expect.objectContaining({
      id: newMember.body.data.id,
      cooperative_id: organizationA.id,
      address: 'Musanze',
    }));
  });

  it('preserves legacy farmer locations and accepts new structured locations', async () => {
    const legacyMember = await models.Member.create({
      cooperative_id: organizationA.id,
      first_name: 'Farmer',
      last_name: 'Legacy Client',
    });
    const legacyCreate = await withHeaders(
      request(app).post('/api/farmers'),
      authHeaders('field_officer', organizationA.id)
    ).send({
      member_id: legacyMember.id,
      crop_type: 'Coffee',
      location: 'Older client free-text location',
    }).expect(201);
    expect(legacyCreate.body.data).toEqual(expect.objectContaining({
      member_id: legacyMember.id,
      location: 'Older client free-text location',
    }));
    const storedLegacyFarmer = await models.Farmer.findByPk(legacyCreate.body.data.id);
    expect(storedLegacyFarmer).toEqual(expect.objectContaining({
      district: null,
      sector: null,
      cell: null,
      village: null,
    }));

    const structuredMember = await models.Member.create({
      cooperative_id: organizationA.id,
      first_name: 'Farmer',
      last_name: 'New Client',
    });
    const structuredCreate = await withHeaders(
      request(app).post('/api/farmers'),
      authHeaders('field_officer', organizationA.id)
    ).send({
      member_id: structuredMember.id,
      crop_type: 'Coffee',
      farm_size_ha: '2.75',
      district: 'Nyamagabe',
      sector: 'Buruhukiro',
      cell: 'Bushigishigi',
      village: 'Giharayumbu',
    }).expect(201);
    expect(structuredCreate.body.data).toEqual(expect.objectContaining({
      member_id: structuredMember.id,
      district: 'Nyamagabe',
      sector: 'Buruhukiro',
      cell: 'Bushigishigi',
      village: 'Giharayumbu',
      location: 'Giharayumbu, Bushigishigi, Buruhukiro, Nyamagabe',
    }));

    const updatedLegacy = await withHeaders(
      request(app).put(`/api/farmers/${legacyFarmer.id}`),
      authHeaders('cooperative_manager', organizationA.id)
    ).send({ crop_type: 'Coffee' }).expect(200);
    expect(updatedLegacy.body.data).toEqual(expect.objectContaining({
      id: legacyFarmer.id,
      member_id: memberA.id,
      crop_type: 'Coffee',
      location: 'Legacy free-text location',
    }));

    const scopedList = await withHeaders(
      request(app).get('/api/farmers').query({ cooperative_id: organizationB.id }),
      authHeaders('cooperative_manager', organizationA.id)
    ).expect(200);
    expect(scopedList.body.data.every(
      (farmer) => farmer.member.cooperative_id === organizationA.id
    )).toBe(true);

    const ownDetail = await withHeaders(
      request(app).get(`/api/farmers/${legacyFarmer.id}`),
      authHeaders('cooperative_manager', organizationA.id)
    ).expect(200);
    expect(ownDetail.body.data.id).toBe(legacyFarmer.id);

    await withHeaders(
      request(app).get(`/api/farmers/${otherOrganizationFarmer.id}`),
      authHeaders('cooperative_manager', organizationA.id)
    ).expect(403);
  });

  it('keeps the authenticated Rwanda location query contract stable', async () => {
    const headers = authHeaders('cooperative_manager', organizationA.id);
    const districts = await withHeaders(request(app).get('/api/locations/districts'), headers).expect(200);
    expect(districts.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Nyamagabe' }),
    ]));

    const sectors = await withHeaders(
      request(app).get('/api/locations/sectors').query({ district: 'Nyamagabe' }),
      headers
    ).expect(200);
    expect(sectors.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Buruhukiro' }),
    ]));

    const cells = await withHeaders(
      request(app).get('/api/locations/cells').query({
        district: 'Nyamagabe',
        sector: 'Buruhukiro',
      }),
      headers
    ).expect(200);
    expect(cells.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Bushigishigi' }),
    ]));

    const villages = await withHeaders(
      request(app).get('/api/locations/villages').query({
        district: 'Nyamagabe',
        sector: 'Buruhukiro',
        cell: 'Bushigishigi',
      }),
      headers
    ).expect(200);
    expect(villages.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Giharayumbu' }),
    ]));
  });

  it('preserves document list, upload metadata, and authenticated download behavior', async () => {
    const headers = authHeaders('cooperative_manager', organizationA.id);
    const listResponse = await withHeaders(
      request(app).get('/api/documents').query({ cooperative_id: organizationB.id }),
      headers
    ).expect(200);
    expect(listResponse.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: legacyDocument.id, cooperative_id: organizationA.id }),
    ]));

    const uploadResponse = await withHeaders(request(app).post('/api/documents'), headers)
      .field('owner_type', 'member')
      .field('owner_id', String(memberA.id))
      .field('description', 'Compatibility upload')
      .attach('file', Buffer.from('PDF'), {
        filename: 'compatibility.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    expect(uploadResponse.body.data).toEqual(expect.objectContaining({
      cooperative_id: organizationA.id,
      owner_type: 'member',
      owner_id: memberA.id,
      original_name: 'compatibility.pdf',
      description: 'Compatibility upload',
    }));

    const downloadResponse = await withHeaders(
      request(app).get(`/api/documents/${legacyDocument.id}/download`),
      headers
    ).expect(200);
    expect(downloadResponse.headers['content-type']).toMatch(/application\/pdf/);
    expect(downloadResponse.headers['content-disposition']).toContain('legacy.pdf');
    expect(downloadResponse.headers['cache-control']).toBe('private, no-store');
  });

  it('preserves report filters and the JSON/CSV data-source contracts', async () => {
    const headers = authHeaders('cooperative_manager', organizationA.id);
    const jsonResponse = await withHeaders(
      request(app).get('/api/reports/members').query({
        format: 'json',
        language: 'en',
        cooperative_id: organizationB.id,
      }),
      headers
    ).expect(200);
    expect(jsonResponse.body).toEqual(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        metadata: expect.objectContaining({
          module: 'members',
          cooperative: 'Compatibility Organization A Updated',
        }),
        columns: expect.arrayContaining([expect.objectContaining({ key: 'cooperative' })]),
        rows: expect.any(Array),
      }),
    }));
    expect(jsonResponse.body.data.rows.every(
      (row) => row.cooperative === 'Compatibility Organization A Updated'
    )).toBe(true);

    const csvResponse = await withHeaders(
      request(app).get('/api/reports/members').query({ format: 'csv', language: 'en' }),
      headers
    ).expect(200);
    expect(csvResponse.headers['content-type']).toMatch(/text\/csv/);
    expect(csvResponse.text).toContain('Members Report');
    expect(csvResponse.text).toContain('Organization');
  });

  it('keeps the dashboard greeting profile source additive and stable', async () => {
    const response = await withHeaders(
      request(app).get('/api/auth/me'),
      authHeaders('cooperative_manager', organizationA.id)
    ).expect(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        id: 101,
        role: 'cooperative_manager',
        cooperative_id: organizationA.id,
        first_name: 'API',
        last_name: 'Tester',
        preferred_language: 'en',
      },
    });
  });
});
