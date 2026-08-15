const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class RefreshToken extends Model {
    static associate(models) {
      RefreshToken.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
      });
    }
  }

  RefreshToken.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      token_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      used_at: DataTypes.DATE,
      revoked_at: DataTypes.DATE,
      ip_address: DataTypes.STRING(64),
      user_agent: DataTypes.STRING(255),
    },
    {
      sequelize,
      modelName: 'RefreshToken',
      tableName: 'refresh_tokens',
      underscored: true,
      updatedAt: false,
      indexes: [{ fields: ['user_id'] }, { fields: ['expires_at'] }],
    }
  );

  return RefreshToken;
};
