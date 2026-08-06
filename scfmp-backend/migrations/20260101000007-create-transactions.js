'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('transactions', {
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
        // nullable: some expenses (e.g. cooperative rent, equipment) aren't tied to a specific member
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'members',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      loan_id: {
        // set when this transaction is a loan disbursement or repayment
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'loans',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      type: {
        type: Sequelize.ENUM(
          'income',
          'expense',
          'saving',
          'loan_disbursement',
          'loan_repayment'
        ),
        allowNull: false,
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'e.g. "Membership fee", "Equipment purchase", "Coffee sales"',
      },
      amount: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
      },
      description: {
        type: Sequelize.STRING(255),
        allowNull: true,
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

    await queryInterface.addIndex('transactions', ['cooperative_id']);
    await queryInterface.addIndex('transactions', ['member_id']);
    await queryInterface.addIndex('transactions', ['type']);
    await queryInterface.addIndex('transactions', ['transaction_date']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('transactions');
  },
};
