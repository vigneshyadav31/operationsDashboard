'use strict';

// HTTP helper used by every adapter (passed in as ctx.http). Built on global fetch
// (Node 22). Per CONTRACTS §8:
//   - retry on 429 + 5xx with exponential backoff 1s/2s/4s (capped at 8s), max 4 attempts
//   - honor the Retry-After header (seconds or HTTP-date)
//   - AbortController timeout (default 10s)
//   - fail FAST on other 4xx (no retry)
//   - parse 'json' | 'text'
//   - throw AppError(status, message) on final failure
const { AppError } = require('./AppError');

const MAX_ATTEMPTS = 4;
const BACKOFF_MS = [1000, 2000, 4000]; // applied between attempts; capped at 8s
const BACKOFF_CAP_MS = 8000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Parse Retry-After: integer seconds or an HTTP-date. Returns ms (>=0) or null.
function parseRetryAfter(headerValue) {
  if (!headerValue) return null;
  const asInt = Number(headerValue);
  if (Number.isFinite(asInt)) return Math.max(0, asInt * 1000);
  const asDate = Date.parse(headerValue);
  if (Number.isFinite(asDate)) return Math.max(0, asDate - Date.now());
  return null;
}

function backoffFor(attemptIndex, retryAfterMs) {
  const base = BACKOFF_MS[Math.min(attemptIndex, BACKOFF_MS.length - 1)];
  const chosen = retryAfterMs != null ? Math.max(retryAfterMs, base) : base;
  return Math.min(chosen, BACKOFF_CAP_MS);
}

async function http(url, opts = {}) {
  const {
    method = 'GET',
    headers = {},
    body,
    timeoutMs = 10000,
    parse = 'json',
  } = opts;

  let lastError = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res;
    try {
      res = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      // Network error or timeout (AbortError) — retryable.
      const isAbort = err && (err.name === 'AbortError' || err.code === 'ABORT_ERR');
      lastError = new AppError(
        isAbort ? 504 : 502,
        isAbort ? `Request to ${url} timed out after ${timeoutMs}ms` : `Network error fetching ${url}: ${err.message}`,
        isAbort ? 'FETCH_TIMEOUT' : 'FETCH_NETWORK'
      );
      if (attempt < MAX_ATTEMPTS - 1) {
        await sleep(backoffFor(attempt, null));
        continue;
      }
      throw lastError;
    }
    clearTimeout(timer);

    // Retryable status codes: 429 + any 5xx.
    if (res.status === 429 || res.status >= 500) {
      lastError = new AppError(res.status, `Upstream ${res.status} from ${url}`, 'UPSTREAM_RETRYABLE');
      if (attempt < MAX_ATTEMPTS - 1) {
        const retryAfterMs = parseRetryAfter(res.headers.get('retry-after'));
        await sleep(backoffFor(attempt, retryAfterMs));
        continue;
      }
      throw lastError;
    }

    // Other 4xx: fail fast, no retry.
    if (res.status >= 400) {
      let detail = '';
      try {
        detail = await res.text();
      } catch (_e) {
        detail = '';
      }
      throw new AppError(
        res.status,
        `Upstream ${res.status} from ${url}${detail ? `: ${detail.slice(0, 200)}` : ''}`,
        'UPSTREAM_CLIENT_ERROR'
      );
    }

    // Success — parse and return.
    try {
      if (parse === 'text') return await res.text();
      if (parse === 'none') return res;
      return await res.json();
    } catch (err) {
      throw new AppError(502, `Failed to parse ${parse} from ${url}: ${err.message}`, 'PARSE_ERROR');
    }
  }

  // Should be unreachable, but guarantee a throw.
  throw lastError || new AppError(502, `Request to ${url} failed`, 'FETCH_FAILED');
}

module.exports = { http };
module.exports.http = http;
module.exports.default = http;
