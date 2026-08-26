const RWANDA_NATIONAL_ID_LENGTH = 16;
const RWANDA_NATIONAL_ID_PATTERN = /^\d{16}$/;

const isRwandaNationalId = (value) =>
  RWANDA_NATIONAL_ID_PATTERN.test(String(value ?? '').trim());

const normalizeRwandaNationalId = (value) => {
  if (value === undefined || value === null || String(value).trim() === '') return null;

  const nationalId = String(value).trim();
  if (!isRwandaNationalId(nationalId)) {
    throw new Error(`National ID must contain exactly ${RWANDA_NATIONAL_ID_LENGTH} digits`);
  }
  return nationalId;
};

module.exports = {
  RWANDA_NATIONAL_ID_LENGTH,
  isRwandaNationalId,
  normalizeRwandaNationalId,
};
