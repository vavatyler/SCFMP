'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('production', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'farmers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      product_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      unit: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'kg',
      },
      unit_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      total_amount: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        comment: 'Auto-calculated: quantity * unit_price',
      },
      season: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'e.g. "2026A" or "2026B" for Rwanda\'s two growing seasons',
      },
      production_date: {
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

    await queryInterface.addIndex('production', ['farmer_id']);
    await queryInterface.addIndex('production', ['production_date']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('production');
  },
};
