const { rwandaLocation } = require('@devrw/rwanda-location');

const normalizeName = (value) => String(value || '').trim().toLocaleLowerCase('en');
const sameName = (left, right) => normalizeName(left) === normalizeName(right);
const item = ({ code, name }) => ({ code: String(code), name });

const findDistrict = (districtName) =>
  rwandaLocation.getDistricts().find((district) => sameName(district.name, districtName));

const findSector = (districtName, sectorName) => {
  const district = findDistrict(districtName);
  if (!district) return null;
  return rwandaLocation
    .getSectors(district.code)
    .find((sector) => sameName(sector.name, sectorName)) || null;
};

const findCell = (districtName, sectorName, cellName) => {
  const sector = findSector(districtName, sectorName);
  if (!sector) return null;
  return rwandaLocation
    .getCells(sector.code)
    .find((cell) => sameName(cell.name, cellName)) || null;
};

const getDistricts = () => rwandaLocation.getDistricts().map(item);

const getSectors = (districtName) => {
  const district = findDistrict(districtName);
  return district ? rwandaLocation.getSectors(district.code).map(item) : [];
};

const getCells = (districtName, sectorName) => {
  const sector = findSector(districtName, sectorName);
  return sector ? rwandaLocation.getCells(sector.code).map(item) : [];
};

const getVillages = (districtName, sectorName, cellName) => {
  const cell = findCell(districtName, sectorName, cellName);
  return cell ? rwandaLocation.getVillages(cell.code).map(item) : [];
};

const validateHierarchy = ({ district, sector, cell, village }, { requireVillage = false } = {}) => {
  const hasAnyValue = [district, sector, cell, village].some((value) => String(value || '').trim());
  if (!hasAnyValue) return { valid: true };

  if (!district || !findDistrict(district)) {
    return { valid: false, error: 'Select a valid Rwanda district' };
  }
  if (!sector || !findSector(district, sector)) {
    return { valid: false, error: 'Select a sector that belongs to the selected district' };
  }
  if (!cell || !findCell(district, sector, cell)) {
    return { valid: false, error: 'Select a cell that belongs to the selected sector' };
  }
  if (requireVillage) {
    const villages = getVillages(district, sector, cell);
    if (!village || !villages.some((entry) => sameName(entry.name, village))) {
      return { valid: false, error: 'Select a village that belongs to the selected cell' };
    }
  } else if (village) {
    const villages = getVillages(district, sector, cell);
    if (!villages.some((entry) => sameName(entry.name, village))) {
      return { valid: false, error: 'Select a village that belongs to the selected cell' };
    }
  }

  return { valid: true };
};

const formatLocation = ({ district, sector, cell, village }) =>
  [village, cell, sector, district].filter(Boolean).join(', ');

module.exports = {
  formatLocation,
  getCells,
  getDistricts,
  getSectors,
  getVillages,
  validateHierarchy,
};
