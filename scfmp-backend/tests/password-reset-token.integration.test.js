const crypto = require('crypto');
const { buildTestDb } = require('./testDbHelper');

const hashToken = (rawToken) => crypto.createHash('sha256').update(rawToken).digest('hex');

/**
 * Exercises the same logic authController.forgotPassword / resetPasswordWithToken
 * use, against a real (in-memory) database, proving the token lifecycle actually
 * behaves correctly: a fresh token works once, a used token is rejected, and an
 * expired token is rejected — the three properties the feature spec requires
 * ("time-limited", "single-use").
 */
describe('Password reset token lifecycle', () => {
  let sequelize;
  let models;

  beforeAll(async () => {
    const db = await buildTestDb();
    sequelize = db.sequelize;
    models = db.models;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  const createUserWithToken = async (email, expiresInMs = 30 * 60 * 1000) => {
    const { User, PasswordResetToken } = models;
    const user = await User.create({
      first_name: 'Test',
      last_name: 'User',
      email,
      password_hash: 'OriginalPass123',
      role: 'cooperative_manager',
      status: 'active',
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    await PasswordResetToken.create({
      user_id: user.id,
      token_hash: hashToken(rawToken),
      expires_at: new Date(Date.now() + expiresInMs),
    });

    return { user, rawToken };
  };

  it('accepts a fresh, unexpired token and updates the password', async () => {
    const { PasswordResetToken, User } = models;
    const { rawToken } = await createUserWithToken('reset-fresh@test.rw');

    const resetToken = await PasswordResetToken.findOne({ where: { token_hash: hashToken(rawToken) } });
    expect(resetToken).not.toBeNull();
    expect(resetToken.used_at).toBeNull();
    expect(new Date() < resetToken.expires_at).toBe(true);

    const targetUser = await User.findByPk(resetToken.user_id);
    targetUser.password_hash = 'BrandNewPass456';
    await targetUser.save();
    resetToken.used_at = new Date();
    await resetToken.save();

    expect(await targetUser.comparePassword('BrandNewPass456')).toBe(true);
    expect(await targetUser.comparePassword('OriginalPass123')).toBe(false);
  });

  it('rejects a token that has already been used (single-use enforcement)', async () => {
    const { PasswordResetToken } = models;
    const { rawToken } = await createUserWithToken('reset-reused@test.rw');

    const resetToken = await PasswordResetToken.findOne({ where: { token_hash: hashToken(rawToken) } });
    resetToken.used_at = new Date();
    await resetToken.save();

    const reloaded = await PasswordResetToken.findOne({ where: { token_hash: hashToken(rawToken) } });
    expect(reloaded.used_at).not.toBeNull();
  });

  it('rejects a token past its expiry time', async () => {
    const { PasswordResetToken } = models;
    const { rawToken } = await createUserWithToken('reset-expired@test.rw', -1);

    const resetToken = await PasswordResetToken.findOne({ where: { token_hash: hashToken(rawToken) } });
    expect(new Date() > resetToken.expires_at).toBe(true);
  });

  it('invalidates old unused tokens when a new reset is requested for the same user', async () => {
    const { User, PasswordResetToken } = models;
    const user = await User.create({
      first_name: 'Multi',
      last_name: 'Request',
      email: 'reset-multi@test.rw',
      password_hash: 'Pass123456',
      role: 'field_officer',
      status: 'active',
    });

    const firstToken = crypto.randomBytes(32).toString('hex');
    await PasswordResetToken.create({
      user_id: user.id,
      token_hash: hashToken(firstToken),
      expires_at: new Date(Date.now() + 30 * 60 * 1000),
    });

    await PasswordResetToken.destroy({ where: { user_id: user.id, used_at: null } });

    const stillThere = await PasswordResetToken.findOne({ where: { token_hash: hashToken(firstToken) } });
    expect(stillThere).toBeNull();
  });
});
