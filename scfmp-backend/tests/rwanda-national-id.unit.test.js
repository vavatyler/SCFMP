const {
  RWANDA_NATIONAL_ID_LENGTH,
  isRwandaNationalId,
  normalizeRwandaNationalId,
} = require('../utils/rwandaNationalId');

describe('Rwanda National ID validation and normalization', () => {
  const validNationalId = '1234567890123456';

  it('accepts exactly 16 numeric digits and trims boundary spaces', () => {
    expect(RWANDA_NATIONAL_ID_LENGTH).toBe(16);
    expect(isRwandaNationalId(validNationalId)).toBe(true);
    expect(isRwandaNationalId(`  ${validNationalId}  `)).toBe(true);
    expect(normalizeRwandaNationalId(`  ${validNationalId}  `)).toBe(validNationalId);
  });

  test.each([
    '123456789012345',
    '12345678901234567',
    '123456789012345A',
    '1234 56789012345',
    '1234-5678-9012-3456',
  ])('rejects invalid National ID %s', (nationalId) => {
    expect(isRwandaNationalId(nationalId)).toBe(false);
    expect(() => normalizeRwandaNationalId(nationalId))
      .toThrow('National ID must contain exactly 16 digits');
  });

  it('keeps the optional field nullable for existing members', () => {
    expect(normalizeRwandaNationalId('')).toBeNull();
    expect(normalizeRwandaNationalId('   ')).toBeNull();
    expect(normalizeRwandaNationalId(null)).toBeNull();
  });
});
