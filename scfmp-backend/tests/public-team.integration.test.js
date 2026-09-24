const express = require('express');
const request = require('supertest');
const { buildTestDb } = require('./testDbHelper');

const mockModels = {};
jest.mock('../models', () => mockModels);

jest.setTimeout(30000);

describe('public Team profiles', () => {
  let sequelize;
  let models;
  let app;

  beforeAll(async () => {
    ({ sequelize, models } = await buildTestDb());
    Object.assign(mockModels, models);
    app = express();
    app.use('/api/public', require('../routes/publicTeamRoutes'));

    await models.TeamMember.bulkCreate([
      {
        full_name: 'Visible Team Member',
        position: 'Founder & CEO',
        biography: 'Approved public biography.',
        photo_url: 'https://images.example.test/visible.jpg',
        linkedin_url: 'https://linkedin.com/in/visible-team-member',
        github_url: 'https://github.com/visible-team-member',
        email: 'private@example.test',
        display_order: 1,
        status: 'active',
        profile_visibility: 'visible',
      },
      {
        full_name: 'Hidden Team Member',
        position: 'Co-Founder & IT Lead',
        status: 'active',
        profile_visibility: 'hidden',
      },
      {
        full_name: 'Inactive Team Member',
        position: 'Volunteer — AgriBridge & Field Systems Support',
        status: 'inactive',
        profile_visibility: 'visible',
      },
    ]);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('returns only active, approved profiles without private fields or database IDs', async () => {
    const response = await request(app).get('/api/public/team').expect(200);

    expect(response.body).toEqual({
      success: true,
      data: [expect.objectContaining({
        full_name: 'Visible Team Member',
        position: 'Founder & CEO',
        biography: 'Approved public biography.',
        photo_url: 'https://images.example.test/visible.jpg',
      })],
    });
    const profile = response.body.data[0];
    expect(profile).not.toHaveProperty('id');
    expect(profile).not.toHaveProperty('email');
    expect(profile).not.toHaveProperty('linked_user_id');
    expect(profile).not.toHaveProperty('status');
    expect(profile).not.toHaveProperty('permissions');
    expect(JSON.stringify(response.body)).not.toContain('Hidden Team Member');
    expect(JSON.stringify(response.body)).not.toContain('Inactive Team Member');
  });
});
