'use strict';

// Integration: full auth flow (CONTRACTS §5, §10).
//   - login with the demo founder -> 200 + Set-Cookie (sid)
//   - GET /api/auth/me with that cookie -> 200 {user}
//   - bad creds -> 401
//   - /api/auth/me without a cookie -> 401
//   - logout -> 204 and the cookie no longer authenticates
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

const app = require('../../src/index');
const { config } = require('../../src/config/env');

// Extract the `sid` cookie value from a Set-Cookie header array.
function sidCookie(res) {
  const setCookie = res.headers['set-cookie'] || [];
  const header = setCookie.find((c) => c.startsWith('sid='));
  assert.ok(header, 'Set-Cookie should contain sid');
  return header.split(';')[0]; // "sid=<value>"
}

test('login with demo founder -> 200 + Set-Cookie', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'founder@demo.local', password: config.demoPassword });

  assert.strictEqual(res.status, 200);
  assert.ok(res.body.user, 'returns user');
  assert.strictEqual(res.body.user.email, 'founder@demo.local');
  assert.strictEqual(res.body.user.role, 'founder');
  assert.ok(res.body.user.password_hash === undefined, 'no hash leaked');

  const cookie = sidCookie(res);
  assert.match(cookie, /^sid=.+/);

  // The cookie should be HttpOnly.
  const raw = (res.headers['set-cookie'] || []).find((c) => c.startsWith('sid='));
  assert.match(raw, /HttpOnly/i, 'session cookie is HttpOnly');
});

test('GET /api/auth/me with the session cookie -> 200 {user}', async () => {
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'founder@demo.local', password: config.demoPassword });
  const cookie = sidCookie(login);

  const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
  assert.strictEqual(me.status, 200);
  assert.strictEqual(me.body.user.email, 'founder@demo.local');
  assert.strictEqual(me.body.user.role, 'founder');
});

test('login with bad credentials -> 401', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'founder@demo.local', password: 'totally-wrong' });
  assert.strictEqual(res.status, 401);
});

test('GET /api/auth/me without a cookie -> 401', async () => {
  const res = await request(app).get('/api/auth/me');
  assert.strictEqual(res.status, 401);
});

test('logout -> 204 and the cookie no longer authenticates', async () => {
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'analyst@demo.local', password: config.demoPassword });
  const cookie = sidCookie(login);

  const out = await request(app).post('/api/auth/logout').set('Cookie', cookie);
  assert.strictEqual(out.status, 204);

  const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
  assert.strictEqual(me.status, 401, 'destroyed session is unauthenticated');
});
