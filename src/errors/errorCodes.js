// Централизованные коды и сообщения ошибок
const ErrorCodes = {
  // Общие ошибки
  SERVER_ERROR: {
    code: 'SERVER_ERROR',
    message: 'Ошибка сервера',
    status: 500
  },
  NOT_FOUND: {
    code: 'NOT_FOUND',
    message: 'Маршрут не найден',
    status: 404
  },

  // Ошибки аутентификации
  MISSING_FIELDS: {
    code: 'MISSING_FIELDS',
    message: 'Поля id и password обязательны',
    status: 400
  },
  USER_EXISTS: {
    code: 'USER_EXISTS',
    message: 'Пользователь уже существует',
    status: 409
  },
  INVALID_CREDENTIALS: {
    code: 'INVALID_CREDENTIALS',
    message: 'Неверные учетные данные',
    status: 401
  },
  MISSING_TOKEN: {
    code: 'MISSING_TOKEN',
    message: 'Токен не предоставлен',
    status: 401
  },
  INVALID_TOKEN: {
    code: 'INVALID_TOKEN',
    message: 'Невалидный токен',
    status: 401
  },
  INVALID_REFRESH_TOKEN: {
    code: 'INVALID_REFRESH_TOKEN',
    message: 'Невалидный refresh токен',
    status: 401
  },
  TOKEN_NOT_FOUND: {
    code: 'TOKEN_NOT_FOUND',
    message: 'Токен не найден',
    status: 401
  },
  TOKEN_INACTIVE: {
    code: 'TOKEN_INACTIVE',
    message: 'Токен деактивирован',
    status: 401
  },
  TOKEN_EXPIRED: {
    code: 'TOKEN_EXPIRED',
    message: 'Токен истек',
    status: 401
  },
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: 'Требуется авторизация',
    status: 401
  },

  // Ошибки работы с файлами
  NO_FILE: {
    code: 'NO_FILE',
    message: 'Файл не предоставлен',
    status: 400
  },
  FILE_NOT_FOUND: {
    code: 'FILE_NOT_FOUND',
    message: 'Файл не найден',
    status: 404
  },
  FILE_NOT_FOUND_ON_DISK: {
    code: 'FILE_NOT_FOUND_ON_DISK',
    message: 'Файл не найден на диске',
    status: 404
  },
  INVALID_PARAMS: {
    code: 'INVALID_PARAMS',
    message: 'Параметры list_size и page должны быть положительными числами',
    status: 400
  },
  FILE_TOO_LARGE: {
    code: 'FILE_TOO_LARGE',
    message: 'Файл слишком большой',
    status: 400
  }
};

module.exports = ErrorCodes;
