const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Notification extends Model {
    static associate(models) {
      Notification.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
      });
    }
  }

  Notification.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: { notEmpty: true },
      },
      message: {
        type: DataTypes.STRING(500),
        allowNull: false,
        validate: { notEmpty: true },
      },
      type: {
        type: DataTypes.ENUM('info', 'success', 'warning', 'alert'),
        defaultValue: 'info',
      },
      related_entity_type: DataTypes.STRING(50),
      related_entity_id: DataTypes.INTEGER,
      is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: 'Notification',
      tableName: 'notifications',
      underscored: true,
    }
  );

  return Notification;
};
