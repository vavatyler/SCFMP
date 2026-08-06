'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('loans', {
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
      member_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'members',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      principal_amount: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
      },
      interest_rate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Annual interest rate as a percentage, e.g. 12.00 for 12%',
      },
      balance: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        comment: 'Remaining amount owed; starts equal to principal_amount, decreases with repayments',
      },
      issue_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      due_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('active', 'paid', 'defaulted'),
        defaultValue: 'active',
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

    await queryInterface.addIndex('loans', ['cooperative_id']);
    await queryInterface.addIndex('loans', ['member_id']);
    await queryInterface.addIndex('loans', ['status']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('loans');
  },
};
