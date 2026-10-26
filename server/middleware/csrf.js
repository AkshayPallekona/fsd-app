const ApiResponse = require('../utils/apiResponse');
const { ALLOWED_ORIGINS, NODE_ENV } = require('../config/env');

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function csrfProtection(req, res, next) {
  if (!STATE_CHANGING_METHODS.has(req.method)) {
    return next();
  }

  // 1. Require custom header X-Requested-With
  const customHeader = req.headers['x-requested-with'];
  if (!customHeader) {
    return ApiResponse.error(
      res,
      'CSRF_DETECTED',
      'Missing required X-Requested-With header.',
      403
    );
  }

  // In test environment, if origin/referer is omitted we can allow if configured,
  // but to be secure, allow standard test origin or check against host.
  const origin = req.headers['origin'];
  const referer = req.headers['referer'];
  const host = req.get('host');

  let requestOrigin = '';
  if (origin) {
    requestOrigin = origin;
  } else if (referer) {
    try {
      const parsed = new URL(referer);
      requestOrigin = parsed.origin;
    } catch {
      return ApiResponse.error(res, 'CSRF_DETECTED', 'Invalid referer header.', 403);
    }
  }

  // If both origin and referer are absent
  if (!requestOrigin) {
    // In testing or non-browser API clients with test environment:
    if (NODE_ENV === 'test') {
      return next();
    }
    return ApiResponse.error(
      res,
      'CSRF_DETECTED',
      'Origin or Referer header required for state-changing operations.',
      403
    );
  }

  // Check if requestOrigin is in ALLOWED_ORIGINS or matches Host
  const allowed = ALLOWED_ORIGINS.some((allowedOrigin) => {
    try {
      const parsedAllowed = new URL(allowedOrigin);
      const parsedReq = new URL(requestOrigin);
      return parsedAllowed.origin === parsedReq.origin;
    } catch {
      return false;
    }
  });

  const matchesHost = host && (requestOrigin === `http://${host}` || requestOrigin === `https://${host}`);

  if (!allowed && !matchesHost) {
    return ApiResponse.error(
      res,
      'CSRF_DETECTED',
      'Cross-site request forgery protection blocked this request.',
      403
    );
  }

  next();
}

module.exports = csrfProtection;
