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

jest.mock('../controllers/cooperativeController', () => ({
  list: (req, res) => res.status(200).json({ success: true }),
  getById: (req, res) => res.status(200).json({ success: true }),
  create: (req, res) => res.status(201).json({ success: true }),
  update: (req, res) => res.status(200).json({ success: true }),
  remove: (req, res) => res.status(200).json({ success: true }),
}));

const express = require('express');
const request = require('supertest');
const cooperativeRoutes = require('../routes/cooperativeRoutes');

const app = express();
app.use(express.json());
app.use('/api/cooperatives', cooperativeRoutes);

describe('organization route RBAC', () => {
  it('allows only Super Admin to list and create organizations', async () => {
    await request(app).get('/api/cooperatives').set('x-test-role', 'cooperative_manager').expect(403);
    await request(app).get('/api/cooperatives').set('x-test-role', 'super_admin').expect(200);
    await request(app).post('/api/cooperatives').set('x-test-role', 'cooperative_manager').send({ name: 'Blocked' }).expect(403);
    await request(app).post('/api/cooperatives').set('x-test-role', 'super_admin').send({ name: 'Allowed' }).expect(201);
  });

  it('rejects an unsupported organization type', async () => {
    const response = await request(app)
      .post('/api/cooperatives')
      .set('x-test-role', 'super_admin')
      .send({ name: 'Invalid Type', organization_type: 'company' })
      .expect(422);

    expect(response.body.success).toBe(false);
  });

  it.each([
    '78932',
    '78932905',
    '7893290521',
    '789ABC052',
    '+250+250789329052',
  ])('rejects malformed Organization phone %s', async (phone) => {
    const response = await request(app)
      .post('/api/cooperatives')
      .set('x-test-role', 'super_admin')
      .send({ name: 'Invalid Phone', phone })
      .expect(422);

    expect(response.body.success).toBe(false);
    expect(response.body.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'phone' }),
    ]));
  });

  it('accepts normalized Rwanda Organization phone format', async () => {
    await request(app)
      .post('/api/cooperatives')
      .set('x-test-role', 'super_admin')
      .send({ name: 'Valid Phone', phone: '+250789329052' })
      .expect(201);
  });

  it('rejects a malformed phone on Organization update', async () => {
    const response = await request(app)
      .put('/api/cooperatives/7')
      .set('x-test-role', 'cooperative_manager')
      .set('x-test-cooperative-id', '7')
      .send({ phone: '78932905' })
      .expect(422);

    expect(response.body.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'phone' }),
    ]));
  });

  it.each([
    'cooperative@gmail',
    'cooperative@',
    '@gmail.com',
    'cooperative@@gmail.com',
    'cooperative @gmail.com',
  ])('rejects malformed Organization email %s', async (email) => {
    const response = await request(app)
      .post('/api/cooperatives')
      .set('x-test-role', 'super_admin')
      .send({ name: 'Invalid Email', email })
      .expect(422);

    expect(response.body.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'email' }),
    ]));
  });

  it.each([
    {},
    { email: '' },
    { email: 'cooperative@gmail.com' },
    { email: '  cooperative@gmail.com  ' },
  ])('accepts optional or valid Organization email %#', async (emailPayload) => {
    await request(app)
      .post('/api/cooperatives')
      .set('x-test-role', 'super_admin')
      .send({ name: 'Valid Email', ...emailPayload })
      .expect(201);
  });

  it('rejects malformed Organization email on update', async () => {
    const response = await request(app)
      .put('/api/cooperatives/7')
      .set('x-test-role', 'cooperative_manager')
      .set('x-test-cooperative-id', '7')
      .send({ email: 'cooperative@gmail' })
      .expect(422);

    expect(response.body.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'email' }),
    ]));
  });

  it('allows a manager to update only their own organization', async () => {
    await request(app)
      .put('/api/cooperatives/7')
      .set('x-test-role', 'cooperative_manager')
      .set('x-test-cooperative-id', '7')
      .send({ name: 'Renamed Organization' })
      .expect(200);

    await request(app)
      .put('/api/cooperatives/8')
      .set('x-test-role', 'cooperative_manager')
      .set('x-test-cooperative-id', '7')
      .send({ name: 'Wrong Organization' })
      .expect(403);

    await request(app)
      .put('/api/cooperatives/7')
      .set('x-test-role', 'farmer')
      .set('x-test-cooperative-id', '7')
      .send({ name: 'Blocked' })
      .expect(403);
  });

  it('allows only Super Admin to delete organizations', async () => {
    await request(app)
      .delete('/api/cooperatives/7')
      .set('x-test-role', 'cooperative_manager')
      .set('x-test-cooperative-id', '7')
      .expect(403);
    await request(app).delete('/api/cooperatives/7').set('x-test-role', 'super_admin').expect(200);
  });
});
