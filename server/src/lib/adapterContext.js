'use strict';

// Builds the ctx object passed to every adapter.fetch(ctx). Per CONTRACTS §2:
//   ctx = { http, env, log, cfg }
//   - http : fetchWithRetry.http
//   - env  : the provider keys object (read via ctx.env.<VAR>)
//   - log  : the leveled logger
//   - cfg  : per-adapter scraper config (from loadScraperConfig) or {} otherwise
const { http } = require('./fetchWithRetry');
const { logger } = require('./logger');
const { config } = require('../config/env');
const { loadScraperConfig } = require('../config/sources');

function buildCtx(adapter) {
  let cfg = {};
  if (adapter && adapter.category === 'scraper') {
    cfg = loadScraperConfig(adapter.id) || {};
  }
  return {
    http,
    env: config.keys,
    log: logger,
    cfg,
  };
}

// Resolve an adapter's normalized payload via fetch+normalize, with a guaranteed
// fallback to sample(). Returns { value, ok } where ok=false means sample() was used.
async function fetchNormalized(adapter) {
  const ctx = buildCtx(adapter);
  const raw = await adapter.fetch(ctx);
  return adapter.normalize(raw);
}

module.exports = { buildCtx, fetchNormalized };
