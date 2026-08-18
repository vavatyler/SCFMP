jest.mock('../models', () => ({
  Farmer: {
    create: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
  },
  Member: { findByPk: jest.fn() },
}));

const { Farmer, Member } = require('../models');
const { create, list, update } = require('../controllers/farmerController');
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

  it('creates a Farmer profile with crop, decimal hectares, and a valid structured location', async () => {
    const village = getVillages(baseLocation.district, baseLocation.sector, baseLocation.cell)[0].name;
    const body = {
      member_id: 5,
      crop_type: 'Coffee',
      farm_size_ha: '2.75',
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
      farm_size_ha: '1.50',
      location: 'Legacy free-text location',
      update: jest.fn().mockResolvedValue(undefined),
    };
    Farmer.findByPk.mockResolvedValue(farmer);
    const res = response();

    await update({
      params: { id: '9' },
      user: { role: 'field_officer', cooperative_id: 2 },
      body: { farm_size_ha: '2.75', member_id: 99 },
    }, res);

    expect(farmer.update).toHaveBeenCalledWith({ farm_size_ha: '2.75' });
    expect(farmer.id).toBe(9);
    expect(farmer.member_id).toBe(5);
    expect(farmer.crop_type).toBe('Coffee');
    expect(farmer.location).toBe('Legacy free-text location');
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
