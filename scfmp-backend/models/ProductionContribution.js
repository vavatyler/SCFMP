const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class ProductionContribution extends Model {
    static associate(models) {
      ProductionContribution.belongsTo(models.Production, {
        foreignKey: 'production_id',
        as: 'production',
      });
      ProductionContribution.belongsTo(models.Farmer, {
        foreignKey: 'farmer_id',
        as: 'farmer',
      });
    }
  }

  ProductionContribution.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    production_id: { type: DataTypes.INTEGER, allowNull: false },
    farmer_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      validate: { min: 0.01 },
    },
    unit: { type: DataTypes.STRING(20), allowNull: false },
  }, {
    sequelize,
    modelName: 'ProductionContribution',
    tableName: 'production_contributions',
    underscored: true,
    indexes: [{ unique: true, fields: ['production_id', 'farmer_id'] }],
  });

  return ProductionContribution;
};
