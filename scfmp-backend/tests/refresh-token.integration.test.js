const crypto = require('crypto');
const { buildTestDb } = require('./testDbHelper');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

describe('Refresh token persistence', () => {
  let sequelize;
  let models;

  beforeAll(async () => {
    ({ sequelize, models } = await buildTestDb());
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('stores only a token hash and supports one-time rotation state', async () => {
    const user = await models.User.create({
      first_name: 'Token',
      last_name: 'Tester',
      email: 'refresh@test.rw',
      password_hash: 'Harvest2026',
      role: 'cooperative_manager',
      status: 'active',
    });
    const rawToken = crypto.randomBytes(48).toString('hex');
    const token = await models.RefreshToken.create({
      user_id: user.id,
      token_hash: hashToken(rawToken),
      expires_at: new Date(Date.now() + 60_000),
    });

    expect(token.token_hash).not.toBe(rawToken);
    expect(token.token_hash).toHaveLength(64);
    const stored = await models.RefreshToken.findByPk(token.id);
    expect(stored.used_at).toBeNull();

    token.used_at = new Date();
    await token.save();
    const reloaded = await models.RefreshToken.findByPk(token.id);
    expect(reloaded.used_at).not.toBeNull();
  });
});
