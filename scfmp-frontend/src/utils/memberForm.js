import { normalizeRwandaPhone, toLocalRwandaPhone } from './validation.js';

export const MEMBER_WRITE_ROLES = ['super_admin', 'cooperative_manager', 'field_officer'];
export const MEMBER_DELETE_ROLES = ['super_admin', 'cooperative_manager'];
export const MEMBER_GENDERS = ['male', 'female', 'other'];
export const MEMBER_ADDRESS_FIELDS = [
  'address_district',
  'address_sector',
  'address_cell',
  'address_village',
];

export const MEMBER_FORM_FIELDS = [
  'first_name',
  'last_name',
  'national_id',
  'gender',
  'phone',
  'address',
  ...MEMBER_ADDRESS_FIELDS,
  'membership_date',
];

export const createEmptyMemberForm = () => ({
  first_name: '',
  last_name: '',
  national_id: '',
  gender: '',
  phone: '',
  address: '',
  address_district: '',
  address_sector: '',
  address_cell: '',
  address_village: '',
  membership_date: '',
});

const dateOnlyValue = (value) => value ? String(value).slice(0, 10) : '';
const normalizedValue = (value) => typeof value === 'string' ? value.trim() : value ?? '';

export const memberToForm = (member = {}) => ({
  first_name: member.first_name || '',
  last_name: member.last_name || '',
  national_id: member.national_id || '',
  gender: member.gender || '',
  phone: toLocalRwandaPhone(member.phone) ?? '',
  address: member.address || '',
  address_district: member.address_district || '',
  address_sector: member.address_sector || '',
  address_cell: member.address_cell || '',
  address_village: member.address_village || '',
  membership_date: dateOnlyValue(member.membership_date),
});

export const getMemberAddressLocation = (value = {}) => ({
  district: value.address_district || '',
  sector: value.address_sector || '',
  cell: value.address_cell || '',
  village: value.address_village || '',
});

export const applyMemberAddressLocation = (form, location) => ({
  ...form,
  address_district: location.district || '',
  address_sector: location.sector || '',
  address_cell: location.cell || '',
  address_village: location.village || '',
});

export const getMemberAddressDisplay = (member = {}) => {
  const { district, sector, cell, village } = getMemberAddressLocation(member);
  const structured = [village, cell, sector, district].filter(Boolean).join(', ');
  const legacy = String(member.address || '').trim();

  if (!structured) return legacy;
  if (!legacy || structured.toLocaleLowerCase() === legacy.toLocaleLowerCase()) return structured;
  return `${structured} — ${legacy}`;
};

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
