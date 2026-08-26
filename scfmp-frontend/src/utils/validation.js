export const RWANDA_PHONE_COUNTRY_CODE = '+250';
export const RWANDA_PHONE_LOCAL_LENGTH = 9;
export const RWANDA_NATIONAL_ID_LENGTH = 16;

export const toLocalRwandaPhone = (value = '') => {
  const phone = String(value).trim();
  if (!phone) return '';

  const compactPhone = phone.replace(/\s/g, '');
  if (/^\+250\d{9}$/.test(compactPhone)) return compactPhone.slice(4);
  if (/^250\d{9}$/.test(compactPhone)) return compactPhone.slice(3);
  if (/^0\d{9}$/.test(compactPhone)) return compactPhone.slice(1);
  if (/^\d{9}$/.test(compactPhone)) return compactPhone;
  return null;
};

export const isValidRwandaLocalPhone = (value) => /^\d{9}$/.test(String(value || ''));

export const isValidRwandaNationalId = (value) =>
  /^\d{16}$/.test(String(value ?? '').trim());

export const sanitizeRwandaPhoneInput = (value, currentValue = '') => {
  const input = String(value ?? '').trim();
  if (!input) return '';
  if (/^\d{1,9}$/.test(input)) return input;

  const localPhone = toLocalRwandaPhone(input);
  return localPhone ?? String(currentValue || '');
};

export const normalizeRwandaPhone = (value) => {
  if (!value) return '';
  const localPhone = toLocalRwandaPhone(value);
  return localPhone ? `${RWANDA_PHONE_COUNTRY_CODE}${localPhone}` : value;
};

export const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim());
