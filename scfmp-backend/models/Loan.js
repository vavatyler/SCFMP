const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Loan extends Model {
    static associate(models) {
      Loan.belongsTo(models.Cooperative, {
        foreignKey: 'cooperative_id',
        as: 'cooperative',
      });
      Loan.belongsTo(models.Member, {
        foreignKey: 'member_id',
        as: 'member',
      });
      Loan.belongsTo(models.User, {
        foreignKey: 'recorded_by',
        as: 'recordedByUser',
      });
      Loan.hasMany(models.Transaction, {
        foreignKey: 'loan_id',
        as: 'transactions',
      });
    }
  }

  Loan.init(
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
      member_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      principal_amount: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        validate: { min: 0.01 },
      },
      interest_rate: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0,
      },
      balance: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
      },
      issue_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      due_date: DataTypes.DATEONLY,
      status: {
        type: DataTypes.ENUM('active', 'paid', 'defaulted'),
        defaultValue: 'active',
      },
      recorded_by: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: 'Loan',
      tableName: 'loans',
      underscored: true,
      hooks: {
        // A new loan's outstanding balance always starts equal to the principal
        beforeValidate: (loan) => {
          if (loan.isNewRecord && loan.balance == null) {
            loan.balance = loan.principal_amount;
          }
        },
      },
    }
  );

  return Loan;
};
