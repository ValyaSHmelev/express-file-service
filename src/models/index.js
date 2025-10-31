const sequelize = require('../config/database');
const User = require('./User');
const RefreshToken = require('./RefreshToken');
const File = require('./File');

// Экспорт всех моделей
module.exports = {
  sequelize,
  User,
  RefreshToken,
  File
};
