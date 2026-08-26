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
  eligibleMembers: (req, res) => res.status(200).json({ success: true }),
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
  farm_size: '2.75',
  farm_size_unit: 'ha',
  district: 'Nyamagabe',
  sector: 'Buruhukiro',
  cell: 'Bushigishigi',
  village: 'Giharayumbu',
};

describe('farmer profile route validation and RBAC', () => {
  it.each(['super_admin', 'cooperative_manager', 'field_officer'])(
    'allows %s to query eligible Members',
    async (role) => {
      await request(app).get('/api/farmers/eligible-members').set('x-test-role', role).expect(200);
    }
  );

  it.each(['accountant', 'farmer'])(
    'blocks %s from querying the Farmer creation dropdown',
    async (role) => {
      await request(app).get('/api/farmers/eligible-members').set('x-test-role', role).expect(403);
    }
  );

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

  it.each([-1, 0, '-1', 'not-a-number', '1.2.3'])(
    'rejects invalid farm size %s',
    async (farmSize) => {
      const response = await request(app)
        .post('/api/farmers')
        .set('x-test-role', 'cooperative_manager')
        .send({ ...validFarmer, farm_size: farmSize })
        .expect(422);

      expect(response.body.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({ field: 'farm_size' }),
      ]));
    }
  );

  it('rejects zero and accepts positive decimal farm sizes', async () => {
    await request(app).post('/api/farmers').set('x-test-role', 'cooperative_manager').send({ ...validFarmer, farm_size: '0' }).expect(422);
    await request(app).put('/api/farmers/9').set('x-test-role', 'field_officer').send({ farm_size: '0.25', farm_size_unit: 'acres' }).expect(200);
  });

  it.each(['acres', 'm2', 'km2'])('accepts the supported %s unit', async (farmSizeUnit) => {
    await request(app)
      .post('/api/farmers')
      .set('x-test-role', 'cooperative_manager')
      .send({ ...validFarmer, farm_size_unit: farmSizeUnit })
      .expect(201);
  });

  it.each([
    [{ farm_size: '1.25' }, 'farm_size_unit'],
    [{ farm_size_unit: 'acres' }, 'farm_size_unit'],
    [{ farm_size: '1.25', farm_size_unit: 'perches' }, 'farm_size_unit'],
  ])('rejects incomplete or unsupported farm size pairs', async (farmSizePayload, field) => {
    const response = await request(app)
      .post('/api/farmers')
      .set('x-test-role', 'cooperative_manager')
      .send({ member_id: 5, ...farmSizePayload })
      .expect(422);

    expect(response.body.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field }),
    ]));
  });

  it('continues to accept positive legacy hectare payloads', async () => {
    await request(app)
      .post('/api/farmers')
      .set('x-test-role', 'cooperative_manager')
      .send({ member_id: 5, farm_size_ha: '0.25' })
      .expect(201);
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
