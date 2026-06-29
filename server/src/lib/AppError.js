'use strict';

class AppError extends Error {
  constructor(status, message, code) {
    super(message || 'Error');
    this.name = 'AppError';
    this.status = Number.isFinite(status) ? status : 500;
    this.code = code || 'APP_ERROR';
    Error.captureStackTrace?.(this, this.constructor);
  }
}

class MissingKeyError extends AppError {
  constructor(varName) {
    super(424, `Missing required environment variable: ${varName}`, 'MISSING_KEY');
    this.name = 'MissingKeyError';
    this.varName = varName;
  }
}

module.exports = { AppError, MissingKeyError };
