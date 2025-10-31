const multer = require('multer');
const { AppError, ErrorCodes } = require('../errors');

// Централизованный обработчик ошибок
const errorHandler = (err, req, res, next) => {
  console.error('Ошибка:', err);

  // Обработка ошибок Multer
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const error = ErrorCodes.FILE_TOO_LARGE;
      return res.status(error.status).json({
        error: {
          code: error.code,
          message: error.message
        }
      });
    }
  }

  // Обработка кастомных ошибок приложения
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message
      }
    });
  }

  // Обработка неизвестных ошибок
  const serverError = ErrorCodes.SERVER_ERROR;
  res.status(serverError.status).json({
    error: {
      code: serverError.code,
      message: serverError.message
    }
  });
};

module.exports = errorHandler;
