'use strict';

const { getAdapters } = require('../config/sources');
const cache = require('../cache/cache');
const { db, uuid, nowIso, audit } = require('../db/db');
const { buildCtx } = require('../lib/adapterContext');
const { logger } = require('../lib/logger');

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
  return date.toISOString().slice(0, 10);
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

async function resolveMetricsPayload(adapter) {
  const ttl = Number.isFinite(adapter.ttlSeconds) ? adapter.ttlSeconds : 300;
  const fetchFn = async () => {
    try {
      const ctx = buildCtx(adapter);
      const raw = await adapter.fetch(ctx);
      const normalized = adapter.normalize(raw);
      if (normalized && normalized.metrics) return normalized;

      return adapter.sample();
    } catch (err) {

      throw err;
    }
  };

  const { value } = await cache.getOrFetch(adapter.id, ttl, fetchFn);

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

  return { fired: true, created: false, idemKey };
}

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
