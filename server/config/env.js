require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = parseInt(process.env.PORT, 10) || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rental_portal';
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [`http://localhost:${PORT}`];
const TRUST_PROXY = process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1';
const MODERATION_REQUIRED = process.env.MODERATION_REQUIRED === 'true';

const EMAIL_MODE = process.env.EMAIL_MODE || (NODE_ENV === 'production' ? 'smtp' : 'console');
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT, 10) || 587;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || 'Rental Portal <noreply@example.com>';

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

function validateEnv() {
  const errors = [];

  if (!MONGODB_URI) {
    errors.push('MONGODB_URI is required.');
  }

  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET is required and must be at least 32 characters long.');
  }

  if (NODE_ENV === 'production') {
    if (EMAIL_MODE === 'console') {
      errors.push('EMAIL_MODE=console is not allowed when NODE_ENV=production. Use SMTP.');
    }
    if (EMAIL_MODE === 'smtp') {
      if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
        errors.push('SMTP configuration (SMTP_HOST, SMTP_USER, SMTP_PASS) is required in production mode.');
      }
    }
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      errors.push('Cloudinary configuration (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) is required in production mode.');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Environment Validation Error:\n - ${errors.join('\n - ')}`);
  }
}

module.exports = {
  NODE_ENV,
  PORT,
  MONGODB_URI,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  ALLOWED_ORIGINS,
  TRUST_PROXY,
  MODERATION_REQUIRED,
  EMAIL_MODE,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  validateEnv
};
