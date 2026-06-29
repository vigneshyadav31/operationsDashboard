'use strict';

// Trigger engine (CONTRACTS §9). For each adapter that declares a trigger:
//   1. obtain the normalized payload via cache.getOrFetch (fetch+normalize, with
//      sample() fallback baked into the fetchFn so it never throws upward),
//   2. read metrics[trigger.metric] and compare against threshold,
//   3. on breach upsert an Action keyed by `${sourceId}:${sopId}:${UTC-day}` using
//      INSERT OR IGNORE (idempotent — exactly one card per event per UTC day),
//   4. write an audit row.
// To guarantee a populated queue with zero keys, evaluation uses
// (cache value || adapter.sample()) for the metrics.
const { getAdapters } = require('../config/sources');
const cache = require('../cache/cache');
const { db, uuid, nowIso, audit } = require('../db/db');
const { buildCtx } = require('../lib/adapterContext');
const { logger } = require('../lib/logger');

// Comparator map (CONTRACTS §9). Each returns a boolean breach decision.
const comparators = {
  gt: (v, t) => v > t,
  lt: (v, t) => v < t,
  gte: (v, t) => v >= t,
  lte: (v, t) => v <= t,
  eq: (v, t) => v === t,
  abs_gt: (v, t) => Math.abs(v) > t,
  abs_gte: (v, t) => Math.abs(v) >= t,
};

function utcDayBucket(date = new Date()) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

const insertActionStmt = db.prepare(`
  INSERT OR IGNORE INTO actions (
    id, idem_key, source_id, sop_id, sop_title, assignee, severity,
    metric, comparator, threshold, value,
    fired_at, due_at, sla_hours, status, ack_at, resolved_at, met_sla
  ) VALUES (
    @id, @idem_key, @source_id, @sop_id, @sop_title, @assignee, @severity,
    @metric, @comparator, @threshold, @value,
    @fired_at, @due_at, @sla_hours, 'open', NULL, NULL, NULL
  )
`);

// Resolve normalized metrics for an adapter through the cache. The fetchFn falls
// back to sample() so zero-key environments still produce data. Returns the
// normalized payload object (with a .metrics field) or null.
async function resolveMetricsPayload(adapter) {
  const ttl = Number.isFinite(adapter.ttlSeconds) ? adapter.ttlSeconds : 300;
  const fetchFn = async () => {
    try {
      const ctx = buildCtx(adapter);
      const raw = await adapter.fetch(ctx);
      const normalized = adapter.normalize(raw);
      if (normalized && normalized.metrics) return normalized;
      // No usable metrics from live data — use sample so triggers still evaluate.
      return adapter.sample();
    } catch (err) {
      // Surface to cache layer so it can return stale, but we still want sample().
      throw err;
    }
  };

  const { value } = await cache.getOrFetch(adapter.id, ttl, fetchFn);
  // (cache value || adapter.sample()) — guarantee metrics even on error/null.
  let payload = value;
  if (!payload || !payload.metrics) {
    try {
      payload = adapter.sample();
    } catch (err) {
      logger.warn(`sample() failed for ${adapter.id}: ${err.message}`);
      return null;
    }
  }
  return payload;
}

async function evaluateOne(adapter) {
  const trigger = adapter.trigger;
  const payload = await resolveMetricsPayload(adapter);
  if (!payload || !payload.metrics) return { fired: false };

  const metricValue = payload.metrics[trigger.metric];
  if (metricValue === undefined || metricValue === null || Number.isNaN(Number(metricValue))) {
    return { fired: false };
  }

  const cmp = comparators[trigger.comparator];
  if (typeof cmp !== 'function') {
    logger.warn(`Unknown comparator '${trigger.comparator}' for ${adapter.id}`);
    return { fired: false };
  }

  const value = Number(metricValue);
  const breach = cmp(value, Number(trigger.threshold));
  if (!breach) return { fired: false };

  const firedAt = new Date();
  const idemKey = `${adapter.id}:${trigger.sopId}:${utcDayBucket(firedAt)}`;
  const slaHours = Number.isFinite(trigger.slaHours) ? trigger.slaHours : 24;
  const dueAt = new Date(firedAt.getTime() + slaHours * 3600 * 1000);

  const info = insertActionStmt.run({
    id: uuid(),
    idem_key: idemKey,
    source_id: adapter.id,
    sop_id: trigger.sopId,
    sop_title: trigger.sopTitle,
    assignee: trigger.assignee,
    severity: trigger.severity,
    metric: trigger.metric,
    comparator: trigger.comparator,
    threshold: Number(trigger.threshold),
    value,
    fired_at: firedAt.toISOString(),
    due_at: dueAt.toISOString(),
    sla_hours: slaHours,
  });

  if (info.changes > 0) {
    audit('engine', 'action.created', idemKey, {
      sourceId: adapter.id,
      metric: trigger.metric,
      comparator: trigger.comparator,
      threshold: trigger.threshold,
      value,
    });
    return { fired: true, created: true, idemKey };
  }
  // Already existed for this UTC day (idempotent no-op).
  return { fired: true, created: false, idemKey };
}

// Evaluate every triggered adapter. Returns a summary { evaluated, fired, created }.
async function evaluateAll() {
  const adapters = getAdapters().filter((a) => a && a.trigger);
  let fired = 0;
  let created = 0;
  for (const adapter of adapters) {
    try {
      const res = await evaluateOne(adapter);
      if (res.fired) fired += 1;
      if (res.created) created += 1;
    } catch (err) {
      logger.error(`evaluateAll: ${adapter.id} failed: ${err.message}`);
    }
  }
  logger.info(`Trigger engine: evaluated ${adapters.length}, breached ${fired}, new cards ${created}`);
  return { evaluated: adapters.length, fired, created };
}

module.exports = { evaluateAll, comparators, evaluateOne };
