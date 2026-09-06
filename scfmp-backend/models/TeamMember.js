const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class TeamMember extends Model {
    static associate(models) {
      TeamMember.belongsTo(models.User, {
        foreignKey: 'linked_user_id',
        as: 'userAccount',
      });
    }
  }

  TeamMember.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    full_name: { type: DataTypes.STRING(150), allowNull: false, validate: { notEmpty: true } },
    position: { type: DataTypes.STRING(150), allowNull: false, validate: { notEmpty: true } },
    biography: DataTypes.TEXT,
    responsibilities: DataTypes.TEXT,
    skills: DataTypes.TEXT,
    photo_url: DataTypes.STRING(500),
    linkedin_url: DataTypes.STRING(500),
    github_url: DataTypes.STRING(500),
    email: { type: DataTypes.STRING(150), validate: { isEmail: true } },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'active',
      validate: { isIn: [['active', 'inactive']] },
    },
    profile_visibility: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'visible',
      validate: { isIn: [['visible', 'hidden']] },
    },
    linked_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: true,
    },
    display_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  }, {
    sequelize,
    modelName: 'TeamMember',
    tableName: 'team_members',
    underscored: true,
  });

  return TeamMember;
};
