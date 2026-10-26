const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;
const {
  NODE_ENV,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET
} = require('../config/env');
const { validateImageMagicBytes } = require('../utils/fileValidator');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Ensure local uploads directory exists
if (NODE_ENV !== 'production' || !CLOUDINARY_CLOUD_NAME) {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

// Configure Cloudinary if credentials provided
const useCloudinary = Boolean(
  CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET
);

if (useCloudinary) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true
  });
}

/**
 * Upload single image buffer to appropriate storage
 */
async function uploadImage(fileBuffer) {
  const magicResult = validateImageMagicBytes(fileBuffer);
  if (!magicResult.valid) {
    const error = new Error(magicResult.error);
    error.statusCode = 400;
    error.code = 'INVALID_IMAGE_TYPE';
    throw error;
  }

  const randomId = crypto.randomBytes(16).toString('hex');

  if (useCloudinary) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'rental_portal',
          public_id: `prop_${randomId}`,
          resource_type: 'image'
        },
        (error, result) => {
          if (error) {
            const err = new Error('Cloudinary upload failed: ' + error.message);
            err.statusCode = 502;
            return reject(err);
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            storage: 'cloudinary'
          });
        }
      );
      uploadStream.end(fileBuffer);
    });
  }

  // Local storage adapter (Dev and Test)
  const ext = magicResult.format === 'jpeg' ? 'jpg' : magicResult.format;
  const fileName = `img_${randomId}.${ext}`;
  const filePath = path.join(UPLOADS_DIR, fileName);

  await fs.promises.writeFile(filePath, fileBuffer);

  return {
    url: `/uploads/${fileName}`,
    publicId: fileName,
    storage: 'local'
  };
}

/**
 * Delete image from storage
 */
async function deleteImage(publicId) {
  if (!publicId) return;

  if (useCloudinary && publicId.startsWith('rental_portal/')) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`Failed to delete image ${publicId} from Cloudinary:`, err.message);
    }
    return;
  }

  // Local file delete
  try {
    const filePath = path.join(UPLOADS_DIR, path.basename(publicId));
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`Failed to delete local image ${publicId}:`, err.message);
  }
}

/**
 * Batch cleanup of images
 */
async function cleanupImages(images = []) {
  for (const img of images) {
    if (img && img.publicId) {
      await deleteImage(img.publicId);
    }
  }
}

module.exports = {
  uploadImage,
  deleteImage,
  cleanupImages,
  UPLOADS_DIR
};
