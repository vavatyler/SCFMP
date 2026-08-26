const { DataTypes, Sequelize } = require('sequelize');
const migration = require('../migrations/20260825000018-add-member-address-hierarchy');

describe('Member residential address hierarchy migration', () => {
  let sequelize;
  let queryInterface;

  beforeEach(async () => {
    sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    queryInterface = sequelize.getQueryInterface();

    await queryInterface.createTable('members', {
      id: { type: DataTypes.INTEGER, primaryKey: true },
      cooperative_id: { type: DataTypes.INTEGER, allowNull: false },
      first_name: { type: DataTypes.STRING(100), allowNull: false },
      last_name: { type: DataTypes.STRING(100), allowNull: false },
      address: { type: DataTypes.STRING(255), allowNull: true },
    });
    await queryInterface.bulkInsert('members', [{
      id: 21,
      cooperative_id: 7,
      first_name: 'Legacy',
      last_name: 'Member',
      address: 'Near the community market',
    }]);
  });

  afterEach(async () => {
    await sequelize.close();
  });

  it('adds nullable structured fields without changing legacy Member data', async () => {
    await migration.up(queryInterface, Sequelize);

    const columns = await queryInterface.describeTable('members');
    const [[member]] = await sequelize.query('SELECT * FROM members WHERE id = 21');

    expect(columns).toEqual(expect.objectContaining({
      address_district: expect.objectContaining({ allowNull: true }),
      address_sector: expect.objectContaining({ allowNull: true }),
      address_cell: expect.objectContaining({ allowNull: true }),
      address_village: expect.objectContaining({ allowNull: true }),
    }));
    expect(member).toEqual(expect.objectContaining({
      id: 21,
      cooperative_id: 7,
      address: 'Near the community market',
      address_district: null,
      address_sector: null,
      address_cell: null,
      address_village: null,
    }));
  });

  it('is safe to run again when all Member address columns already exist', async () => {
    await migration.up(queryInterface, Sequelize);
    const schemaAfterFirstRun = await queryInterface.describeTable('members');

    await migration.up(queryInterface, Sequelize);

    expect(await queryInterface.describeTable('members')).toEqual(schemaAfterFirstRun);
    const [[member]] = await sequelize.query('SELECT id, address FROM members WHERE id = 21');
    expect(member).toEqual({ id: 21, address: 'Near the community market' });
  });
});
