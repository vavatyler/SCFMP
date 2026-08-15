const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Product extends Model {
    static associate(models) {
      Product.belongsTo(models.Cooperative, {
        foreignKey: 'cooperative_id',
        as: 'cooperative',
      });
      Product.hasMany(models.Production, {
        foreignKey: 'product_id',
        as: 'productionRecords',
      });
    }
  }

  Product.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      cooperative_id: { type: DataTypes.INTEGER, allowNull: false },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: { notEmpty: true },
      },
      category: DataTypes.STRING(100),
      default_unit: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'kg' },
      status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
      },
    },
    {
      sequelize,
      modelName: 'Product',
      tableName: 'products',
      underscored: true,
      indexes: [{ unique: true, fields: ['cooperative_id', 'name'] }],
    }
  );

  return Product;
};
