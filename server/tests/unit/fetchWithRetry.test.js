'use strict';

// Unit tests for lib/fetchWithRetry.http (CONTRACTS §8):
//   - retries on 429 + 5xx with backoff, honoring Retry-After
//   - fails FAST on other 4xx (404 — no retry)
//   - returns parsed JSON on 200
// No real network: global fetch is stubbed. Backoff is real but tiny because the
// stub returns success/failure synchronously and we keep attempt counts low; we
// also stub global setTimeout to fire immediately so backoff sleeps don't slow the
// suite or make it nondeterministic.
const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

const { http } = require('../../src/lib/fetchWithRetry');
const { AppError } = require('../../src/lib/AppError');

// Build a minimal Response-like object the helper understands.
function makeRes({ status = 200, json, text, headers = {} }) {
  const lower = {};
  for (const k of Object.keys(headers)) lower[k.toLowerCase()] = String(headers[k]);
  return {
    status,
    headers: { get: (name) => (name.toLowerCase() in lower ? lower[name.toLowerCase()] : null) },
    json: async () => (typeof json === 'function' ? json() : json),
    text: async () => (typeof text === 'function' ? text() : text != null ? text : ''),
  };
}

let realFetch;
let realSetTimeout;

beforeEach(() => {
  realFetch = global.fetch;
  realSetTimeout = global.setTimeout;
  // Make backoff sleeps resolve immediately and deterministically. The helper's
  // own AbortController timeout uses setTimeout too, but it never fires because we
  // invoke the callback on the next microtask only when delay > 0 is requested for
  // sleeping; to be safe we run the callback asynchronously with zero delay.
  global.setTimeout = (fn, _ms) => {
    // Schedule on the microtask queue so abort timers never actually abort a
    // resolved fetch, while backoff sleeps still resolve promptly.
    return realSetTimeout(fn, 0);
  };
});

afterEach(() => {
  global.fetch = realFetch;
  global.setTimeout = realSetTimeout;
});

test('returns parsed JSON on 200', async () => {
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return makeRes({ status: 200, json: { ok: true, n: 42 } });
  };
  const data = await http('https://example.test/ok', { parse: 'json' });
  assert.deepStrictEqual(data, { ok: true, n: 42 });
  assert.strictEqual(calls, 1, 'a 200 must not retry');
});

test('returns text when parse=text', async () => {
  global.fetch = async () => makeRes({ status: 200, text: 'hello world' });
  const data = await http('https://example.test/text', { parse: 'text' });
  assert.strictEqual(data, 'hello world');
});

test('fails fast on 404 (no retry)', async () => {
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return makeRes({ status: 404, text: 'not found' });
  };
  await assert.rejects(
    () => http('https://example.test/missing'),
    (err) => {
      assert.ok(err instanceof AppError);
      assert.strictEqual(err.status, 404);
      return true;
    }
  );
  assert.strictEqual(calls, 1, 'a 404 must fail fast without retrying');
});

test('retries on 429 then succeeds (honors backoff loop)', async () => {
  const statuses = [429, 429, 200];
  let calls = 0;
  global.fetch = async () => {
    const status = statuses[calls] ?? 200;
    calls += 1;
    if (status === 200) return makeRes({ status: 200, json: { recovered: true } });
    return makeRes({ status, headers: { 'retry-after': '0' }, text: 'rate limited' });
  };
  const data = await http('https://example.test/ratelimited');
  assert.deepStrictEqual(data, { recovered: true });
  assert.strictEqual(calls, 3, 'should retry twice then succeed on the third attempt');
});

test('retries on 5xx then succeeds', async () => {
  const statuses = [500, 503, 200];
  let calls = 0;
  global.fetch = async () => {
    const status = statuses[calls] ?? 200;
    calls += 1;
    if (status === 200) return makeRes({ status: 200, json: { up: true } });
    return makeRes({ status, text: 'server error' });
  };
  const data = await http('https://example.test/5xx');
  assert.deepStrictEqual(data, { up: true });
  assert.strictEqual(calls, 3);
});

test('gives up after max attempts on persistent 5xx and throws AppError', async () => {
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return makeRes({ status: 503, text: 'down' });
  };
  await assert.rejects(
    () => http('https://example.test/always500'),
    (err) => {
      assert.ok(err instanceof AppError);
      assert.strictEqual(err.status, 503);
      return true;
    }
  );
  assert.strictEqual(calls, 4, 'MAX_ATTEMPTS is 4');
});

test('retries on network error then succeeds', async () => {
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    if (calls < 2) throw new Error('ECONNRESET');
    return makeRes({ status: 200, json: { ok: 1 } });
  };
  const data = await http('https://example.test/flaky');
  assert.deepStrictEqual(data, { ok: 1 });
  assert.strictEqual(calls, 2);
});
