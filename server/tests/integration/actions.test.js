'use strict';

// Integration: GET /api/actions + ack/resolve transitions (CONTRACTS §5, §10).
//   - the engine (evaluateAll over sample data) creates Action cards.
//   - founder sees all cards; analyst sees only assignee=='analyst'.
//   - ack records ackAt + status 'ack'; resolve records resolvedAt + status 'done'
//     and metSla = resolvedAt<=dueAt (true here, dueAt is in the future).
//   - IDOR guard: analyst cannot ack a founder-assigned action (404).
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

const { test, before } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

const app = require('../../src/index');
const { config } = require('../../src/config/env');
const { evaluateAll } = require('../../src/triggers/engine');
const { db } = require('../../src/db/db');

before(async () => {
  // Reset to a clean, deterministic queue: clear today's cards then re-evaluate so
  // every engine-created card starts in the 'open' state (the DB persists across
  // runs, so a prior run may have left cards in 'done'). The engine is idempotent
  // per UTC day, so we delete first to guarantee fresh open cards.
  db.prepare('DELETE FROM actions').run();
  await evaluateAll();
});

async function loginCookie(email) {
  const res = await request(app).post('/api/auth/login').send({ email, password: config.demoPassword });
  assert.strictEqual(res.status, 200, `login for ${email}`);
  const header = (res.headers['set-cookie'] || []).find((c) => c.startsWith('sid='));
  assert.ok(header, 'sid cookie present');
  return header.split(';')[0];
}

test('GET /api/actions (founder) returns the engine-created cards', async () => {
  const cookie = await loginCookie('founder@demo.local');
  const res = await request(app).get('/api/actions').set('Cookie', cookie);
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.ok(res.body.length >= 1, 'queue has at least one engine-created card');

  const card = res.body[0];
  for (const key of ['id', 'idemKey', 'sourceId', 'sopId', 'assignee', 'severity', 'status', 'dueAt', 'firedAt']) {
    assert.ok(key in card, `Action has ${key}`);
  }
  assert.ok(['open', 'ack', 'done'].includes(card.status));
});

test('analyst sees only analyst-assigned actions (IDOR list scoping)', async () => {
  const cookie = await loginCookie('analyst@demo.local');
  const res = await request(app).get('/api/actions').set('Cookie', cookie);
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body));
  for (const a of res.body) {
    assert.strictEqual(a.assignee, 'analyst', 'analyst only sees its own queue');
  }
});

test('ack then resolve transitions status and sets metSla', async () => {
  const cookie = await loginCookie('founder@demo.local');
  const list = await request(app).get('/api/actions').set('Cookie', cookie);
  // Pick a still-open card to drive the full transition.
  const open = list.body.find((a) => a.status === 'open') || list.body[0];
  assert.ok(open, 'have an action to transition');

  // ACK
  const acked = await request(app).post(`/api/actions/${open.id}/ack`).set('Cookie', cookie);
  assert.strictEqual(acked.status, 200);
  assert.strictEqual(acked.body.status, 'ack');
  assert.ok(acked.body.ackAt, 'ackAt recorded');
  assert.strictEqual(acked.body.resolvedAt, null);

  // RESOLVE
  const resolved = await request(app).post(`/api/actions/${open.id}/resolve`).set('Cookie', cookie);
  assert.strictEqual(resolved.status, 200);
  assert.strictEqual(resolved.body.status, 'done');
  assert.ok(resolved.body.resolvedAt, 'resolvedAt recorded');
  // dueAt is in the future (slaHours ahead of firedAt) so resolving now meets SLA.
  assert.strictEqual(resolved.body.metSla, true, 'metSla = resolvedAt <= dueAt');
  assert.strictEqual(resolved.body.breached, false);
});

test('analyst cannot ack a founder-assigned action (404 IDOR guard)', async () => {
  const founderCookie = await loginCookie('founder@demo.local');
  const all = await request(app).get('/api/actions').set('Cookie', founderCookie);
  const founderAction = all.body.find((a) => a.assignee === 'founder');

  if (!founderAction) return; // nothing founder-assigned to test against

  const analystCookie = await loginCookie('analyst@demo.local');
  const res = await request(app)
    .post(`/api/actions/${founderAction.id}/ack`)
    .set('Cookie', analystCookie);
  assert.strictEqual(res.status, 404, 'cross-tenant access is hidden as 404');
});

test('GET /api/actions unauthenticated -> 401', async () => {
  const res = await request(app).get('/api/actions');
  assert.strictEqual(res.status, 401);
});
