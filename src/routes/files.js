const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const FileController = require('../controllers/fileController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Настройка multer
const configuredUploadRoot = process.env.UPLOAD_DIR || 'uploads';
const resolveUploadDir = () => {
  if (path.isAbsolute(configuredUploadRoot)) return configuredUploadRoot;
  return path.join(__dirname, '../../', configuredUploadRoot);
};

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = resolveUploadDir();
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: (process.env.MAX_FILE_SIZE_MB || 100) * 1024 * 1024 }
});


// Роуты для работы с файлами
router.post('/upload', authMiddleware, upload.single('file'), FileController.uploadFile);
router.get('/list', authMiddleware, FileController.listFiles);
router.get('/:id', authMiddleware, FileController.getFileInfo);
router.get('/download/:id', authMiddleware, FileController.downloadFile);
router.delete('/delete/:id', authMiddleware, FileController.deleteFile);
router.put('/update/:id', authMiddleware, upload.single('file'), FileController.updateFile);

module.exports = router;
