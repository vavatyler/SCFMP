jest.mock('../models', () => ({
  AuditLog: { count: jest.fn() },
  Cooperative: {
    create: jest.fn(),
    findByPk: jest.fn(),
  },
  Document: { count: jest.fn() },
  InventoryItem: { count: jest.fn() },
  Loan: { count: jest.fn() },
  Member: { count: jest.fn() },
  Product: { count: jest.fn() },
  Production: { count: jest.fn() },
  Transaction: { count: jest.fn() },
  User: { count: jest.fn() },
}));

const { Cooperative } = require('../models');
const { create, update } = require('../controllers/cooperativeController');

const response = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('organization form persistence', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates an organization using the eight-field API contract and normalized phone storage', async () => {
    const requestPayload = {
      organization_type: 'farmer_group',
      name: 'Nyagatare Growers',
      registration_number: 'RG-2026-01',
      district: 'Nyagatare',
      sector: 'Rwimiyaga',
      cell: 'Gacundezi',
      phone: '788123456',
      email: 'office@example.org',
    };
    const storedPayload = { ...requestPayload, phone: '+250788123456' };
    Cooperative.create.mockResolvedValue({ id: 42, ...storedPayload });
    const res = response();

    await create({ body: requestPayload }, res);

    expect(Cooperative.create).toHaveBeenCalledWith(storedPayload);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('updates the existing record with only submitted fields', async () => {
    const organization = {
      id: 42,
      name: 'Nyagatare Growers',
      email: 'office@example.org',
      update: jest.fn().mockResolvedValue(undefined),
    };
    Cooperative.findByPk.mockResolvedValue(organization);
    const res = response();

    await update({ params: { id: '42' }, body: { name: 'Nyagatare Producers' } }, res);

    expect(Cooperative.findByPk).toHaveBeenCalledWith('42');
    expect(organization.update).toHaveBeenCalledWith({ name: 'Nyagatare Producers' });
    expect(organization.id).toBe(42);
    expect(organization.email).toBe('office@example.org');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('preserves an intentional optional-field clear as null', async () => {
    const organization = { id: 42, update: jest.fn().mockResolvedValue(undefined) };
    Cooperative.findByPk.mockResolvedValue(organization);
    const res = response();

    await update({ params: { id: '42' }, body: { phone: null } }, res);

    expect(organization.update).toHaveBeenCalledWith({ phone: null });
  });

  it('normalizes a changed legacy phone without changing the organization ID', async () => {
    const organization = {
      id: 42,
      phone: '+250788123456',
      update: jest.fn().mockResolvedValue(undefined),
    };
    Cooperative.findByPk.mockResolvedValue(organization);
    const res = response();

    await update({ params: { id: '42' }, body: { phone: '0789329052' } }, res);

    expect(organization.update).toHaveBeenCalledWith({ phone: '+250789329052' });
    expect(organization.id).toBe(42);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('trims a changed valid email and preserves the organization ID', async () => {
    const organization = {
      id: 42,
      email: 'old@example.org',
      update: jest.fn().mockResolvedValue(undefined),
    };
    Cooperative.findByPk.mockResolvedValue(organization);
    const res = response();

    await update({ params: { id: '42' }, body: { email: '  new@example.org  ' } }, res);

    expect(organization.update).toHaveBeenCalledWith({ email: 'new@example.org' });
    expect(organization.id).toBe(42);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('allows an optional Organization email to be cleared', async () => {
    const organization = {
      id: 42,
      email: 'old@example.org',
      update: jest.fn().mockResolvedValue(undefined),
    };
    Cooperative.findByPk.mockResolvedValue(organization);
    const res = response();

    await update({ params: { id: '42' }, body: { email: null } }, res);

    expect(organization.update).toHaveBeenCalledWith({ email: null });
  });

  it('rejects a manipulated organization hierarchy', async () => {
    const res = response();

    await create({
      body: {
        name: 'Invalid Location',
        district: 'Nyamagabe',
        sector: 'Kacyiru',
        cell: 'Kamatamu',
      },
    }, res);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(Cooperative.create).not.toHaveBeenCalled();
  });

  it('preserves unchanged legacy location and email data during unrelated edits', async () => {
    const organization = {
      id: 42,
      district: 'Legacy district',
      sector: null,
      cell: null,
      email: 'legacy-email',
      update: jest.fn().mockResolvedValue(undefined),
    };
    Cooperative.findByPk.mockResolvedValue(organization);
    const res = response();

    await update({ params: { id: '42' }, body: { name: 'Safe Rename' } }, res);

    expect(organization.update).toHaveBeenCalledWith({ name: 'Safe Rename' });
    expect(organization.email).toBe('legacy-email');
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
