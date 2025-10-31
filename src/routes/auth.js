const express = require('express');
const AuthController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Роуты аутентификации
router.post('/signup', AuthController.signup);
router.post('/signin', AuthController.signin);
router.post('/signin/new_token', AuthController.refreshToken);
router.get('/logout', authMiddleware, AuthController.logout);
router.get('/info', authMiddleware, AuthController.getInfo);

module.exports = router;
