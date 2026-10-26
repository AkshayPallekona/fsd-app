const ApiResponse = require('../utils/apiResponse');
const { NODE_ENV } = require('../config/env');

function notFoundHandler(req, res) {
  return ApiResponse.error(res, 'NOT_FOUND', `Resource not found: ${req.originalUrl}`, 404);
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return ApiResponse.error(res, 'FILE_TOO_LARGE', 'Uploaded file exceeds the 5 MB limit.', 413);
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return ApiResponse.error(res, 'TOO_MANY_FILES', 'Exceeded maximum allowed files.', 400);
    }
    return ApiResponse.error(res, 'UPLOAD_ERROR', err.message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message
    }));
    return ApiResponse.error(res, 'VALIDATION_FAILED', 'Validation error.', 422, details);
  }

  // Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    return ApiResponse.error(
      res,
      'INVALID_ID',
      `Invalid format for field ${err.path}: ${err.value}`,
      400
    );
  }

  // Mongo duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return ApiResponse.error(
      res,
      'DUPLICATE_KEY',
      `A record with this ${field} already exists.`,
      409
    );
  }

  // SyntaxError from body-parser
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return ApiResponse.error(res, 'INVALID_JSON', 'Malformed JSON payload.', 400);
  }

  // General custom HTTP error if has statusCode
  const statusCode = err.statusCode || err.status || 500;
  const message = (statusCode === 500 && NODE_ENV === 'production')
    ? 'Internal server error'
    : err.message || 'Internal server error';

  const code = err.code || 'INTERNAL_ERROR';

  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error('Unhandled Server Error:', err);
  }

  return ApiResponse.error(
    res,
    code,
    message,
    statusCode,
    NODE_ENV !== 'production' && statusCode >= 500 ? { stack: err.stack } : undefined
  );
}

module.exports = {
  notFoundHandler,
  errorHandler
};
