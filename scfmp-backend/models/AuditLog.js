const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class AuditLog extends Model {
    static associate(models) {
      AuditLog.belongsTo(models.User, {
        foreignKey: 'actor_user_id',
        as: 'actor',
      });
      AuditLog.belongsTo(models.Cooperative, {
        foreignKey: 'cooperative_id',
        as: 'cooperative',
      });
    }
  }

  AuditLog.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      actor_user_id: { type: DataTypes.INTEGER, allowNull: true },
      cooperative_id: { type: DataTypes.INTEGER, allowNull: true },
      action: { type: DataTypes.STRING(80), allowNull: false },
      entity_type: { type: DataTypes.STRING(80), allowNull: true },
      entity_id: { type: DataTypes.STRING(80), allowNull: true },
      outcome: {
        type: DataTypes.ENUM('success', 'failure'),
        allowNull: false,
        defaultValue: 'success',
      },
      ip_address: DataTypes.STRING(64),
      user_agent: DataTypes.STRING(255),
      metadata: DataTypes.JSON,
    },
    {
      sequelize,
      modelName: 'AuditLog',
      tableName: 'audit_logs',
      underscored: true,
      updatedAt: false,
      indexes: [
        { fields: ['actor_user_id'] },
        { fields: ['cooperative_id'] },
        { fields: ['action'] },
        { fields: ['created_at'] },
      ],
    }
  );

  return AuditLog;
};
