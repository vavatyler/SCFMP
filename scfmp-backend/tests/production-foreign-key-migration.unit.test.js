const migration = require(
  '../migrations/20260827000021-deduplicate-production-farmer-foreign-key'
);

const farmerForeignKey = (constraintName) => ({
  constraintName,
  columnName: 'farmer_id',
  referencedTableName: 'farmers',
  referencedColumnName: 'id',
});

describe('Production farmer foreign-key cleanup migration', () => {
  it('keeps one farmer relationship and removes only equivalent duplicates', async () => {
    const queryInterface = {
      getForeignKeyReferencesForTable: jest.fn().mockResolvedValue([
        farmerForeignKey('fk_5'),
        { ...farmerForeignKey('fk_1'), constraintName: undefined },
        farmerForeignKey('fk_1'),
        {
          constraintName: 'production_product_id_fk',
          columnName: 'product_id',
          referencedTableName: 'products',
          referencedColumnName: 'id',
        },
      ]),
      removeConstraint: jest.fn().mockResolvedValue(undefined),
    };

    await migration.up(queryInterface);

    expect(queryInterface.removeConstraint).toHaveBeenCalledTimes(1);
    expect(queryInterface.removeConstraint).toHaveBeenCalledWith('production', 'fk_5');
  });

  it('is idempotent when one or no matching constraint exists', async () => {
    for (const foreignKeys of [[], [farmerForeignKey('fk_1')]]) {
      const queryInterface = {
        getForeignKeyReferencesForTable: jest.fn().mockResolvedValue(foreignKeys),
        removeConstraint: jest.fn(),
      };

      await migration.up(queryInterface);

      expect(queryInterface.removeConstraint).not.toHaveBeenCalled();
    }
  });
});
