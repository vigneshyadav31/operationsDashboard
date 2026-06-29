'use strict';

// SQLite-backed TTL cache with stale-while-revalidate (CONTRACTS §7).
//   getOrFetch(key, ttlSeconds, fetchFn, {force}) -> {value, lastUpdated, status}
//   peek(key) -> {value, lastUpdated, status} | null
//   get(key)  -> {value, lastUpdated, status} | null
//   set(key, value, ttlSeconds, status)
// Never throws to the caller: on fetchFn failure returns last cached value as
// 'stale', or {value:null, status:'error'} when nothing is cached.
const { db, nowIso } = require('../db/db');
const { logger } = require('../lib/logger');

const selectStmt = db.prepare('SELECT key, value, fetched_at, ttl_seconds, status FROM cache WHERE key = ?');
const upsertStmt = db.prepare(`
  INSERT INTO cache (key, value, fetched_at, ttl_seconds, status)
  VALUES (@key, @value, @fetched_at, @ttl_seconds, @status)
  ON CONFLICT(key) DO UPDATE SET
    value = excluded.value,
    fetched_at = excluded.fetched_at,
    ttl_seconds = excluded.ttl_seconds,
    status = excluded.status
`);

// Track in-flight background revalidations so we never stampede the same key.
const inflight = new Set();

function readRow(key) {
  const row = selectStmt.get(key);
  if (!row) return null;
  let value = null;
  try {
    value = row.value === null || row.value === undefined ? null : JSON.parse(row.value);
  } catch (_e) {
    value = null;
  }
  return {
    value,
    lastUpdated: row.fetched_at || null,
    ttlSeconds: row.ttl_seconds,
    status: row.status || 'fresh',
    fetchedAt: row.fetched_at,
  };
}

function isFresh(row, ttlSeconds) {
  if (!row || !row.fetchedAt) return false;
  const ttl = Number.isFinite(ttlSeconds) ? ttlSeconds : row.ttlSeconds;
  if (!Number.isFinite(ttl)) return false;
  const ageMs = Date.now() - new Date(row.fetchedAt).getTime();
  return ageMs >= 0 && ageMs < ttl * 1000;
}

function set(key, value, ttlSeconds, status = 'fresh') {
  upsertStmt.run({
    key,
    value: value === undefined ? null : JSON.stringify(value),
    fetched_at: nowIso(),
    ttl_seconds: Number.isFinite(ttlSeconds) ? ttlSeconds : 0,
    status,
  });
}

function get(key) {
  const row = readRow(key);
  if (!row) return null;
  return { value: row.value, lastUpdated: row.lastUpdated, status: row.status };
}

function peek(key) {
  return get(key);
}

// Run fetchFn, store the result fresh, and return it. On failure, do NOT store
// (preserves any prior cached value) and rethrow so the caller can fall back.
async function revalidate(key, ttlSeconds, fetchFn) {
  const value = await fetchFn();
  set(key, value, ttlSeconds, 'fresh');
  return value;
}

async function getOrFetch(key, ttlSeconds, fetchFn, opts = {}) {
  const force = !!opts.force;
  const row = readRow(key);

  // Fresh hit (and not forced) — return immediately.
  if (!force && row && isFresh(row, ttlSeconds)) {
    return { value: row.value, lastUpdated: row.lastUpdated, status: 'fresh' };
  }

  const hasCached = row && row.value !== null && row.value !== undefined;

  // Stale-while-revalidate: if we have stale data and we're not forcing, return
  // it immediately and refresh in the background.
  if (!force && hasCached) {
    if (!inflight.has(key)) {
      inflight.add(key);
      Promise.resolve()
        .then(() => revalidate(key, ttlSeconds, fetchFn))
        .catch((err) => {
          logger.warn(`cache background revalidate failed for ${key}: ${err.message}`);
        })
        .finally(() => inflight.delete(key));
    }
    return { value: row.value, lastUpdated: row.lastUpdated, status: 'stale' };
  }

  // Forced refresh, or no cached value: await fetchFn.
  try {
    const value = await revalidate(key, ttlSeconds, fetchFn);
    const fresh = readRow(key);
    return { value, lastUpdated: fresh ? fresh.lastUpdated : nowIso(), status: 'fresh' };
  } catch (err) {
    logger.warn(`cache fetch failed for ${key}: ${err.message}`);
    if (hasCached) {
      return { value: row.value, lastUpdated: row.lastUpdated, status: 'stale' };
    }
    return { value: null, lastUpdated: row ? row.lastUpdated : null, status: 'error' };
  }
}

module.exports = {
  getOrFetch,
  peek,
  get,
  set,
};
