'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('farmers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      member_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true, // one farmer profile per member
        references: {
          model: 'members',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      farm_size_ha: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Farm size in hectares',
      },
      location: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      gps_coordinates: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      crop_type: {
        type: Sequelize.STRING(100),
        allowNull: true,
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

    await queryInterface.addIndex('farmers', ['member_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('farmers');
  },
};
