const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const File = sequelize.define('File', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  filename: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Уникальное имя файла на сервере'
  },
  original_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Оригинальное имя файла'
  },
  extension: {
    type: DataTypes.STRING(50)
  },
  mime_type: {
    type: DataTypes.STRING(100)
  },
  size: {
    type: DataTypes.BIGINT,
    allowNull: false,
    comment: 'Размер в байтах'
  },
  file_path: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: 'Путь к файлу'
  },
  upload_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'files',
  timestamps: false
});

// Связи
File.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(File, { foreignKey: 'user_id' });

module.exports = File;
