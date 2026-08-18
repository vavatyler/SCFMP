const { DataTypes, Sequelize } = require('sequelize');
const migration = require('../migrations/20260817000017-add-organization-types-and-farmer-locations');

const TABLES_WITH_EXISTING_DATA = [
  'cooperatives',
  'users',
  'members',
  'farmers',
  'production',
  'transactions',
  'inventory_items',
  'documents',
];

describe('organization type and farmer location migration', () => {
  let sequelize;
  let queryInterface;

  const rowCount = async (tableName) => {
    const [[result]] = await sequelize.query(`SELECT COUNT(*) AS count FROM ${tableName}`);
    return Number(result.count);
  };

  const snapshotCounts = async () => Object.fromEntries(
    await Promise.all(TABLES_WITH_EXISTING_DATA.map(async (tableName) => [
      tableName,
      await rowCount(tableName),
    ]))
  );

  beforeEach(async () => {
    sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    queryInterface = sequelize.getQueryInterface();

    await queryInterface.createTable('cooperatives', {
      id: { type: DataTypes.INTEGER, primaryKey: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      registration_number: { type: DataTypes.STRING(50), allowNull: true, unique: true },
      district: { type: DataTypes.STRING(100), allowNull: true },
      sector: { type: DataTypes.STRING(100), allowNull: true },
      cell: { type: DataTypes.STRING(100), allowNull: true },
      village: { type: DataTypes.STRING(100), allowNull: true },
    });
    await queryInterface.createTable('users', {
      id: { type: DataTypes.INTEGER, primaryKey: true },
      cooperative_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'cooperatives', key: 'id' },
      },
      email: { type: DataTypes.STRING(150), allowNull: false },
    });
    await queryInterface.createTable('members', {
      id: { type: DataTypes.INTEGER, primaryKey: true },
      cooperative_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'cooperatives', key: 'id' },
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
      },
      first_name: { type: DataTypes.STRING(100), allowNull: false },
    });
    await queryInterface.createTable('farmers', {
      id: { type: DataTypes.INTEGER, primaryKey: true },
      member_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'members', key: 'id' },
      },
      farm_size_ha: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      location: { type: DataTypes.STRING(255), allowNull: true },
      gps_coordinates: { type: DataTypes.STRING(100), allowNull: true },
      crop_type: { type: DataTypes.STRING(100), allowNull: true },
    });
    await queryInterface.createTable('production', {
      id: { type: DataTypes.INTEGER, primaryKey: true },
      farmer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'farmers', key: 'id' },
      },
      product_name: { type: DataTypes.STRING(100), allowNull: false },
    });
    await queryInterface.createTable('transactions', {
      id: { type: DataTypes.INTEGER, primaryKey: true },
      cooperative_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'cooperatives', key: 'id' },
      },
      member_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'members', key: 'id' },
      },
      amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    });
    await queryInterface.createTable('inventory_items', {
      id: { type: DataTypes.INTEGER, primaryKey: true },
      cooperative_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'cooperatives', key: 'id' },
      },
      item_name: { type: DataTypes.STRING(150), allowNull: false },
    });
    await queryInterface.createTable('documents', {
      id: { type: DataTypes.INTEGER, primaryKey: true },
      cooperative_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'cooperatives', key: 'id' },
      },
      owner_type: { type: DataTypes.STRING(20), allowNull: false },
      owner_id: { type: DataTypes.INTEGER, allowNull: false },
    });

    await queryInterface.bulkInsert('cooperatives', [
      {
        id: 1,
        name: 'GASAKA TEA COOP',
        registration_number: 'REG-001',
        district: 'Nyamagabe',
        sector: 'Gasaka',
        cell: 'Ngiryi',
        village: 'Test Village',
      },
      {
        id: 30001,
        name: 'CYANIKA',
        registration_number: null,
        district: 'Burera',
        sector: 'Cyanika',
        cell: null,
        village: null,
      },
    ]);
    await queryInterface.bulkInsert('users', [
      { id: 11, cooperative_id: 1, email: 'manager@example.test' },
      { id: 12, cooperative_id: null, email: 'admin@example.test' },
    ]);
    await queryInterface.bulkInsert('members', [
      { id: 21, cooperative_id: 1, user_id: 11, first_name: 'Member One' },
      { id: 22, cooperative_id: 30001, user_id: null, first_name: 'Member Two' },
      { id: 23, cooperative_id: 1, user_id: null, first_name: 'Member Three' },
    ]);
    await queryInterface.bulkInsert('farmers', [
      {
        id: 31,
        member_id: 21,
        farm_size_ha: 2.5,
        location: 'Legacy location one',
        gps_coordinates: '-1.9441,30.0619',
        crop_type: 'Tea',
      },
      {
        id: 32,
        member_id: 22,
        farm_size_ha: 1.25,
        location: 'Legacy location two',
        gps_coordinates: null,
        crop_type: 'Potatoes',
      },
    ]);
    await queryInterface.bulkInsert('production', [
      { id: 41, farmer_id: 31, product_name: 'Tea' },
    ]);
    await queryInterface.bulkInsert('transactions', [
      { id: 51, cooperative_id: 1, member_id: 21, amount: 25000 },
    ]);
    await queryInterface.bulkInsert('inventory_items', [
      { id: 61, cooperative_id: 1, item_name: 'Fertilizer' },
    ]);
    await queryInterface.bulkInsert('documents', [
      { id: 71, cooperative_id: 1, owner_type: 'farmer', owner_id: 31 },
    ]);
  });

  afterEach(async () => {
    await sequelize.close();
  });

  it('adds safe defaults and nullable hierarchy fields without changing existing data or relationships', async () => {
    const countsBefore = await snapshotCounts();

    await migration.up(queryInterface, Sequelize);

    expect(await snapshotCounts()).toEqual(countsBefore);

    const [organizations] = await sequelize.query('SELECT * FROM cooperatives ORDER BY id');
    expect(organizations).toEqual([
      expect.objectContaining({
        id: 1,
        name: 'GASAKA TEA COOP',
        registration_number: 'REG-001',
        district: 'Nyamagabe',
        organization_type: 'cooperative',
      }),
      expect.objectContaining({
        id: 30001,
        name: 'CYANIKA',
        registration_number: null,
        district: 'Burera',
        organization_type: 'cooperative',
      }),
    ]);

    const [farmers] = await sequelize.query('SELECT * FROM farmers ORDER BY id');
    expect(farmers).toEqual([
      expect.objectContaining({
        id: 31,
        member_id: 21,
        location: 'Legacy location one',
        district: null,
        sector: null,
        cell: null,
        village: null,
      }),
      expect.objectContaining({
        id: 32,
        member_id: 22,
        location: 'Legacy location two',
        district: null,
        sector: null,
        cell: null,
        village: null,
      }),
    ]);

    const [[relationships]] = await sequelize.query(`
      SELECT
        u.cooperative_id AS user_organization_id,
        m.cooperative_id AS member_organization_id,
        f.member_id AS farmer_member_id,
        p.farmer_id AS production_farmer_id,
        t.member_id AS transaction_member_id,
        i.cooperative_id AS inventory_organization_id,
        d.owner_id AS document_owner_id
      FROM users u
      JOIN members m ON m.user_id = u.id
      JOIN farmers f ON f.member_id = m.id
      JOIN production p ON p.farmer_id = f.id
      JOIN transactions t ON t.member_id = m.id
      JOIN inventory_items i ON i.cooperative_id = m.cooperative_id
      JOIN documents d ON d.cooperative_id = m.cooperative_id
      WHERE u.id = 11
    `);
    expect(relationships).toEqual({
      user_organization_id: 1,
      member_organization_id: 1,
      farmer_member_id: 21,
      production_farmer_id: 31,
      transaction_member_id: 21,
      inventory_organization_id: 1,
      document_owner_id: 31,
    });
  });

  it('supports SME creation and organization/farmer edits while preserving IDs and legacy location', async () => {
    await migration.up(queryInterface, Sequelize);

    await queryInterface.bulkInsert('cooperatives', [{
      id: 30002,
      name: 'Rwanda Harvest SME',
      registration_number: 'SME-002',
      organization_type: 'sme',
      district: 'Kigali',
      sector: 'Kacyiru',
      cell: 'Kamatamu',
      village: 'Kanserege',
    }]);
    await sequelize.query(`
      UPDATE cooperatives
      SET name = 'CYANIKA FARMER GROUP', organization_type = 'farmer_group'
      WHERE id = 30001
    `);
    await sequelize.query(`
      UPDATE farmers
      SET district = 'Nyamagabe', sector = 'Gasaka', cell = 'Ngiryi', village = 'Test Village'
      WHERE id = 31
    `);

    const [[sme]] = await sequelize.query(
      'SELECT id, name, organization_type FROM cooperatives WHERE id = 30002'
    );
    const [[editedOrganization]] = await sequelize.query(
      'SELECT id, name, organization_type FROM cooperatives WHERE id = 30001'
    );
    const [[editedFarmer]] = await sequelize.query(
      'SELECT id, member_id, location, district, sector, cell, village FROM farmers WHERE id = 31'
    );

    expect(sme).toEqual({
      id: 30002,
      name: 'Rwanda Harvest SME',
      organization_type: 'sme',
    });
    expect(editedOrganization).toEqual({
      id: 30001,
      name: 'CYANIKA FARMER GROUP',
      organization_type: 'farmer_group',
    });
    expect(editedFarmer).toEqual({
      id: 31,
      member_id: 21,
      location: 'Legacy location one',
      district: 'Nyamagabe',
      sector: 'Gasaka',
      cell: 'Ngiryi',
      village: 'Test Village',
    });
  });

  it('is safe to run again when all target columns already exist', async () => {
    await migration.up(queryInterface, Sequelize);
    const schemaAfterFirstRun = {
      cooperatives: await queryInterface.describeTable('cooperatives'),
      farmers: await queryInterface.describeTable('farmers'),
    };

    await migration.up(queryInterface, Sequelize);

    expect(await queryInterface.describeTable('cooperatives')).toEqual(schemaAfterFirstRun.cooperatives);
    expect(await queryInterface.describeTable('farmers')).toEqual(schemaAfterFirstRun.farmers);
  });

  it('supports rollback while preserving pre-existing fields, rows, IDs, and relationships', async () => {
    const countsBefore = await snapshotCounts();
    await migration.up(queryInterface, Sequelize);

    // Sequelize emulates DROP COLUMN in SQLite by rebuilding the table. Disable
    // SQLite's FK enforcement only for that emulation; MySQL drops these
    // unrelated columns in place without altering the existing relationships.
    await sequelize.query('PRAGMA foreign_keys = OFF');
    await migration.down(queryInterface, Sequelize);
    await sequelize.query('PRAGMA foreign_keys = ON');

    const organizationColumns = await queryInterface.describeTable('cooperatives');
    const farmerColumns = await queryInterface.describeTable('farmers');
    const [organizations] = await sequelize.query('SELECT id, name FROM cooperatives ORDER BY id');
    const [farmers] = await sequelize.query(
      'SELECT id, member_id, location FROM farmers ORDER BY id'
    );

    expect(organizationColumns.organization_type).toBeUndefined();
    expect(farmerColumns.district).toBeUndefined();
    expect(farmerColumns.sector).toBeUndefined();
    expect(farmerColumns.cell).toBeUndefined();
    expect(farmerColumns.village).toBeUndefined();
    expect(await snapshotCounts()).toEqual(countsBefore);
    expect(organizations).toEqual([
      { id: 1, name: 'GASAKA TEA COOP' },
      { id: 30001, name: 'CYANIKA' },
    ]);
    expect(farmers).toEqual([
      { id: 31, member_id: 21, location: 'Legacy location one' },
      { id: 32, member_id: 22, location: 'Legacy location two' },
    ]);

    const [[relationship]] = await sequelize.query(`
      SELECT p.farmer_id, f.member_id, m.cooperative_id
      FROM production p
      JOIN farmers f ON f.id = p.farmer_id
      JOIN members m ON m.id = f.member_id
      WHERE p.id = 41
    `);
    expect(relationship).toEqual({ farmer_id: 31, member_id: 21, cooperative_id: 1 });
  });
});
