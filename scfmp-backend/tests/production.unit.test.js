const { Sequelize } = require('sequelize');
const defineProduction = require('../models/Production');

describe('Production total_amount auto-calculation', () => {
  // Use a lightweight in-memory SQLite instance purely to test the model's
  // beforeValidate hook logic — no MySQL connection required for this test.
  const sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
  const Production = defineProduction(sequelize);

  beforeAll(async () => {
    await sequelize.sync();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('calculates total_amount as quantity * unit_price', async () => {
    const record = await Production.build({
      cooperative_id: 1,
      farmer_id: 1,
      product_id: 1,
      product_name: 'Coffee',
      quantity: 200,
      unit: 'kg',
      unit_price: 800,
      production_date: '2026-06-01',
    });

    await record.validate();

    expect(Number(record.total_amount)).toBe(160000);
  });

  it('recalculates total_amount when quantity changes', async () => {
    const record = await Production.build({
      cooperative_id: 1,
      farmer_id: 1,
      product_id: 2,
      product_name: 'Maize',
      quantity: 50,
      unit_price: 300,
      production_date: '2026-06-01',
    });
    await record.validate();
    expect(Number(record.total_amount)).toBe(15000);

    record.quantity = 100;
    await record.validate();
    expect(Number(record.total_amount)).toBe(30000);
  });

  it('requires direct cooperative and product relationships', async () => {
    const record = Production.build({
      farmer_id: 1,
      product_name: 'Beans',
      quantity: 20,
      unit_price: 500,
      production_date: '2026-06-01',
    });

    await expect(record.validate()).rejects.toMatchObject({ name: 'SequelizeValidationError' });
  });

  it('supports group ownership without requiring a farmer', async () => {
    const record = Production.build({
      cooperative_id: 1,
      production_mode: 'group',
      farmer_group_id: 8,
      product_id: 1,
      product_name: 'Tea',
      actual_harvest: 40.5,
      unit: 'kg',
      harvest_date: '2026-08-20',
    });

    await record.validate();

    expect(Number(record.quantity)).toBe(40.5);
    expect(record.production_date).toBe('2026-08-20');
    expect(Number(record.total_amount)).toBe(0);
  });

  it('rejects mixed or missing ownership for the selected production mode', async () => {
    const mixedOwner = Production.build({
      cooperative_id: 1,
      production_mode: 'group',
      farmer_id: 2,
      farmer_group_id: 8,
      product_id: 1,
      product_name: 'Tea',
      actual_harvest: 40,
      harvest_date: '2026-08-20',
    });

    await expect(mixedOwner.validate()).rejects.toMatchObject({
      name: 'SequelizeValidationError',
    });
  });
});
