'use strict';

// Unit tests for auth/auth.js (CONTRACTS §10):
//   - bcrypt hash != plaintext (and verifies)
//   - verifyLogin true/false against seeded + created users
//   - session create -> lookup -> destroy lifecycle
// Uses the real DB (demo users seeded on boot). New users use unique emails so the
// suite is repeatable.
const { test } = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');

const auth = require('../../src/auth/auth');
const { config } = require('../../src/config/env');

function uniqueEmail() {
  return `unit_${process.pid}_${Date.now()}_${Math.random().toString(36).slice(2)}@test.local`;
}

test('hashPassword produces a bcrypt hash that is not the plaintext but verifies', () => {
  const plain = 'sup3r-secret-pw';
  const hash = auth.hashPassword(plain);
  assert.notStrictEqual(hash, plain, 'hash must differ from plaintext');
  assert.match(hash, /^\$2[aby]\$/, 'looks like a bcrypt hash');
  assert.strictEqual(bcrypt.compareSync(plain, hash), true, 'hash verifies the original');
  assert.strictEqual(bcrypt.compareSync('wrong', hash), false);
});

test('createUser stores a hashed password (never plaintext) and returns a public user', () => {
  const email = uniqueEmail();
  const user = auth.createUser({ email, password: 'pw123456', name: 'Test User', role: 'analyst' });
  assert.ok(user.id);
  assert.strictEqual(user.email, email.toLowerCase());
  assert.strictEqual(user.role, 'analyst');
  assert.strictEqual(user.name, 'Test User');
  assert.strictEqual(user.password_hash, undefined, 'public user never leaks the hash');

  const row = auth.getUserByEmail(email);
  assert.ok(row.password_hash && row.password_hash !== 'pw123456', 'DB stores a hash, not the plaintext');
});

test('createUser rejects duplicate email with 409', () => {
  const email = uniqueEmail();
  auth.createUser({ email, password: 'pw123456', name: 'Dup' });
  assert.throws(
    () => auth.createUser({ email, password: 'pw123456', name: 'Dup2' }),
    (err) => err.status === 409
  );
});

test('verifyLogin returns the public user on correct creds, null otherwise', () => {
  const email = uniqueEmail();
  auth.createUser({ email, password: 'rightpass', name: 'Login User', role: 'admin' });

  const ok = auth.verifyLogin(email, 'rightpass');
  assert.ok(ok, 'correct password verifies');
  assert.strictEqual(ok.email, email.toLowerCase());
  assert.strictEqual(ok.role, 'admin');

  assert.strictEqual(auth.verifyLogin(email, 'wrongpass'), null, 'wrong password -> null');
  assert.strictEqual(auth.verifyLogin('nobody@nowhere.local', 'x'), null, 'unknown user -> null');
});

test('seeded demo founder verifies with the demo password', () => {
  const user = auth.verifyLogin('founder@demo.local', config.demoPassword);
  assert.ok(user, 'demo founder logs in with the demo password');
  assert.strictEqual(user.role, 'founder');
});

test('session create -> lookup -> destroy lifecycle', () => {
  const email = uniqueEmail();
  const user = auth.createUser({ email, password: 'pw123456', name: 'Session User' });

  const sid = auth.createSession(user.id);
  assert.match(sid, /^[0-9a-f]{64}$/, 'session id is 32-byte hex');

  const resolved = auth.getUserBySession(sid);
  assert.ok(resolved, 'session resolves to a user');
  assert.strictEqual(resolved.id, user.id);
  assert.strictEqual(resolved.email, email.toLowerCase());

  auth.destroySession(sid);
  assert.strictEqual(auth.getUserBySession(sid), null, 'destroyed session no longer resolves');
});

test('getUserBySession returns null for unknown/empty session ids', () => {
  assert.strictEqual(auth.getUserBySession('deadbeef'), null);
  assert.strictEqual(auth.getUserBySession(''), null);
  assert.strictEqual(auth.getUserBySession(undefined), null);
});
