const rateLimit = require('express-rate-limit');
const ApiResponse = require('../utils/apiResponse');

function rateLimitHandler(req, res) {
  return ApiResponse.error(
    res,
    'TOO_MANY_REQUESTS',
    'Too many requests from this IP, please try again later.',
    429
  );
}

// Generic rate limiter for general API routes (e.g. 100 requests per 15 minutes)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

// Stricter rate limiter for sensitive authentication actions (login, register, forgot-password, reset-password)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

module.exports = {
  apiLimiter,
  authLimiter
};
