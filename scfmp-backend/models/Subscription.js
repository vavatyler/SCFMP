const { DataTypes, Model } = require('sequelize');
const { SUBSCRIPTION_PLANS } = require('../config/subscriptionPlans');

const PLAN_IDS = SUBSCRIPTION_PLANS.map((plan) => plan.id);

module.exports = (sequelize) => {
  class Subscription extends Model {
    static associate(models) {
      Subscription.belongsTo(models.Cooperative, {
        foreignKey: 'cooperative_id',
        as: 'cooperative',
      });
    }
  }

  Subscription.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cooperative_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    plan_id: {
      type: DataTypes.STRING(40),
      allowNull: false,
      validate: { isIn: [PLAN_IDS] },
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'inactive',
      validate: { isIn: [['trialing', 'active', 'past_due', 'cancelled', 'inactive']] },
    },
    billing_cycle: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: { isIn: [['monthly', 'yearly']] },
    },
    starts_at: DataTypes.DATE,
    next_billing_date: DataTypes.DATEONLY,
    renews_at: DataTypes.DATEONLY,
    cancel_at_period_end: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    payment_status: {
      type: DataTypes.STRING(30),
      allowNull: true,
      validate: { isIn: [['not_required', 'pending', 'paid', 'failed', 'refunded']] },
    },
    external_reference: DataTypes.STRING(191),
  }, {
    sequelize,
    modelName: 'Subscription',
    tableName: 'subscriptions',
    underscored: true,
  });

  return Subscription;
};
