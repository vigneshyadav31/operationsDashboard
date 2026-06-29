'use strict';

const { COOKIE_NAME, getUserBySession } = require('../auth/auth');
const { AppError } = require('../lib/AppError');

function attachUser(req, _res, next) {
  try {
    const sid = req.cookies ? req.cookies[COOKIE_NAME] : undefined;
    req.user = sid ? getUserBySession(sid) || null : null;
  } catch (_e) {
    req.user = null;
  }
  next();
}

function requireAuth(req, _res, next) {
  if (!req.user) return next(new AppError(401, 'Authentication required', 'UNAUTHENTICATED'));
  next();
}

function requireRole(...roles) {
  const allowed = new Set(roles.flat());
  return (req, _res, next) => {
    if (!req.user) return next(new AppError(401, 'Authentication required', 'UNAUTHENTICATED'));
    if (!allowed.has(req.user.role)) {
      return next(new AppError(403, 'Insufficient permissions', 'FORBIDDEN'));
    }
    next();
  };
}

module.exports = { attachUser, requireAuth, requireRole };
