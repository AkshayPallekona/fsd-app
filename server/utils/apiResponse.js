class ApiResponse {
  static success(res, data = null, message = 'Success', statusCode = 200) {
    if (statusCode === 204) {
      return res.status(204).send();
    }
    return res.status(statusCode).json({
      success: true,
      data,
      message
    });
  }

  static error(res, code = 'INTERNAL_ERROR', message = 'An error occurred', statusCode = 500, details = undefined) {
    const errorPayload = {
      code,
      message
    };
    if (details !== undefined) {
      errorPayload.details = details;
    }
    return res.status(statusCode).json({
      success: false,
      error: errorPayload
    });
  }
}

module.exports = ApiResponse;
