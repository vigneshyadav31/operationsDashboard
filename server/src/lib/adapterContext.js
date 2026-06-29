'use strict';

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

async function fetchNormalized(adapter) {
  const ctx = buildCtx(adapter);
  const raw = await adapter.fetch(ctx);
  return adapter.normalize(raw);
}

module.exports = { buildCtx, fetchNormalized };
