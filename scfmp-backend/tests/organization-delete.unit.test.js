jest.mock('../models', () => ({
  AuditLog: { count: jest.fn() },
  Cooperative: { findByPk: jest.fn() },
  Document: { count: jest.fn() },
  InventoryItem: { count: jest.fn() },
  Loan: { count: jest.fn() },
  Member: { count: jest.fn() },
  Product: { count: jest.fn() },
  Production: { count: jest.fn() },
  Transaction: { count: jest.fn() },
  User: { count: jest.fn() },
}));

const models = require('../models');
const { remove } = require('../controllers/cooperativeController');

const response = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('organization safe deletion', () => {
  const countModels = [
    models.User,
    models.Member,
    models.Production,
    models.Transaction,
    models.Loan,
    models.InventoryItem,
    models.Document,
    models.Product,
    models.AuditLog,
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    countModels.forEach((model) => model.count.mockResolvedValue(0));
  });

  it('blocks deletion and reports dependencies when related records exist', async () => {
    const organization = { id: 7, destroy: jest.fn() };
    models.Cooperative.findByPk.mockResolvedValue(organization);
    models.Member.count.mockResolvedValue(3);
    const res = response();

    await remove({ params: { id: '7' } }, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      data: { dependencies: { members: 3 } },
    }));
    expect(organization.destroy).not.toHaveBeenCalled();
  });

  it('deletes an empty organization', async () => {
    const organization = { id: 8, destroy: jest.fn().mockResolvedValue(undefined) };
    models.Cooperative.findByPk.mockResolvedValue(organization);
    const res = response();

    await remove({ params: { id: '8' } }, res);

    expect(organization.destroy).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
