'use strict';

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

const app = require('../../src/index');
const { config } = require('../../src/config/env');

async function loginCookie(email) {
  const res = await request(app).post('/api/auth/login').send({ email, password: config.demoPassword });
  assert.strictEqual(res.status, 200, `login for ${email}`);
  const setCookie = res.headers['set-cookie'] || [];
  const header = setCookie.find((c) => c.startsWith('sid='));
  assert.ok(header, 'sid cookie present');
  return header.split(';')[0];
}

test('GET /api/widgets unauthenticated -> 401', async () => {
  const res = await request(app).get('/api/widgets');
  assert.strictEqual(res.status, 401);
});

test('GET /api/widgets (founder) -> array of populated WidgetPayloads', async () => {
  const cookie = await loginCookie('founder@demo.local');
  const res = await request(app).get('/api/widgets').set('Cookie', cookie);
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body), 'response is an array');
  assert.ok(res.body.length >= 1, 'at least one widget');

  for (const w of res.body) {
    assert.ok(w.id, 'widget has id');
    assert.ok(w.widget && w.widget.type, 'widget has widget.type');
    assert.ok(
      ['fresh', 'stale', 'error', 'restricted'].includes(w.status),
      `valid status: ${w.status}`
    );

    if (w.status !== 'restricted') {
      assert.ok(w.data !== undefined, `widget ${w.id} has a data field`);
    }
  }
});

test('sensitive widget A1 is available to founder', async () => {
  const cookie = await loginCookie('founder@demo.local');
  const res = await request(app).get('/api/widgets/A1').set('Cookie', cookie);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.id, 'A1');
  assert.strictEqual(res.body.sensitive, true);
  assert.notStrictEqual(res.body.status, 'restricted', 'founder sees real data for A1');
  assert.ok(res.body.data, 'founder gets A1 data');
});

test('sensitive widget A1 is RESTRICTED for analyst (data:null, status restricted)', async () => {
  const cookie = await loginCookie('analyst@demo.local');

  const one = await request(app).get('/api/widgets/A1').set('Cookie', cookie);
  assert.strictEqual(one.status, 200);
  assert.strictEqual(one.body.id, 'A1');
  assert.strictEqual(one.body.status, 'restricted');
  assert.strictEqual(one.body.data, null);
  assert.strictEqual(one.body.metrics, null);

  const list = await request(app).get('/api/widgets').set('Cookie', cookie);
  assert.strictEqual(list.status, 200);
  const a1 = list.body.find((w) => w.id === 'A1');
  assert.ok(a1, 'A1 present in analyst list');
  assert.strictEqual(a1.status, 'restricted');
  assert.strictEqual(a1.data, null);
});

test('analyst cannot force-refresh a widget (requireRole founder/admin) -> 403', async () => {
  const cookie = await loginCookie('analyst@demo.local');
  const res = await request(app).post('/api/widgets/A2/refresh').set('Cookie', cookie);
  assert.strictEqual(res.status, 403);
});
