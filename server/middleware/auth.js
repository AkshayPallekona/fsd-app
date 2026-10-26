const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/env');
const ApiResponse = require('../utils/apiResponse');

async function authenticate(req, res, next) {
  let token = null;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7);
  }

  if (!token) {
    return ApiResponse.error(res, 'UNAUTHORIZED', 'Authentication token required.', 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return ApiResponse.error(res, 'TOKEN_EXPIRED', 'Authentication token expired.', 401);
    }
    return ApiResponse.error(res, 'INVALID_TOKEN', 'Invalid authentication token.', 401);
  }

  try {
    const user = await User.findById(decoded.userId);
    if (!user || user.status === 'deleted') {
      return ApiResponse.error(res, 'USER_NOT_FOUND', 'User account does not exist.', 401);
    }

    if (user.status === 'suspended') {
      return ApiResponse.error(
        res,
        'ACCOUNT_SUSPENDED',
        'Your account has been suspended. Please contact support.',
        403
      );
    }

    // Verify token version matches user's current tokenVersion
    if (decoded.tokenVersion !== user.tokenVersion) {
      return ApiResponse.error(
        res,
        'TOKEN_REVOKED',
        'Session has been invalidated. Please log in again.',
        401
      );
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

// Optional auth middleware for routes where public access is allowed, but authenticated user is identified if logged in
async function optionalAuth(req, res, next) {
  let token = null;
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7);
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (user && user.status === 'active' && decoded.tokenVersion === user.tokenVersion) {
      req.user = user;
    }
  } catch {
    // Ignore error for optional authentication
  }
  next();
}

module.exports = {
  authenticate,
  optionalAuth
};
