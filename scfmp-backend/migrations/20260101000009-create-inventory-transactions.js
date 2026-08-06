'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('inventory_transactions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      item_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'inventory_items',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM('in', 'out'),
        allowNull: false,
        comment: '"in" = stock received (purchase, donation); "out" = stock issued/used',
      },
      quantity: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      reference: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'e.g. "Purchased from AgroSupply Ltd", "Issued to Valentin Nshimiyimana"',
      },
      transaction_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      recorded_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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

    await queryInterface.addIndex('inventory_transactions', ['item_id']);
    await queryInterface.addIndex('inventory_transactions', ['type']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('inventory_transactions');
  },
};
