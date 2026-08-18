const RWANDA_LOCAL_PHONE_PATTERN = /^\d{9}$/;
const RWANDA_NORMALIZED_PHONE_PATTERN = /^\+250\d{9}$/;
const RWANDA_LEGACY_PHONE_PATTERN = /^0\d{9}$/;

const toLocalRwandaPhone = (value = '') => {
  const phone = String(value).trim();

  if (RWANDA_NORMALIZED_PHONE_PATTERN.test(phone)) return phone.slice(4);
  if (/^250\d{9}$/.test(phone)) return phone.slice(3);
  if (RWANDA_LEGACY_PHONE_PATTERN.test(phone)) return phone.slice(1);
  if (RWANDA_LOCAL_PHONE_PATTERN.test(phone)) return phone;

  return null;
};

const isRwandaPhone = (value) => toLocalRwandaPhone(value) !== null;

const normalizeRwandaPhone = (value) => {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const localPhone = toLocalRwandaPhone(value);
  if (!localPhone) throw new Error('Phone must contain exactly 9 Rwanda local digits');
  return `+250${localPhone}`;
};

module.exports = {
  isRwandaPhone,
  normalizeRwandaPhone,
  toLocalRwandaPhone,
};
