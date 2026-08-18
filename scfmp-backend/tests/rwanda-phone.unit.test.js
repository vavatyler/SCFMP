const {
  isRwandaPhone,
  normalizeRwandaPhone,
  toLocalRwandaPhone,
} = require('../utils/rwandaPhone');

describe('Rwanda phone validation and normalization', () => {
  test.each([
    ['789329052', '789329052'],
    ['0789329052', '789329052'],
    ['250789329052', '789329052'],
    ['+250789329052', '789329052'],
  ])('accepts %s and extracts its local number', (input, expected) => {
    expect(isRwandaPhone(input)).toBe(true);
    expect(toLocalRwandaPhone(input)).toBe(expected);
    expect(normalizeRwandaPhone(input)).toBe('+250789329052');
  });

  test.each([
    '78932',
    '78932905',
    '7893290521',
    '+251789329052',
    '+250+250789329052',
    '+25078932905',
    '+2507893290521',
    '78A329052',
    '789.329.052',
  ])('rejects %s', (input) => {
    expect(isRwandaPhone(input)).toBe(false);
    expect(() => normalizeRwandaPhone(input)).toThrow('Phone must contain exactly 9 Rwanda local digits');
  });

  test('keeps optional empty values nullable', () => {
    expect(normalizeRwandaPhone('')).toBeNull();
    expect(normalizeRwandaPhone(null)).toBeNull();
  });
});
