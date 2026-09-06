'use strict';

const ROLE_VALUES = [
  'super_admin',
  'platform_admin',
  'technical_admin',
  'cooperative_manager',
  'accountant',
  'field_officer',
  'farmer',
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === 'mysql' || dialect === 'mariadb') {
      await queryInterface.sequelize.query(
        `ALTER TABLE users MODIFY role ENUM(${ROLE_VALUES.map((role) => `'${role}'`).join(', ')}) NOT NULL`
      );
    } else {
      await queryInterface.changeColumn('users', 'role', {
        type: Sequelize.ENUM(...ROLE_VALUES),
        allowNull: false,
      });
    }

    const columns = await queryInterface.describeTable('users');
    if (!columns.account_scope) {
      await queryInterface.addColumn('users', 'account_scope', {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'organization',
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE users
      SET account_scope = CASE
        WHEN role IN ('super_admin', 'platform_admin', 'technical_admin') THEN 'platform'
        ELSE 'organization'
      END
    `);

    const indexes = await queryInterface.showIndex('users');
    if (!indexes.some((index) => index.name === 'users_account_scope_role')) {
      await queryInterface.addIndex('users', ['account_scope', 'role'], {
        name: 'users_account_scope_role',
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const indexes = await queryInterface.showIndex('users');
    if (indexes.some((index) => index.name === 'users_account_scope_role')) {
      await queryInterface.removeIndex('users', 'users_account_scope_role');
    }
    const columns = await queryInterface.describeTable('users');
    if (columns.account_scope) await queryInterface.removeColumn('users', 'account_scope');
    await queryInterface.changeColumn('users', 'role', {
      type: Sequelize.ENUM('super_admin', 'cooperative_manager', 'accountant', 'field_officer', 'farmer'),
      allowNull: false,
    });
  },
};
