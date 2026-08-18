import { normalizeRwandaPhone, toLocalRwandaPhone } from './validation.js';

export const MEMBER_WRITE_ROLES = ['super_admin', 'cooperative_manager', 'field_officer'];
export const MEMBER_DELETE_ROLES = ['super_admin', 'cooperative_manager'];
export const MEMBER_GENDERS = ['male', 'female', 'other'];

export const MEMBER_FORM_FIELDS = [
  'first_name',
  'last_name',
  'gender',
  'phone',
  'address',
  'membership_date',
];

export const createEmptyMemberForm = () => ({
  first_name: '',
  last_name: '',
  gender: '',
  phone: '',
  address: '',
  membership_date: '',
});

const dateOnlyValue = (value) => value ? String(value).slice(0, 10) : '';
const normalizedValue = (value) => typeof value === 'string' ? value.trim() : value ?? '';

export const memberToForm = (member = {}) => ({
  first_name: member.first_name || '',
  last_name: member.last_name || '',
  gender: member.gender || '',
  phone: toLocalRwandaPhone(member.phone) ?? '',
  address: member.address || '',
  membership_date: dateOnlyValue(member.membership_date),
});

export const buildMemberPayload = (form, originalMember = null) => {
  const payload = {};
  const original = originalMember ? memberToForm(originalMember) : null;

  MEMBER_FORM_FIELDS.forEach((field) => {
    const value = normalizedValue(form[field]);

    if (!original) {
      if (field === 'first_name' || field === 'last_name' || value !== '') payload[field] = value;
      return;
    }

    const originalValue = normalizedValue(original[field]);
    if (value !== originalValue) payload[field] = value === '' ? null : value;
  });

  if (typeof payload.phone === 'string' && payload.phone) {
    payload.phone = normalizeRwandaPhone(payload.phone);
  }

  return payload;
};
