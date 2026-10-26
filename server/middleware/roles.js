const ApiResponse = require('../utils/apiResponse');

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.error(res, 'UNAUTHORIZED', 'Authentication required.', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return ApiResponse.error(
        res,
        'FORBIDDEN',
        'You do not have permission to perform this action.',
        403
      );
    }

    next();
  };
}

module.exports = {
  authorizeRoles
};
