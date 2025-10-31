const request = require('supertest');
const app = require('../src/app');
const { User, RefreshToken } = require('./setup');

describe('Auth API E2E Tests', () => {
  
  describe('POST /signup', () => {
    it('должен зарегистрировать нового пользователя с email', async () => {
      const response = await request(app)
        .post('/signup')
        .send({
          id: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      
      // Проверяем, что пользователь создан в БД
      const user = await User.findOne({ where: { user_id: 'test@example.com' } });
      expect(user).toBeTruthy();
    });

    it('должен зарегистрировать нового пользователя с телефоном', async () => {
      const response = await request(app)
        .post('/signup')
        .send({
          id: '+79991234567',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('не должен зарегистрировать пользователя с существующим id', async () => {
      // Создаем пользователя
      await request(app)
        .post('/signup')
        .send({
          id: 'duplicate@example.com',
          password: 'password123'
        });

      // Пытаемся создать еще раз
      const response = await request(app)
        .post('/signup')
        .send({
          id: 'duplicate@example.com',
          password: 'password456'
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
      
    });

    it('не должен зарегистрировать пользователя без пароля', async () => {
      const response = await request(app)
        .post('/signup')
        .send({
          id: 'test@example.com'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /signin', () => {
    beforeEach(async () => {
      // Создаем тестового пользователя
      await request(app)
        .post('/signup')
        .send({
          id: 'signin@example.com',
          password: 'password123'
        });
    });

    it('должен войти с правильными учетными данными', async () => {
      const response = await request(app)
        .post('/signin')
        .send({
          id: 'signin@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('не должен войти с неправильным паролем', async () => {
      const response = await request(app)
        .post('/signin')
        .send({
          id: 'signin@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
    });

    it('не должен войти с несуществующим пользователем', async () => {
      const response = await request(app)
        .post('/signin')
        .send({
          id: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /signin/new_token', () => {
    let refreshToken;

    beforeEach(async () => {
      // Создаем пользователя и получаем токены
      const response = await request(app)
        .post('/signup')
        .send({
          id: 'refresh@example.com',
          password: 'password123'
        });
      
      refreshToken = response.body.refreshToken;
    });

    it('должен обновить токен с валидным refresh token', async () => {
      const response = await request(app)
        .post('/signin/new_token')
        .send({
          refreshToken
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
    });

    it('не должен обновить токен с невалидным refresh token', async () => {
      const response = await request(app)
        .post('/signin/new_token')
        .send({
          refreshToken: 'invalid_token'
        });

      expect(response.status).toBe(401);
    });

    it('не должен обновить токен без refresh token', async () => {
      const response = await request(app)
        .post('/signin/new_token')
        .send({});

      expect(response.status).toBe(401);
    });
  });

  describe('GET /info', () => {
    let accessToken;

    beforeEach(async () => {
      // Создаем пользователя и получаем токен
      const response = await request(app)
        .post('/signup')
        .send({
          id: 'info@example.com',
          password: 'password123'
        });
      
      accessToken = response.body.accessToken;
    });

    it('должен вернуть информацию о пользователе с валидным токеном', async () => {
      const response = await request(app)
        .get('/info')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'info@example.com');
    });

    it('не должен вернуть информацию без токена', async () => {
      const response = await request(app)
        .get('/info');

      expect(response.status).toBe(401);
    });

    it('не должен вернуть информацию с невалидным токеном', async () => {
      const response = await request(app)
        .get('/info')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /logout', () => {
    let accessToken;
    let refreshToken;

    beforeEach(async () => {
      // Создаем пользователя и получаем токены
      const response = await request(app)
        .post('/signup')
        .send({
          id: 'logout@example.com',
          password: 'password123'
        });
      
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('должен выйти из системы с валидным токеном', async () => {
      const response = await request(app)
        .get('/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    it('старый токен не должен работать после logout', async () => {
      // Выходим
      await request(app)
        .get('/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      // Пытаемся использовать старый токен
      const response = await request(app)
        .get('/info')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(401);
    });

    it('старый refresh token не должен работать после logout', async () => {
      // Выходим
      await request(app)
        .get('/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      // Пытаемся обновить токен
      const response = await request(app)
        .post('/signin/new_token')
        .send({ refreshToken });

      expect(response.status).toBe(401);
    });

    it('не должен выйти без токена', async () => {
      const response = await request(app)
        .get('/logout');

      expect(response.status).toBe(401);
    });
  });

  describe('Множественные устройства', () => {
    it('должен поддерживать вход с нескольких устройств', async () => {
      const userId = 'multidevice@example.com';
      
      // Регистрируем пользователя
      await request(app)
        .post('/signup')
        .send({
          id: userId,
          password: 'password123'
        });

      // Входим с первого устройства
      const device1 = await request(app)
        .post('/signin')
        .send({
          id: userId,
          password: 'password123'
        });

      // Входим со второго устройства
      const device2 = await request(app)
        .post('/signin')
        .send({
          id: userId,
          password: 'password123'
        });

      // Оба токена должны работать
      const info1 = await request(app)
        .get('/info')
        .set('Authorization', `Bearer ${device1.body.accessToken}`);

      const info2 = await request(app)
        .get('/info')
        .set('Authorization', `Bearer ${device2.body.accessToken}`);

      expect(info1.status).toBe(200);
      expect(info2.status).toBe(200);
    });

    it('выход с одного устройства не должен влиять на другие', async () => {
      const userId = 'multidevice2@example.com';
      
      // Регистрируем пользователя
      await request(app)
        .post('/signup')
        .send({
          id: userId,
          password: 'password123'
        });

      // Входим с двух устройств
      const device1 = await request(app)
        .post('/signin')
        .send({
          id: userId,
          password: 'password123'
        });

      const device2 = await request(app)
        .post('/signin')
        .send({
          id: userId,
          password: 'password123'
        });

      // Выходим с первого устройства
      await request(app)
        .get('/logout')
        .set('Authorization', `Bearer ${device1.body.accessToken}`);

      // Первое устройство не должно работать
      const info1 = await request(app)
        .get('/info')
        .set('Authorization', `Bearer ${device1.body.accessToken}`);

      // Второе устройство должно продолжать работать
      const info2 = await request(app)
        .get('/info')
        .set('Authorization', `Bearer ${device2.body.accessToken}`);

      expect(info1.status).toBe(401);
      expect(info2.status).toBe(200);
    });
  });
});
