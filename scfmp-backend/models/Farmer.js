const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Farmer extends Model {
    static associate(models) {
      Farmer.belongsTo(models.Member, {
        foreignKey: 'member_id',
        as: 'member',
      });
      Farmer.hasMany(models.Production, {
        foreignKey: 'farmer_id',
        as: 'productionRecords',
      });
      Farmer.hasMany(models.ProductionContribution, {
        foreignKey: 'farmer_id',
        as: 'productionContributions',
      });
    }
  }

  Farmer.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      member_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
      },
      farm_size_ha: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      farm_size: {
        type: DataTypes.DECIMAL(14, 4),
        allowNull: true,
      },
      farm_size_unit: {
        type: DataTypes.STRING(10),
        allowNull: true,
        validate: {
          isIn: [['ha', 'acres', 'm2', 'km2']],
        },
      },
      location: DataTypes.STRING(255),
      district: DataTypes.STRING(100),
      sector: DataTypes.STRING(100),
      cell: DataTypes.STRING(100),
      village: DataTypes.STRING(100),
      gps_coordinates: DataTypes.STRING(100),
      crop_type: DataTypes.STRING(100),
    },
    {
      sequelize,
      modelName: 'Farmer',
      tableName: 'farmers',
      underscored: true,
    }
  );

  return Farmer;
};
