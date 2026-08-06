'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('cooperatives', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      registration_number: {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true,
      },
      district: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      sector: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      cell: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      village: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      email: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'suspended'),
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
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('cooperatives');
  },
};
