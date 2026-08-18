import { normalizeRwandaPhone, toLocalRwandaPhone } from './validation.js';

export const ORGANIZATION_TYPES = [
  'cooperative',
  'farmer_group',
  'sme',
  'school',
  'association',
  'ngo',
  'other',
];

export const ORGANIZATION_FORM_FIELDS = [
  'organization_type',
  'name',
  'registration_number',
  'district',
  'sector',
  'cell',
  'phone',
  'email',
];

export const createEmptyOrganizationForm = () => ({
  organization_type: 'cooperative',
  name: '',
  registration_number: '',
  district: '',
  sector: '',
  cell: '',
  phone: '',
  email: '',
});

const normalizedValue = (value) => typeof value === 'string' ? value.trim() : value ?? '';

export const organizationToForm = (organization = {}) => ({
  organization_type: organization.organization_type || 'cooperative',
  name: organization.name || '',
  registration_number: organization.registration_number || '',
  district: organization.district || '',
  sector: organization.sector || '',
  cell: organization.cell || '',
  phone: toLocalRwandaPhone(organization.phone) ?? '',
  email: organization.email || '',
});

export const buildOrganizationPayload = (form, originalOrganization = null) => {
  const payload = {};
  const original = originalOrganization ? organizationToForm(originalOrganization) : null;

  ORGANIZATION_FORM_FIELDS.forEach((field) => {
    const value = normalizedValue(form[field]);

    if (!original) {
      if (field === 'name' || field === 'organization_type' || value !== '') payload[field] = value;
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
