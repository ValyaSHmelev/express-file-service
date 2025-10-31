const path = require('path');
const fs = require('fs').promises;

// Загружаем тестовое окружение
require('dotenv').config();
// Направляем загрузки в тестовую директорию
process.env.UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads-test';

const { sequelize, User, RefreshToken, File } = require('../src/models');

// Глобальная настройка перед всеми тестами
beforeAll(async () => {
  try {
    // Подключаемся к БД
    await sequelize.authenticate();
    console.log('✅ Подключение к тестовой БД установлено');

    // Синхронизируем модели (пересоздаем таблицы)
    await sequelize.sync({ force: true });
    console.log('✅ Таблицы тестовой БД созданы');

    // Создаем директорию для тестовых файлов
    const testUploadsDir = path.isAbsolute(process.env.UPLOAD_DIR)
      ? process.env.UPLOAD_DIR
      : path.join(__dirname, '..', process.env.UPLOAD_DIR);
    await fs.mkdir(testUploadsDir, { recursive: true });
  } catch (error) {
    console.error('❌ Ошибка при настройке тестов:', error);
    throw error;
  }
});

// Очистка после каждого теста
afterEach(async () => {
  // Очищаем все таблицы
  await RefreshToken.destroy({ where: {}, force: true });
  await File.destroy({ where: {}, force: true });
  await User.destroy({ where: {}, force: true });
});

// Глобальная очистка после всех тестов
afterAll(async () => {
  try {
    // Удаляем тестовые файлы
    const testUploadsDir = path.isAbsolute(process.env.UPLOAD_DIR)
      ? process.env.UPLOAD_DIR
      : path.join(__dirname, '..', process.env.UPLOAD_DIR);
    try {
      const files = await fs.readdir(testUploadsDir);
      for (const file of files) {
        await fs.unlink(path.join(testUploadsDir, file));
      }
      await fs.rmdir(testUploadsDir);
    } catch (err) {
      // Директория может не существовать
    }

    // Закрываем соединение с БД
    await sequelize.close();
    console.log('✅ Соединение с тестовой БД закрыто');
  } catch (error) {
    console.error('❌ Ошибка при очистке тестов:', error);
  }
});

module.exports = {
  sequelize,
  User,
  RefreshToken,
  File
};
