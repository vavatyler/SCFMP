const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class FarmerGroup extends Model {
    static associate(models) {
      FarmerGroup.belongsTo(models.Cooperative, {
        foreignKey: 'cooperative_id',
        as: 'cooperative',
      });
      FarmerGroup.hasMany(models.Production, {
        foreignKey: 'farmer_group_id',
        as: 'productionRecords',
      });
    }
  }

  FarmerGroup.init(
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
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: { notEmpty: true },
      },
      location: DataTypes.STRING(255),
      status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
      },
    },
    {
      sequelize,
      modelName: 'FarmerGroup',
      tableName: 'farmer_groups',
      underscored: true,
      indexes: [{ unique: true, fields: ['cooperative_id', 'name'] }],
    }
  );

  return FarmerGroup;
};
