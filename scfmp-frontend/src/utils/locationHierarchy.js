export const ORGANIZATION_LOCATION_FIELDS = ['district', 'sector', 'cell'];
export const FARMER_LOCATION_FIELDS = [...ORGANIZATION_LOCATION_FIELDS, 'village'];

const fieldsFor = (includeVillage) => (
  includeVillage ? FARMER_LOCATION_FIELDS : ORGANIZATION_LOCATION_FIELDS
);

export const applyLocationChange = (value, field, fieldValue) => {
  if (field === 'district') {
    return { ...value, district: fieldValue, sector: '', cell: '', village: '' };
  }
  if (field === 'sector') {
    return { ...value, sector: fieldValue, cell: '', village: '' };
  }
  if (field === 'cell') {
    return { ...value, cell: fieldValue, village: '' };
  }
  return { ...value, village: fieldValue };
};

export const hasAnyLocation = (value, { includeVillage = false } = {}) => (
  fieldsFor(includeVillage).some((field) => String(value?.[field] || '').trim())
);

export const hasCompleteLocation = (value, { includeVillage = false } = {}) => (
  fieldsFor(includeVillage).every((field) => String(value?.[field] || '').trim())
);

export const hasLocationChanged = (value, original, { includeVillage = false } = {}) => (
  fieldsFor(includeVillage).some(
    (field) => String(value?.[field] || '').trim() !== String(original?.[field] || '').trim()
  )
);
