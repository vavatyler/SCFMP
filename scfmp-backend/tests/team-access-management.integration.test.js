const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { buildTestDb } = require('./testDbHelper');
const { PERMISSIONS } = require('../config/accessControl');

const mockModels = {};

jest.mock('../models', () => mockModels);
jest.mock('../services/auditService', () => ({
  recordAuditEvent: jest.fn().mockResolvedValue(null),
}));

const JWT_SECRET = 'team-access-integration-secret';
const REFRESH_SECRET = 'team-access-refresh-secret';

const tokenFor = (user) => jwt.sign({
  id: user.id,
  role: user.role,
  cooperative_id: user.cooperative_id,
  token_version: user.token_version,
  type: 'access',
}, JWT_SECRET, {
  expiresIn: '15m',
  issuer: 'scfmp-api',
  audience: 'scfmp-web',
});

const authenticated = (builder, user) => builder.set('Authorization', `Bearer ${tokenFor(user)}`);

describe('Team profiles and linked-account access management', () => {
  let sequelize;
  let models;
  let app;
  let superAdmin;
  let manager;
  let restrictedAccount;

  beforeAll(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.JWT_REFRESH_SECRET = REFRESH_SECRET;
    ({ sequelize, models } = await buildTestDb());
    Object.assign(mockModels, models, { sequelize });

    const cooperative = await models.Cooperative.create({ name: 'Team Access Cooperative' });
    superAdmin = await models.User.create({
      first_name: 'Super',
      last_name: 'Admin',
      email: 'super-team@example.test',
      password_hash: 'SecurePassword123',
      role: 'super_admin',
    });
    manager = await models.User.create({
      cooperative_id: cooperative.id,
      first_name: 'Manager',
      last_name: 'User',
      email: 'manager-team@example.test',
      password_hash: 'SecurePassword123',
      role: 'cooperative_manager',
    });
    restrictedAccount = await models.User.create({
      cooperative_id: cooperative.id,
      first_name: 'Restricted',
      last_name: 'User',
      email: 'restricted-team@example.test',
      password_hash: 'SecurePassword123',
      role: 'field_officer',
    });

    app = express();
    app.use(express.json());
    app.use('/api/auth', require('../routes/authRoutes'));
    app.use('/api/team-members', require('../routes/teamMemberRoutes'));
    app.use('/api/transactions', require('../routes/transactionRoutes'));
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('accepts only the approved organizational roles and valid HTTPS photo URLs', async () => {
    await authenticated(request(app).post('/api/team-members'), superAdmin)
      .send({ full_name: 'Legacy Title', position: 'Managing Director' })
      .expect(422);
    await authenticated(request(app).post('/api/team-members'), superAdmin)
      .send({ full_name: 'Invalid Photo', position: 'Founder & CEO', photo_url: 'not-a-url' })
      .expect(422);

    for (const position of [
      'Founder & CEO',
      'Co-Founder & IT Lead',
      'Volunteer — AgriBridge & Field Systems Support',
    ]) {
      await authenticated(request(app).post('/api/team-members'), superAdmin)
        .send({ full_name: position, position, profile_visibility: 'visible' })
        .expect(201);
    }
  });

  it('keeps hidden profiles and access details out of ordinary Team responses', async () => {
    await models.TeamMember.create({
      full_name: 'Hidden Person',
      position: 'Volunteer — AgriBridge & Field Systems Support',
      status: 'active',
      profile_visibility: 'hidden',
      linked_user_id: manager.id,
    });

    const ordinary = await authenticated(request(app).get('/api/team-members'), manager).expect(200);
    expect(ordinary.body.data.map((profile) => profile.full_name)).not.toContain('Hidden Person');
    expect(ordinary.body.data.every((profile) => profile.access === undefined)).toBe(true);
    expect(ordinary.body.data.every((profile) => profile.linked_user_id === undefined)).toBe(true);

    const management = await authenticated(
      request(app).get('/api/team-members').query({ include_inactive: true, include_hidden: true }),
      superAdmin
    ).expect(200);
    const hidden = management.body.data.find((profile) => profile.full_name === 'Hidden Person');
    expect(hidden).toEqual(expect.objectContaining({
      profile_visibility: 'hidden',
      linked_user_id: manager.id,
    }));
    expect(hidden.access.account.email).toBe(manager.email);
  });

  it('rejects direct non-Super-Admin management and applies granular backend permissions', async () => {
    const founder = await models.TeamMember.findOne({ where: { position: 'Founder & CEO' } });
    await authenticated(request(app).put(`/api/team-members/${founder.id}`), manager)
      .send({ biography: 'Unauthorized edit' })
      .expect(403);

    await restrictedAccount.update({ permissions: [PERMISSIONS.TEAM_VIEW] });
    await authenticated(request(app).get('/api/team-members'), restrictedAccount).expect(200);
    await authenticated(request(app).get('/api/transactions'), restrictedAccount).expect(403);
  });

  it('lets Super Admin manage linked-account access and immediately revokes disabled access', async () => {
    const founder = await models.TeamMember.findOne({ where: { position: 'Founder & CEO' } });
    const update = await authenticated(request(app).put(`/api/team-members/${founder.id}`), superAdmin)
      .send({
        linked_user_id: restrictedAccount.id,
        access: {
          system_access_enabled: false,
          account_status: 'active',
          system_role: 'field_officer',
          permissions: [PERMISSIONS.TEAM_VIEW],
        },
      })
      .expect(200);
    expect(update.body.data.access).toEqual(expect.objectContaining({
      system_access_enabled: false,
      permissions: [PERMISSIONS.TEAM_VIEW],
      accessible_modules: ['team'],
    }));

    await restrictedAccount.reload();
    expect(restrictedAccount.system_access_enabled).toBe(false);
    await authenticated(request(app).get('/api/team-members'), restrictedAccount).expect(401);
    await request(app).post('/api/auth/login').send({
      email: restrictedAccount.email,
      password: 'SecurePassword123',
    }).expect(401);

    await authenticated(request(app).put(`/api/team-members/${founder.id}`), superAdmin)
      .send({
        access: {
          system_access_enabled: true,
          account_status: 'inactive',
          system_role: 'field_officer',
          permissions: [PERMISSIONS.TEAM_VIEW],
        },
      })
      .expect(200);
    await restrictedAccount.reload();
    expect(restrictedAccount.status).toBe('inactive');
    await request(app).post('/api/auth/login').send({
      email: restrictedAccount.email,
      password: 'SecurePassword123',
    }).expect(401);
  });

  it('keeps archived Team records while hiding them from showcase results', async () => {
    const cofounder = await models.TeamMember.findOne({ where: { position: 'Co-Founder & IT Lead' } });
    await authenticated(request(app).delete(`/api/team-members/${cofounder.id}`), superAdmin).expect(200);
    await cofounder.reload();
    expect(cofounder).toEqual(expect.objectContaining({ status: 'inactive', profile_visibility: 'hidden' }));

    const ordinary = await authenticated(request(app).get('/api/team-members'), manager).expect(200);
    expect(ordinary.body.data.map((profile) => profile.id)).not.toContain(cofounder.id);
  });
});
