const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { buildTestDb } = require('./testDbHelper');

const mockModels = {};

jest.mock('../models', () => mockModels);
jest.mock('../services/documentStorageService', () => ({
  STORAGE_ERROR_CODES: {
    unavailable: 'DOCUMENT_STORAGE_UNAVAILABLE',
    uploadFailed: 'DOCUMENT_STORAGE_UPLOAD_FAILED',
  },
  isBlobLocation: jest.fn(() => true),
  saveUploadedFile: jest.fn(),
  openStoredFile: jest.fn(),
  removeStoredFile: jest.fn(),
  unlinkIfPresent: jest.fn(),
}));

const TEST_JWT_SECRET = 'task-17-access-secret-for-isolated-tests';
const TEST_REFRESH_SECRET = 'task-17-refresh-secret-for-isolated-tests';
const previousEnvironment = {
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,
};

process.env.JWT_SECRET = TEST_JWT_SECRET;
process.env.JWT_REFRESH_SECRET = TEST_REFRESH_SECRET;
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

const withBearer = (builder, token) => builder.set('Authorization', `Bearer ${token}`);

describe('Task 17 authentication, RBAC, and organization isolation', () => {
  let app;
  let sequelize;
  let models;
  let organizationA;
  let organizationB;
  let superAdmin;
  let managerA;
  let accountantA;
  let fieldOfficerA;
  let farmerUserA;
  let memberA;
  let memberB;
  let farmerA;
  let farmerB;
  let productionA;
  let productionB;
  let transactionA;
  let transactionB;
  let inventoryA;
  let inventoryB;
  let documentA;
  let documentB;

  const accessTokenFor = (user, expiresIn = '15m') => jwt.sign({
    id: user.id,
    role: user.role,
    cooperative_id: user.cooperative_id,
    token_version: user.token_version,
    type: 'access',
  }, TEST_JWT_SECRET, {
    expiresIn,
    issuer: 'scfmp-api',
    audience: 'scfmp-web',
  });

  beforeAll(async () => {
    ({ sequelize, models } = await buildTestDb());
    Object.assign(mockModels, models, { sequelize });

    organizationA = await models.Cooperative.create({ name: 'Security Organization A' });
    organizationB = await models.Cooperative.create({ name: 'Security Organization B' });

    managerA = await models.User.create({
      cooperative_id: organizationA.id,
      first_name: 'Manager',
      last_name: 'Alpha',
      email: 'manager-alpha@security.test',
      password_hash: 'SecureLogin123',
      role: 'cooperative_manager',
    });
    const createTestUser = (values) => models.User.create({
      first_name: values.first_name,
      last_name: 'Security',
      email: values.email,
      password_hash: 'not-used-by-these-tests',
      role: values.role,
      cooperative_id: values.cooperative_id ?? null,
    }, { hooks: false });
    superAdmin = await createTestUser({
      first_name: 'Super', email: 'super@security.test', role: 'super_admin',
    });
    accountantA = await createTestUser({
      first_name: 'Accountant', email: 'accountant@security.test', role: 'accountant',
      cooperative_id: organizationA.id,
    });
    fieldOfficerA = await createTestUser({
      first_name: 'Field', email: 'field@security.test', role: 'field_officer',
      cooperative_id: organizationA.id,
    });
    farmerUserA = await createTestUser({
      first_name: 'Farmer', email: 'farmer@security.test', role: 'farmer',
      cooperative_id: organizationA.id,
    });

    memberA = await models.Member.create({
      cooperative_id: organizationA.id,
      user_id: farmerUserA.id,
      first_name: 'Farmer',
      last_name: 'Alpha',
    });
    await models.Member.create({
      cooperative_id: organizationA.id,
      first_name: 'Other',
      last_name: 'Alpha',
    });
    memberB = await models.Member.create({
      cooperative_id: organizationB.id,
      first_name: 'Member',
      last_name: 'Beta',
    });
    farmerA = await models.Farmer.create({ member_id: memberA.id, crop_type: 'Coffee' });
    farmerB = await models.Farmer.create({ member_id: memberB.id, crop_type: 'Maize' });

    const productA = await models.Product.create({ cooperative_id: organizationA.id, name: 'Coffee' });
    const productB = await models.Product.create({ cooperative_id: organizationB.id, name: 'Maize' });
    productionA = await models.Production.create({
      cooperative_id: organizationA.id,
      farmer_id: farmerA.id,
      product_id: productA.id,
      product_name: productA.name,
      quantity: 10,
      unit_price: 500,
      production_date: '2026-08-01',
    });
    productionB = await models.Production.create({
      cooperative_id: organizationB.id,
      farmer_id: farmerB.id,
      product_id: productB.id,
      product_name: productB.name,
      quantity: 20,
      unit_price: 300,
      production_date: '2026-08-02',
    });
    transactionA = await models.Transaction.create({
      cooperative_id: organizationA.id,
      member_id: memberA.id,
      type: 'income',
      amount: 5000,
      transaction_date: '2026-08-01',
      recorded_by: managerA.id,
    });
    transactionB = await models.Transaction.create({
      cooperative_id: organizationB.id,
      member_id: memberB.id,
      type: 'expense',
      amount: 2000,
      transaction_date: '2026-08-02',
    });
    inventoryA = await models.InventoryItem.create({
      cooperative_id: organizationA.id,
      item_name: 'Seed A',
      unit: 'kg',
    });
    inventoryB = await models.InventoryItem.create({
      cooperative_id: organizationB.id,
      item_name: 'Seed B',
      unit: 'kg',
    });
    documentA = await models.Document.create({
      cooperative_id: organizationA.id,
      owner_type: 'member',
      owner_id: memberA.id,
      original_name: 'alpha.pdf',
      stored_name: 'alpha.pdf',
      file_path: 'https://private.example.test/alpha.pdf',
    });
    documentB = await models.Document.create({
      cooperative_id: organizationB.id,
      owner_type: 'member',
      owner_id: memberB.id,
      original_name: 'beta.pdf',
      stored_name: 'beta.pdf',
      file_path: 'https://private.example.test/beta.pdf',
    });

    app = express();
    app.use(express.json());
    app.use('/api/auth', require('../routes/authRoutes'));
    app.use('/api/cooperatives', require('../routes/cooperativeRoutes'));
    app.use('/api/members', require('../routes/memberRoutes'));
    app.use('/api/farmers', require('../routes/farmerRoutes'));
    app.use('/api/production', require('../routes/productionRoutes'));
    app.use('/api/transactions', require('../routes/transactionRoutes'));
    app.use('/api/loans', require('../routes/loanRoutes'));
    app.use('/api/inventory', require('../routes/inventoryRoutes'));
    app.use('/api/reports', require('../routes/reportRoutes'));
    app.use('/api/documents', require('../routes/documentRoutes'));
  });

  afterAll(async () => {
    await sequelize.close();
    Object.entries(previousEnvironment).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  });

  it('preserves valid/invalid login, persistence, refresh rotation, logout, and invalid-session handling', async () => {
    await request(app).post('/api/auth/login').send({
      email: managerA.email,
      password: 'wrong-password',
    }).expect(401);

    const login = await request(app).post('/api/auth/login').send({
      email: managerA.email,
      password: 'SecureLogin123',
    }).expect(200);
    expect(login.body.data.user.password_hash).toBeUndefined();

    const persistedSession = await withBearer(
      request(app).get('/api/auth/me'),
      login.body.data.accessToken
    ).expect(200);
    expect(persistedSession.body.data.first_name).toBe('Manager');

    const rotated = await request(app).post('/api/auth/refresh').send({
      refreshToken: login.body.data.refreshToken,
    }).expect(200);
    await withBearer(request(app).get('/api/auth/me'), rotated.body.data.accessToken).expect(200);

    await withBearer(request(app).post('/api/auth/logout'), rotated.body.data.accessToken)
      .send({ refreshToken: rotated.body.data.refreshToken })
      .expect(200);
    await request(app).post('/api/auth/refresh').send({
      refreshToken: rotated.body.data.refreshToken,
    }).expect(401);

    await withBearer(request(app).get('/api/auth/me'), 'not-a-jwt').expect(401);
    await withBearer(request(app).get('/api/auth/me'), accessTokenFor(managerA, -1)).expect(401);
  });

  it.each([
    '/api/cooperatives',
    '/api/members',
    '/api/farmers',
    '/api/production',
    '/api/transactions',
    '/api/loans',
    '/api/inventory',
    '/api/reports/members',
    '/api/documents',
  ])('rejects unauthenticated access to %s', async (path) => {
    await request(app).get(path).expect(401);
  });

  it('enforces Super Admin organization access and rejects manipulated manager switching/CRUD', async () => {
    const superToken = accessTokenFor(superAdmin);
    const managerToken = accessTokenFor(managerA);

    const allOrganizations = await withBearer(request(app).get('/api/cooperatives'), superToken).expect(200);
    expect(allOrganizations.body.data).toHaveLength(2);
    await withBearer(request(app).get('/api/cooperatives'), managerToken).expect(403);
    await withBearer(request(app).get(`/api/cooperatives/${organizationA.id}`), managerToken).expect(200);
    await withBearer(request(app).get(`/api/cooperatives/${organizationB.id}`), managerToken).expect(403);
    await withBearer(request(app).post('/api/cooperatives'), managerToken)
      .send({ name: 'Unauthorized Organization' })
      .expect(403);
    await withBearer(request(app).delete(`/api/cooperatives/${organizationB.id}`), managerToken).expect(403);

    await withBearer(request(app).post('/api/cooperatives'), superToken)
      .send({ name: 'Invalid Type', organization_type: 'unsupported' })
      .expect(422);

    await withBearer(request(app).post('/api/auth/register'), managerToken)
      .send({
        first_name: 'Escalation',
        last_name: 'Attempt',
        email: 'escalation-attempt@security.test',
        password: 'StrongPassword123',
        role: 'super_admin',
        cooperative_id: organizationB.id,
      })
      .expect(403);
  });

  it('matches the existing write-role matrix across protected modules', async () => {
    const usersByRole = {
      super_admin: superAdmin,
      cooperative_manager: managerA,
      accountant: accountantA,
      field_officer: fieldOfficerA,
      farmer: farmerUserA,
    };
    const writeMatrix = [
      { path: '/api/cooperatives', roles: ['super_admin'] },
      { path: '/api/members', roles: ['super_admin', 'cooperative_manager', 'field_officer'] },
      { path: '/api/farmers', roles: ['super_admin', 'cooperative_manager', 'field_officer'] },
      { path: '/api/production', roles: ['super_admin', 'cooperative_manager', 'field_officer'] },
      { path: '/api/transactions', roles: ['super_admin', 'cooperative_manager', 'accountant'] },
      { path: '/api/inventory', roles: ['super_admin', 'cooperative_manager', 'field_officer'] },
      { path: '/api/documents', roles: ['super_admin', 'cooperative_manager', 'accountant', 'field_officer'] },
    ];

    for (const { path, roles } of writeMatrix) {
      for (const [role, user] of Object.entries(usersByRole)) {
        const response = await withBearer(request(app).post(path), accessTokenFor(user)).send({});
        expect(response.status === 403).toBe(!roles.includes(role));
      }
    }
  });

  it('keeps Member and Farmer IDs, writes, location data, and client organization IDs scoped', async () => {
    const managerToken = accessTokenFor(managerA);
    const farmerToken = accessTokenFor(farmerUserA);

    const members = await withBearer(
      request(app).get('/api/members').query({ cooperative_id: organizationB.id }),
      managerToken
    ).expect(200);
    expect(members.body.data.every((member) => member.cooperative_id === organizationA.id)).toBe(true);
    await withBearer(request(app).get(`/api/members/${memberB.id}`), managerToken).expect(403);
    await withBearer(request(app).put(`/api/members/${memberB.id}`), managerToken)
      .send({ first_name: 'Manipulated' })
      .expect(403);

    const createdMember = await withBearer(request(app).post('/api/members'), managerToken)
      .send({
        cooperative_id: organizationB.id,
        first_name: 'Scoped',
        last_name: 'Member',
      })
      .expect(201);
    expect(createdMember.body.data.cooperative_id).toBe(organizationA.id);

    const farmers = await withBearer(
      request(app).get('/api/farmers').query({ cooperative_id: organizationB.id }),
      managerToken
    ).expect(200);
    expect(farmers.body.data.every(
      (farmer) => farmer.member.cooperative_id === organizationA.id
    )).toBe(true);
    await withBearer(request(app).get(`/api/farmers/${farmerB.id}`), managerToken).expect(403);
    await withBearer(request(app).put(`/api/farmers/${farmerB.id}`), managerToken)
      .send({ crop_type: 'Manipulated' })
      .expect(403);
    await withBearer(request(app).post('/api/farmers'), managerToken)
      .send({ member_id: memberB.id, crop_type: 'Manipulated' })
      .expect(403);

    await withBearer(request(app).post('/api/farmers'), managerToken)
      .send({
        member_id: createdMember.body.data.id,
        district: 'Nyamagabe',
        sector: 'Kacyiru',
        cell: 'Kamutwa',
        village: 'Kamutwa',
      })
      .expect(422);

    const farmerMembers = await withBearer(request(app).get('/api/members'), farmerToken).expect(200);
    expect(farmerMembers.body.data.map((member) => member.id)).toEqual([memberA.id]);
    await withBearer(request(app).get(`/api/members/${memberB.id}`), farmerToken).expect(403);
  });

  it('enforces Production, Finance, and Inventory scopes and write-role boundaries', async () => {
    const superToken = accessTokenFor(superAdmin);
    const managerToken = accessTokenFor(managerA);
    const accountantToken = accessTokenFor(accountantA);
    const fieldToken = accessTokenFor(fieldOfficerA);
    const farmerToken = accessTokenFor(farmerUserA);

    const production = await withBearer(
      request(app).get('/api/production').query({ cooperative_id: organizationB.id }),
      managerToken
    ).expect(200);
    expect(production.body.data.map((record) => record.id)).toEqual([productionA.id]);
    await withBearer(request(app).get(`/api/production/${productionB.id}`), managerToken).expect(403);
    await withBearer(request(app).put(`/api/production/${productionB.id}`), managerToken)
      .send({ quantity: 99 })
      .expect(403);
    await withBearer(request(app).post('/api/production'), accountantToken)
      .send({ farmer_id: farmerA.id, product_name: 'Coffee', quantity: 1, unit_price: 1, production_date: '2026-08-10' })
      .expect(403);

    const transactions = await withBearer(
      request(app).get('/api/transactions').query({ cooperative_id: organizationB.id }),
      managerToken
    ).expect(200);
    expect(transactions.body.data.map((record) => record.id)).toEqual([transactionA.id]);
    await withBearer(request(app).get(`/api/transactions/${transactionB.id}`), managerToken).expect(403);
    await withBearer(request(app).put(`/api/transactions/${transactionB.id}`), managerToken)
      .send({ amount: 1 })
      .expect(403);
    await withBearer(request(app).put(`/api/transactions/${transactionA.id}`), managerToken)
      .send({ member_id: memberB.id })
      .expect(400);
    await withBearer(request(app).put(`/api/transactions/${transactionA.id}`), managerToken)
      .send({ description: 'Allowed correction', recorded_by: superAdmin.id, id: 999 })
      .expect(200);
    const protectedTransaction = await models.Transaction.findByPk(transactionA.id);
    expect(protectedTransaction.recorded_by).toBe(managerA.id);
    expect(protectedTransaction.description).toBe('Allowed correction');
    await withBearer(request(app).post('/api/transactions'), fieldToken)
      .send({ type: 'income', amount: 1, transaction_date: '2026-08-10' })
      .expect(403);

    const farmerTransactions = await withBearer(request(app).get('/api/transactions'), farmerToken).expect(200);
    expect(farmerTransactions.body.data.map((record) => record.id)).toEqual([transactionA.id]);

    const inventory = await withBearer(
      request(app).get('/api/inventory').query({ cooperative_id: organizationB.id }),
      managerToken
    ).expect(200);
    expect(inventory.body.data.map((item) => item.id)).toEqual([inventoryA.id]);
    await withBearer(request(app).get(`/api/inventory/${inventoryB.id}`), managerToken).expect(403);
    await withBearer(request(app).put(`/api/inventory/${inventoryB.id}`), managerToken)
      .send({ item_name: 'Manipulated' })
      .expect(403);
    await withBearer(request(app).put(`/api/inventory/${inventoryA.id}`), accountantToken)
      .send({ item_name: 'Manipulated' })
      .expect(403);

    await withBearer(request(app).get(`/api/production/${productionB.id}`), superToken).expect(200);
    await withBearer(request(app).get(`/api/transactions/${transactionB.id}`), superToken).expect(200);
    await withBearer(request(app).get(`/api/inventory/${inventoryB.id}`), superToken).expect(200);
  });

  it('keeps Reports and Documents scoped, including Farmer ownership and direct document IDs', async () => {
    const superToken = accessTokenFor(superAdmin);
    const managerToken = accessTokenFor(managerA);
    const farmerToken = accessTokenFor(farmerUserA);

    const managerReport = await withBearer(
      request(app).get('/api/reports/members').query({
        format: 'json',
        cooperative_id: organizationB.id,
      }),
      managerToken
    ).expect(200);
    expect(managerReport.body.data.rows.every(
      (row) => row.cooperative === organizationA.name
    )).toBe(true);

    const superReport = await withBearer(
      request(app).get('/api/reports/members').query({
        format: 'json',
        cooperative_id: organizationB.id,
      }),
      superToken
    ).expect(200);
    expect(superReport.body.data.rows.map((row) => row.cooperative)).toEqual([organizationB.name]);

    const managerDocuments = await withBearer(
      request(app).get('/api/documents').query({ cooperative_id: organizationB.id }),
      managerToken
    ).expect(200);
    expect(managerDocuments.body.data.map((document) => document.id)).toEqual([documentA.id]);
    await withBearer(request(app).get(`/api/documents/${documentB.id}/download`), managerToken).expect(403);

    const farmerDocuments = await withBearer(request(app).get('/api/documents'), farmerToken).expect(200);
    expect(farmerDocuments.body.data.map((document) => document.id)).toEqual([documentA.id]);
    await withBearer(request(app).get(`/api/documents/${documentB.id}/download`), farmerToken).expect(403);
    await withBearer(request(app).delete(`/api/documents/${documentA.id}`), farmerToken).expect(403);
  });
});
