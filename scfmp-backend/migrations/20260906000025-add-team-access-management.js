'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const userColumns = await queryInterface.describeTable('users');
    if (!userColumns.system_access_enabled) {
      await queryInterface.addColumn('users', 'system_access_enabled', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
    }
    if (!userColumns.permissions) {
      await queryInterface.addColumn('users', 'permissions', {
        type: Sequelize.JSON,
        allowNull: true,
      });
    }

    const teamColumns = await queryInterface.describeTable('team_members');
    if (!teamColumns.profile_visibility) {
      await queryInterface.addColumn('team_members', 'profile_visibility', {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'visible',
      });
    }
    if (!teamColumns.linked_user_id) {
      await queryInterface.addColumn('team_members', 'linked_user_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    // Add the column and constraint separately for MySQL-compatible providers
    // that cannot resolve a new key in a compound ALTER TABLE statement.
    const foreignKeys = await queryInterface.getForeignKeyReferencesForTable('team_members');
    if (!foreignKeys.some((key) => key.columnName === 'linked_user_id')) {
      await queryInterface.addConstraint('team_members', {
        fields: ['linked_user_id'],
        type: 'foreign key',
        name: 'team_members_linked_user_id_fk',
        references: { table: 'users', field: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    const indexes = await queryInterface.showIndex('team_members');
    const indexNames = new Set(indexes.map((index) => index.name));
    if (!indexNames.has('team_members_linked_user_unique')) {
      await queryInterface.addIndex('team_members', ['linked_user_id'], {
        name: 'team_members_linked_user_unique',
        unique: true,
      });
    }
    if (!indexNames.has('team_members_visibility_status_order')) {
      await queryInterface.addIndex('team_members', ['profile_visibility', 'status', 'display_order'], {
        name: 'team_members_visibility_status_order',
      });
    }
  },

  down: async (queryInterface) => {
    const indexes = await queryInterface.showIndex('team_members');
    const indexNames = new Set(indexes.map((index) => index.name));
    if (indexNames.has('team_members_visibility_status_order')) {
      await queryInterface.removeIndex('team_members', 'team_members_visibility_status_order');
    }
    if (indexNames.has('team_members_linked_user_unique')) {
      await queryInterface.removeIndex('team_members', 'team_members_linked_user_unique');
    }

    const foreignKeys = await queryInterface.getForeignKeyReferencesForTable('team_members');
    const linkedUserForeignKey = foreignKeys.find((key) => key.columnName === 'linked_user_id');
    if (linkedUserForeignKey?.constraintName) {
      await queryInterface.removeConstraint('team_members', linkedUserForeignKey.constraintName);
    }

    const teamColumns = await queryInterface.describeTable('team_members');
    if (teamColumns.linked_user_id) await queryInterface.removeColumn('team_members', 'linked_user_id');
    if (teamColumns.profile_visibility) await queryInterface.removeColumn('team_members', 'profile_visibility');

    const userColumns = await queryInterface.describeTable('users');
    if (userColumns.permissions) await queryInterface.removeColumn('users', 'permissions');
    if (userColumns.system_access_enabled) await queryInterface.removeColumn('users', 'system_access_enabled');
  },
};
