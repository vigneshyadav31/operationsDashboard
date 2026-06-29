'use strict';

// API gateway middleware: a per-IP fixed-window rate limiter plus a request-id /
// entry-log guard. Exported as a factory returning the middleware array so it can
// be configured per app.
const crypto = require('crypto');
const { AppError } = require('../lib/AppError');
const { logger } = require('../lib/logger');

const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_MAX = 300; // requests per window per IP

function clientIp(req) {
  return (
    req.ip ||
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    (req.socket && req.socket.remoteAddress) ||
    'unknown'
  );
}

// Returns middleware enforcing a fixed-window limit. The window resets wholesale
// once it elapses (simple + memory-light). Buckets are pruned lazily.
function rateLimiter({ windowMs = DEFAULT_WINDOW_MS, max = DEFAULT_MAX } = {}) {
  const buckets = new Map(); // ip -> { count, resetAt }

  return function rateLimit(req, res, next) {
    const now = Date.now();
    const ip = clientIp(req);
    let bucket = buckets.get(ip);

    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(ip, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, max - bucket.count);
    const resetSec = Math.ceil((bucket.resetAt - now) / 1000);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(resetSec));

    // Opportunistic cleanup to bound memory.
    if (buckets.size > 5000) {
      for (const [key, b] of buckets) {
        if (now >= b.resetAt) buckets.delete(key);
      }
    }

    if (bucket.count > max) {
      res.setHeader('Retry-After', String(resetSec));
      return next(new AppError(429, 'Too many requests', 'RATE_LIMITED'));
    }
    next();
  };
}

// Tags each request with an id and logs an entry line.
function entryGuard(req, res, next) {
  const id = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  const start = Date.now();
  res.on('finish', () => {
    logger.info(`${id} ${req.method} ${req.originalUrl} -> ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
}

// Factory: returns the ordered middleware list to mount.
function createGateway(options = {}) {
  return [entryGuard, rateLimiter(options)];
}

module.exports = createGateway;
module.exports.createGateway = createGateway;
module.exports.rateLimiter = rateLimiter;
module.exports.entryGuard = entryGuard;
