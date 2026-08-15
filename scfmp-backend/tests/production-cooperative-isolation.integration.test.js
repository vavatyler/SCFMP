const { buildTestDb } = require('./testDbHelper');

/**
 * Reproduces a real bug found in production: Production.findAndCountAll() with
 * both `limit` and a nested where clause (Production -> Farmer -> Member ->
 * cooperative_id) silently ignores the nested filter due to Sequelize's default
 * `subQuery: true` behavior whenever limit + include are combined. The paginated
 * row selection happens in an inner subquery that only sees the TOP-LEVEL where
 * clause — nested include filters never reach it — so a super_admin viewing
 * Cooperative A would see Cooperative B's production records too (with farmer
 * data silently nulled out, since the LEFT JOIN hydration step still runs).
 *
 * The fix is `subQuery: false` on that query, which forces Sequelize to filter
 * in a single flat query where the nested where clause actually applies.
 */
describe('Production list — cross-cooperative isolation with pagination', () => {
  let sequelize;
  let models;
  let coopA, coopB, farmerA, farmerB;

  beforeAll(async () => {
    const db = await buildTestDb();
    sequelize = db.sequelize;
    models = db.models;

    const { Cooperative, Member, Farmer, Production } = models;

    coopA = await Cooperative.create({ name: 'Cooperative A' });
    coopB = await Cooperative.create({ name: 'Cooperative B' });

    const memberA = await Member.create({
      cooperative_id: coopA.id,
      first_name: 'Alice',
      last_name: 'A',
      status: 'active',
    });
    const memberB = await Member.create({
      cooperative_id: coopB.id,
      first_name: 'Bob',
      last_name: 'B',
      status: 'active',
    });

    farmerA = await Farmer.create({ member_id: memberA.id, crop_type: 'Coffee' });
    farmerB = await Farmer.create({ member_id: memberB.id, crop_type: 'Maize' });

    const productA = await models.Product.create({ cooperative_id: coopA.id, name: 'Coffee' });
    const productB = await models.Product.create({ cooperative_id: coopB.id, name: 'Maize' });

    await Production.create({
      cooperative_id: coopA.id,
      farmer_id: farmerA.id,
      product_id: productA.id,
      product_name: 'Coffee',
      quantity: 100,
      unit_price: 500,
      production_date: '2026-01-01',
    });
    await Production.create({
      cooperative_id: coopB.id,
      farmer_id: farmerB.id,
      product_id: productB.id,
      product_name: 'Maize',
      quantity: 50,
      unit_price: 300,
      production_date: '2026-01-02',
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  const queryProductionForCooperative = async (cooperativeId, { subQuery, required } = {}) => {
    const { Production, Farmer, Member } = models;
    return Production.findAndCountAll({
      include: [
        {
          model: Farmer,
          as: 'farmer',
          required,
          include: [
            { model: Member, as: 'member', required, where: { cooperative_id: cooperativeId } },
          ],
        },
      ],
      limit: 20,
      offset: 0,
      subQuery,
    });
  };

  it('BUG (Sequelize defaults: subQuery true, required inferred): leaks Cooperative B into Cooperative A view', async () => {
    const { rows } = await queryProductionForCooperative(coopA.id, {});

    const productNames = rows.map((r) => r.product_name).sort();
    expect(productNames).toEqual(['Coffee', 'Maize']); // WRONG — Maize belongs to Cooperative B
  });

  it('PARTIAL FIX (subQuery: false alone) is NOT enough — count is still wrong', async () => {
    const { count } = await queryProductionForCooperative(coopA.id, { subQuery: false });
    expect(count).toBe(2); // documents that this alone doesn't fix count
  });

  it('FULL FIX (subQuery: false + required: true on every level): only returns Cooperative A own record', async () => {
    const { rows, count } = await queryProductionForCooperative(coopA.id, {
      subQuery: false,
      required: true,
    });

    expect(count).toBe(1);
    expect(rows).toHaveLength(1);
    expect(rows[0].product_name).toBe('Coffee');
  });

  it('FULL FIX: Cooperative B only sees its own record', async () => {
    const { rows, count } = await queryProductionForCooperative(coopB.id, {
      subQuery: false,
      required: true,
    });

    expect(count).toBe(1);
    expect(rows).toHaveLength(1);
    expect(rows[0].product_name).toBe('Maize');
  });
});
