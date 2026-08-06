'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('inventory_items', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      cooperative_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'cooperatives',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      item_name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      category: {
        type: Sequelize.ENUM('seed', 'fertilizer', 'equipment', 'other'),
        defaultValue: 'other',
      },
      unit: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'e.g. kg, litre, piece, bag',
      },
      quantity_in_stock: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Never edited directly — only changed via inventory_transactions',
      },
      reorder_level: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Triggers a low-stock alert when quantity_in_stock falls to or below this',
      },
      unit_cost: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('active', 'discontinued'),
        defaultValue: 'active',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('inventory_items', ['cooperative_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('inventory_items');
  },
};
