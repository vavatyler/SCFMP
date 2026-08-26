'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    let columns = await queryInterface.describeTable('farmers');

    if (!columns.farm_size) {
      await queryInterface.addColumn('farmers', 'farm_size', {
        type: Sequelize.DECIMAL(14, 4),
        allowNull: true,
        comment: 'Farm size value in the separately stored farm_size_unit',
      });
    }
    if (!columns.farm_size_unit) {
      await queryInterface.addColumn('farmers', 'farm_size_unit', {
        type: Sequelize.STRING(10),
        allowNull: true,
        comment: 'Farm size unit: ha, acres, m2, or km2',
      });
    }

    columns = await queryInterface.describeTable('farmers');
    if (columns.farm_size_ha && columns.farm_size && columns.farm_size_unit) {
      const table = queryInterface.queryGenerator.quoteTable('farmers');
      const farmSize = queryInterface.queryGenerator.quoteIdentifier('farm_size');
      const legacySize = queryInterface.queryGenerator.quoteIdentifier('farm_size_ha');
      const unit = queryInterface.queryGenerator.quoteIdentifier('farm_size_unit');

      await queryInterface.sequelize.query(
        `UPDATE ${table} SET ${farmSize} = ${legacySize} `
        + `WHERE ${farmSize} IS NULL AND ${legacySize} IS NOT NULL`
      );
      await queryInterface.sequelize.query(
        `UPDATE ${table} SET ${unit} = 'ha' `
        + `WHERE ${unit} IS NULL AND ${legacySize} IS NOT NULL`
      );
    }
  },

  down: async (queryInterface) => {
    const columns = await queryInterface.describeTable('farmers');
    if (columns.farm_size_unit) await queryInterface.removeColumn('farmers', 'farm_size_unit');
    if (columns.farm_size) await queryInterface.removeColumn('farmers', 'farm_size');
  },
};
