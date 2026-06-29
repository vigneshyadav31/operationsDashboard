'use strict';

const { getAdapters, getAdapter } = require('../config/sources');
const cache = require('../cache/cache');
const { buildCtx } = require('../lib/adapterContext');
const { AppError } = require('../lib/AppError');
const { logger } = require('../lib/logger');

const PRIVILEGED = new Set(['founder', 'admin']);

function isPrivileged(user) {
  return !!user && PRIVILEGED.has(user.role);
}

function baseEnvelope(adapter) {
  return {
    id: adapter.id,
    name: adapter.name,
    category: adapter.category,
    sensitive: !!adapter.sensitive,
    widget: {
      type: adapter.widget.type,
      title: adapter.widget.title,
      question: adapter.widget.question,
      description: adapter.widget.description,
    },
  };
}

async function buildPayload(adapter, user, { force = false } = {}) {
  const env = baseEnvelope(adapter);

  if (adapter.sensitive && !isPrivileged(user)) {
    return { ...env, data: null, metrics: null, status: 'restricted', lastUpdated: null };
  }

  const ttl = Number.isFinite(adapter.ttlSeconds) ? adapter.ttlSeconds : 300;
  const fetchFn = () => {
    const ctx = buildCtx(adapter);
    return Promise.resolve(adapter.fetch(ctx)).then((raw) => adapter.normalize(raw));
  };

  let result;
  try {
    result = await cache.getOrFetch(adapter.id, ttl, fetchFn, { force });
  } catch (err) {

    logger.warn(`widget ${adapter.id} cache error: ${err.message}`);
    result = { value: null, lastUpdated: null, status: 'error' };
  }

  let { value, lastUpdated, status } = result;

  if (!value || status === 'error') {
    try {
      value = adapter.sample();
      status = 'stale';
      if (!lastUpdated) lastUpdated = new Date().toISOString();
    } catch (err) {
      return {
        ...env,
        data: null,
        metrics: null,
        status: 'error',
        lastUpdated: lastUpdated || null,
        error: err.message,
      };
    }
  }

  const { metrics = null, ...data } = value || {};
  return { ...env, data, metrics, status, lastUpdated: lastUpdated || null };
}

async function list(req, res, next) {
  try {
    const adapters = getAdapters();
    const payloads = await Promise.all(adapters.map((a) => buildPayload(a, req.user)));
    res.json(payloads);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const adapter = getAdapter(req.params.id);
    if (!adapter) return next(new AppError(404, `Unknown widget '${req.params.id}'`, 'NOT_FOUND'));
    const payload = await buildPayload(adapter, req.user);
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

async function refreshOne(req, res, next) {
  try {
    const adapter = getAdapter(req.params.id);
    if (!adapter) return next(new AppError(404, `Unknown widget '${req.params.id}'`, 'NOT_FOUND'));
    const payload = await buildPayload(adapter, req.user, { force: true });
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, refreshOne, buildPayload };
