import assert from 'node:assert/strict';
import {
  buildMemberPayload,
  createEmptyMemberForm,
  getMemberAddressDisplay,
  getMemberAddressLocation,
  applyMemberAddressLocation,
  MEMBER_ADDRESS_FIELDS,
  MEMBER_FORM_FIELDS,
  memberToForm,
} from '../src/utils/memberForm.js';
import { applyLocationChange } from '../src/utils/locationHierarchy.js';
import { isValidRwandaNationalId } from '../src/utils/validation.js';

const validNationalId = '1234567890123456';

assert.equal(isValidRwandaNationalId(validNationalId), true);
assert.equal(isValidRwandaNationalId(`  ${validNationalId}  `), true);
[
  '123456789012345',
  '12345678901234567',
  '123456789012345A',
  '1234 56789012345',
].forEach((nationalId) => assert.equal(isValidRwandaNationalId(nationalId), false));

const createPayload = buildMemberPayload({
  ...createEmptyMemberForm(),
  first_name: ' Aline ',
  last_name: ' Uwase ',
  national_id: `  ${validNationalId}  `,
});
assert.deepEqual(createPayload, {
  first_name: 'Aline',
  last_name: 'Uwase',
  national_id: validNationalId,
});

const legacyMember = {
  first_name: 'Legacy',
  last_name: 'Member',
  national_id: 'legacy-value',
};
const unchangedLegacyPayload = buildMemberPayload(memberToForm(legacyMember), legacyMember);
assert.equal(Object.hasOwn(unchangedLegacyPayload, 'national_id'), false);

const existingMember = {
  first_name: 'Existing',
  last_name: 'Member',
  national_id: validNationalId,
};
const clearedForm = memberToForm(existingMember);
clearedForm.national_id = '';
assert.equal(buildMemberPayload(clearedForm, existingMember).national_id, null);

['crop_type', 'farm_size_ha', 'district', 'production_date'].forEach((field) => {
  assert.equal(MEMBER_FORM_FIELDS.includes(field), false);
});

const structuredAddress = {
  district: 'Nyamagabe',
  sector: 'Buruhukiro',
  cell: 'Bushigishigi',
  village: 'Giharayumbu',
};
let addressForm = applyMemberAddressLocation(createEmptyMemberForm(), structuredAddress);
assert.deepEqual(getMemberAddressLocation(addressForm), structuredAddress);
assert.equal(getMemberAddressDisplay(addressForm), 'Giharayumbu, Bushigishigi, Buruhukiro, Nyamagabe');

addressForm = applyMemberAddressLocation(
  addressForm,
  applyLocationChange(getMemberAddressLocation(addressForm), 'district', 'Gasabo')
);
assert.deepEqual(getMemberAddressLocation(addressForm), {
  district: 'Gasabo',
  sector: '',
  cell: '',
  village: '',
});

const legacyAddressMember = {
  first_name: 'Legacy',
  last_name: 'Address',
  address: 'Near the community market',
};
const legacyAddressEdit = memberToForm(legacyAddressMember);
legacyAddressEdit.first_name = 'Updated';
const legacyAddressPayload = buildMemberPayload(legacyAddressEdit, legacyAddressMember);
assert.equal(Object.hasOwn(legacyAddressPayload, 'address'), false);
MEMBER_ADDRESS_FIELDS.forEach((field) => {
  assert.equal(Object.hasOwn(legacyAddressPayload, field), false);
  assert.equal(MEMBER_FORM_FIELDS.includes(field), true);
});
assert.equal(getMemberAddressDisplay(legacyAddressMember), 'Near the community market');

console.log('Member National ID and residential address validation, cascading, legacy preservation, and form separation passed.');
