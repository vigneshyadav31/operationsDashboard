'use strict';

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

const app = require('../../src/index');

test('GET /api/health -> 200 status ok with checks', async () => {
  const res = await request(app).get('/api/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'ok');
  assert.ok(Number.isFinite(res.body.uptimeSec), 'uptimeSec present');
  assert.ok(res.body.version, 'version present');
  assert.ok(res.body.checks, 'checks present');
  assert.strictEqual(res.body.checks.db, true, 'db check ok');
  assert.strictEqual(res.body.checks.cache, true, 'cache check ok');
  assert.ok(res.body.checks.sourcesLoaded >= 1, 'at least one source loaded');
});

test('unknown /api route -> 404 JSON', async () => {
  const res = await request(app).get('/api/does-not-exist');
  assert.strictEqual(res.status, 404);
});
