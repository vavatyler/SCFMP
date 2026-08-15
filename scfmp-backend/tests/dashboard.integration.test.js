const { buildTestDb } = require('./testDbHelper');

/**
 * Builds a full in-memory SQLite copy of the schema (all models + associations),
 * seeds it with realistic data, and runs the actual dashboard aggregation queries
 * against it. This catches query bugs (bad joins, wrong group-by, etc.) before
 * they ever reach a live MySQL database.
 */
describe('Dashboard aggregation', () => {
  let sequelize;
  let models;

  beforeAll(async () => {
    ({ sequelize, models } = await buildTestDb());

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
});
