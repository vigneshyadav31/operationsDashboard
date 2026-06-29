'use strict';

// Central Express error handler. Maps AppError -> its status/code, everything
// else -> 500. Always responds with JSON shape { error, code }.
const { AppError } = require('../lib/AppError');
const { logger } = require('../lib/logger');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const isApp = err instanceof AppError;
  const status = isApp && Number.isFinite(err.status) ? err.status : 500;
  const code = (isApp && err.code) || 'INTERNAL_ERROR';
  const message = status >= 500 && !isApp ? 'Internal server error' : err.message || 'Error';

  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} -> ${status}: ${err.stack || err.message}`);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} -> ${status}: ${err.message}`);
  }

  if (res.headersSent) return next(err);
  res.status(status).json({ error: message, code });
}

module.exports = { errorHandler };
