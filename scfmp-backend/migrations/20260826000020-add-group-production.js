'use strict';

const normalizeTableName = (value) => (
  typeof value === 'string' ? value : value.tableName || value.name
);

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = new Set((await queryInterface.showAllTables()).map(normalizeTableName));

    if (!tables.has('farmer_groups')) {
      await queryInterface.createTable('farmer_groups', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        cooperative_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'cooperatives', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        name: { type: Sequelize.STRING(150), allowNull: false },
        location: { type: Sequelize.STRING(255), allowNull: true },
        status: {
          type: Sequelize.ENUM('active', 'inactive'),
          allowNull: false,
          defaultValue: 'active',
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      });
      await queryInterface.addConstraint('farmer_groups', {
        fields: ['cooperative_id', 'name'],
        type: 'unique',
        name: 'farmer_groups_cooperative_name_unique',
      });
      await queryInterface.addIndex('farmer_groups', ['cooperative_id'], {
        name: 'farmer_groups_cooperative_id',
      });
    }

    let columns = await queryInterface.describeTable('production');
    const additions = {
      production_mode: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'individual',
      },
      farmer_group_id: { type: Sequelize.INTEGER, allowNull: true },
      production_location: { type: Sequelize.STRING(255), allowNull: true },
      expected_production: { type: Sequelize.DECIMAL(14, 2), allowNull: true },
      actual_harvest: { type: Sequelize.DECIMAL(14, 2), allowNull: true },
      harvest_date: { type: Sequelize.DATEONLY, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
    };
    for (const [field, definition] of Object.entries(additions)) {
      if (!columns[field]) await queryInterface.addColumn('production', field, definition);
    }

    columns = await queryInterface.describeTable('production');
    const production = queryInterface.queryGenerator.quoteTable('production');
    const quote = (field) => queryInterface.queryGenerator.quoteIdentifier(field);
    await queryInterface.sequelize.query(
      `UPDATE ${production} SET ${quote('production_mode')} = 'individual' `
      + `WHERE ${quote('production_mode')} IS NULL OR ${quote('production_mode')} = ''`
    );
    await queryInterface.sequelize.query(
      `UPDATE ${production} SET ${quote('actual_harvest')} = ${quote('quantity')} `
      + `WHERE ${quote('actual_harvest')} IS NULL`
    );
    await queryInterface.sequelize.query(
      `UPDATE ${production} SET ${quote('harvest_date')} = ${quote('production_date')} `
      + `WHERE ${quote('harvest_date')} IS NULL`
    );

    if (columns.farmer_id && columns.farmer_id.allowNull === false) {
      await queryInterface.changeColumn('production', 'farmer_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'farmers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    }
    await queryInterface.changeColumn('production', 'quantity', {
      type: Sequelize.DECIMAL(14, 2),
      allowNull: false,
    });
    await queryInterface.changeColumn('production', 'actual_harvest', {
      type: Sequelize.DECIMAL(14, 2),
      allowNull: false,
    });
    await queryInterface.changeColumn('production', 'harvest_date', {
      type: Sequelize.DATEONLY,
      allowNull: false,
    });

    const foreignKeys = await queryInterface.getForeignKeyReferencesForTable('production');
    const foreignKeyColumns = new Set(
      foreignKeys.map((key) => key.columnName || key.column_name)
    );
    if (!foreignKeyColumns.has('farmer_group_id')) {
      await queryInterface.addConstraint('production', {
        fields: ['farmer_group_id'],
        type: 'foreign key',
        name: 'production_farmer_group_id_fk',
        references: { table: 'farmer_groups', field: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      });
    }

    const indexes = await queryInterface.showIndex('production');
    const indexNames = new Set(indexes.map((index) => index.name));
    for (const [field, name] of [
      ['production_mode', 'production_mode'],
      ['farmer_group_id', 'production_farmer_group_id'],
      ['harvest_date', 'production_harvest_date'],
    ]) {
      if (!indexNames.has(name)) await queryInterface.addIndex('production', [field], { name });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tables = new Set((await queryInterface.showAllTables()).map(normalizeTableName));
    if (!tables.has('production')) return;

    const columns = await queryInterface.describeTable('production');
    for (const field of [
      'notes',
      'harvest_date',
      'actual_harvest',
      'expected_production',
      'production_location',
      'farmer_group_id',
      'production_mode',
    ]) {
      if (columns[field]) await queryInterface.removeColumn('production', field);
    }
    await queryInterface.changeColumn('production', 'farmer_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'farmers', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
    if (tables.has('farmer_groups')) await queryInterface.dropTable('farmer_groups');
  },
};
