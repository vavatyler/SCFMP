const { formatLocation } = require('../services/rwandaLocationService');

const MEMBER_ADDRESS_FIELDS = [
  'address_district',
  'address_sector',
  'address_cell',
  'address_village',
];

const memberAddressToHierarchy = (value = {}) => ({
  district: value.address_district,
  sector: value.address_sector,
  cell: value.address_cell,
  village: value.address_village,
});

const hasStructuredMemberAddress = (value) => MEMBER_ADDRESS_FIELDS.some(
  (field) => String(value?.[field] || '').trim()
);

const memberAddressChanged = (body, member = {}) => MEMBER_ADDRESS_FIELDS.some(
  (field) => Object.prototype.hasOwnProperty.call(body, field)
    && String(body[field] || '').trim() !== String(member?.[field] || '').trim()
);

const mergeMemberAddress = (body, member = {}) => Object.fromEntries(
  MEMBER_ADDRESS_FIELDS.map((field) => [
    field,
    Object.prototype.hasOwnProperty.call(body, field) ? body[field] : member[field],
  ])
);

const formatMemberAddress = (member = {}) => {
  const structured = formatLocation(memberAddressToHierarchy(member));
  const legacy = String(member.address || '').trim();

  if (!structured) return legacy;
  if (!legacy || structured.toLocaleLowerCase() === legacy.toLocaleLowerCase()) return structured;
  return `${structured} — ${legacy}`;
};

module.exports = {
  MEMBER_ADDRESS_FIELDS,
  formatMemberAddress,
  hasStructuredMemberAddress,
  memberAddressChanged,
  memberAddressToHierarchy,
  mergeMemberAddress,
};
