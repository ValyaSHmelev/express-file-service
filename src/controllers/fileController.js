const path = require('path');
const fs = require('fs').promises;
const { File } = require('../models');
const { AppError, ErrorCodes } = require('../errors');

class FileController {
  // POST /file/upload - Загрузка файла
  static async uploadFile(req, res, next) {
    try {
      if (!req.file) {
        const error = ErrorCodes.NO_FILE;
        throw new AppError(error.code, error.message, error.status);
      }

      const file = req.file;
      const extension = path.extname(file.originalname).substring(1);

      // Сохранение метаданных в БД
      const fileRecord = await File.create({
        user_id: req.user.id,
        filename: file.filename,
        original_name: file.originalname,
        extension,
        mime_type: file.mimetype,
        size: file.size,
        file_path: file.path
      });

      res.status(201).json({
        id: fileRecord.id,
        filename: fileRecord.filename,
        originalName: fileRecord.original_name,
        extension: fileRecord.extension,
        mimeType: fileRecord.mime_type,
        size: fileRecord.size,
        uploadDate: fileRecord.upload_date
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /file/list - Список файлов с пагинацией
  static async listFiles(req, res, next) {
    try {
      const listSize = parseInt(req.query.list_size) || 10;
      const page = parseInt(req.query.page) || 1;

      if (listSize < 1 || page < 1) {
        const error = ErrorCodes.INVALID_PARAMS;
        throw new AppError(error.code, error.message, error.status);
      }

      const offset = (page - 1) * listSize;

      // Получение файлов с пагинацией
      const { count, rows: files } = await File.findAndCountAll({
        where: { user_id: req.user.id },
        attributes: ['id', 'filename', 'original_name', 'extension', 'mime_type', 'size', 'upload_date'],
        order: [['upload_date', 'DESC']],
        limit: listSize,
        offset
      });

      const totalPages = Math.ceil(count / listSize);

      res.json({
        files: files.map(file => ({
          id: file.id,
          filename: file.filename,
          originalName: file.original_name,
          extension: file.extension,
          mimeType: file.mime_type,
          size: file.size,
          uploadDate: file.upload_date
        })),
        total: count,
        page,
        pageSize: listSize,
        totalPages
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /file/:id - Информация о файле
  static async getFileInfo(req, res, next) {
    try {
      const fileId = parseInt(req.params.id);

      const file = await File.findOne({
        where: { 
          id: fileId, 
          user_id: req.user.id 
        },
        attributes: ['id', 'filename', 'original_name', 'extension', 'mime_type', 'size', 'upload_date']
      });

      if (!file) {
        const error = ErrorCodes.FILE_NOT_FOUND;
        throw new AppError(error.code, error.message, error.status);
      }

      res.json({
        id: file.id,
        filename: file.filename,
        originalName: file.original_name,
        extension: file.extension,
        mimeType: file.mime_type,
        size: file.size,
        uploadDate: file.upload_date
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /file/download/:id - Скачивание файла
  static async downloadFile(req, res, next) {
    try {
      const fileId = parseInt(req.params.id);

      const file = await File.findOne({
        where: { 
          id: fileId, 
          user_id: req.user.id 
        }
      });

      if (!file) {
        const error = ErrorCodes.FILE_NOT_FOUND;
        throw new AppError(error.code, error.message, error.status);
      }

      // Проверка существования файла
      try {
        await fs.access(file.file_path);
      } catch {
        const error = ErrorCodes.FILE_NOT_FOUND_ON_DISK;
        throw new AppError(error.code, error.message, error.status);
      }

      res.setHeader('Content-Type', file.mime_type);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
      res.download(file.file_path, file.original_name);
    } catch (error) {
      next(error);
    }
  }

  // DELETE /file/delete/:id - Удаление файла
  static async deleteFile(req, res, next) {
    try {
      const fileId = parseInt(req.params.id);

      // Получение информации о файле
      const file = await File.findOne({
        where: { 
          id: fileId, 
          user_id: req.user.id 
        }
      });

      if (!file) {
        const error = ErrorCodes.FILE_NOT_FOUND;
        throw new AppError(error.code, error.message, error.status);
      }

      const filePath = file.file_path;

      // Удаление из БД
      await file.destroy();

      // Удаление физического файла
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.warn('Файл не найден на диске:', filePath);
      }

      res.json({ 
        message: 'Файл успешно удален' 
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /file/update/:id - Обновление файла
  static async updateFile(req, res, next) {
    try {
      const fileId = parseInt(req.params.id);

      if (!req.file) {
        const error = ErrorCodes.NO_FILE;
        throw new AppError(error.code, error.message, error.status);
      }

      // Получение старого файла
      const oldFile = await File.findOne({
        where: { 
          id: fileId, 
          user_id: req.user.id 
        }
      });

      if (!oldFile) {
        // Удаляем загруженный файл
        await fs.unlink(req.file.path);
        const error = ErrorCodes.FILE_NOT_FOUND;
        throw new AppError(error.code, error.message, error.status);
      }

      const oldFilePath = oldFile.file_path;
      const newFile = req.file;
      const extension = path.extname(newFile.originalname).substring(1);

      // Обновление в БД
      await oldFile.update({
        filename: newFile.filename,
        original_name: newFile.originalname,
        extension,
        mime_type: newFile.mimetype,
        size: newFile.size,
        file_path: newFile.path,
        upload_date: new Date()
      });

      // Удаление старого файла
      try {
        await fs.unlink(oldFilePath);
      } catch (error) {
        console.warn('Старый файл не найден на диске:', oldFilePath);
      }

      res.json({
        id: oldFile.id,
        filename: oldFile.filename,
        originalName: oldFile.original_name,
        extension: oldFile.extension,
        mimeType: oldFile.mime_type,
        size: oldFile.size,
        uploadDate: oldFile.upload_date
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = FileController;
