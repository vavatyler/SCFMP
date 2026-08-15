'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableNames = new Set(
      (await queryInterface.showAllTables()).map((table) =>
        typeof table === 'string' ? table : table.tableName || table.name
      )
    );

    // TiDB DDL is not transactional, so a failed migration can leave this table
    // behind. Make the migration safe to retry after a partial application.
    if (!tableNames.has('products')) {
      await queryInterface.createTable('products', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        cooperative_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'cooperatives', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        name: { type: Sequelize.STRING(100), allowNull: false },
        category: { type: Sequelize.STRING(100), allowNull: true },
        default_unit: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'kg' },
        status: {
          type: Sequelize.ENUM('active', 'inactive'),
          allowNull: false,
          defaultValue: 'active',
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      });
      await queryInterface.addConstraint('products', {
        fields: ['cooperative_id', 'name'],
        type: 'unique',
        name: 'products_cooperative_name_unique',
      });
      await queryInterface.addIndex('products', ['cooperative_id']);
    }

    const productionColumns = await queryInterface.describeTable('production');

    // TiDB rejects an ALTER that adds a column and a foreign key referencing that
    // new column together. Add the columns first, then add constraints below.
    if (!productionColumns.cooperative_id) {
      await queryInterface.addColumn('production', 'cooperative_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
    if (!productionColumns.product_id) {
      await queryInterface.addColumn('production', 'product_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
    if (!productionColumns.status) {
      await queryInterface.addColumn('production', 'status', {
        type: Sequelize.ENUM('recorded', 'verified', 'rejected'),
        allowNull: false,
        defaultValue: 'recorded',
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE production p
      INNER JOIN farmers f ON f.id = p.farmer_id
      INNER JOIN members m ON m.id = f.member_id
      SET p.cooperative_id = m.cooperative_id
      WHERE p.cooperative_id IS NULL
    `);
    await queryInterface.sequelize.query(`
      INSERT IGNORE INTO products (cooperative_id, name, default_unit, status, created_at, updated_at)
      SELECT p.cooperative_id, p.product_name, MAX(COALESCE(p.unit, 'kg')), 'active', NOW(), NOW()
      FROM production p
      WHERE p.cooperative_id IS NOT NULL
      GROUP BY p.cooperative_id, p.product_name
    `);
    await queryInterface.sequelize.query(`
      UPDATE production p
      INNER JOIN products pr
        ON pr.cooperative_id = p.cooperative_id AND pr.name = p.product_name
      SET p.product_id = pr.id
      WHERE p.product_id IS NULL
    `);

    await queryInterface.changeColumn('production', 'cooperative_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
    await queryInterface.changeColumn('production', 'product_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    const foreignKeys = await queryInterface.getForeignKeyReferencesForTable('production');
    const foreignKeyColumns = new Set(
      foreignKeys.map((foreignKey) => foreignKey.columnName || foreignKey.column_name)
    );
    if (!foreignKeyColumns.has('cooperative_id')) {
      await queryInterface.addConstraint('production', {
        fields: ['cooperative_id'],
        type: 'foreign key',
        name: 'production_cooperative_id_fk',
        references: { table: 'cooperatives', field: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    }
    if (!foreignKeyColumns.has('product_id')) {
      await queryInterface.addConstraint('production', {
        fields: ['product_id'],
        type: 'foreign key',
        name: 'production_product_id_fk',
        references: { table: 'products', field: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      });
    }

    const productionIndexes = await queryInterface.showIndex('production');
    const productionIndexNames = new Set(productionIndexes.map((index) => index.name));
    for (const [field, name] of [
      ['cooperative_id', 'production_cooperative_id'],
      ['product_id', 'production_product_id'],
      ['season', 'production_season'],
      ['status', 'production_status'],
    ]) {
      if (!productionIndexNames.has(name)) {
        await queryInterface.addIndex('production', [field], { name });
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('production', 'status');
    await queryInterface.removeColumn('production', 'product_id');
    await queryInterface.removeColumn('production', 'cooperative_id');
    await queryInterface.dropTable('products');
  },
};
