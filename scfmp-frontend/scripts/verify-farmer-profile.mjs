import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildFarmerPayload,
  createEmptyFarmerForm,
  farmerToForm,
  getFarmSizeDisplay,
  isValidFarmSize,
} from '../src/utils/farmerForm.js';
import { applyLocationChange } from '../src/utils/locationHierarchy.js';

const profilePayload = {
  ...buildFarmerPayload({
    ...createEmptyFarmerForm(),
    crop_type: ' Coffee ',
    farm_size: '2.75',
    farm_size_unit: 'acres',
    district: 'Nyamagabe',
    sector: 'Buruhukiro',
    cell: 'Bushigishigi',
    village: 'Giharayumbu',
  }),
  member_id: 42,
};

assert.deepEqual(profilePayload, {
  crop_type: 'Coffee',
  farm_size: '2.75',
  farm_size_unit: 'acres',
  district: 'Nyamagabe',
  sector: 'Buruhukiro',
  cell: 'Bushigishigi',
  village: 'Giharayumbu',
  member_id: 42,
});

['first_name', 'last_name', 'national_id', 'gender', 'phone', 'address'].forEach((field) => {
  assert.equal(Object.hasOwn(profilePayload, field), false, `${field} must remain on Member`);
});

const apiSource = readFileSync(new URL('../src/api/farmers.js', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('../src/pages/FarmersPage.jsx', import.meta.url), 'utf8');
const memberDetailSource = readFileSync(new URL('../src/pages/MemberDetailPage.jsx', import.meta.url), 'utf8');
const farmSizeFieldsSource = readFileSync(new URL('../src/components/FarmSizeFields.jsx', import.meta.url), 'utf8');

assert.match(apiSource, /['"]\/farmers\/eligible-members['"]/);
assert.match(pageSource, /listEligibleFarmerMembers\(cooperativeScope\)/);
assert.match(pageSource, /<select[\s\S]*id="farmer-member"/);
assert.match(pageSource, /member_id:\s*Number\(selectedMemberId\)/);
assert.match(pageSource, /<FarmSizeFields/);
assert.doesNotMatch(pageSource, /name="(?:first_name|last_name|national_id|phone|address)"/);
assert.match(memberDetailSource, /createFarmer\(\{ \.\.\.payload, member_id: Number\(id\) \}\)/);
assert.match(farmSizeFieldsSource, /FARM_SIZE_UNIT_OPTIONS\.map/);

['1', '0.01', '.75', '12.3456'].forEach((value) => assert.equal(isValidFarmSize(value), true));
['0', '-1', 'abc', '1 hectare'].forEach((value) => assert.equal(isValidFarmSize(value), false));
const legacyForm = farmerToForm({ farm_size_ha: '3.50' });
assert.equal(legacyForm.farm_size, '3.50');
assert.equal(legacyForm.farm_size_unit, 'ha');
assert.equal(getFarmSizeDisplay({ farm_size: '2.75', farm_size_unit: 'm2' }), '2.75 m²');

const completeLocation = {
  district: 'Nyamagabe',
  sector: 'Cyanika',
  cell: 'Kiyumba',
  village: 'Gatare',
};
assert.deepEqual(applyLocationChange(completeLocation, 'district', 'Gasabo'), {
  district: 'Gasabo', sector: '', cell: '', village: '',
});
assert.deepEqual(applyLocationChange(completeLocation, 'sector', 'Gasaka'), {
  district: 'Nyamagabe', sector: 'Gasaka', cell: '', village: '',
});
assert.deepEqual(applyLocationChange(completeLocation, 'cell', 'Karama'), {
  district: 'Nyamagabe', sector: 'Cyanika', cell: 'Karama', village: '',
});
assert.deepEqual(applyLocationChange(completeLocation, 'village', 'Kaviri'), {
  district: 'Nyamagabe', sector: 'Cyanika', cell: 'Kiyumba', village: 'Kaviri',
});
assert.match(pageSource, /RwandaLocationFields[\s\S]*includeVillage/);
assert.match(memberDetailSource, /RwandaLocationFields[\s\S]*includeVillage/);

console.log('Farmer Profile creation links an organization-scoped existing Member and stores farming fields only.');
