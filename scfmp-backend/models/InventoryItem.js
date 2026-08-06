const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class InventoryItem extends Model {
    static associate(models) {
      InventoryItem.belongsTo(models.Cooperative, {
        foreignKey: 'cooperative_id',
        as: 'cooperative',
      });
      InventoryItem.hasMany(models.InventoryTransaction, {
        foreignKey: 'item_id',
        as: 'movements',
      });
    }
  }

  InventoryItem.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      cooperative_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      item_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: { notEmpty: true },
      },
      category: {
        type: DataTypes.ENUM('seed', 'fertilizer', 'equipment', 'other'),
        defaultValue: 'other',
      },
      unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      quantity_in_stock: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
      },
      reorder_level: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
      },
      unit_cost: DataTypes.DECIMAL(12, 2),
      status: {
        type: DataTypes.ENUM('active', 'discontinued'),
        defaultValue: 'active',
      },
    },
    {
      sequelize,
      modelName: 'InventoryItem',
      tableName: 'inventory_items',
      underscored: true,
    }
  );

  return InventoryItem;
};
