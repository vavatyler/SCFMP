const { DataTypes, Sequelize } = require('sequelize');
const productionMigration = require('../migrations/20260905000022-expand-production-details-and-contributions');
const documentMigration = require('../migrations/20260905000023-expand-document-metadata');
const platformMigration = require('../migrations/20260905000024-create-team-and-subscriptions');

describe('AgriBridge expansion migrations', () => {
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
      actual_harvest: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    });
    await queryInterface.createTable('documents', {
      id: { type: DataTypes.INTEGER, primaryKey: true },
      original_name: { type: DataTypes.STRING(255), allowNull: false },
      uploaded_by: { type: DataTypes.INTEGER, allowNull: true },
    });
    await queryInterface.bulkInsert('cooperatives', [{ id: 7 }]);
    await queryInterface.bulkInsert('farmers', [{ id: 11 }]);
    await queryInterface.bulkInsert('production', [{ id: 21, actual_harvest: 125.5 }]);
    await queryInterface.bulkInsert('documents', [{ id: 31, original_name: 'legacy-report.pdf' }]);
  });

  afterEach(async () => {
    await sequelize.close();
  });

  it('backfills production quantities and creates contribution storage without changing legacy values', async () => {
    await productionMigration.up(queryInterface, Sequelize);

    const columns = await queryInterface.describeTable('production');
    const [[record]] = await sequelize.query('SELECT * FROM production WHERE id = 21');
    const tables = await queryInterface.showAllTables();

    expect(columns).toEqual(expect.objectContaining({
      reporting_period: expect.any(Object),
      quality_grade: expect.any(Object),
      sold_quantity: expect.objectContaining({ allowNull: false }),
      remaining_quantity: expect.any(Object),
    }));
    expect(record).toEqual(expect.objectContaining({
      id: 21,
      actual_harvest: 125.5,
      sold_quantity: 0,
      remaining_quantity: 125.5,
    }));
    expect(tables).toContain('production_contributions');

    await productionMigration.up(queryInterface, Sequelize);
    const [[preserved]] = await sequelize.query('SELECT * FROM production WHERE id = 21');
    expect(preserved.remaining_quantity).toBe(125.5);
  });

  it('backfills document classification metadata and preserves the existing file name', async () => {
    await documentMigration.up(queryInterface, Sequelize);

    const columns = await queryInterface.describeTable('documents');
    const [[document]] = await sequelize.query('SELECT * FROM documents WHERE id = 31');

    expect(columns).toEqual(expect.objectContaining({
      title: expect.objectContaining({ allowNull: false }),
      category: expect.objectContaining({ allowNull: false }),
      document_type: expect.objectContaining({ allowNull: false }),
      archived_at: expect.any(Object),
    }));
    expect(document).toEqual(expect.objectContaining({
      original_name: 'legacy-report.pdf',
      title: 'legacy-report.pdf',
      category: 'other',
      document_type: 'other',
      visibility: 'organization',
    }));
  });

  it('creates empty, organization-owned subscription and data-driven team tables', async () => {
    await platformMigration.up(queryInterface, Sequelize);

    const tables = await queryInterface.showAllTables();
    const [team] = await sequelize.query('SELECT * FROM team_members');
    const [subscriptions] = await sequelize.query('SELECT * FROM subscriptions');
    const subscriptionColumns = await queryInterface.describeTable('subscriptions');

    expect(tables).toEqual(expect.arrayContaining(['team_members', 'subscriptions']));
    expect(team).toHaveLength(0);
    expect(subscriptions).toHaveLength(0);
    expect(subscriptionColumns.cooperative_id).toEqual(expect.objectContaining({ allowNull: false }));

    await platformMigration.up(queryInterface, Sequelize);
    expect((await queryInterface.showAllTables()).filter((name) => name === 'subscriptions')).toHaveLength(1);
  });
});
