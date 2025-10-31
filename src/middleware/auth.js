const jwt = require('jsonwebtoken');
require('dotenv').config();
const { AppError, ErrorCodes } = require('../errors');
const { RefreshToken } = require('../models');

// чтобы избежать принудительного сброса соединения (ECONNRESET)
const drainRequest = (req, cb) => {
  // Если тело ещё можно читать и оно не завершено
  if (req && req.readable && !req.complete) {
    req.on('data', () => {});
    req.on('end', cb);
    req.resume();
  } else {
    // Вызовем колбэк асинхронно для единообразия
    process.nextTick(cb);
  }
};

const authMiddleware = async (req, res, next) => {
  try {
    // Получаем токен из заголовка Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error = ErrorCodes.MISSING_TOKEN;
      return drainRequest(req, () => next(new AppError(error.code, error.message, error.status)));
    }

    const token = authHeader.substring(7); // Убираем "Bearer "

    // Верифицируем токен
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Проверяем наличие актуального активного refresh токена для пары (user, device)
    const latestRefresh = await RefreshToken.findOne({
      where: { user_id: decoded.id, device_id: decoded.deviceId },
      order: [['created_at', 'DESC']]
    });

    if (!latestRefresh) {
      const err = ErrorCodes.TOKEN_NOT_FOUND;
      return drainRequest(req, () => next(new AppError(err.code, err.message, err.status)));
    }

    if (!latestRefresh.is_active) {
      const err = ErrorCodes.TOKEN_INACTIVE;
      return drainRequest(req, () => next(new AppError(err.code, err.message, err.status)));
    }

    if (new Date() > new Date(latestRefresh.expires_at)) {
      const err = ErrorCodes.TOKEN_EXPIRED;
      return drainRequest(req, () => next(new AppError(err.code, err.message, err.status)));
    }

    // Добавляем данные пользователя в req
    req.user = {
      id: decoded.id,
      userId: decoded.userId,
      deviceId: decoded.deviceId
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      const err = ErrorCodes.TOKEN_EXPIRED;
      return drainRequest(req, () => next(new AppError(err.code, err.message, err.status)));
    }
    
    if (error.name === 'JsonWebTokenError') {
      const err = ErrorCodes.INVALID_TOKEN;
      return drainRequest(req, () => next(new AppError(err.code, err.message, err.status)));
    }

    return drainRequest(req, () => next(error));
  }
};

module.exports = authMiddleware;
