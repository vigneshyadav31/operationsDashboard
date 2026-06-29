'use strict';

// Auth controller: register, login, logout, me (CONTRACTS §5).
const auth = require('../auth/auth');
const { audit } = require('../db/db');
const { AppError } = require('../lib/AppError');

function setSessionCookie(res, sid) {
  res.cookie(auth.COOKIE_NAME, sid, auth.cookieOptions());
}

// POST /api/auth/register -> 201 {user} + Set-Cookie
function register(req, res, next) {
  try {
    const { email, password, name, role } = req.body || {};
    const user = auth.createUser({ email, password, name, role });
    const sid = auth.createSession(user.id);
    setSessionCookie(res, sid);
    audit(user.email, 'auth.register', user.id, { role: user.role });
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login -> 200 {user} + Set-Cookie (401 on bad creds)
function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    const user = auth.verifyLogin(email, password);
    if (!user) return next(new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS'));
    const sid = auth.createSession(user.id);
    setSessionCookie(res, sid);
    audit(user.email, 'auth.login', user.id, {});
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/logout -> 204, clears cookie
function logout(req, res, next) {
  try {
    const sid = req.cookies ? req.cookies[auth.COOKIE_NAME] : undefined;
    if (sid) auth.destroySession(sid);
    res.clearCookie(auth.COOKIE_NAME, { path: '/' });
    if (req.user) audit(req.user.email, 'auth.logout', req.user.id, {});
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me -> 200 {user} | 401
function me(req, res, next) {
  try {
    if (!req.user) return next(new AppError(401, 'Not authenticated', 'UNAUTHENTICATED'));
    res.json({ user: req.user });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, logout, me };
