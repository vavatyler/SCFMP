'use strict';

const MEMBER_ADDRESS_FIELDS = [
  'address_district',
  'address_sector',
  'address_cell',
  'address_village',
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const memberColumns = await queryInterface.describeTable('members');

    for (const field of MEMBER_ADDRESS_FIELDS) {
      if (!memberColumns[field]) {
        await queryInterface.addColumn('members', field, {
          type: Sequelize.STRING(100),
          allowNull: true,
        });
      }
    }
  },

  down: async (queryInterface) => {
    const memberColumns = await queryInterface.describeTable('members');

    for (const field of [...MEMBER_ADDRESS_FIELDS].reverse()) {
      if (memberColumns[field]) await queryInterface.removeColumn('members', field);
    }
  },
};
