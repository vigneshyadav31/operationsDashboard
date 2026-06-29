'use strict';

// Central error type. Carries an HTTP status + a stable machine-readable code so
// the error handler can map it to a JSON response { error, code }.
class AppError extends Error {
  constructor(status, message, code) {
    super(message || 'Error');
    this.name = 'AppError';
    this.status = Number.isFinite(status) ? status : 500;
    this.code = code || 'APP_ERROR';
    Error.captureStackTrace?.(this, this.constructor);
  }
}

// Thrown by keyed adapters when a required env var is missing. The cache layer
// catches this and degrades to seed/stale data so the dashboard still renders.
class MissingKeyError extends AppError {
  constructor(varName) {
    super(424, `Missing required environment variable: ${varName}`, 'MISSING_KEY');
    this.name = 'MissingKeyError';
    this.varName = varName;
  }
}

module.exports = { AppError, MissingKeyError };
