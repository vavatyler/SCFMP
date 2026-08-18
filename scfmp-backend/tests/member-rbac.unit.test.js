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

jest.mock('../controllers/memberController', () => ({
  list: (req, res) => res.status(200).json({ success: true }),
  getById: (req, res) => res.status(200).json({ success: true }),
  create: (req, res) => res.status(201).json({ success: true }),
  update: (req, res) => res.status(200).json({ success: true }),
  remove: (req, res) => res.status(200).json({ success: true }),
}));

const express = require('express');
const request = require('supertest');
const memberRoutes = require('../routes/memberRoutes');

const app = express();
app.use(express.json());
app.use('/api/members', memberRoutes);

const validMember = {
  first_name: 'Aline',
  last_name: 'Uwase',
  gender: 'female',
  phone: '+250789329052',
  address: 'Kigali',
  membership_date: '2026-08-18',
};

describe('member route validation and RBAC', () => {
  it.each(['super_admin', 'cooperative_manager', 'field_officer'])(
    'allows %s to create and edit Members',
    async (role) => {
      await request(app).post('/api/members').set('x-test-role', role).send(validMember).expect(201);
      await request(app).put('/api/members/42').set('x-test-role', role).send({ address: 'Musanze' }).expect(200);
    }
  );

  it.each(['accountant', 'farmer'])(
    'blocks %s from Member create and edit actions',
    async (role) => {
      await request(app).post('/api/members').set('x-test-role', role).send(validMember).expect(403);
      await request(app).put('/api/members/42').set('x-test-role', role).send({ address: 'Blocked' }).expect(403);
    }
  );

  it('limits Member deletion to managers and super admins', async () => {
    await request(app).delete('/api/members/42').set('x-test-role', 'field_officer').expect(403);
    await request(app).delete('/api/members/42').set('x-test-role', 'cooperative_manager').expect(200);
    await request(app).delete('/api/members/42').set('x-test-role', 'super_admin').expect(200);
  });

  it('requires trimmed first and last names', async () => {
    const response = await request(app)
      .post('/api/members')
      .set('x-test-role', 'cooperative_manager')
      .send({ first_name: '   ', last_name: '' })
      .expect(422);

    expect(response.body.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'first_name' }),
      expect.objectContaining({ field: 'last_name' }),
    ]));
  });

  it.each([
    { phone: '78932905' },
    { phone: '7893290521' },
    { phone: '789ABC052' },
    { gender: 'unknown' },
    { membership_date: '18/08/2026' },
    { address: 'a'.repeat(256) },
    { first_name: 'a'.repeat(101) },
  ])('rejects invalid Member form input %#', async (invalidField) => {
    const response = await request(app)
      .post('/api/members')
      .set('x-test-role', 'cooperative_manager')
      .send({ ...validMember, ...invalidField })
      .expect(422);

    expect(response.body.success).toBe(false);
  });

  it('accepts missing optional Member fields', async () => {
    await request(app)
      .post('/api/members')
      .set('x-test-role', 'cooperative_manager')
      .send({ first_name: 'Aline', last_name: 'Uwase' })
      .expect(201);
  });
});
