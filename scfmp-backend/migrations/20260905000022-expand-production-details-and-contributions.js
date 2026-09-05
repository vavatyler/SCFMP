'use strict';

const normalizeTableName = (value) => (
  typeof value === 'string' ? value : value.tableName || value.name
);

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = new Set((await queryInterface.showAllTables()).map(normalizeTableName));
    const columns = await queryInterface.describeTable('production');
    const additions = {
      reporting_period: { type: Sequelize.STRING(50), allowNull: true },
      variety: { type: Sequelize.STRING(100), allowNull: true },
      production_category: { type: Sequelize.STRING(100), allowNull: true },
      quality_grade: { type: Sequelize.STRING(50), allowNull: true },
      storage_location: { type: Sequelize.STRING(255), allowNull: true },
      storage_quantity: { type: Sequelize.DECIMAL(14, 2), allowNull: true },
      sold_quantity: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      remaining_quantity: { type: Sequelize.DECIMAL(14, 2), allowNull: true },
      buyer: { type: Sequelize.STRING(150), allowNull: true },
    };
    for (const [field, definition] of Object.entries(additions)) {
      if (!columns[field]) await queryInterface.addColumn('production', field, definition);
    }

    const production = queryInterface.queryGenerator.quoteTable('production');
    const q = (field) => queryInterface.queryGenerator.quoteIdentifier(field);
    await queryInterface.sequelize.query(
      `UPDATE ${production} SET ${q('sold_quantity')} = 0 WHERE ${q('sold_quantity')} IS NULL`
    );
    await queryInterface.sequelize.query(
      `UPDATE ${production} SET ${q('remaining_quantity')} = ${q('actual_harvest')} `
      + `WHERE ${q('remaining_quantity')} IS NULL`
    );

    if (!tables.has('production_contributions')) {
      await queryInterface.createTable('production_contributions', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        production_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'production', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        farmer_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'farmers', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        quantity: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
        unit: { type: Sequelize.STRING(20), allowNull: false },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      });
      await queryInterface.addConstraint('production_contributions', {
        fields: ['production_id', 'farmer_id'],
        type: 'unique',
        name: 'production_contributions_record_farmer_unique',
      });
      await queryInterface.addIndex('production_contributions', ['farmer_id'], {
        name: 'production_contributions_farmer_id',
      });
    }
  },

  down: async (queryInterface) => {
    const tables = new Set((await queryInterface.showAllTables()).map(normalizeTableName));
    if (tables.has('production_contributions')) {
      await queryInterface.dropTable('production_contributions');
    }
    const columns = await queryInterface.describeTable('production');
    for (const field of [
      'buyer',
      'remaining_quantity',
      'sold_quantity',
      'storage_quantity',
      'storage_location',
      'quality_grade',
      'production_category',
      'variety',
      'reporting_period',
    ]) {
      if (columns[field]) await queryInterface.removeColumn('production', field);
    }
  },
};
