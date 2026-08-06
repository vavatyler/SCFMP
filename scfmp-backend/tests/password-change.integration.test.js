const { buildTestDb } = require('./testDbHelper');
const bcrypt = require('bcryptjs');

/**
 * Both PUT /api/auth/change-password and PUT /api/users/:id/reset-password work by
 * simply setting user.password_hash = newPlainPassword and calling user.save() —
 * relying entirely on the User model's beforeUpdate hook to re-hash it. This test
 * proves that mechanism actually works end-to-end against a real (in-memory) DB.
 */
describe('Password change/reset mechanism (User model rehashing on update)', () => {
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

  it('rehashes password_hash when it changes on an existing user, and the old password stops working', async () => {
    const { User } = models;

    const user = await User.create({
      first_name: 'Jean',
      last_name: 'Uwimana',
      email: 'jean-pwtest@coop.rw',
      password_hash: 'OriginalPass123',
      role: 'cooperative_manager',
      status: 'active',
    });

    expect(await user.comparePassword('OriginalPass123')).toBe(true);

    user.password_hash = 'NewPass456';
    await user.save();

    // Old password should no longer work, new one should
    expect(await user.comparePassword('OriginalPass123')).toBe(false);
    expect(await user.comparePassword('NewPass456')).toBe(true);

    // And the stored value must actually be hashed, never plaintext
    expect(user.password_hash).not.toBe('NewPass456');
    expect(user.password_hash.startsWith('$2')).toBe(true); // bcrypt hash prefix
  });
});
