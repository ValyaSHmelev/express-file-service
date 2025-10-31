# Express File Service

REST API сервис для работы с файлами и аутентификацией по JWT. Основная бизнес логика покрыта e2e тестами.

## Описание
- **Аутентификация:** выдача `access` и `refresh` токенов, обновление токенов, `logout` с инвалидированием текущей пары.
- **Файлы:** загрузка, список с пагинацией, информация о файле, скачивание, обновление и удаление.
- **База данных:** MySQL 8 с инициализацией схемы из `db.sql`.

## Требования
- **Node.js:** 18.x LTS или новее (рекомендуется 18/20)
- **npm:** 9.x+ или **Yarn:** 1.22+
- **Docker Engine:** 20.10+ (или новее)

## Подготовка окружения
1. Клонируйте репозиторий и перейдите в директорию проекта:
   ```bash
   git clone https://github.com/ValyaSHmelev/express-file-service.git
   cd express-file-service
   ```
2. Создайте `.env` на основе примера:
   ```bash
   cp .env.example .env
   ```
3. Установите зависимости:
   ```bash
   # npm
   npm install

   # или yarn
   yarn install
   ```

## Запуск базы данных (MySQL 8)
Проект содержит `docker-compose.yml` для поднятия MySQL 8 и инициализации схемы из `db.sql`.

1. Убедитесь, что значения `DB_NAME`, `DB_USER`, `DB_PASSWORD` в `.env` заданы.
2. Запустите базу:
   ```bash
   docker compose up -d
   ```
3. Дождитесь, пока контейнер `file_service_db` станет `healthy` (в `docker ps`).
4. База будет доступна на `localhost:3306`. Данные сохраняются в volume `mysql_data`.

## Тесты

Запуск:
```bash
# npm
npm test

# или yarn
yarn test
```

Дополнительно:
```bash
# вотчер
npm run test:watch
yarn test --watch

# покрытие
npm run test:coverage
yarn test --coverage
```

## Быстрый старт приложения (опционально)
```bash
# dev-режим с перезапуском
npm run dev
yarn dev

# продовый старт
npm start
yarn start
```

## Примечания
- `docker-compose.yml` пробрасывает порт `3306:3306` и автоматически выполняет `db.sql` при первом старте.
- Переменные окружения (см. пример в `./.env.example`):
  - **PORT** — порт HTTP-сервера.
  - **MAX_FILE_SIZE_MB** — максимальный размер загружаемого файла в мегабайтах.
  - **UPLOAD_DIR** — каталог для сохранения загруженных файлов.
  - **DB_HOST** — адрес MySQL.
  - **DB_USER** — пользователь MySQL.
  - **DB_PASSWORD** — пароль MySQL.
  - **DB_NAME** — имя базы данных.
  - **JWT_SECRET** — секрет для подписи access‑токена.
  - **JWT_EXPIRES_IN** — время жизни access‑токена.
  - **REFRESH_TOKEN_SECRET** — секрет для подписи refresh‑токена.
  - **REFRESH_TOKEN_EXPIRES_IN** — время жизни refresh‑токена.

