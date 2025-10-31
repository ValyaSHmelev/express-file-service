const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { User, RefreshToken } = require('../models');
const { AppError, ErrorCodes } = require('../errors');

class AuthController {
  // Утилиты для генерации токенов
  static generateAccessToken(userId, userIdString, deviceId) {
    return jwt.sign(
      { id: userId, userId: userIdString, deviceId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
  }

  static generateRefreshToken(userId, userIdString, deviceId) {
    return jwt.sign(
      { id: userId, userId: userIdString, deviceId },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN }
    );
  }

  // POST /signup - Регистрация
  static async signup(req, res, next) {
    try {
      const { id, password } = req.body;

      // Валидация
      if (!id || !password) {
        const error = ErrorCodes.MISSING_FIELDS;
        throw new AppError(error.code, error.message, error.status);
      }

      // Проверка существования пользователя
      const existingUser = await User.findOne({ where: { user_id: id } });

      if (existingUser) {
        const error = ErrorCodes.USER_EXISTS;
        throw new AppError(error.code, error.message, error.status);
      }

      // Хеширование пароля
      const passwordHash = await bcrypt.hash(password, 10);

      // Создание пользователя
      const user = await User.create({
        user_id: id,
        password_hash: passwordHash
      });

      const deviceId = uuidv4();

      // Генерация токенов
      const accessToken = AuthController.generateAccessToken(user.id, user.user_id, deviceId);
      const refreshToken = AuthController.generateRefreshToken(user.id, user.user_id, deviceId);

      // Сохранение refresh токена
      const decodedRtOnSignup = jwt.decode(refreshToken);
      const expiresAt = decodedRtOnSignup && decodedRtOnSignup.exp
        ? new Date(decodedRtOnSignup.exp * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await RefreshToken.create({
        user_id: user.id,
        token: refreshToken,
        device_id: deviceId,
        expires_at: expiresAt
      });

      res.status(201).json({
        accessToken,
        refreshToken
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /signin - Вход
  static async signin(req, res, next) {
    try {
      const { id, password } = req.body;

      // Валидация
      if (!id || !password) {
        const error = ErrorCodes.MISSING_FIELDS;
        throw new AppError(error.code, error.message, error.status);
      }

      // Поиск пользователя
      const user = await User.findOne({ where: { user_id: id } });

      if (!user) {
        const error = ErrorCodes.INVALID_CREDENTIALS;
        throw new AppError(error.code, error.message, error.status);
      }

      // Проверка пароля
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      
      if (!isPasswordValid) {
        const error = ErrorCodes.INVALID_CREDENTIALS;
        throw new AppError(error.code, error.message, error.status);
      }

      const deviceId = uuidv4();

      // Генерация токенов
      const accessToken = AuthController.generateAccessToken(user.id, user.user_id, deviceId);
      const refreshToken = AuthController.generateRefreshToken(user.id, user.user_id, deviceId);

      // Сохранение refresh токена
      const decodedRtOnSignin = jwt.decode(refreshToken);
      const expiresAt = decodedRtOnSignin && decodedRtOnSignin.exp
        ? new Date(decodedRtOnSignin.exp * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await RefreshToken.create({
        user_id: user.id,
        token: refreshToken,
        device_id: deviceId,
        expires_at: expiresAt
      });

      res.json({
        accessToken,
        refreshToken
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /signin/new_token - Обновление токена
  static async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        const error = ErrorCodes.MISSING_TOKEN;
        throw new AppError(error.code, error.message, error.status);
      }

      // Верификация refresh токена
      let decoded;
      try {
        decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
      } catch (error) {
        const err = ErrorCodes.INVALID_REFRESH_TOKEN;
        throw new AppError(err.code, err.message, err.status);
      }

      // Проверка токена в БД
      const tokenData = await RefreshToken.findOne({ 
        where: { token: refreshToken } 
      });

      if (!tokenData) {
        const error = ErrorCodes.TOKEN_NOT_FOUND;
        throw new AppError(error.code, error.message, error.status);
      }

      // Проверка активности
      if (!tokenData.is_active) {
        const error = ErrorCodes.TOKEN_INACTIVE;
        throw new AppError(error.code, error.message, error.status);
      }

      // Проверка срока действия
      if (new Date() > new Date(tokenData.expires_at)) {
        const error = ErrorCodes.TOKEN_EXPIRED;
        throw new AppError(error.code, error.message, error.status);
      }

      // Генерация нового access токена
      const accessToken = AuthController.generateAccessToken(decoded.id, decoded.userId, decoded.deviceId);

      res.json({ accessToken });
    } catch (error) {
      next(error);
    }
  }

  // GET /logout - Выход
  static async logout(req, res, next) {
    try {
      const { id: userDbId, deviceId } = req.user;

      // Деактивируем все refresh токены для данной пары (user, device)
      await RefreshToken.update(
        { is_active: false },
        { where: { user_id: userDbId, device_id: deviceId } }
      );

      // Идемпотентный ответ
      res.json({
        message: 'Выход выполнен успешно'
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /info - Информация о пользователе
  static async getInfo(req, res, next) {
    try {
      res.json({ 
        id: req.user.userId 
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
