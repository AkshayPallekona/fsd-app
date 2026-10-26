const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/apiResponse');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));
    return ApiResponse.error(res, 'VALIDATION_FAILED', 'Validation failed.', 422, formatted);
  }
  next();
}

module.exports = {
  validate
};
