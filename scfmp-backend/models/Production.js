const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Production extends Model {
    static associate(models) {
      Production.belongsTo(models.Farmer, {
        foreignKey: 'farmer_id',
        as: 'farmer',
      });
      Production.belongsTo(models.User, {
        foreignKey: 'recorded_by',
        as: 'recordedByUser',
      });
    }
  }

  Production.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      farmer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      product_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: { notEmpty: true },
      },
      quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: { min: 0.01 },
      },
      unit: {
        type: DataTypes.STRING(20),
        defaultValue: 'kg',
      },
      unit_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: { min: 0 },
      },
      total_amount: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
      },
      season: DataTypes.STRING(20),
      production_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      recorded_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Production',
      tableName: 'production',
      underscored: true,
      hooks: {
        // total_amount is always derived from quantity * unit_price — never trust client input for this
        beforeValidate: (record) => {
          if (record.quantity != null && record.unit_price != null) {
            record.total_amount = (
              parseFloat(record.quantity) * parseFloat(record.unit_price)
            ).toFixed(2);
          }
        },
      },
    }
  );

  return Production;
};
