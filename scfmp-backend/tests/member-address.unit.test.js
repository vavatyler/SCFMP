const {
  formatMemberAddress,
  hasStructuredMemberAddress,
  memberAddressChanged,
  memberAddressToHierarchy,
  mergeMemberAddress,
} = require('../utils/memberAddress');

const structuredAddress = {
  address_district: 'Nyamagabe',
  address_sector: 'Buruhukiro',
  address_cell: 'Bushigishigi',
  address_village: 'Giharayumbu',
};

describe('Member residential address utilities', () => {
  it('maps Member address fields without using Farmer location fields', () => {
    expect(memberAddressToHierarchy(structuredAddress)).toEqual({
      district: 'Nyamagabe',
      sector: 'Buruhukiro',
      cell: 'Bushigishigi',
      village: 'Giharayumbu',
    });
    expect(hasStructuredMemberAddress(structuredAddress)).toBe(true);
    expect(hasStructuredMemberAddress({ location: 'Farm location' })).toBe(false);
  });

  it('merges partial edits so server validation sees the complete stored hierarchy', () => {
    expect(mergeMemberAddress({ address_village: 'New village' }, structuredAddress)).toEqual({
      ...structuredAddress,
      address_village: 'New village',
    });
    expect(memberAddressChanged({ address_village: 'Giharayumbu' }, structuredAddress)).toBe(false);
    expect(memberAddressChanged({ address_village: 'New village' }, structuredAddress)).toBe(true);
  });

  it('reports structured residence and preserves additional legacy address details', () => {
    expect(formatMemberAddress(structuredAddress)).toBe(
      'Giharayumbu, Bushigishigi, Buruhukiro, Nyamagabe'
    );
    expect(formatMemberAddress({ address: 'Near the community market' })).toBe(
      'Near the community market'
    );
    expect(formatMemberAddress({ ...structuredAddress, address: 'Near the community market' })).toBe(
      'Giharayumbu, Bushigishigi, Buruhukiro, Nyamagabe — Near the community market'
    );
  });
});
