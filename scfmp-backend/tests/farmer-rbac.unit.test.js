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

jest.mock('../controllers/farmerController', () => ({
  list: (req, res) => res.status(200).json({ success: true }),
  getById: (req, res) => res.status(200).json({ success: true }),
  create: (req, res) => res.status(201).json({ success: true }),
  update: (req, res) => res.status(200).json({ success: true }),
  remove: (req, res) => res.status(200).json({ success: true }),
}));

const express = require('express');
const request = require('supertest');
const farmerRoutes = require('../routes/farmerRoutes');

const app = express();
app.use(express.json());
app.use('/api/farmers', farmerRoutes);

const validFarmer = {
  member_id: 5,
  crop_type: 'Coffee',
  farm_size_ha: '2.75',
  district: 'Nyamagabe',
  sector: 'Buruhukiro',
  cell: 'Bushigishigi',
  village: 'Giharayumbu',
};

describe('farmer profile route validation and RBAC', () => {
  it.each(['super_admin', 'cooperative_manager', 'field_officer'])(
    'allows %s to create and edit Farmer profiles',
    async (role) => {
      await request(app).post('/api/farmers').set('x-test-role', role).send(validFarmer).expect(201);
      await request(app).put('/api/farmers/9').set('x-test-role', role).send({ crop_type: 'Tea' }).expect(200);
    }
  );

  it.each(['accountant', 'farmer'])(
    'blocks %s from Farmer profile create and edit actions',
    async (role) => {
      await request(app).post('/api/farmers').set('x-test-role', role).send(validFarmer).expect(403);
      await request(app).put('/api/farmers/9').set('x-test-role', role).send({ crop_type: 'Tea' }).expect(403);
    }
  );

  it('limits Farmer profile deletion to managers and super admins', async () => {
    await request(app).delete('/api/farmers/9').set('x-test-role', 'field_officer').expect(403);
    await request(app).delete('/api/farmers/9').set('x-test-role', 'cooperative_manager').expect(200);
    await request(app).delete('/api/farmers/9').set('x-test-role', 'super_admin').expect(200);
  });

  it.each(['-1', 'not-a-number', '1.2.3'])(
    'rejects invalid farm size %s',
    async (farmSize) => {
      const response = await request(app)
        .post('/api/farmers')
        .set('x-test-role', 'cooperative_manager')
        .send({ ...validFarmer, farm_size_ha: farmSize })
        .expect(422);

      expect(response.body.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({ field: 'farm_size_ha' }),
      ]));
    }
  );

  it('accepts zero and decimal hectares', async () => {
    await request(app).post('/api/farmers').set('x-test-role', 'cooperative_manager').send({ ...validFarmer, farm_size_ha: '0' }).expect(201);
    await request(app).put('/api/farmers/9').set('x-test-role', 'field_officer').send({ farm_size_ha: '0.25' }).expect(200);
  });

  it('rejects crop values that exceed the existing database field length', async () => {
    const response = await request(app)
      .post('/api/farmers')
      .set('x-test-role', 'cooperative_manager')
      .send({ ...validFarmer, crop_type: 'a'.repeat(101) })
      .expect(422);

    expect(response.body.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'crop_type' }),
    ]));
  });

  it('keeps crop, size, and structured location optional', async () => {
    await request(app)
      .post('/api/farmers')
      .set('x-test-role', 'cooperative_manager')
      .send({ member_id: 5 })
      .expect(201);
  });
});
