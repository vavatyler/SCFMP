const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Document extends Model {
    static associate(models) {
      Document.belongsTo(models.Cooperative, {
        foreignKey: 'cooperative_id',
        as: 'cooperative',
      });
      Document.belongsTo(models.User, {
        foreignKey: 'uploaded_by',
        as: 'uploadedByUser',
      });
    }
  }

  Document.init(
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
      owner_type: {
        type: DataTypes.ENUM('cooperative', 'member', 'farmer', 'loan'),
        allowNull: false,
      },
      owner_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      original_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      stored_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      file_path: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      mime_type: DataTypes.STRING(100),
      file_size: DataTypes.INTEGER,
      description: DataTypes.STRING(255),
      uploaded_by: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: 'Document',
      tableName: 'documents',
      underscored: true,
    }
  );

  return Document;
};
