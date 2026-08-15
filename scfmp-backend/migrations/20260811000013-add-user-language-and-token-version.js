'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'preferred_language', {
      type: Sequelize.ENUM('en', 'rw', 'fr'),
      allowNull: false,
      defaultValue: 'en',
    });
    await queryInterface.addColumn('users', 'token_version', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'token_version');
    await queryInterface.removeColumn('users', 'preferred_language');
  },
};
