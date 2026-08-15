const { PASSWORD_MIN_LENGTH, validatePasswordStrength } = require('../utils/passwordPolicy');

describe('Password policy', () => {
  it('requires at least eight characters', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
    expect(validatePasswordStrength('Aa1short')).toBeNull();
    expect(validatePasswordStrength('Aa1tiny')).toMatch(/at least 8/i);
  });

  it.each([
    ['alllowercase1', 'uppercase'],
    ['ALLUPPERCASE1', 'lowercase'],
    ['NoDigitsHere', 'number'],
  ])('rejects a password missing a required character class: %s', (password) => {
    expect(validatePasswordStrength(password)).toMatch(/uppercase, lowercase, and a number/i);
  });

  it('accepts a strong password', () => {
    expect(validatePasswordStrength('Harvest2026')).toBeNull();
  });
});
