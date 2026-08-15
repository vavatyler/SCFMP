'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs', {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      actor_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      cooperative_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'cooperatives', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      action: { type: Sequelize.STRING(80), allowNull: false },
      entity_type: { type: Sequelize.STRING(80), allowNull: true },
      entity_id: { type: Sequelize.STRING(80), allowNull: true },
      outcome: {
        type: Sequelize.ENUM('success', 'failure'),
        allowNull: false,
        defaultValue: 'success',
      },
      ip_address: { type: Sequelize.STRING(64), allowNull: true },
      user_agent: { type: Sequelize.STRING(255), allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('audit_logs', ['actor_user_id']);
    await queryInterface.addIndex('audit_logs', ['cooperative_id']);
    await queryInterface.addIndex('audit_logs', ['action']);
    await queryInterface.addIndex('audit_logs', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('audit_logs');
  },
};
