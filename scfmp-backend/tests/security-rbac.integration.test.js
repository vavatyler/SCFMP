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
  let productA;
  let productB;
  let productionA;
  let productionB;
  let productionBLinkedToA;
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

    productA = await models.Product.create({ cooperative_id: organizationA.id, name: 'Coffee' });
    productB = await models.Product.create({ cooperative_id: organizationB.id, name: 'Maize' });
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
    productionBLinkedToA = await models.Production.create({
      cooperative_id: organizationB.id,
      farmer_id: farmerA.id,
      product_id: productB.id,
      product_name: productB.name,
      quantity: 7,
      unit_price: 300,
      production_date: '2026-08-03',
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
      title: 'Organization A document',
      category: 'other',
      document_type: 'other',
      original_name: 'alpha.pdf',
      stored_name: 'alpha.pdf',
      file_path: 'https://private.example.test/alpha.pdf',
    });
    documentB = await models.Document.create({
      cooperative_id: organizationB.id,
      owner_type: 'member',
      owner_id: memberB.id,
      title: 'Organization B document',
      category: 'other',
      document_type: 'other',
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
    app.use('/api/dashboard', require('../routes/dashboardRoutes'));
    app.use('/api/transactions', require('../routes/transactionRoutes'));
    app.use('/api/loans', require('../routes/loanRoutes'));
    app.use('/api/inventory', require('../routes/inventoryRoutes'));
    app.use('/api/reports', require('../routes/reportRoutes'));
    app.use('/api/documents', require('../routes/documentRoutes'));
    app.use('/api/farmer-groups', require('../routes/farmerGroupRoutes'));
    app.use('/api/team-members', require('../routes/teamMemberRoutes'));
    app.use('/api/subscriptions', require('../routes/subscriptionRoutes'));
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
    '/api/farmer-groups',
    '/api/team-members',
    '/api/subscriptions',
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
    const eligibleMembers = await withBearer(
      request(app).get('/api/farmers/eligible-members').query({ cooperative_id: organizationB.id }),
      managerToken
    ).expect(200);
    expect(eligibleMembers.body.data.map((member) => member.id)).toContain(createdMember.body.data.id);
    expect(eligibleMembers.body.data.map((member) => member.id)).not.toContain(memberA.id);
    expect(eligibleMembers.body.data.map((member) => member.id)).not.toContain(memberB.id);
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

    const memberCountBeforeFarmerCreation = await models.Member.count();
    const linkedFarmer = await withBearer(request(app).post('/api/farmers'), managerToken)
      .send({ member_id: createdMember.body.data.id, crop_type: 'Coffee' })
      .expect(201);
    expect(linkedFarmer.body.data.member_id).toBe(createdMember.body.data.id);
    expect(await models.Member.count()).toBe(memberCountBeforeFarmerCreation);
    await withBearer(request(app).post('/api/farmers'), managerToken)
      .send({ member_id: createdMember.body.data.id, crop_type: 'Tea' })
      .expect(409);

    const eligibleAfterCreation = await withBearer(
      request(app).get('/api/farmers/eligible-members'),
      managerToken
    ).expect(200);
    expect(eligibleAfterCreation.body.data.map((member) => member.id))
      .not.toContain(createdMember.body.data.id);
    await models.Farmer.destroy({ where: { id: linkedFarmer.body.data.id } });

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

  it('isolates Production records, writes, dropdowns, and statistics by authenticated organization', async () => {
    const superToken = accessTokenFor(superAdmin);
    const managerToken = accessTokenFor(managerA);

    const managerList = await withBearer(
      request(app).get('/api/production').query({ cooperative_id: organizationB.id }),
      managerToken
    ).expect(200);
    expect(managerList.body.data.map((record) => record.id)).toEqual([productionA.id]);

    await withBearer(request(app).get(`/api/production/${productionB.id}`), managerToken).expect(403);
    await withBearer(request(app).put(`/api/production/${productionB.id}`), managerToken)
      .send({ quantity: 99 })
      .expect(403);
    await withBearer(request(app).delete(`/api/production/${productionB.id}`), managerToken).expect(403);
    expect(await models.Production.findByPk(productionB.id)).not.toBeNull();

    await withBearer(request(app).post('/api/production'), managerToken)
      .send({
        cooperative_id: organizationA.id,
        farmer_id: farmerB.id,
        product_id: productB.id,
        quantity: 1,
        unit_price: 1,
        production_date: '2026-08-10',
      })
      .expect(403);
    await withBearer(request(app).post('/api/production'), managerToken)
      .send({
        cooperative_id: organizationB.id,
        farmer_id: farmerA.id,
        product_id: productB.id,
        quantity: 1,
        unit_price: 1,
        production_date: '2026-08-10',
      })
      .expect(400);

    const managerProducts = await withBearer(
      request(app).get('/api/production/products').query({ cooperative_id: organizationB.id }),
      managerToken
    ).expect(200);
    expect(managerProducts.body.data.map((product) => product.id)).toEqual([productA.id]);

    const managerFarmers = await withBearer(
      request(app).get('/api/farmers').query({ cooperative_id: organizationB.id }),
      managerToken
    ).expect(200);
    expect(managerFarmers.body.data.map((farmer) => farmer.id)).toEqual([farmerA.id]);

    const managerAnalytics = await withBearer(
      request(app).get('/api/production/analytics').query({ cooperative_id: organizationB.id }),
      managerToken
    ).expect(200);
    expect(managerAnalytics.body.data.stats).toEqual(expect.objectContaining({
      record_count: 1,
      total_quantity: 10,
      total_value: 5000,
      active_farmers: 1,
    }));
    expect(managerAnalytics.body.data.cooperative_comparison.map((item) => item.key))
      .toEqual([organizationA.id]);

    const managerSummary = await withBearer(
      request(app).get('/api/production/summary').query({ cooperative_id: organizationB.id }),
      managerToken
    ).expect(200);
    expect(managerSummary.body.data.map((item) => item.key)).toEqual([productA.id]);

    const managerDashboard = await withBearer(
      request(app).get('/api/dashboard/summary').query({ cooperative_id: organizationB.id }),
      managerToken
    ).expect(200);
    expect(managerDashboard.body.data.production).toEqual({
      total_value: 5000,
      total_quantity: 10,
      record_count: 1,
    });

    const managerCreate = await withBearer(request(app).post('/api/production'), managerToken)
      .send({
        cooperative_id: organizationB.id,
        farmer_id: farmerA.id,
        product_id: productA.id,
        quantity: 1,
        unit_price: 100,
        production_date: '2026-08-11',
      })
      .expect(201);
    expect(managerCreate.body.data.cooperative_id).toBe(organizationA.id);

    const managerUpdate = await withBearer(
      request(app).put(`/api/production/${managerCreate.body.data.id}`),
      managerToken
    ).send({
      cooperative_id: organizationB.id,
      farmer_id: farmerB.id,
      quantity: 2,
    }).expect(200);
    expect(managerUpdate.body.data).toEqual(expect.objectContaining({
      cooperative_id: organizationA.id,
      farmer_id: farmerA.id,
    }));
    await withBearer(
      request(app).delete(`/api/production/${managerCreate.body.data.id}`),
      managerToken
    ).expect(200);

    const superList = await withBearer(
      request(app).get('/api/production').query({ cooperative_id: organizationB.id }),
      superToken
    ).expect(200);
    expect(superList.body.data.map((record) => record.id).sort((a, b) => a - b))
      .toEqual([productionB.id, productionBLinkedToA.id].sort((a, b) => a - b));

    const superAnalytics = await withBearer(
      request(app).get('/api/production/analytics').query({ cooperative_id: organizationB.id }),
      superToken
    ).expect(200);
    expect(superAnalytics.body.data.stats).toEqual(expect.objectContaining({
      record_count: 2,
      total_quantity: 27,
      total_value: 8100,
      active_farmers: 2,
    }));

    const superDashboard = await withBearer(
      request(app).get('/api/dashboard/summary').query({ cooperative_id: organizationB.id }),
      superToken
    ).expect(200);
    expect(superDashboard.body.data.production).toEqual({
      total_value: 8100,
      total_quantity: 27,
      record_count: 2,
    });

    const superCreate = await withBearer(request(app).post('/api/production'), superToken)
      .send({
        cooperative_id: organizationB.id,
        farmer_id: farmerB.id,
        product_id: productB.id,
        quantity: 3,
        unit_price: 100,
        production_date: '2026-08-12',
      })
      .expect(201);
    expect(superCreate.body.data.cooperative_id).toBe(organizationB.id);
    await withBearer(
      request(app).put(`/api/production/${superCreate.body.data.id}`),
      superToken
    ).send({ quantity: 4 }).expect(200);
    await withBearer(
      request(app).delete(`/api/production/${superCreate.body.data.id}`),
      superToken
    ).expect(200);
  });

  it('supports organization-scoped Individual and Group production ownership', async () => {
    const superToken = accessTokenFor(superAdmin);
    const managerToken = accessTokenFor(managerA);
    const groupA = await models.FarmerGroup.create({
      cooperative_id: organizationA.id,
      name: 'Alpha Tea Growers',
      location: 'Nyamagabe',
    });
    const groupB = await models.FarmerGroup.create({
      cooperative_id: organizationB.id,
      name: 'Beta Tea Growers',
      location: 'Huye',
    });

    const managerGroups = await withBearer(
      request(app).get('/api/production/farmer-groups').query({ cooperative_id: organizationB.id }),
      managerToken
    ).expect(200);
    expect(managerGroups.body.data.map((group) => group.id)).toEqual([groupA.id]);

    await withBearer(request(app).post('/api/production'), managerToken)
      .send({
        cooperative_id: organizationB.id,
        production_mode: 'group',
        farmer_group_id: groupB.id,
        product_id: productB.id,
        expected_production: 10,
        actual_harvest: 9,
        harvest_date: '2026-08-20',
        unit: 'kg',
        season: '2026B',
        production_location: 'Huye',
      })
      .expect(403);

    await withBearer(request(app).post('/api/production'), managerToken)
      .send({
        production_mode: 'group',
        farmer_id: farmerA.id,
        farmer_group_id: groupA.id,
        product_id: productA.id,
        expected_production: 10,
        actual_harvest: 9,
        harvest_date: '2026-08-20',
        unit: 'kg',
        season: '2026B',
        production_location: 'Nyamagabe',
      })
      .expect(422);

    await withBearer(request(app).post('/api/production'), managerToken)
      .send({
        production_mode: 'individual',
        farmer_id: farmerA.id,
        product_id: productA.id,
        actual_harvest: 9,
        harvest_date: '2026-08-20',
        unit: 'kg',
        season: '2026B',
        production_location: 'Nyamagabe',
      })
      .expect(201);

    const managerGroupProduction = await withBearer(
      request(app).post('/api/production'),
      managerToken
    ).send({
      cooperative_id: organizationB.id,
      production_mode: 'group',
      farmer_group_id: groupA.id,
      product_id: productA.id,
      expected_production: 15,
      actual_harvest: 12.5,
      harvest_date: '2026-08-21',
      unit: 'kg',
      season: '2026B',
      production_location: 'Nyamagabe',
      notes: 'Shared harvest',
    }).expect(201);
    expect(managerGroupProduction.body.data).toEqual(expect.objectContaining({
      cooperative_id: organizationA.id,
      production_mode: 'group',
      farmer_id: null,
      farmer_group_id: groupA.id,
      quantity: 12.5,
      actual_harvest: 12.5,
      production_date: '2026-08-21',
      harvest_date: '2026-08-21',
      production_location: 'Nyamagabe',
    }));

    const managerIndividualProduction = await withBearer(
      request(app).post('/api/production'),
      managerToken
    ).send({
      production_mode: 'individual',
      farmer_id: farmerA.id,
      product_id: productA.id,
      expected_production: 5,
      actual_harvest: 4.75,
      harvest_date: '2026-08-22',
      unit: 'kg',
      season: '2026B',
      production_location: 'Nyamagabe',
    }).expect(201);
    expect(managerIndividualProduction.body.data).toEqual(expect.objectContaining({
      cooperative_id: organizationA.id,
      production_mode: 'individual',
      farmer_id: farmerA.id,
      farmer_group_id: null,
      quantity: 4.75,
      actual_harvest: 4.75,
    }));

    const managerGroupList = await withBearer(
      request(app).get('/api/production').query({ production_mode: 'group' }),
      managerToken
    ).expect(200);
    expect(managerGroupList.body.data.map((record) => record.id))
      .toEqual([managerGroupProduction.body.data.id]);

    const managerGroupAnalytics = await withBearer(
      request(app).get('/api/production/analytics').query({ production_mode: 'group' }),
      managerToken
    ).expect(200);
    expect(managerGroupAnalytics.body.data.stats).toEqual(expect.objectContaining({
      record_count: 1,
      active_farmers: 0,
      active_groups: 1,
      active_producers: 1,
      total_expected_production: 15,
      total_actual_harvest: 12.5,
    }));

    await withBearer(request(app).post('/api/production'), managerToken)
      .send({
        production_mode: 'group',
        farmer_group_id: groupA.id,
        product_id: productA.id,
        actual_harvest: 99,
        harvest_date: '2026-08-23',
        unit: 'kg',
        contributions: [{ farmer_id: farmerB.id, quantity: 3, unit: 'kg' }],
      })
      .expect(400);

    const contributedProduction = await withBearer(request(app).post('/api/production'), managerToken)
      .send({
        production_mode: 'group',
        farmer_group_id: groupA.id,
        product_id: productA.id,
        actual_harvest: 99,
        harvest_date: '2026-08-23',
        unit: 'kg',
        contributions: [{ farmer_id: farmerA.id, quantity: 3.25, unit: 'kg' }],
      })
      .expect(201);
    expect(contributedProduction.body.data).toEqual(expect.objectContaining({
      cooperative_id: organizationA.id,
      production_mode: 'group',
      actual_harvest: 3.25,
      quantity: 3.25,
      contributions: [expect.objectContaining({ farmer_id: farmerA.id, quantity: 3.25, unit: 'kg' })],
    }));
    await withBearer(
      request(app).delete(`/api/production/${contributedProduction.body.data.id}`),
      managerToken
    ).expect(200);

    const cooperativeProduction = await withBearer(request(app).post('/api/production'), managerToken)
      .send({
        production_mode: 'group',
        product_id: productA.id,
        actual_harvest: 8,
        production_date: '2026-08-24',
        unit: 'kg',
      })
      .expect(201);
    expect(cooperativeProduction.body.data).toEqual(expect.objectContaining({
      cooperative_id: organizationA.id,
      production_mode: 'group',
      farmer_id: null,
      farmer_group_id: null,
      actual_harvest: 8,
    }));
    await withBearer(
      request(app).delete(`/api/production/${cooperativeProduction.body.data.id}`),
      managerToken
    ).expect(200);

    const protectedOwnerUpdate = await withBearer(
      request(app).put(`/api/production/${managerGroupProduction.body.data.id}`),
      managerToken
    ).send({
      cooperative_id: organizationB.id,
      production_mode: 'individual',
      farmer_id: farmerB.id,
      farmer_group_id: groupB.id,
      actual_harvest: 13,
    }).expect(200);
    expect(protectedOwnerUpdate.body.data).toEqual(expect.objectContaining({
      cooperative_id: organizationA.id,
      production_mode: 'group',
      farmer_id: null,
      farmer_group_id: groupA.id,
      actual_harvest: 13,
      quantity: 13,
    }));

    const superGroups = await withBearer(
      request(app).get('/api/production/farmer-groups').query({ cooperative_id: organizationB.id }),
      superToken
    ).expect(200);
    expect(superGroups.body.data.map((group) => group.id)).toEqual([groupB.id]);

    const superGroupProduction = await withBearer(
      request(app).post('/api/production'),
      superToken
    ).send({
      cooperative_id: organizationB.id,
      production_mode: 'group',
      farmer_group_id: groupB.id,
      product_id: productB.id,
      expected_production: 20,
      actual_harvest: 18,
      harvest_date: '2026-08-23',
      unit: 'kg',
      season: '2026B',
      production_location: 'Huye',
    }).expect(201);
    await withBearer(
      request(app).get(`/api/production/${superGroupProduction.body.data.id}`),
      managerToken
    ).expect(403);
    await withBearer(
      request(app).get(`/api/production/${superGroupProduction.body.data.id}`),
      superToken
    ).expect(200);

    for (const record of [
      managerGroupProduction.body.data,
      managerIndividualProduction.body.data,
      superGroupProduction.body.data,
    ]) {
      await withBearer(request(app).delete(`/api/production/${record.id}`), superToken).expect(200);
    }
    await groupA.destroy();
    await groupB.destroy();
  });

  it('fails closed across organization-owned modules when organization context is missing', async () => {
    const unscopedManager = await models.User.create({
      first_name: 'Unscoped',
      last_name: 'Production Manager',
      email: 'unscoped-production@security.test',
      password_hash: 'not-used-by-this-test',
      role: 'cooperative_manager',
    }, { hooks: false });
    const groupA = await models.FarmerGroup.create({
      cooperative_id: organizationA.id,
      name: 'Unscoped Test Group A',
    });
    const groupB = await models.FarmerGroup.create({
      cooperative_id: organizationB.id,
      name: 'Unscoped Test Group B',
    });
    const token = accessTokenFor(unscopedManager);

    const members = await withBearer(request(app).get('/api/members'), token).expect(200);
    expect(members.body.data).toEqual([]);

    const farmers = await withBearer(request(app).get('/api/farmers'), token).expect(200);
    expect(farmers.body.data).toEqual([]);

    const production = await withBearer(request(app).get('/api/production'), token).expect(200);
    expect(production.body.data).toEqual([]);

    const products = await withBearer(
      request(app).get('/api/production/products'),
      token
    ).expect(200);
    expect(products.body.data).toEqual([]);

    const groups = await withBearer(
      request(app).get('/api/production/farmer-groups'),
      token
    ).expect(200);
    expect(groups.body.data).toEqual([]);

    const analytics = await withBearer(
      request(app).get('/api/production/analytics'),
      token
    ).expect(200);
    expect(analytics.body.data.stats).toEqual(expect.objectContaining({
      record_count: 0,
      total_quantity: 0,
      total_value: 0,
    }));

    const dashboard = await withBearer(
      request(app).get('/api/dashboard/summary'),
      token
    ).expect(200);
    expect(dashboard.body.data).toEqual(expect.objectContaining({
      members: expect.objectContaining({ total: 0, active: 0 }),
      farmers: expect.objectContaining({ total: 0 }),
      production: { total_value: 0, total_quantity: 0, record_count: 0 },
    }));

    const report = await withBearer(
      request(app).get('/api/reports/production').query({ format: 'json' }),
      token
    ).expect(200);
    expect(report.body.data.rows).toEqual([]);

    await groupA.destroy();
    await groupB.destroy();
    await unscopedManager.destroy();
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

  it('strictly isolates every Finance surface by authenticated organization', async () => {
    const superToken = accessTokenFor(superAdmin);
    const managerToken = accessTokenFor(managerA);

    const managerTransactions = await withBearer(
      request(app).get('/api/transactions').query({ cooperative_id: organizationB.id }),
      managerToken
    ).expect(200);
    expect(managerTransactions.body.data.map((record) => record.id)).toEqual([transactionA.id]);

    const crossMemberFilter = await withBearer(
      request(app).get('/api/transactions').query({ member_id: memberB.id }),
      managerToken
    ).expect(200);
    expect(crossMemberFilter.body.data).toEqual([]);

    await withBearer(
      request(app).get(`/api/transactions/${transactionB.id}`),
      managerToken
    ).expect(403);
    await withBearer(
      request(app).put(`/api/transactions/${transactionB.id}`),
      managerToken
    ).send({ amount: 1 }).expect(403);
    await withBearer(
      request(app).delete(`/api/transactions/${transactionB.id}`),
      managerToken
    ).expect(403);

    await withBearer(request(app).post('/api/transactions'), managerToken)
      .send({
        cooperative_id: organizationB.id,
        member_id: memberB.id,
        type: 'income',
        category: 'Product Sales',
        amount: 1250,
        transaction_date: '2026-08-25',
      })
      .expect(403);

    await withBearer(request(app).post('/api/transactions'), managerToken)
      .send({
        member_id: memberB.id,
        type: 'income',
        category: 'Product Sales',
        amount: 1250,
        transaction_date: '2026-08-25',
      })
      .expect(400);

    await withBearer(request(app).post('/api/transactions'), managerToken)
      .send({
        cooperative_id: organizationB.id,
        member_id: memberA.id,
        type: 'income',
        category: 'Product Sales',
        amount: 1250,
        transaction_date: '2026-08-25',
      })
      .expect(403);

    const managerCreate = await withBearer(request(app).post('/api/transactions'), managerToken)
      .send({
        member_id: memberA.id,
        type: 'income',
        category: 'Product Sales',
        amount: 1250,
        transaction_date: '2026-08-25',
      })
      .expect(201);
    expect(managerCreate.body.data.cooperative_id).toBe(organizationA.id);

    await withBearer(
      request(app).put(`/api/transactions/${managerCreate.body.data.id}`),
      managerToken
    ).send({ cooperative_id: organizationB.id, description: 'Manipulated organization' }).expect(403);
    await withBearer(
      request(app).put(`/api/transactions/${managerCreate.body.data.id}`),
      managerToken
    ).send({ description: 'Organization A record' }).expect(200);
    const protectedCreatedTransaction = await models.Transaction.findByPk(managerCreate.body.data.id);
    expect(protectedCreatedTransaction.cooperative_id).toBe(organizationA.id);

    await withBearer(
      request(app).put(`/api/transactions/${managerCreate.body.data.id}`),
      managerToken
    ).send({ member_id: memberB.id }).expect(400);

    const managerSummary = await withBearer(
      request(app).get('/api/transactions/summary').query({ cooperative_id: organizationB.id }),
      managerToken
    ).expect(200);
    expect(managerSummary.body.data).toEqual(expect.objectContaining({
      income: 6250,
      expense: 0,
      net_balance: 6250,
    }));

    const managerDashboard = await withBearer(
      request(app).get('/api/dashboard/summary').query({ cooperative_id: organizationB.id }),
      managerToken
    ).expect(200);
    expect(managerDashboard.body.data.finance).toEqual(expect.objectContaining({
      income: 6250,
      expense: 0,
      net_balance: 6250,
    }));

    const managerDashboardExport = await withBearer(
      request(app).get('/api/dashboard/export').query({ cooperative_id: organizationB.id }),
      managerToken
    ).expect(200);
    expect(managerDashboardExport.text).toContain('"Income (RWF)","6250"');
    expect(managerDashboardExport.text).toContain('"Expenses (RWF)","0"');

    const managerMembers = await withBearer(
      request(app).get('/api/members').query({ cooperative_id: organizationB.id }),
      managerToken
    ).expect(200);
    expect(managerMembers.body.data.length).toBeGreaterThan(0);
    expect(managerMembers.body.data.every(
      (member) => member.cooperative_id === organizationA.id
    )).toBe(true);
    expect(managerMembers.body.data.map((member) => member.id)).not.toContain(memberB.id);

    const managerFinanceReport = await withBearer(
      request(app).get('/api/reports/finance').query({
        format: 'json',
        cooperative_id: organizationB.id,
      }),
      managerToken
    ).expect(200);
    expect(managerFinanceReport.body.data.rows).toHaveLength(2);
    expect(managerFinanceReport.body.data.rows.every(
      (row) => row.cooperative === organizationA.name
    )).toBe(true);
    expect(managerFinanceReport.body.data.rows.map((row) => row.amount)).not.toContain(2000);

    const managerFinanceCsv = await withBearer(
      request(app).get('/api/reports/finance').query({
        format: 'csv',
        cooperative_id: organizationB.id,
      }),
      managerToken
    ).expect(200);
    expect(managerFinanceCsv.text).toContain(organizationA.name);
    expect(managerFinanceCsv.text).not.toContain(organizationB.name);

    const superTransactions = await withBearer(
      request(app).get('/api/transactions').query({ cooperative_id: organizationB.id }),
      superToken
    ).expect(200);
    expect(superTransactions.body.data.map((record) => record.id)).toEqual([transactionB.id]);
    await withBearer(
      request(app).get(`/api/transactions/${transactionB.id}`),
      superToken
    ).expect(200);

    const superSummary = await withBearer(
      request(app).get('/api/transactions/summary').query({ cooperative_id: organizationB.id }),
      superToken
    ).expect(200);
    expect(superSummary.body.data).toEqual(expect.objectContaining({
      income: 0,
      expense: 2000,
      net_balance: -2000,
    }));

    const superFinanceReport = await withBearer(
      request(app).get('/api/reports/finance').query({
        format: 'json',
        cooperative_id: organizationB.id,
      }),
      superToken
    ).expect(200);
    expect(superFinanceReport.body.data.rows.map((row) => row.cooperative))
      .toEqual([organizationB.name]);

    const unscopedManager = await models.User.create({
      first_name: 'Unscoped',
      last_name: 'Manager',
      email: 'unscoped-finance@security.test',
      password_hash: 'not-used-by-this-test',
      role: 'cooperative_manager',
    }, { hooks: false });
    const unscopedToken = accessTokenFor(unscopedManager);

    const unscopedTransactions = await withBearer(
      request(app).get('/api/transactions'),
      unscopedToken
    ).expect(200);
    expect(unscopedTransactions.body.data).toEqual([]);

    const unscopedSummary = await withBearer(
      request(app).get('/api/transactions/summary'),
      unscopedToken
    ).expect(200);
    expect(unscopedSummary.body.data).toEqual(expect.objectContaining({
      income: 0,
      expense: 0,
      saving: 0,
      net_balance: 0,
    }));

    const unscopedDashboard = await withBearer(
      request(app).get('/api/dashboard/summary'),
      unscopedToken
    ).expect(200);
    expect(unscopedDashboard.body.data.finance).toEqual(expect.objectContaining({
      income: 0,
      expense: 0,
      saving: 0,
      net_balance: 0,
    }));

    const unscopedReport = await withBearer(
      request(app).get('/api/reports/finance').query({ format: 'json' }),
      unscopedToken
    ).expect(200);
    expect(unscopedReport.body.data.rows).toEqual([]);

    await withBearer(
      request(app).delete(`/api/transactions/${managerCreate.body.data.id}`),
      managerToken
    ).expect(200);
  });

  it('scopes subscriptions and Farmer Group administration while keeping Team administration Super Admin-only', async () => {
    const managerToken = accessTokenFor(managerA);
    const superToken = accessTokenFor(superAdmin);
    const farmerToken = accessTokenFor(farmerUserA);
    await models.Subscription.create({
      cooperative_id: organizationA.id,
      plan_id: 'basic',
      status: 'active',
      billing_cycle: 'monthly',
      payment_status: 'not_required',
    });
    await models.Subscription.create({
      cooperative_id: organizationB.id,
      plan_id: 'professional',
      status: 'active',
      billing_cycle: 'yearly',
      payment_status: 'not_required',
    });

    const managerSubscription = await withBearer(
      request(app).get('/api/subscriptions').query({ cooperative_id: organizationB.id }),
      managerToken
    ).expect(200);
    expect(managerSubscription.body.data.current).toEqual(expect.objectContaining({
      cooperative_id: organizationA.id,
      plan_id: 'basic',
    }));
    expect(managerSubscription.body.data.plans.every((plan) => (
      plan.prices.monthly === null && plan.prices.yearly === null
    ))).toBe(true);

    const farmerSubscription = await withBearer(request(app).get('/api/subscriptions'), farmerToken).expect(200);
    expect(farmerSubscription.body.data.current.cooperative_id).toBe(organizationA.id);
    const superSubscription = await withBearer(
      request(app).get('/api/subscriptions').query({ cooperative_id: organizationB.id }),
      superToken
    ).expect(200);
    expect(superSubscription.body.data.current.plan_id).toBe('professional');

    await withBearer(request(app).post('/api/team-members'), managerToken)
      .send({ full_name: 'Not allowed', position: 'Manager' })
      .expect(403);
    const teamMember = await withBearer(request(app).post('/api/team-members'), superToken)
      .send({ full_name: 'Configured Person', position: 'Founder & CEO', display_order: 2 })
      .expect(201);
    await withBearer(request(app).put(`/api/team-members/${teamMember.body.data.id}`), superToken)
      .send({ status: 'inactive' })
      .expect(200);
    const managerTeam = await withBearer(request(app).get('/api/team-members'), managerToken).expect(200);
    expect(managerTeam.body.data).toEqual([]);
    const superTeam = await withBearer(
      request(app).get('/api/team-members').query({ include_inactive: true }),
      superToken
    ).expect(200);
    expect(superTeam.body.data).toEqual([expect.objectContaining({ full_name: 'Configured Person', status: 'inactive' })]);
    await withBearer(request(app).delete(`/api/team-members/${teamMember.body.data.id}`), superToken).expect(200);

    const group = await withBearer(request(app).post('/api/farmer-groups'), managerToken)
      .send({ cooperative_id: organizationB.id, name: 'Scoped API Group', location: 'Gasaka' })
      .expect(201);
    expect(group.body.data.cooperative_id).toBe(organizationA.id);
    const groups = await withBearer(
      request(app).get('/api/farmer-groups').query({ cooperative_id: organizationB.id }),
      managerToken
    ).expect(200);
    expect(groups.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: group.body.data.id, cooperative_id: organizationA.id }),
    ]));
    await withBearer(request(app).delete(`/api/farmer-groups/${group.body.data.id}`), managerToken).expect(200);
  });
});
