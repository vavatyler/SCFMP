'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    let columns = await queryInterface.describeTable('documents');
    const additions = {
      title: { type: Sequelize.STRING(255), allowNull: true },
      category: { type: Sequelize.STRING(80), allowNull: true },
      document_type: { type: Sequelize.STRING(100), allowNull: true },
      document_date: { type: Sequelize.DATEONLY, allowNull: true },
      expiry_date: { type: Sequelize.DATEONLY, allowNull: true },
      version: { type: Sequelize.STRING(40), allowNull: true },
      tags: { type: Sequelize.TEXT, allowNull: true },
      visibility: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'organization' },
      notes: { type: Sequelize.TEXT, allowNull: true },
      archived_at: { type: Sequelize.DATE, allowNull: true },
    };
    for (const [field, definition] of Object.entries(additions)) {
      if (!columns[field]) await queryInterface.addColumn('documents', field, definition);
    }

    const documents = queryInterface.queryGenerator.quoteTable('documents');
    const q = (field) => queryInterface.queryGenerator.quoteIdentifier(field);
    await queryInterface.sequelize.query(
      `UPDATE ${documents} SET ${q('title')} = ${q('original_name')} `
      + `WHERE ${q('title')} IS NULL OR ${q('title')} = ''`
    );
    await queryInterface.sequelize.query(
      `UPDATE ${documents} SET ${q('category')} = 'other' `
      + `WHERE ${q('category')} IS NULL OR ${q('category')} = ''`
    );
    await queryInterface.sequelize.query(
      `UPDATE ${documents} SET ${q('document_type')} = 'other' `
      + `WHERE ${q('document_type')} IS NULL OR ${q('document_type')} = ''`
    );
    await queryInterface.changeColumn('documents', 'title', { type: Sequelize.STRING(255), allowNull: false });
    await queryInterface.changeColumn('documents', 'category', { type: Sequelize.STRING(80), allowNull: false, defaultValue: 'other' });
    await queryInterface.changeColumn('documents', 'document_type', { type: Sequelize.STRING(100), allowNull: false, defaultValue: 'other' });

    const indexes = await queryInterface.showIndex('documents');
    const names = new Set(indexes.map((index) => index.name));
    for (const [fields, name] of [
      [['category', 'document_type'], 'documents_category_type'],
      [['expiry_date'], 'documents_expiry_date'],
      [['archived_at'], 'documents_archived_at'],
      [['uploaded_by'], 'documents_uploaded_by'],
    ]) {
      if (!names.has(name)) await queryInterface.addIndex('documents', fields, { name });
    }
  },

  down: async (queryInterface) => {
    const columns = await queryInterface.describeTable('documents');
    for (const field of [
      'archived_at',
      'notes',
      'visibility',
      'tags',
      'version',
      'expiry_date',
      'document_date',
      'document_type',
      'category',
      'title',
    ]) {
      if (columns[field]) await queryInterface.removeColumn('documents', field);
    }
  },
};
