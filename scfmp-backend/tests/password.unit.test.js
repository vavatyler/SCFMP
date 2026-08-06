const bcrypt = require('bcryptjs');

describe('Password hashing (used by the User model hooks)', () => {
  it('hashes a password and verifies a correct match', async () => {
    const plain = 'ChangeMe123!';
    const hash = await bcrypt.hash(plain, 10);

    expect(hash).not.toBe(plain);
    await expect(bcrypt.compare(plain, hash)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await bcrypt.hash('CorrectPassword1', 10);
    await expect(bcrypt.compare('WrongPassword1', hash)).resolves.toBe(false);
  });
});
