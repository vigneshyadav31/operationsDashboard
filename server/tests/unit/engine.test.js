'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

const { comparators, evaluateOne, evaluateAll } = require('../../src/triggers/engine');
const a1 = require('../../src/sources/public/a1.js');
const { db } = require('../../src/db/db');
const cache = require('../../src/cache/cache');

function utcDay(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

test('comparators implement the §9 semantics', () => {
  assert.strictEqual(comparators.gt(5, 3), true);
  assert.strictEqual(comparators.gt(3, 5), false);
  assert.strictEqual(comparators.gt(3, 3), false);

  assert.strictEqual(comparators.lt(3, 5), true);
  assert.strictEqual(comparators.lt(5, 3), false);

  assert.strictEqual(comparators.gte(3, 3), true);
  assert.strictEqual(comparators.gte(2, 3), false);

  assert.strictEqual(comparators.lte(3, 3), true);
  assert.strictEqual(comparators.lte(4, 3), false);

  assert.strictEqual(comparators.eq(7, 7), true);
  assert.strictEqual(comparators.eq(7, 8), false);

  assert.strictEqual(comparators.abs_gt(-12, 10), true);
  assert.strictEqual(comparators.abs_gt(12, 10), true);
  assert.strictEqual(comparators.abs_gt(-8, 10), false);
  assert.strictEqual(comparators.abs_gt(10, 10), false, 'abs_gt is strict >');

  assert.strictEqual(comparators.abs_gte(-10, 10), true);
  assert.strictEqual(comparators.abs_gte(10, 10), true);
  assert.strictEqual(comparators.abs_gte(-9, 10), false);
});

test("A1's sample() breaches and creates exactly one Action (idempotent)", async () => {
  const idemKey = `${a1.id}:${a1.trigger.sopId}:${utcDay()}`;

  db.prepare('DELETE FROM actions WHERE idem_key = ?').run(idemKey);

  cache.set(a1.id, a1.sample(), a1.ttlSeconds, 'fresh');

  const r1 = await evaluateOne(a1);
  assert.strictEqual(r1.fired, true, 'A1 sample should breach abs_gt 10');
  assert.strictEqual(r1.created, true, 'first evaluation creates the card');
  assert.strictEqual(r1.idemKey, idemKey);

  const r2 = await evaluateOne(a1);
  assert.strictEqual(r2.fired, true);
  assert.strictEqual(r2.created, false, 'idempotent: no duplicate card for same UTC day');

  const count = db.prepare('SELECT COUNT(*) AS n FROM actions WHERE idem_key = ?').get(idemKey).n;
  assert.strictEqual(count, 1, 'exactly one Action per source/sop/UTC-day');
});

test('created Action has correct SLA dueAt = firedAt + slaHours*3600s and open status', async () => {
  const idemKey = `${a1.id}:${a1.trigger.sopId}:${utcDay()}`;
  db.prepare('DELETE FROM actions WHERE idem_key = ?').run(idemKey);
  cache.set(a1.id, a1.sample(), a1.ttlSeconds, 'fresh');

  const res = await evaluateOne(a1);
  assert.strictEqual(res.created, true);

  const row = db.prepare('SELECT * FROM actions WHERE idem_key = ?').get(idemKey);
  assert.ok(row, 'action row exists');
  assert.strictEqual(row.status, 'open');
  assert.strictEqual(row.sla_hours, a1.trigger.slaHours);
  assert.strictEqual(row.source_id, a1.id);
  assert.strictEqual(row.sop_id, a1.trigger.sopId);
  assert.strictEqual(row.comparator, a1.trigger.comparator);
  assert.strictEqual(row.met_sla, null);
  assert.strictEqual(row.ack_at, null);
  assert.strictEqual(row.resolved_at, null);

  const firedMs = new Date(row.fired_at).getTime();
  const dueMs = new Date(row.due_at).getTime();
  assert.strictEqual(dueMs - firedMs, a1.trigger.slaHours * 3600 * 1000, 'dueAt = firedAt + slaHours');
});

test('evaluateAll returns a summary and populates the queue from sample data', async () => {
  const summary = await evaluateAll();
  assert.ok(Number.isFinite(summary.evaluated), 'evaluated is a number');
  assert.ok(summary.evaluated >= 1, 'there is at least one triggered adapter');
  assert.ok(summary.fired >= 1, 'at least one breach fires from sample data (A1)');

  const total = db.prepare('SELECT COUNT(*) AS n FROM actions').get().n;
  assert.ok(total >= 1, 'engine produced Action Queue cards from sample data');
});

test('non-breaching metric does not create an Action', async () => {

  const calm = {
    id: 'ZZTEST',
    trigger: {
      metric: 'changePct',
      comparator: 'abs_gt',
      threshold: 10,
      sopId: 'SOP-ZZ',
      sopTitle: 'Test SOP',
      assignee: 'analyst',
      slaHours: 24,
      severity: 'low',
    },
    ttlSeconds: 300,
    async fetch() {
      return {};
    },
    normalize() {
      return { value: 1, metrics: { changePct: 0.5 } };
    },
    sample() {
      return this.normalize({});
    },
  };
  const idemKey = `ZZTEST:SOP-ZZ:${utcDay()}`;
  db.prepare('DELETE FROM actions WHERE idem_key = ?').run(idemKey);

  const res = await evaluateOne(calm);
  assert.strictEqual(res.fired, false, '0.5 does not exceed abs_gt 10');
  const count = db.prepare('SELECT COUNT(*) AS n FROM actions WHERE idem_key = ?').get(idemKey).n;
  assert.strictEqual(count, 0);
});
