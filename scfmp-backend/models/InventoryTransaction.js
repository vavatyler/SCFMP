const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class InventoryTransaction extends Model {
    static associate(models) {
      InventoryTransaction.belongsTo(models.InventoryItem, {
        foreignKey: 'item_id',
        as: 'item',
      });
      InventoryTransaction.belongsTo(models.User, {
        foreignKey: 'recorded_by',
        as: 'recordedByUser',
      });
    }
  }

  InventoryTransaction.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      item_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM('in', 'out'),
        allowNull: false,
      },
      quantity: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        validate: { min: 0.01 },
      },
      reference: DataTypes.STRING(255),
      transaction_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      recorded_by: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: 'InventoryTransaction',
      tableName: 'inventory_transactions',
      underscored: true,
    }
  );

  return InventoryTransaction;
};
