const { DataTypes, Sequelize } = require('sequelize');
const migration = require('../migrations/20260826000020-add-group-production');

describe('Group production migration', () => {
  let sequelize;
  let queryInterface;

  beforeEach(async () => {
    sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    queryInterface = sequelize.getQueryInterface();
    await queryInterface.createTable('cooperatives', {
      id: { type: DataTypes.INTEGER, primaryKey: true },
    });
    await queryInterface.createTable('farmers', {
      id: { type: DataTypes.INTEGER, primaryKey: true },
    });
    await queryInterface.createTable('production', {
      id: { type: DataTypes.INTEGER, primaryKey: true },
      farmer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'farmers', key: 'id' },
      },
      quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      production_date: { type: DataTypes.DATEONLY, allowNull: false },
    });
    await queryInterface.bulkInsert('cooperatives', [{ id: 7 }]);
    await queryInterface.bulkInsert('farmers', [{ id: 11 }]);
    await queryInterface.bulkInsert('production', [{
      id: 21,
      farmer_id: 11,
      quantity: 125.5,
      production_date: '2026-08-20',
    }]);
  });

  afterEach(async () => {
    await sequelize.close();
  });

  it('preserves and backfills legacy individual production', async () => {
    await migration.up(queryInterface, Sequelize);

    const columns = await queryInterface.describeTable('production');
    const [[record]] = await sequelize.query('SELECT * FROM production WHERE id = 21');

    expect(columns).toEqual(expect.objectContaining({
      production_mode: expect.objectContaining({ allowNull: false }),
      farmer_id: expect.objectContaining({ allowNull: true }),
      farmer_group_id: expect.objectContaining({ allowNull: true }),
      actual_harvest: expect.objectContaining({ allowNull: false }),
      harvest_date: expect.objectContaining({ allowNull: false }),
      expected_production: expect.objectContaining({ allowNull: true }),
      production_location: expect.objectContaining({ allowNull: true }),
      notes: expect.objectContaining({ allowNull: true }),
    }));
    expect(record).toEqual(expect.objectContaining({
      farmer_id: 11,
      farmer_group_id: null,
      production_mode: 'individual',
      quantity: 125.5,
      actual_harvest: 125.5,
      production_date: '2026-08-20',
      harvest_date: '2026-08-20',
    }));
  });

  it('is idempotent and creates organization-owned farmer groups', async () => {
    await migration.up(queryInterface, Sequelize);
    await queryInterface.bulkInsert('farmer_groups', [{
      id: 31,
      cooperative_id: 7,
      name: 'Gasaka Tea Growers',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    }]);

    await migration.up(queryInterface, Sequelize);
    const [[group]] = await sequelize.query('SELECT * FROM farmer_groups WHERE id = 31');
    const [[record]] = await sequelize.query('SELECT * FROM production WHERE id = 21');

    expect(group).toEqual(expect.objectContaining({
      cooperative_id: 7,
      name: 'Gasaka Tea Growers',
    }));
    expect(record).toEqual(expect.objectContaining({
      production_mode: 'individual',
      quantity: 125.5,
      actual_harvest: 125.5,
    }));
  });
});
