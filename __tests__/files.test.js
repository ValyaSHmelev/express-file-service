const request = require('supertest');
const path = require('path');
const fs = require('fs').promises;
const app = require('../src/app');
const { File } = require('./setup');

describe('File API E2E Tests', () => {
  let accessToken;
  let userId = 'fileuser@example.com';

  // Создаем тестовый файл
  const testFilePath = path.join(__dirname, 'test-file.txt');
  const testFileContent = 'This is a test file content';

  beforeAll(async () => {
    // Создаем тестовый файл
    await fs.writeFile(testFilePath, testFileContent);
  });

  afterAll(async () => {
    // Удаляем тестовый файл
    try {
      await fs.unlink(testFilePath);
    } catch (err) {
      // Файл может не существовать
    }
  });

  beforeEach(async () => {
    // Создаем пользователя и получаем токен
    const response = await request(app)
      .post('/signup')
      .send({
        id: userId,
        password: 'password123'
      });
    
    accessToken = response.body.accessToken;
  });

  describe('POST /file/upload', () => {
    it('должен загрузить файл', async () => {
      const response = await request(app)
        .post('/file/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', testFilePath);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('originalName', 'test-file.txt');
      expect(response.body).toHaveProperty('extension', 'txt');
      expect(response.body).toHaveProperty('mimeType', 'text/plain');
      expect(response.body).toHaveProperty('size');
      expect(response.body).toHaveProperty('uploadDate');

      // Проверяем, что файл сохранен в БД
      const file = await File.findByPk(response.body.id);
      expect(file).toBeTruthy();
    });

    it('не должен загрузить файл без авторизации', async () => {
      const response = await request(app)
        .post('/file/upload')
        .attach('file', testFilePath);

      expect(response.status).toBe(401);
    });

    it('не должен загрузить без файла', async () => {
      const response = await request(app)
        .post('/file/upload')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /file/list', () => {
    beforeEach(async () => {
      // Загружаем несколько тестовых файлов
      for (let i = 0; i < 15; i++) {
        await request(app)
          .post('/file/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .attach('file', testFilePath);
      }
    });

    it('должен вернуть список файлов с пагинацией по умолчанию', async () => {
      const response = await request(app)
        .get('/file/list')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('files');
      expect(response.body.files).toHaveLength(10); // По умолчанию 10
      expect(response.body.page).toBe(1);
      expect(response.body.pageSize).toBe(10);
      expect(response.body.total).toBe(15);
    });

    it('должен вернуть список с кастомным размером страницы', async () => {
      const response = await request(app)
        .get('/file/list?list_size=5')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.files).toHaveLength(5);
      expect(response.body.pageSize).toBe(5);
    });

    it('должен вернуть вторую страницу', async () => {
      const response = await request(app)
        .get('/file/list?page=2&list_size=10')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.files).toHaveLength(5); // Осталось 5 файлов
      expect(response.body.page).toBe(2);
    });

    it('не должен вернуть список без авторизации', async () => {
      const response = await request(app)
        .get('/file/list');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /file/:id', () => {
    let fileId;

    beforeEach(async () => {
      // Загружаем файл
      const uploadResponse = await request(app)
        .post('/file/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', testFilePath);
      
      fileId = uploadResponse.body.id;
    });

    it('должен вернуть информацию о файле', async () => {
      const response = await request(app)
        .get(`/file/${fileId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', fileId);
      expect(response.body).toHaveProperty('originalName', 'test-file.txt');
      expect(response.body).toHaveProperty('extension', 'txt');
      expect(response.body).toHaveProperty('mimeType', 'text/plain');
    });

    it('не должен вернуть информацию о несуществующем файле', async () => {
      const response = await request(app)
        .get('/file/99999')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });

    it('не должен вернуть информацию без авторизации', async () => {
      const response = await request(app)
        .get(`/file/${fileId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /file/download/:id', () => {
    let fileId;

    beforeEach(async () => {
      // Загружаем файл
      const uploadResponse = await request(app)
        .post('/file/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', testFilePath);
      
      fileId = uploadResponse.body.id;
    });

    it('должен скачать файл', async () => {
      const response = await request(app)
        .get(`/file/download/${fileId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/plain');
      expect(response.headers['content-disposition']).toContain('test-file.txt');
    });

    it('не должен скачать несуществующий файл', async () => {
      const response = await request(app)
        .get('/file/download/99999')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });

    it('не должен скачать файл без авторизации', async () => {
      const response = await request(app)
        .get(`/file/download/${fileId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /file/delete/:id', () => {
    let fileId;

    beforeEach(async () => {
      // Загружаем файл
      const uploadResponse = await request(app)
        .post('/file/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', testFilePath);
      
      fileId = uploadResponse.body.id;
    });

    it('должен удалить файл', async () => {
      const response = await request(app)
        .delete(`/file/delete/${fileId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');

      // Проверяем, что файл удален из БД
      const file = await File.findByPk(fileId);
      expect(file).toBeNull();
    });

    it('не должен удалить несуществующий файл', async () => {
      const response = await request(app)
        .delete('/file/delete/99999')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });

    it('не должен удалить файл без авторизации', async () => {
      const response = await request(app)
        .delete(`/file/delete/${fileId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /file/update/:id', () => {
    let fileId;
    const updatedFilePath = path.join(__dirname, 'updated-file.txt');
    const updatedFileContent = 'This is an updated file content';

    beforeAll(async () => {
      // Создаем обновленный тестовый файл
      await fs.writeFile(updatedFilePath, updatedFileContent);
    });

    afterAll(async () => {
      // Удаляем обновленный тестовый файл
      try {
        await fs.unlink(updatedFilePath);
      } catch (err) {
        // Файл может не существовать
      }
    });

    beforeEach(async () => {
      // Загружаем файл
      const uploadResponse = await request(app)
        .post('/file/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', testFilePath);
      
      fileId = uploadResponse.body.id;
    });

    it('должен обновить файл', async () => {
      const response = await request(app)
        .put(`/file/update/${fileId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', updatedFilePath);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', fileId);
      expect(response.body).toHaveProperty('originalName', 'updated-file.txt');
      
      // Проверяем, что файл обновлен в БД
      const file = await File.findByPk(fileId);
      expect(file.original_name).toBe('updated-file.txt');
    });

    it('не должен обновить несуществующий файл', async () => {
      const response = await request(app)
        .put('/file/update/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', updatedFilePath);

      expect(response.status).toBe(404);
    });

    it('не должен обновить файл без нового файла', async () => {
      const response = await request(app)
        .put(`/file/update/${fileId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(400);
    });

    it('не должен обновить файл без авторизации', async () => {
      const response = await request(app)
        .put(`/file/update/${fileId}`)
        .attach('file', updatedFilePath);

      expect(response.status).toBe(401);
    });
  });

  describe('Изоляция пользователей', () => {
    let user1Token, user2Token;
    let user1FileId;

    beforeEach(async () => {
      // Создаем первого пользователя
      const user1 = await request(app)
        .post('/signup')
        .send({
          id: 'user1@example.com',
          password: 'password123'
        });
      user1Token = user1.body.accessToken;

      // Создаем второго пользователя
      const user2 = await request(app)
        .post('/signup')
        .send({
          id: 'user2@example.com',
          password: 'password123'
        });
      user2Token = user2.body.accessToken;

      // Загружаем файл от первого пользователя
      const uploadResponse = await request(app)
        .post('/file/upload')
        .set('Authorization', `Bearer ${user1Token}`)
        .attach('file', testFilePath);
      
      user1FileId = uploadResponse.body.id;
    });

    it('пользователь должен видеть только свои файлы в списке', async () => {
      // Загружаем файл от второго пользователя
      await request(app)
        .post('/file/upload')
        .set('Authorization', `Bearer ${user2Token}`)
        .attach('file', testFilePath);

      // Проверяем список файлов первого пользователя
      const user1Files = await request(app)
        .get('/file/list')
        .set('Authorization', `Bearer ${user1Token}`);

      // Проверяем список файлов второго пользователя
      const user2Files = await request(app)
        .get('/file/list')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(user1Files.body.total).toBe(1);
      expect(user2Files.body.total).toBe(1);
    });
  });
});
