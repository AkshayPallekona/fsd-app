const multer = require('multer');

// Memory storage to inspect magic bytes before persisting to disk or Cloudinary
const storage = multer.memoryStorage();

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    const error = new Error('Only JPEG, PNG, and WebP images are allowed.');
    error.code = 'INVALID_MIME_TYPE';
    return cb(error, false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
    files: 10 // max 10 files per upload
  },
  fileFilter
});

module.exports = upload;
