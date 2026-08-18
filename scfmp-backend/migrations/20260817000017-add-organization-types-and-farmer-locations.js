'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const cooperativeColumns = await queryInterface.describeTable('cooperatives');
    if (!cooperativeColumns.organization_type) {
      await queryInterface.addColumn('cooperatives', 'organization_type', {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'cooperative',
      });
    }

    const farmerColumns = await queryInterface.describeTable('farmers');
    for (const field of ['district', 'sector', 'cell', 'village']) {
      if (!farmerColumns[field]) {
        await queryInterface.addColumn('farmers', field, {
          type: Sequelize.STRING(100),
          allowNull: true,
        });
      }
    }
  },

  down: async (queryInterface) => {
    const farmerColumns = await queryInterface.describeTable('farmers');
    for (const field of ['village', 'cell', 'sector', 'district']) {
      if (farmerColumns[field]) await queryInterface.removeColumn('farmers', field);
    }

    const cooperativeColumns = await queryInterface.describeTable('cooperatives');
    if (cooperativeColumns.organization_type) {
      await queryInterface.removeColumn('cooperatives', 'organization_type');
    }
  },
};
