const {
  formatLocation,
  getCells,
  getDistricts,
  getSectors,
  getVillages,
  validateHierarchy,
} = require('../services/rwandaLocationService');

describe('Rwanda administrative hierarchy', () => {
  const location = {
    district: 'Nyamagabe',
    sector: 'Buruhukiro',
    cell: 'Bushigishigi',
    village: 'Giharayumbu',
  };

  it('provides dependent district, sector, cell, and village options', () => {
    expect(getDistricts()).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Nyamagabe' }),
    ]));
    expect(getSectors(location.district)).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: location.sector }),
    ]));
    expect(getCells(location.district, location.sector)).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: location.cell }),
    ]));
    expect(getVillages(location.district, location.sector, location.cell)).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: location.village })])
    );
  });

  it('validates parent-child relationships case-insensitively', () => {
    expect(validateHierarchy(location, { requireVillage: true })).toEqual({ valid: true });
    expect(validateHierarchy({
      district: 'nyamagabe',
      sector: 'buruhukiro',
      cell: 'bushigishigi',
      village: 'giharayumbu',
    }, { requireVillage: true })).toEqual({ valid: true });
  });

  it('rejects an invalid hierarchy and formats a valid legacy display value', () => {
    expect(validateHierarchy({ ...location, sector: 'Gasaka' }, { requireVillage: true }))
      .toMatchObject({ valid: false });
    expect(validateHierarchy({ ...location, cell: 'Invalid cell' }, { requireVillage: true }))
      .toMatchObject({ valid: false });
    expect(validateHierarchy({ ...location, village: 'Invalid village' }, { requireVillage: true }))
      .toMatchObject({ valid: false });
    expect(formatLocation(location)).toBe('Giharayumbu, Bushigishigi, Buruhukiro, Nyamagabe');
  });
});
