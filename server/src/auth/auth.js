'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { db, uuid, nowIso } = require('../db/db');
const { config } = require('../config/env');
const { AppError } = require('../lib/AppError');

const COOKIE_NAME = 'sid';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 10;
const VALID_ROLES = new Set(['founder', 'analyst', 'admin']);

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: config.isProduction,
  maxAge: SESSION_TTL_MS,
  path: '/',
});

function hashPassword(password) {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

function publicUser(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

function getUserByEmail(email) {
  if (!email) return null;
  return db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase());
}

function getUserById(id) {
  if (!id) return null;
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function createUser({ email, password, name, role }) {
  const normEmail = String(email || '').trim().toLowerCase();
  if (!normEmail || !password) {
    throw new AppError(400, 'email and password are required', 'INVALID_INPUT');
  }
  if (getUserByEmail(normEmail)) {
    throw new AppError(409, 'A user with that email already exists', 'EMAIL_TAKEN');
  }
  const chosenRole = VALID_ROLES.has(role) ? role : 'analyst';
  const id = uuid();
  db.prepare(
    'INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, normEmail, name || normEmail.split('@')[0], hashPassword(password), chosenRole, nowIso());
  return publicUser(getUserById(id));
}

function verifyLogin(email, password) {
  const row = getUserByEmail(email);
  if (!row) return null;
  if (!bcrypt.compareSync(String(password || ''), row.password_hash || '')) return null;
  return publicUser(row);
}

function createSession(userId) {
  const sid = crypto.randomBytes(32).toString('hex');
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare(
    'INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
  ).run(sid, userId, expiresAt, createdAt);
  return sid;
}

function destroySession(sid) {
  if (!sid) return;
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sid);
}

function getUserBySession(sid) {
  if (!sid) return null;
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sid);
  if (!session) return null;
  if (session.expires_at && new Date(session.expires_at).getTime() < Date.now()) {
    destroySession(sid);
    return null;
  }
  return publicUser(getUserById(session.user_id));
}

module.exports = {
  COOKIE_NAME,
  SESSION_TTL_MS,
  cookieOptions,
  hashPassword,
  createUser,
  verifyLogin,
  createSession,
  destroySession,
  getUserBySession,
  getUserByEmail,
  publicUser,
};
