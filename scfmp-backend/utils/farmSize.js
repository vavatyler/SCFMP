const FARM_SIZE_UNITS = Object.freeze(['ha', 'acres', 'm2', 'km2']);

const FARM_SIZE_UNIT_SYMBOLS = Object.freeze({
  ha: 'ha',
  acres: 'acres',
  m2: 'm²',
  km2: 'km²',
});

const hasOwn = (value, field) => Object.prototype.hasOwnProperty.call(value || {}, field);
const hasFarmSizeValue = (value) => value !== null && String(value ?? '').trim() !== '';
const isValidPositiveFarmSize = (value) => {
  if (!hasFarmSizeValue(value)) return true;
  const normalized = String(value).trim();
  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(normalized)) return false;
  const numericValue = Number(normalized);
  return Number.isFinite(numericValue) && numericValue > 0;
};

const normalizeFarmSizePayload = (body = {}) => {
  const touchesNewFields = hasOwn(body, 'farm_size') || hasOwn(body, 'farm_size_unit');
  if (touchesNewFields) {
    const farmSize = hasFarmSizeValue(body.farm_size) ? String(body.farm_size).trim() : null;
    return {
      farm_size: farmSize,
      farm_size_unit: farmSize && hasFarmSizeValue(body.farm_size_unit)
        ? String(body.farm_size_unit).trim()
        : null,
    };
  }

  // Compatibility for older clients. The historical column is explicitly hectares.
  if (hasOwn(body, 'farm_size_ha')) {
    const farmSize = hasFarmSizeValue(body.farm_size_ha)
      ? String(body.farm_size_ha).trim()
      : null;
    return {
      farm_size_ha: farmSize,
      farm_size: farmSize,
      farm_size_unit: farmSize ? 'ha' : null,
    };
  }

  return {};
};

const getFarmSizeValue = (farmer = {}) => (
  hasFarmSizeValue(farmer.farm_size) ? farmer.farm_size : farmer.farm_size_ha
);

const getFarmSizeUnit = (farmer = {}) => (
  hasFarmSizeValue(getFarmSizeValue(farmer)) ? (farmer.farm_size_unit || 'ha') : null
);

const formatFarmSize = (farmer = {}) => {
  const value = getFarmSizeValue(farmer);
  const unit = getFarmSizeUnit(farmer);
  if (!hasFarmSizeValue(value) || !unit) return '';
  return `${value} ${FARM_SIZE_UNIT_SYMBOLS[unit] || unit}`;
};

module.exports = {
  FARM_SIZE_UNITS,
  formatFarmSize,
  getFarmSizeUnit,
  getFarmSizeValue,
  hasFarmSizeValue,
  isValidPositiveFarmSize,
  normalizeFarmSizePayload,
};
