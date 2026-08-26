jest.mock('../models', () => ({
  Cooperative: {},
  Farmer: {},
  Member: {
    create: jest.fn(),
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
  },
}));

const { Member } = require('../models');
const { create, list, update } = require('../controllers/memberController');

const response = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('member form persistence and organization isolation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates the focused Member fields in the signed-in organization with normalized identifiers', async () => {
    const body = {
      cooperative_id: 99,
      first_name: 'Aline',
      last_name: 'Uwase',
      national_id: '  1234567890123456  ',
      gender: 'female',
      phone: '0789329052',
      address: 'Kigali',
      membership_date: '2026-08-18',
    };
    Member.create.mockResolvedValue({
      id: 14,
      ...body,
      national_id: '1234567890123456',
      cooperative_id: 7,
      phone: '+250789329052',
    });
    const res = response();

    await create({ user: { role: 'cooperative_manager', cooperative_id: 7 }, body }, res);

    expect(Member.create).toHaveBeenCalledWith({
      ...body,
      national_id: '1234567890123456',
      cooperative_id: 7,
      phone: '+250789329052',
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('creates a super-admin Member in the explicitly selected organization', async () => {
    Member.create.mockResolvedValue({ id: 15 });
    const res = response();

    await create({
      user: { role: 'super_admin', cooperative_id: null },
      body: { cooperative_id: 9, first_name: 'Eric', last_name: 'Mugabo' },
    }, res);

    expect(Member.create).toHaveBeenCalledWith(expect.objectContaining({ cooperative_id: 9 }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('updates only submitted Member fields while preserving ID, organization, and legacy data', async () => {
    const member = {
      id: 42,
      cooperative_id: 7,
      national_id: 'legacy-national-id',
      phone: 'legacy-phone',
      membership_date: null,
      update: jest.fn().mockResolvedValue(undefined),
    };
    Member.findByPk.mockResolvedValue(member);
    const res = response();

    await update({
      user: { role: 'cooperative_manager', cooperative_id: 7 },
      params: { id: '42' },
      body: { address: 'Musanze', cooperative_id: 12 },
    }, res);

    expect(Member.findByPk).toHaveBeenCalledWith('42');
    expect(member.update).toHaveBeenCalledWith({ address: 'Musanze' });
    expect(member.id).toBe(42);
    expect(member.cooperative_id).toBe(7);
    expect(member.national_id).toBe('legacy-national-id');
    expect(member.phone).toBe('legacy-phone');
    expect(member.membership_date).toBeNull();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('normalizes a changed Member phone and supports clearing optional fields', async () => {
    const member = {
      id: 42,
      cooperative_id: 7,
      update: jest.fn().mockResolvedValue(undefined),
    };
    Member.findByPk.mockResolvedValue(member);
    const res = response();

    await update({
      user: { role: 'field_officer', cooperative_id: 7 },
      params: { id: '42' },
      body: { national_id: '   ', phone: '789329052', address: null, membership_date: null },
    }, res);

    expect(member.update).toHaveBeenCalledWith({
      national_id: null,
      phone: '+250789329052',
      address: null,
      membership_date: null,
    });
  });

  it('creates a Member with a validated residential hierarchy separate from farm location', async () => {
    const memberAddress = {
      address_district: 'Nyamagabe',
      address_sector: 'Buruhukiro',
      address_cell: 'Bushigishigi',
      address_village: 'Giharayumbu',
    };
    Member.create.mockResolvedValue({ id: 17, ...memberAddress });
    const res = response();

    await create({
      user: { role: 'cooperative_manager', cooperative_id: 7 },
      body: {
        first_name: 'Aline',
        last_name: 'Uwase',
        address: 'Near the market',
        ...memberAddress,
      },
    }, res);

    expect(Member.create).toHaveBeenCalledWith({
      first_name: 'Aline',
      last_name: 'Uwase',
      address: 'Near the market',
      ...memberAddress,
      cooperative_id: 7,
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('rejects an incomplete or incompatible Member residential hierarchy', async () => {
    const res = response();

    await create({
      user: { role: 'cooperative_manager', cooperative_id: 7 },
      body: {
        first_name: 'Aline',
        last_name: 'Uwase',
        address_district: 'Nyamagabe',
        address_sector: 'Buruhukiro',
      },
    }, res);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(Member.create).not.toHaveBeenCalled();
  });

  it('validates a changed parent against stored children and preserves legacy address', async () => {
    const member = {
      id: 42,
      cooperative_id: 7,
      address: 'Legacy contact address',
      address_district: 'Nyamagabe',
      address_sector: 'Buruhukiro',
      address_cell: 'Bushigishigi',
      address_village: 'Giharayumbu',
      update: jest.fn(),
    };
    Member.findByPk.mockResolvedValue(member);
    const res = response();

    await update({
      user: { role: 'cooperative_manager', cooperative_id: 7 },
      params: { id: '42' },
      body: { address_district: 'Gasabo' },
    }, res);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(member.update).not.toHaveBeenCalled();
    expect(member.address).toBe('Legacy contact address');
  });

  it('can clear structured Member address fields without clearing legacy address', async () => {
    const member = {
      id: 42,
      cooperative_id: 7,
      address: 'Legacy contact address',
      address_district: 'Nyamagabe',
      address_sector: 'Buruhukiro',
      address_cell: 'Bushigishigi',
      address_village: 'Giharayumbu',
      update: jest.fn().mockResolvedValue(undefined),
    };
    Member.findByPk.mockResolvedValue(member);
    const res = response();

    await update({
      user: { role: 'field_officer', cooperative_id: 7 },
      params: { id: '42' },
      body: {
        address_district: null,
        address_sector: null,
        address_cell: null,
        address_village: null,
      },
    }, res);

    expect(member.update).toHaveBeenCalledWith({
      address_district: null,
      address_sector: null,
      address_cell: null,
      address_village: null,
    });
    expect(member.address).toBe('Legacy contact address');
  });

  it('does not persist Farmer Profile or production fields through the Member endpoint', async () => {
    Member.create.mockResolvedValue({ id: 16 });
    const res = response();

    await create({
      user: { role: 'cooperative_manager', cooperative_id: 7 },
      body: {
        first_name: 'Aline',
        last_name: 'Uwase',
        crop_type: 'Coffee',
        farm_size_ha: 2,
        district: 'Gasabo',
        production_date: '2026-08-25',
      },
    }, res);

    expect(Member.create).toHaveBeenCalledWith({
      first_name: 'Aline',
      last_name: 'Uwase',
      cooperative_id: 7,
    });
  });

  it('blocks updates across organizations', async () => {
    const member = {
      id: 42,
      cooperative_id: 8,
      update: jest.fn(),
    };
    Member.findByPk.mockResolvedValue(member);
    const res = response();

    await update({
      user: { role: 'cooperative_manager', cooperative_id: 7 },
      params: { id: '42' },
      body: { address: 'Blocked' },
    }, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(member.update).not.toHaveBeenCalled();
  });

  it('scopes Member lists to the signed-in organization', async () => {
    Member.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
    const res = response();

    await list({
      user: { id: 3, role: 'cooperative_manager', cooperative_id: 7 },
      query: { cooperative_id: 8 },
    }, res);

    expect(Member.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { cooperative_id: 7 },
    }));
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
