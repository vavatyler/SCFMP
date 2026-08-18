import {
  FARMER_LOCATION_FIELDS,
  hasAnyLocation,
  hasCompleteLocation,
  hasLocationChanged,
} from './locationHierarchy.js';

export const FARMER_WRITE_ROLES = ['super_admin', 'cooperative_manager', 'field_officer'];

export const createEmptyFarmerForm = () => ({
  farm_size_ha: '',
  crop_type: '',
  district: '',
  sector: '',
  cell: '',
  village: '',
  legacy_location: '',
});

const normalizedText = (value) => String(value ?? '').trim();

export const farmerToForm = (farmer = {}) => {
  const hasStructuredLocation = hasAnyLocation(farmer, { includeVillage: true });
  return {
    farm_size_ha: farmer.farm_size_ha == null ? '' : String(farmer.farm_size_ha),
    crop_type: farmer.crop_type || '',
    district: farmer.district || '',
    sector: farmer.sector || '',
    cell: farmer.cell || '',
    village: farmer.village || '',
    legacy_location: hasStructuredLocation ? '' : farmer.location || '',
  };
};

export const isValidFarmSize = (value) => {
  const normalized = normalizedText(value);
  if (!normalized) return true;
  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(normalized)) return false;
  const numericValue = Number(normalized);
  return Number.isFinite(numericValue) && numericValue >= 0;
};

export const getFarmerLocationDisplay = (farmer = {}) => {
  if (farmer.location) return farmer.location;
  return [farmer.village, farmer.cell, farmer.sector, farmer.district]
    .map(normalizedText)
    .filter(Boolean)
    .join(', ');
};

export const buildFarmerPayload = (form, originalFarmer = null) => {
  const payload = {};
  const cropType = normalizedText(form.crop_type);
  const farmSize = normalizedText(form.farm_size_ha);

  if (!originalFarmer) {
    if (cropType) payload.crop_type = cropType;
    if (farmSize) payload.farm_size_ha = farmSize;
  } else {
    const original = farmerToForm(originalFarmer);
    if (cropType !== normalizedText(original.crop_type)) payload.crop_type = cropType || null;
    if (farmSize !== normalizedText(original.farm_size_ha)) payload.farm_size_ha = farmSize || null;
  }

  const locationChanged = !originalFarmer || hasLocationChanged(
    form,
    originalFarmer,
    { includeVillage: true }
  );
  const hasAnyStructuredLocation = hasAnyLocation(form, { includeVillage: true });
  const hasCompleteStructuredLocation = hasCompleteLocation(form, { includeVillage: true });

  if (locationChanged && hasCompleteStructuredLocation) {
    FARMER_LOCATION_FIELDS.forEach((field) => { payload[field] = normalizedText(form[field]); });
  } else if (locationChanged && originalFarmer && !hasAnyStructuredLocation) {
    FARMER_LOCATION_FIELDS.forEach((field) => { payload[field] = null; });
    payload.location = null;
  } else if (!originalFarmer && form.legacy_location) {
    payload.location = form.legacy_location;
  }

  return payload;
};
