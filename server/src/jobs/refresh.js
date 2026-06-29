'use strict';

const cron = require('node-cron');
const { getAdapters } = require('../config/sources');
const cache = require('../cache/cache');
const { buildCtx } = require('../lib/adapterContext');
const { evaluateAll } = require('../triggers/engine');
const { config } = require('../config/env');
const { logger } = require('../lib/logger');

let task = null;
let running = false;

async function refreshAdapter(adapter) {
  const ttl = Number.isFinite(adapter.ttlSeconds) ? adapter.ttlSeconds : 300;
  const fetchFn = () => {
    const ctx = buildCtx(adapter);
    return Promise.resolve(adapter.fetch(ctx)).then((raw) => adapter.normalize(raw));
  };
  const { status } = await cache.getOrFetch(adapter.id, ttl, fetchFn, { force: true });
  return status;
}

async function refreshAll() {
  const adapters = getAdapters().filter((a) => a && a.refresh);
  let n = 0;
  for (const adapter of adapters) {
    try {
      await refreshAdapter(adapter);
      n += 1;
    } catch (err) {
      logger.warn(`refreshAll: ${adapter.id} failed: ${err.message}`);
    }
  }
  return n;
}

async function runOnce() {
  if (running) {
    logger.info('refresh: a run is already in progress; skipping');
    return { ran: 0, evaluated: 0, fired: 0, created: 0 };
  }
  running = true;
  try {
    const ran = await refreshAll();
    const summary = await evaluateAll();
    logger.info(`refresh.runOnce: refreshed ${ran}, created ${summary.created} action card(s)`);
    return { ran, ...summary };
  } finally {
    running = false;
  }
}

function startRefreshJob() {
  if (task) return task;
  const expr = config.refreshCron || '*/10 * * * *';
  if (!cron.validate(expr)) {
    logger.warn(`Invalid REFRESH_CRON '${expr}'; refresh job not scheduled`);
    return null;
  }
  task = cron.schedule(expr, () => {
    runOnce().catch((err) => logger.error(`scheduled refresh failed: ${err.message}`));
  });
  logger.info(`Refresh job scheduled with cron '${expr}'`);
  return task;
}

function stopRefreshJob() {
  if (task) {
    task.stop();
    task = null;
  }
}

module.exports = { startRefreshJob, stopRefreshJob, runOnce, refreshAll, refreshAdapter };
