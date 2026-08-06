'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('documents', {
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
      owner_type: {
        // What this document is attached to — kept generic (not a strict FK) so the same
        // documents table can serve cooperatives, members, farmers, and loans without
        // needing a separate table per entity type.
        type: Sequelize.ENUM('cooperative', 'member', 'farmer', 'loan'),
        allowNull: false,
      },
      owner_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'The id of the cooperative/member/farmer/loan this document belongs to',
      },
      original_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'The filename as uploaded by the user, e.g. "national_id_scan.pdf"',
      },
      stored_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'The unique filename actually saved on disk, to avoid collisions',
      },
      file_path: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      file_size: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Size in bytes',
      },
      description: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      uploaded_by: {
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

    await queryInterface.addIndex('documents', ['cooperative_id']);
    await queryInterface.addIndex('documents', ['owner_type', 'owner_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('documents');
  },
};
