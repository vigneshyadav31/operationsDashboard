'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

const cache = require('../../src/cache/cache');

function uniqueKey(label) {
  return `test:${label}:${process.pid}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

async function flush() {
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
}

test('fresh hit within TTL returns cached value without re-fetching', async () => {
  const key = uniqueKey('fresh');
  let calls = 0;
  const fetchFn = async () => {
    calls += 1;
    return { n: calls };
  };

  const first = await cache.getOrFetch(key, 600, fetchFn);
  assert.strictEqual(first.status, 'fresh');
  assert.deepStrictEqual(first.value, { n: 1 });
  assert.ok(first.lastUpdated, 'lastUpdated should be set');

  const second = await cache.getOrFetch(key, 600, fetchFn);
  assert.strictEqual(second.status, 'fresh');
  assert.deepStrictEqual(second.value, { n: 1 }, 'should return the cached value');
  assert.strictEqual(calls, 1, 'fetchFn must not be called again within TTL');
});

test('stale-while-revalidate: after TTL returns stale then refreshes in background', async () => {
  const key = uniqueKey('swr');

  cache.set(key, { v: 'old' }, 0, 'fresh');

  let calls = 0;
  const fetchFn = async () => {
    calls += 1;
    return { v: 'new' };
  };

  const res = await cache.getOrFetch(key, 0, fetchFn);
  assert.strictEqual(res.status, 'stale', 'stale data returned immediately');
  assert.deepStrictEqual(res.value, { v: 'old' });

  await flush();

  const peeked = cache.peek(key);
  assert.deepStrictEqual(peeked.value, { v: 'new' }, 'background refresh stored the new value');
  assert.strictEqual(calls, 1, 'background revalidation ran exactly once');
});

test('no cached value: awaits fetchFn and returns fresh', async () => {
  const key = uniqueKey('cold');
  const res = await cache.getOrFetch(key, 600, async () => ({ cold: true }));
  assert.strictEqual(res.status, 'fresh');
  assert.deepStrictEqual(res.value, { cold: true });
});

test('graceful fallback: fetchFn throws with stale present -> returns stale, never throws', async () => {
  const key = uniqueKey('errstale');
  cache.set(key, { v: 'cached' }, 0, 'fresh');

  let res;
  await assert.doesNotReject(async () => {
    res = await cache.getOrFetch(key, 0, async () => {
      throw new Error('upstream boom');
    });
  });

  assert.strictEqual(res.status, 'stale');
  assert.deepStrictEqual(res.value, { v: 'cached' });

  await flush();

  assert.deepStrictEqual(cache.peek(key).value, { v: 'cached' });
});

test('graceful fallback: fetchFn throws with NO cache -> status error, value null, never throws', async () => {
  const key = uniqueKey('errcold');
  let res;
  await assert.doesNotReject(async () => {
    res = await cache.getOrFetch(key, 600, async () => {
      throw new Error('cold boom');
    });
  });
  assert.strictEqual(res.status, 'error');
  assert.strictEqual(res.value, null);
});

test('force refresh awaits fetchFn even when a cached value exists', async () => {
  const key = uniqueKey('force');
  cache.set(key, { v: 'old' }, 600, 'fresh');
  const res = await cache.getOrFetch(key, 600, async () => ({ v: 'forced' }), { force: true });
  assert.strictEqual(res.status, 'fresh');
  assert.deepStrictEqual(res.value, { v: 'forced' });
});

test('get/set/peek round-trip', () => {
  const key = uniqueKey('rt');
  cache.set(key, { hello: 'world' }, 300, 'fresh');
  const got = cache.get(key);
  assert.deepStrictEqual(got.value, { hello: 'world' });
  assert.strictEqual(got.status, 'fresh');
  assert.ok(got.lastUpdated);
  assert.strictEqual(cache.get(uniqueKey('missing')), null);
});
