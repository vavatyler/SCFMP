'use strict';

const normalizeTableName = (value) => (
  typeof value === 'string' ? value : value.tableName || value.name
);

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = new Set((await queryInterface.showAllTables()).map(normalizeTableName));
    if (!tables.has('team_members')) {
      await queryInterface.createTable('team_members', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        full_name: { type: Sequelize.STRING(150), allowNull: false },
        position: { type: Sequelize.STRING(150), allowNull: false },
        biography: { type: Sequelize.TEXT, allowNull: true },
        responsibilities: { type: Sequelize.TEXT, allowNull: true },
        skills: { type: Sequelize.TEXT, allowNull: true },
        photo_url: { type: Sequelize.STRING(500), allowNull: true },
        linkedin_url: { type: Sequelize.STRING(500), allowNull: true },
        github_url: { type: Sequelize.STRING(500), allowNull: true },
        email: { type: Sequelize.STRING(150), allowNull: true },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'active' },
        display_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      });
      await queryInterface.addIndex('team_members', ['status', 'display_order'], {
        name: 'team_members_status_order',
      });
    }

    if (!tables.has('subscriptions')) {
      await queryInterface.createTable('subscriptions', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        cooperative_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          unique: true,
          references: { model: 'cooperatives', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        plan_id: { type: Sequelize.STRING(40), allowNull: false },
        status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'inactive' },
        billing_cycle: { type: Sequelize.STRING(20), allowNull: true },
        starts_at: { type: Sequelize.DATE, allowNull: true },
        next_billing_date: { type: Sequelize.DATEONLY, allowNull: true },
        renews_at: { type: Sequelize.DATEONLY, allowNull: true },
        cancel_at_period_end: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        payment_status: { type: Sequelize.STRING(30), allowNull: true },
        external_reference: { type: Sequelize.STRING(191), allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      });
    }
  },

  down: async (queryInterface) => {
    const tables = new Set((await queryInterface.showAllTables()).map(normalizeTableName));
    if (tables.has('subscriptions')) await queryInterface.dropTable('subscriptions');
    if (tables.has('team_members')) await queryInterface.dropTable('team_members');
  },
};
