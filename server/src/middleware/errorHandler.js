'use strict';

const { AppError } = require('../lib/AppError');
const { logger } = require('../lib/logger');

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
