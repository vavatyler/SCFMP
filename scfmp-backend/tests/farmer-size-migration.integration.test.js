const { DataTypes, Sequelize } = require('sequelize');
const migration = require('../migrations/20260825000019-add-farmer-size-unit');

describe('Farmer size unit migration', () => {
  let sequelize;
  let queryInterface;

  beforeEach(async () => {
    sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    queryInterface = sequelize.getQueryInterface();
    await queryInterface.createTable('farmers', {
      id: { type: DataTypes.INTEGER, primaryKey: true },
      farm_size_ha: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    });
    await queryInterface.bulkInsert('farmers', [
      { id: 1, farm_size_ha: 2.75 },
      { id: 2, farm_size_ha: null },
    ]);
  });

  afterEach(async () => {
    await sequelize.close();
  });

  it('backfills explicitly-hectare legacy values without changing them', async () => {
    await migration.up(queryInterface, Sequelize);

    const columns = await queryInterface.describeTable('farmers');
    const [rows] = await sequelize.query('SELECT * FROM farmers ORDER BY id');

    expect(columns).toEqual(expect.objectContaining({
      farm_size: expect.objectContaining({ allowNull: true }),
      farm_size_unit: expect.objectContaining({ allowNull: true }),
      farm_size_ha: expect.objectContaining({ allowNull: true }),
    }));
    expect(rows[0]).toEqual(expect.objectContaining({
      farm_size_ha: 2.75,
      farm_size: 2.75,
      farm_size_unit: 'ha',
    }));
    expect(rows[1]).toEqual(expect.objectContaining({
      farm_size_ha: null,
      farm_size: null,
      farm_size_unit: null,
    }));
  });

  it('is idempotent and does not overwrite a new non-hectare value', async () => {
    await migration.up(queryInterface, Sequelize);
    await queryInterface.bulkUpdate('farmers', {
      farm_size: 3.5,
      farm_size_unit: 'acres',
    }, { id: 1 });

    await migration.up(queryInterface, Sequelize);
    const [[farmer]] = await sequelize.query('SELECT * FROM farmers WHERE id = 1');

    expect(farmer).toEqual(expect.objectContaining({
      farm_size_ha: 2.75,
      farm_size: 3.5,
      farm_size_unit: 'acres',
    }));
  });
});
