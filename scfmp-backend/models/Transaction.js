const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Transaction extends Model {
    static associate(models) {
      Transaction.belongsTo(models.Cooperative, {
        foreignKey: 'cooperative_id',
        as: 'cooperative',
      });
      Transaction.belongsTo(models.Member, {
        foreignKey: 'member_id',
        as: 'member',
      });
      Transaction.belongsTo(models.Loan, {
        foreignKey: 'loan_id',
        as: 'loan',
      });
      Transaction.belongsTo(models.User, {
        foreignKey: 'recorded_by',
        as: 'recordedByUser',
      });
    }
  }

  Transaction.init(
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
        allowNull: true,
      },
      loan_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      type: {
        type: DataTypes.ENUM(
          'income',
          'expense',
          'saving',
          'loan_disbursement',
          'loan_repayment'
        ),
        allowNull: false,
      },
      category: DataTypes.STRING(100),
      amount: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        validate: { min: 0.01 },
      },
      description: DataTypes.STRING(255),
      transaction_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      recorded_by: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: 'Transaction',
      tableName: 'transactions',
      underscored: true,
    }
  );

  return Transaction;
};
