const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const { ACCOUNT_SCOPES, ALL_ACCOUNT_ROLES, accountScopeForRole } = require('../config/accountRoles');

module.exports = (sequelize) => {
  class User extends Model {
    static associate(models) {
      User.belongsTo(models.Cooperative, {
        foreignKey: 'cooperative_id',
        as: 'cooperative',
      });
      User.hasMany(models.Notification, {
        foreignKey: 'user_id',
        as: 'notifications',
      });
      User.hasMany(models.PasswordResetToken, {
        foreignKey: 'user_id',
        as: 'passwordResetTokens',
      });
      User.hasMany(models.RefreshToken, {
        foreignKey: 'user_id',
        as: 'refreshTokens',
      });
      User.hasMany(models.AuditLog, {
        foreignKey: 'actor_user_id',
        as: 'auditLogs',
      });
      User.hasOne(models.TeamMember, {
        foreignKey: 'linked_user_id',
        as: 'teamProfile',
      });
    }

    // Instance method: compare a plain password against the stored hash
    async comparePassword(plainPassword) {
      return bcrypt.compare(plainPassword, this.password_hash);
    }

    // Never leak the hash when a user object is serialized to JSON
    toJSON() {
      const values = { ...this.get() };
      delete values.password_hash;
      delete values.token_version;
      delete values.permissions;
      return values;
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      cooperative_id: {
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
      email: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      phone: DataTypes.STRING(20),
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM(...ALL_ACCOUNT_ROLES),
        allowNull: false,
      },
      account_scope: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: ACCOUNT_SCOPES.ORGANIZATION,
        validate: { isIn: [Object.values(ACCOUNT_SCOPES)] },
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active',
      },
      system_access_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      permissions: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      preferred_language: {
        type: DataTypes.ENUM('en', 'rw', 'fr'),
        allowNull: false,
        defaultValue: 'en',
      },
      token_version: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
      last_login_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      underscored: true,
      hooks: {
        beforeValidate: (user) => {
          user.account_scope = accountScopeForRole(user.role);
          if (user.account_scope === ACCOUNT_SCOPES.PLATFORM) user.cooperative_id = null;
        },
        // Hash the password automatically whenever it's set or changed
        beforeCreate: async (user) => {
          if (user.password_hash) {
            user.password_hash = await bcrypt.hash(user.password_hash, 10);
          }
        },
        beforeUpdate: async (user) => {
          if (user.changed('password_hash')) {
            user.password_hash = await bcrypt.hash(user.password_hash, 10);
          }
        },
      },
    }
  );

  return User;
};
