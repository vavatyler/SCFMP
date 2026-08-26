const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Cooperative extends Model {
    static associate(models) {
      Cooperative.hasMany(models.User, {
        foreignKey: 'cooperative_id',
        as: 'users',
      });
      Cooperative.hasMany(models.Member, {
        foreignKey: 'cooperative_id',
        as: 'members',
      });
      Cooperative.hasMany(models.Loan, {
        foreignKey: 'cooperative_id',
        as: 'loans',
      });
      Cooperative.hasMany(models.Transaction, {
        foreignKey: 'cooperative_id',
        as: 'transactions',
      });
      Cooperative.hasMany(models.InventoryItem, {
        foreignKey: 'cooperative_id',
        as: 'inventoryItems',
      });
      Cooperative.hasMany(models.Document, {
        foreignKey: 'cooperative_id',
        as: 'documents',
      });
      Cooperative.hasMany(models.Product, {
        foreignKey: 'cooperative_id',
        as: 'products',
      });
      Cooperative.hasMany(models.FarmerGroup, {
        foreignKey: 'cooperative_id',
        as: 'farmerGroups',
      });
      Cooperative.hasMany(models.Production, {
        foreignKey: 'cooperative_id',
        as: 'productionRecords',
      });
    }
  }

  Cooperative.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: { notEmpty: true },
      },
      registration_number: {
        type: DataTypes.STRING(50),
        unique: true,
      },
      organization_type: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'cooperative',
        validate: {
          isIn: [[
            'cooperative',
            'farmer_group',
            'sme',
            'school',
            'association',
            'ngo',
            'other',
          ]],
        },
      },
      district: DataTypes.STRING(100),
      sector: DataTypes.STRING(100),
      cell: DataTypes.STRING(100),
      village: DataTypes.STRING(100),
      phone: DataTypes.STRING(20),
      email: {
        type: DataTypes.STRING(150),
        validate: { isEmail: true },
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'suspended'),
        defaultValue: 'active',
      },
    },
    {
      sequelize,
      modelName: 'Cooperative',
      tableName: 'cooperatives',
      underscored: true,
    }
  );

  return Cooperative;
};
