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
  const requestedExample = {
    district: 'Nyamagabe',
    sector: 'Cyanika',
    cell: 'Kiyumba',
    village: 'Gatare',
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

  it('validates the requested Nyamagabe, Cyanika, Kiyumba hierarchy', () => {
    expect(getSectors(requestedExample.district)).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: requestedExample.sector }),
    ]));
    expect(getCells(requestedExample.district, requestedExample.sector)).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: requestedExample.cell })])
    );
    expect(getVillages(
      requestedExample.district,
      requestedExample.sector,
      requestedExample.cell
    )).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: requestedExample.village }),
    ]));
    expect(validateHierarchy(requestedExample, { requireVillage: true })).toEqual({ valid: true });
  });

  it('rejects each impossible parent-child relationship with a specific error', () => {
    expect(validateHierarchy({
      ...requestedExample,
      sector: 'Gisozi',
    }, { requireVillage: true })).toEqual({
      valid: false,
      error: 'Select a sector that belongs to the selected district',
    });
    expect(validateHierarchy({
      ...requestedExample,
      cell: 'Bushigishigi',
    }, { requireVillage: true })).toEqual({
      valid: false,
      error: 'Select a cell that belongs to the selected sector',
    });
    expect(validateHierarchy({
      ...requestedExample,
      village: 'Giharayumbu',
    }, { requireVillage: true })).toEqual({
      valid: false,
      error: 'Select a village that belongs to the selected cell',
    });
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
