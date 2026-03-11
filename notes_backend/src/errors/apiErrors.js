class ApiError extends Error {
  constructor({ statusCode, code, message, details }) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

class NotFoundError extends ApiError {
  constructor(message = 'Not found', details) {
    super({ statusCode: 404, code: 'NOT_FOUND', message, details });
    this.name = 'NotFoundError';
  }
}

class ValidationError extends ApiError {
  constructor(message = 'Validation error', details) {
    super({ statusCode: 400, code: 'VALIDATION_ERROR', message, details });
    this.name = 'ValidationError';
  }
}

class ConflictError extends ApiError {
  constructor(message = 'Conflict', details) {
    super({ statusCode: 409, code: 'CONFLICT', message, details });
    this.name = 'ConflictError';
  }
}

module.exports = {
  ApiError,
  NotFoundError,
  ValidationError,
  ConflictError,
};

