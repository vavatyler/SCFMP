const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class TeamMember extends Model {}

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
    display_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  }, {
    sequelize,
    modelName: 'TeamMember',
    tableName: 'team_members',
    underscored: true,
  });

  return TeamMember;
};
