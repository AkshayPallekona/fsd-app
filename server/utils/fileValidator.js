/**
 * Validates file buffer against known image magic bytes:
 * - JPEG: FF D8 FF
 * - PNG: 89 50 4E 47 0D 0A 1A 0A
 * - WEBP: 52 49 46 46 (RIFF) + offset 8: 57 45 42 50 (WEBP)
 */
function validateImageMagicBytes(buffer) {
  if (!buffer || buffer.length < 12) {
    return { valid: false, error: 'File buffer too small to be a valid image.' };
  }

  // Check JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, format: 'jpeg', mime: 'image/jpeg' };
  }

  // Check PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, format: 'png', mime: 'image/png' };
  }

  // Check WEBP
  const isRiff =
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
  const isWebp =
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;

  if (isRiff && isWebp) {
    return { valid: true, format: 'webp', mime: 'image/webp' };
  }

  return { valid: false, error: 'Invalid image format. Only JPEG, PNG, and WebP are allowed.' };
}

module.exports = {
  validateImageMagicBytes
};
