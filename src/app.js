const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');
const errorHandler = require('./middleware/errorHandler');
const ErrorCodes = require('./errors/errorCodes');
const AppError = require('./errors/AppError');

const app = express();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Роуты
app.use(authRoutes);
app.use('/file', fileRoutes);

// Базовый роут
app.get('/', (req, res) => {
  res.json({ 
    message: 'Express File Service API',
    version: '1.0.0'
  });
});

// Обработка 404
app.use((req, res, next) => {
  const error = ErrorCodes.NOT_FOUND;
  next(new AppError(error.code, error.message, error.status));
});

// Централизованная обработка ошибок
app.use(errorHandler);

module.exports = app;
