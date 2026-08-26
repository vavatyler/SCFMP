jest.mock('../middleware/authMiddleware', () => ({
  verifyToken: (req, res, next) => (
    req.get('x-test-authenticated') === 'true'
      ? next()
      : res.status(401).json({ success: false, message: 'No token provided' })
  ),
}));

const express = require('express');
const request = require('supertest');
const locationRoutes = require('../routes/locationRoutes');

const app = express();
app.use('/api/locations', locationRoutes);

const authenticated = (requestBuilder) => requestBuilder.set('x-test-authenticated', 'true');

describe('Rwanda location API', () => {
  it('keeps location data behind authentication', async () => {
    await request(app).get('/api/locations/districts').expect(401);
  });

  it('returns only dependent options for each selected parent', async () => {
    const districts = await authenticated(request(app).get('/api/locations/districts')).expect(200);
    expect(districts.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Nyamagabe' }),
    ]));

    const sectors = await authenticated(
      request(app).get('/api/locations/sectors').query({ district: 'Nyamagabe' })
    ).expect(200);
    expect(sectors.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Cyanika' }),
    ]));
    expect(sectors.body.data).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Gisozi' }),
    ]));

    const cells = await authenticated(
      request(app).get('/api/locations/cells').query({ district: 'Nyamagabe', sector: 'Cyanika' })
    ).expect(200);
    expect(cells.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Kiyumba' }),
    ]));
    expect(cells.body.data).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Bushigishigi' }),
    ]));

    const villages = await authenticated(
      request(app).get('/api/locations/villages').query({
        district: 'Nyamagabe',
        sector: 'Cyanika',
        cell: 'Kiyumba',
      })
    ).expect(200);
    expect(villages.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Gatare' }),
    ]));
    expect(villages.body.data).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Giharayumbu' }),
    ]));
  });

  it('rejects missing parent query parameters and safely empties invalid parents', async () => {
    await authenticated(request(app).get('/api/locations/cells').query({ district: 'Nyamagabe' }))
      .expect(422);

    const response = await authenticated(
      request(app).get('/api/locations/sectors').query({ district: 'Not a district' })
    ).expect(200);
    expect(response.body.data).toEqual([]);
  });
});
