const { buildTestDb } = require('./testDbHelper');
const mockDashboardModels = {};
jest.mock('../models', () => mockDashboardModels);

/**
 * Builds a full in-memory SQLite copy of the schema (all models + associations),
 * seeds it with realistic data, and runs the actual dashboard aggregation queries
 * against it. This catches query bugs (bad joins, wrong group-by, etc.) before
 * they ever reach a live MySQL database.
 */
describe('Dashboard aggregation', () => {
  let sequelize;
  let models;
  let dashboardController;

  beforeAll(async () => {
    ({ sequelize, models } = await buildTestDb());
    Object.assign(mockDashboardModels, models, { sequelize });
    dashboardController = require('../controllers/dashboardController');

    // Seed: one cooperative, two members, one farmer, some production/finance/inventory
    const coop = await models.Cooperative.create({ name: 'Test Coop', district: 'Nyamagabe' });

    const member1 = await models.Member.create({
      cooperative_id: coop.id,
      first_name: 'Valentin',
      last_name: 'N',
      status: 'active',
    });
    await models.Member.create({
      cooperative_id: coop.id,
      first_name: 'Alice',
      last_name: 'M',
      status: 'active',
    });

    const farmer = await models.Farmer.create({
      member_id: member1.id,
      farm_size_ha: 2,
      crop_type: 'Coffee',
    });

    const product = await models.Product.create({
      cooperative_id: coop.id,
      name: 'Coffee',
      default_unit: 'kg',
    });

    await models.Production.create({
      cooperative_id: coop.id,
      farmer_id: farmer.id,
      product_id: product.id,
      product_name: 'Coffee',
      quantity: 200,
      unit_price: 800,
      production_date: '2026-06-01',
    });

    await models.Transaction.create({
      cooperative_id: coop.id,
      member_id: member1.id,
      type: 'income',
      amount: 160000,
      transaction_date: '2026-06-05',
    });
    await models.Transaction.create({
      cooperative_id: coop.id,
      type: 'expense',
      amount: 45000,
      transaction_date: '2026-06-06',
    });

    await models.InventoryItem.create({
      cooperative_id: coop.id,
      item_name: 'NPK Fertilizer',
      unit: 'kg',
      quantity_in_stock: 20,
      reorder_level: 50,
    });

    global.__testModels = models;
    global.__testCoopId = coop.id;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('counts members and farmers correctly for the cooperative', async () => {
    const { Member, Farmer } = global.__testModels;
    const coopId = global.__testCoopId;

    const totalMembers = await Member.count({ where: { cooperative_id: coopId } });
    const totalFarmers = await Farmer.count({
      include: [{ model: Member, as: 'member', where: { cooperative_id: coopId }, attributes: [] }],
    });

    expect(totalMembers).toBe(2);
    expect(totalFarmers).toBe(1);
  });

  it('sums production value correctly (200kg * 800 = 160,000)', async () => {
    const { Production, Farmer, Member } = global.__testModels;
    const { fn, col } = require('sequelize');
    const coopId = global.__testCoopId;

    const result = await Production.findOne({
      include: [
        {
          model: Farmer,
          as: 'farmer',
          attributes: [],
          include: [{ model: Member, as: 'member', where: { cooperative_id: coopId }, attributes: [] }],
        },
      ],
      attributes: [[fn('SUM', col('Production.total_amount')), 'total_value']],
      raw: true,
    });

    expect(Number(result.total_value)).toBe(160000);
  });

  it('computes net_balance as income minus expense (160,000 - 45,000 = 115,000)', async () => {
    const { Transaction } = global.__testModels;
    const { fn, col } = require('sequelize');
    const coopId = global.__testCoopId;

    const rows = await Transaction.findAll({
      where: { cooperative_id: coopId },
      attributes: ['type', [fn('SUM', col('amount')), 'total']],
      group: ['type'],
      raw: true,
    });

    const totals = { income: 0, expense: 0 };
    rows.forEach((r) => (totals[r.type] = parseFloat(r.total)));
    const netBalance = totals.income - totals.expense;

    expect(netBalance).toBe(115000);
  });

  it('flags the fertilizer item as low stock (20kg <= 50kg reorder level)', async () => {
    const { InventoryItem } = global.__testModels;
    const { Op } = require('sequelize');
    const coopId = global.__testCoopId;

    const lowStockCount = await InventoryItem.count({
      where: {
        cooperative_id: coopId,
        [Op.and]: sequelize.where(
          sequelize.col('quantity_in_stock'),
          Op.lte,
          sequelize.col('reorder_level')
        ),
      },
    });

    expect(lowStockCount).toBe(1);
  });

  it('returns dashboard totals only for modules the user can view', async () => {
    const data = await dashboardController.buildSummary(global.__testCoopId, {
      user: { id: 900, role: 'technical_admin', permissions: ['dashboard.view', 'members.view'] },
    });

    expect(data.members).toEqual({ total: 2, active: 2 });
    expect(data.farmers).toBeUndefined();
    expect(data.production).toBeUndefined();
    expect(data.finance).toBeUndefined();
    expect(data.loans).toBeUndefined();
    expect(data.inventory).toBeUndefined();
  });

  it('returns scoped dashboard analytics using existing production, location, stock, and transaction data', async () => {
    let responseBody;
    const response = {
      status: jest.fn(() => response),
      json: jest.fn((body) => { responseBody = body; return body; }),
    };
    await dashboardController.analytics({
      organizationId: global.__testCoopId,
      query: {},
      user: { id: 901, role: 'super_admin', permissions: null },
    }, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.data.production_trend).toEqual(expect.arrayContaining([
      expect.objectContaining({ quantity: 200, value: 160000, records: 1 }),
    ]));
    expect(responseBody.data.farmer_distribution).toEqual([
      expect.objectContaining({ location: 'Not specified', farmers: 1 }),
    ]);
    expect(responseBody.data.inventory_status).toEqual({ total_items: 1, available: 0, low_stock: 1, out_of_stock: 0 });
    expect(responseBody.data.financial_overview).toEqual(expect.arrayContaining([
      expect.objectContaining({ income: 160000, expense: 45000 }),
    ]));
  });

  it('does not build analytics for modules outside the user’s assigned permissions', async () => {
    let responseBody;
    const response = {
      status: jest.fn(() => response),
      json: jest.fn((body) => { responseBody = body; return body; }),
    };
    await dashboardController.analytics({
      organizationId: global.__testCoopId,
      query: {},
      user: { id: 902, role: 'technical_admin', permissions: ['dashboard.view'] },
    }, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(responseBody.data.production_trend).toBeUndefined();
    expect(responseBody.data.farmer_distribution).toBeUndefined();
    expect(responseBody.data.inventory_status).toBeUndefined();
    expect(responseBody.data.financial_overview).toBeUndefined();
    expect(responseBody.data.recent_activity).toEqual([]);
  });
});
