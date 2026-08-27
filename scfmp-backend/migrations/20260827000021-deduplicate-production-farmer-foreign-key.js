'use strict';

const valueFor = (foreignKey, ...names) => {
  const key = names.find((name) => foreignKey[name] !== undefined);
  return key ? foreignKey[key] : null;
};

const constraintNameFor = (foreignKey) => valueFor(
  foreignKey,
  'constraintName',
  'constraint_name'
);

module.exports = {
  up: async (queryInterface) => {
    const foreignKeys = await queryInterface.getForeignKeyReferencesForTable('production');
    const farmerForeignKeys = foreignKeys
      .filter((foreignKey) => (
        valueFor(foreignKey, 'columnName', 'column_name') === 'farmer_id'
        && valueFor(foreignKey, 'referencedTableName', 'referenced_table_name') === 'farmers'
        && valueFor(foreignKey, 'referencedColumnName', 'referenced_column_name') === 'id'
        && constraintNameFor(foreignKey)
      ))
      .sort((left, right) => (
        constraintNameFor(left).localeCompare(constraintNameFor(right), 'en', { numeric: true })
      ));

    // Migration 20 only changes farmer_id nullability. Some MySQL-compatible
    // databases preserve the original FK and add an equivalent replacement.
    // Retain one valid relationship and remove only equivalent duplicates.
    for (const duplicate of farmerForeignKeys.slice(1)) {
      await queryInterface.removeConstraint('production', constraintNameFor(duplicate));
    }
  },

  // A redundant constraint carries no distinct relationship to restore.
  down: async () => {},
};
