const { ApiError } = require('../errors/apiErrors');

// PUBLIC_INTERFACE
function asyncHandler(fn) {
  /**
   * Wrap an Express handler to propagate promise rejections to next(err).
   *
   * Contract:
   * - Input: (req,res,next) handler that may return a Promise
   * - Output: Express-compatible handler
   */
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// PUBLIC_INTERFACE
function errorHandler(err, req, res, next) {
  /**
   * Centralized error boundary for the API.
   *
   * Response contract:
   * {
   *   status: 'error',
   *   error: { code, message, details? }
   * }
   */
  void next;

  const isApiError = err instanceof ApiError;
  const statusCode = isApiError ? err.statusCode : 500;

  const payload = {
    status: 'error',
    error: {
      code: isApiError ? err.code : 'INTERNAL_ERROR',
      message: isApiError ? err.message : 'Internal Server Error',
    },
  };

  if (isApiError && err.details !== undefined) {
    payload.error.details = err.details;
  }

  // Log with basic request context for debuggability.
  // Avoid logging large bodies; include identifiers and path.
  console.error('API_ERROR', {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    code: payload.error.code,
    message: payload.error.message,
    details: payload.error.details,
    stack: err && err.stack ? err.stack : undefined,
  });

  res.status(statusCode).json(payload);
}

module.exports = {
  asyncHandler,
  errorHandler,
};

