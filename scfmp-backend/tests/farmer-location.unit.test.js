jest.mock('../models', () => ({
  Farmer: {
    create: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
  },
  Member: { findAll: jest.fn(), findByPk: jest.fn() },
}));

const { Farmer, Member } = require('../models');
const {
  create,
  eligibleMembers,
  list,
  update,
} = require('../controllers/farmerController');
const { getVillages } = require('../services/rwandaLocationService');

const response = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const baseLocation = {
  district: 'Nyamagabe',
  sector: 'Buruhukiro',
  cell: 'Bushigishigi',
};

describe('farmer location persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Member.findByPk.mockResolvedValue({ id: 5, cooperative_id: 2 });
    Farmer.findOne.mockResolvedValue(null);
  });

  it('rejects a village outside the selected cell', async () => {
    const res = response();

    await create({
      user: { role: 'super_admin' },
      body: { member_id: 5, ...baseLocation, village: 'Invalid village' },
    }, res);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(Farmer.create).not.toHaveBeenCalled();
  });

  it.each([
    [
      { district: 'Nyamagabe', sector: 'Gisozi', cell: 'Musezero', village: 'Kagara' },
      'Select a sector that belongs to the selected district',
    ],
    [
      { district: 'Nyamagabe', sector: 'Cyanika', cell: 'Bushigishigi', village: 'Giharayumbu' },
      'Select a cell that belongs to the selected sector',
    ],
    [
      { district: 'Nyamagabe', sector: 'Cyanika', cell: 'Kiyumba', village: 'Giharayumbu' },
      'Select a village that belongs to the selected cell',
    ],
  ])('rejects impossible Farmer hierarchy %# server-side', async (invalidLocation, message) => {
    const res = response();

    await create({
      user: { role: 'cooperative_manager', cooperative_id: 2 },
      body: { member_id: 5, ...invalidLocation },
    }, res);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ success: false, message });
    expect(Farmer.create).not.toHaveBeenCalled();
  });

  it('lists only members without Farmer Profiles in the authenticated organization', async () => {
    Member.findAll.mockResolvedValue([
      { id: 8, first_name: 'Alice', last_name: 'MUKAGASANA' },
      { id: 5, first_name: 'Valentin', last_name: 'TUYISHIME' },
    ]);
    const res = response();

    await eligibleMembers({
      user: { role: 'cooperative_manager', cooperative_id: 2 },
      query: { cooperative_id: 99 },
    }, res);

    expect(Member.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        cooperative_id: 2,
        '$farmerProfile.id$': null,
      },
      include: [expect.objectContaining({
        model: Farmer,
        as: 'farmerProfile',
        required: false,
      })],
    }));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('requires Super Admin to select the current organization for eligible members', async () => {
    const res = response();

    await eligibleMembers({ user: { role: 'super_admin' }, query: {} }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Member.findAll).not.toHaveBeenCalled();
  });

  it('creates a Farmer profile with a decimal size, unit, and valid structured location', async () => {
    const village = getVillages(baseLocation.district, baseLocation.sector, baseLocation.cell)[0].name;
    const body = {
      member_id: 5,
      crop_type: 'Coffee',
      farm_size: '2.75',
      farm_size_unit: 'acres',
      ...baseLocation,
      village,
    };
    Farmer.create.mockResolvedValue({ id: 9, ...body });
    const res = response();

    await create({ user: { role: 'cooperative_manager', cooperative_id: 2 }, body }, res);

    expect(Farmer.create).toHaveBeenCalledWith({
      ...body,
      location: `${village}, Bushigishigi, Buruhukiro, Nyamagabe`,
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('does not pass protected or unknown fields into Farmer creation', async () => {
    const body = {
      member_id: 5,
      crop_type: 'Coffee',
      id: 999,
      created_at: '2000-01-01T00:00:00.000Z',
      unexpected_field: 'must not reach Sequelize',
    };
    Farmer.create.mockResolvedValue({ id: 9, member_id: 5, crop_type: 'Coffee' });
    const res = response();

    await create({ user: { role: 'cooperative_manager', cooperative_id: 2 }, body }, res);

    expect(Farmer.create).toHaveBeenCalledWith({ member_id: 5, crop_type: 'Coffee' });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('does not create a duplicate Farmer Profile for an existing Member link', async () => {
    Farmer.findOne.mockResolvedValue({ id: 9, member_id: 5 });
    const res = response();

    await create({
      user: { role: 'cooperative_manager', cooperative_id: 2 },
      body: { member_id: 5, crop_type: 'Coffee' },
    }, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(Farmer.create).not.toHaveBeenCalled();
  });

  it('maps a database uniqueness race to the existing duplicate-profile response', async () => {
    Farmer.create.mockRejectedValue({ name: 'SequelizeUniqueConstraintError' });
    const res = response();

    await create({
      user: { role: 'cooperative_manager', cooperative_id: 2 },
      body: { member_id: 5, crop_type: 'Coffee' },
    }, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('merges a changed location with saved parents instead of nulling them', async () => {
    const village = getVillages(baseLocation.district, baseLocation.sector, baseLocation.cell)[0].name;
    const farmer = {
      id: 9,
      member_id: 5,
      member: { cooperative_id: 2 },
      ...baseLocation,
      village: null,
      update: jest.fn().mockResolvedValue(undefined),
    };
    Farmer.findByPk.mockResolvedValue(farmer);
    const res = response();

    await update({
      params: { id: '9' },
      user: { role: 'super_admin' },
      body: { village },
    }, res);

    expect(farmer.update).toHaveBeenCalledWith({
      ...baseLocation,
      village,
      location: `${village}, Bushigishigi, Buruhukiro, Nyamagabe`,
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('rejects a parent change that would retain incompatible saved children', async () => {
    const farmer = {
      id: 9,
      member_id: 5,
      member: { cooperative_id: 2 },
      district: 'Nyamagabe',
      sector: 'Buruhukiro',
      cell: 'Bushigishigi',
      village: 'Giharayumbu',
      update: jest.fn().mockResolvedValue(undefined),
    };
    Farmer.findByPk.mockResolvedValue(farmer);
    const res = response();

    await update({
      params: { id: '9' },
      user: { role: 'field_officer', cooperative_id: 2 },
      body: { sector: 'Cyanika' },
    }, res);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Select a cell that belongs to the selected sector',
    });
    expect(farmer.update).not.toHaveBeenCalled();
  });

  it('preserves legacy free-text location during unrelated updates', async () => {
    const farmer = {
      id: 9,
      member_id: 5,
      member: { cooperative_id: 2 },
      location: 'Legacy free-text location',
      district: null,
      sector: null,
      cell: null,
      village: null,
      update: jest.fn().mockResolvedValue(undefined),
    };
    Farmer.findByPk.mockResolvedValue(farmer);
    const res = response();

    await update({
      params: { id: '9' },
      user: { role: 'super_admin' },
      body: { crop_type: 'Coffee' },
    }, res);

    expect(farmer.update).toHaveBeenCalledWith({ crop_type: 'Coffee' });
    expect(farmer.location).toBe('Legacy free-text location');
  });

  it('updates only submitted profile values while preserving Farmer and Member relationships', async () => {
    const farmer = {
      id: 9,
      member_id: 5,
      member: { cooperative_id: 2 },
      crop_type: 'Coffee',
      farm_size: '1.50',
      farm_size_unit: 'ha',
      location: 'Legacy free-text location',
      update: jest.fn().mockResolvedValue(undefined),
    };
    Farmer.findByPk.mockResolvedValue(farmer);
    const res = response();

    await update({
      params: { id: '9' },
      user: { role: 'field_officer', cooperative_id: 2 },
      body: { farm_size: '2.75', farm_size_unit: 'm2', member_id: 99 },
    }, res);

    expect(farmer.update).toHaveBeenCalledWith({ farm_size: '2.75', farm_size_unit: 'm2' });
    expect(farmer.id).toBe(9);
    expect(farmer.member_id).toBe(5);
    expect(farmer.crop_type).toBe('Coffee');
    expect(farmer.location).toBe('Legacy free-text location');
  });

  it('maps legacy hectare writes into the new fields without changing the legacy value', async () => {
    const farmer = {
      id: 9,
      member_id: 5,
      member: { cooperative_id: 2 },
      update: jest.fn().mockResolvedValue(undefined),
    };
    Farmer.findByPk.mockResolvedValue(farmer);
    const res = response();

    await update({
      params: { id: '9' },
      user: { role: 'field_officer', cooperative_id: 2 },
      body: { farm_size_ha: '1.25' },
    }, res);

    expect(farmer.update).toHaveBeenCalledWith({
      farm_size_ha: '1.25',
      farm_size: '1.25',
      farm_size_unit: 'ha',
    });
  });

  it('blocks Farmer edits across organizations', async () => {
    const farmer = {
      id: 9,
      member_id: 5,
      member: { cooperative_id: 3 },
      update: jest.fn(),
    };
    Farmer.findByPk.mockResolvedValue(farmer);
    const res = response();

    await update({
      params: { id: '9' },
      user: { role: 'cooperative_manager', cooperative_id: 2 },
      body: { crop_type: 'Tea' },
    }, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(farmer.update).not.toHaveBeenCalled();
  });

  it('scopes Farmer lists to the signed-in organization', async () => {
    Farmer.findAll.mockResolvedValue([]);
    const res = response();

    await list({
      user: { id: 3, role: 'cooperative_manager', cooperative_id: 2 },
      query: { cooperative_id: 8 },
    }, res);

    expect(Farmer.findAll).toHaveBeenCalledWith(expect.objectContaining({
      include: [expect.objectContaining({ where: { cooperative_id: 2 } })],
    }));
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
