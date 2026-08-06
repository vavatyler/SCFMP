const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Member extends Model {
    static associate(models) {
      Member.belongsTo(models.Cooperative, {
        foreignKey: 'cooperative_id',
        as: 'cooperative',
      });
      Member.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'userAccount',
      });
      Member.hasOne(models.Farmer, {
        foreignKey: 'member_id',
        as: 'farmerProfile',
      });
      Member.hasMany(models.Loan, {
        foreignKey: 'member_id',
        as: 'loans',
      });
      Member.hasMany(models.Transaction, {
        foreignKey: 'member_id',
        as: 'transactions',
      });
    }
  }

  Member.init(
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
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      first_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: { notEmpty: true },
      },
      last_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: { notEmpty: true },
      },
      gender: DataTypes.ENUM('male', 'female', 'other'),
      date_of_birth: DataTypes.DATEONLY,
      national_id: {
        type: DataTypes.STRING(30),
        unique: true,
      },
      phone: DataTypes.STRING(20),
      address: DataTypes.STRING(255),
      membership_date: DataTypes.DATEONLY,
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'suspended'),
        defaultValue: 'active',
      },
    },
    {
      sequelize,
      modelName: 'Member',
      tableName: 'members',
      underscored: true,
    }
  );

  return Member;
};
