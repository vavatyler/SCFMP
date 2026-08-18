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

  it('creates all six form fields in the signed-in user organization with normalized phone storage', async () => {
    const body = {
      cooperative_id: 99,
      first_name: 'Aline',
      last_name: 'Uwase',
      gender: 'female',
      phone: '0789329052',
      address: 'Kigali',
      membership_date: '2026-08-18',
    };
    Member.create.mockResolvedValue({ id: 14, ...body, cooperative_id: 7, phone: '+250789329052' });
    const res = response();

    await create({ user: { role: 'cooperative_manager', cooperative_id: 7 }, body }, res);

    expect(Member.create).toHaveBeenCalledWith({
      ...body,
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
      body: { phone: '789329052', address: null, membership_date: null },
    }, res);

    expect(member.update).toHaveBeenCalledWith({
      phone: '+250789329052',
      address: null,
      membership_date: null,
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
