'use strict';

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const envLevel = (process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'error' : 'info')).toLowerCase();
const threshold = LEVELS[envLevel] === undefined ? LEVELS.info : LEVELS[envLevel];

function emit(level, stream, args) {
  if (LEVELS[level] > threshold) return;
  const ts = new Date().toISOString();
  stream(`[${ts}] [${level.toUpperCase()}]`, ...args);
}

const logger = {
  error: (...args) => emit('error', console.error, args),
  warn: (...args) => emit('warn', console.warn, args),
  info: (...args) => emit('info', console.log, args),
  debug: (...args) => emit('debug', console.log, args),
};

module.exports = { logger };
module.exports.logger = logger;
module.exports.default = logger;
