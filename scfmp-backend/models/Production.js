const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Production extends Model {
    static associate(models) {
      Production.belongsTo(models.Cooperative, {
        foreignKey: 'cooperative_id',
        as: 'cooperative',
      });
      Production.belongsTo(models.Farmer, {
        foreignKey: 'farmer_id',
        as: 'farmer',
      });
      Production.belongsTo(models.FarmerGroup, {
        foreignKey: 'farmer_group_id',
        as: 'farmerGroup',
      });
      Production.belongsTo(models.Product, {
        foreignKey: 'product_id',
        as: 'product',
      });
      Production.belongsTo(models.User, {
        foreignKey: 'recorded_by',
        as: 'recordedByUser',
      });
      Production.hasMany(models.ProductionContribution, {
        foreignKey: 'production_id',
        as: 'contributions',
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
      cooperative_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      farmer_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      farmer_group_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      production_mode: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'individual',
        validate: { isIn: [['individual', 'group']] },
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      product_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: { notEmpty: true },
      },
      quantity: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        validate: { min: 0.01 },
      },
      expected_production: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: true,
        validate: { min: 0.01 },
      },
      reporting_period: DataTypes.STRING(50),
      variety: DataTypes.STRING(100),
      production_category: DataTypes.STRING(100),
      actual_harvest: {
        type: DataTypes.DECIMAL(14, 2),
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
        defaultValue: 0,
        validate: { min: 0 },
      },
      total_amount: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
      },
      season: DataTypes.STRING(20),
      status: {
        type: DataTypes.ENUM('recorded', 'verified', 'rejected'),
        allowNull: false,
        defaultValue: 'recorded',
      },
      production_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      harvest_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      production_location: DataTypes.STRING(255),
      quality_grade: DataTypes.STRING(50),
      storage_location: DataTypes.STRING(255),
      storage_quantity: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: true,
        validate: { min: 0 },
      },
      sold_quantity: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 },
      },
      remaining_quantity: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: true,
        validate: { min: 0 },
      },
      buyer: DataTypes.STRING(150),
      notes: DataTypes.TEXT,
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
      validate: {
        ownerMatchesProductionMode() {
          if (this.production_mode === 'individual') {
            if (!this.farmer_id || this.farmer_group_id) {
              throw new Error('Individual production requires a farmer and cannot have a farmer group');
            }
          } else if (this.production_mode === 'group') {
            if (this.farmer_id) {
              throw new Error('Group production cannot have a primary farmer');
            }
          }
        },
      },
      hooks: {
        // total_amount is always derived from quantity * unit_price — never trust client input for this
        beforeValidate: (record) => {
          if (record.actual_harvest == null && record.quantity != null) {
            record.actual_harvest = record.quantity;
          }
          if (record.quantity == null && record.actual_harvest != null) {
            record.quantity = record.actual_harvest;
          }
          if (record.harvest_date == null && record.production_date != null) {
            record.harvest_date = record.production_date;
          }
          if (record.production_date == null && record.harvest_date != null) {
            record.production_date = record.harvest_date;
          }
          if (record.unit_price == null) record.unit_price = 0;
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
