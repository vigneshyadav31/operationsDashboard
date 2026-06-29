# ARCHITECTURE — The Operations Dashboard

End-to-end design for a Founder's Office operations cockpit: 25 external/internal
signals are pulled through a uniform adapter contract, cached with stale-while-revalidate,
shaped into typed widgets, evaluated by a deterministic trigger engine, and turned into
SLA-bound **Action Queue** cards that map 1:1 to Standard Operating Procedures (SOPs).

This document is the design companion to **[`../CONTRACTS.md`](../CONTRACTS.md)**, which is the
authoritative interface spec. Where a section number appears below (e.g. *CONTRACTS §7*), the
behaviour described is pinned by that section and the code conforms to it exactly. If this
document and `CONTRACTS.md` ever disagree, **`CONTRACTS.md` wins.**

---

## 1. System at a glance

The product answers three operational questions for every signal it tracks, surfaced as the
per-widget `question` badge (*CONTRACTS §2*, `widget.question ∈ {trigger|sla|refresh}`):

1. **trigger** — "Has a threshold been crossed that requires a human to act?"
2. **sla** — "Is an open obligation about to breach its service-level deadline?"
3. **refresh** — "What is the latest state of this signal?"

A single founder, the analysts they delegate to, and an admin operator share one dashboard.
RBAC keeps sensitive financial widgets (treasury, investor quotes) founder/admin-only, and
restricts each analyst to their own action queue.

The hard guarantee (*CONTRACTS §13*): the entire app **installs and runs on Windows with ZERO
API keys**. Every adapter ships a deterministic `sample()` fixture, so all 25 widgets render and
the Action Queue is populated by the trigger engine even when no upstream is reachable.

---

## 2. Data-flow diagram (sources → cache → widgets → triggers → action queue)

```
                          THE OPERATIONS DASHBOARD — DATA FLOW

  UPSTREAMS                         BACKEND (CommonJS / Express / better-sqlite3)
  ─────────                         ─────────────────────────────────────────────

  PUBLIC  A1..A8  ─┐
  (no key)         │     ┌──────────────────────────────────────────────────────┐
                   │     │  config/sources.js  — registry loader                 │
  KEYED   B1..B10 ─┼────►│   auto-requires sources/{public,keyed,scrapers}/*.js  │
  (env key)        │     │   getAdapters() / getAdapter(id) / loadScraperConfig()│
                   │     └───────────────────────────┬──────────────────────────┘
  SCRAPERS C1..C7 ─┘                                 │  adapter = {id,fetch,normalize,sample,trigger}
  (YAML config)                                      ▼
                              ┌──────────────────────────────────────────┐
                              │  lib/adapterContext.buildCtx(adapter)     │
                              │   ctx = { http, env(keys), log, cfg(yaml)}│
                              └───────────────┬──────────────────────────┘
                                              │  fetchFn = () => normalize(fetch(ctx))
                                              ▼
   ┌───────────────────────────────────────────────────────────────────────────────────┐
   │ cache/cache.js  getOrFetch(key=adapter.id, ttl, fetchFn, {force})                   │
   │   fresh? → return cached            stale? → return stale NOW + revalidate in bg     │
   │   miss?  → await fetchFn            error?  → return last stale, else {value:null}   │
   │   (NEVER throws) backed by SQLite `cache` table (key,value,fetched_at,ttl,status)   │
   └───────────┬───────────────────────────────────────────────────────┬───────────────┘
               │ normalized {…widgetData, metrics:{…}}                  │ same normalized payload
               ▼                                                        ▼
   ┌──────────────────────────────┐                       ┌──────────────────────────────────┐
   │ controllers/widgets          │                       │ triggers/engine.evaluateAll()     │
   │   buildPayload(adapter,user) │                       │   metrics[trigger.metric] vs       │
   │   RBAC: sensitive→restricted │                       │   threshold via comparator         │
   │   fallback: sample()→'stale' │                       │   breach → INSERT OR IGNORE Action │
   │   → WidgetPayload (§5)        │                       │   idemKey=src:sop:UTCday → 1/day   │
   └──────────────┬───────────────┘                       └──────────────────┬───────────────┘
                  │ GET /api/widgets                                          │ writes
                  ▼                                                           ▼
   ┌──────────────────────────────┐                       ┌──────────────────────────────────┐
   │ db/db.js (better-sqlite3)    │◄──────────────────────│  actions / audit_log tables       │
   │  ./data/ops.sqlite (WAL)     │                       │  + jobs/refresh.js (node-cron)     │
   └──────────────────────────────┘                       └──────────────────────────────────┘
                  │  /api (express, cookie sid, RBAC)
                  ▼
   ════════════════════════════════════════════ HTTP /api ════════════════════════════════════
                  │
                  ▼
  FRONTEND (Vite + React + recharts, ESM)
   ┌──────────────────────────────────────────────────────────────────────────────────────┐
   │ App → AuthContext(/api/auth/me) → Dashboard                                            │
   │   Nav(role, logout, Refresh-all)                                                       │
   │   ActionQueue(/api/actions, SLA countdown, ack/resolve)   ◄── the SOP queue            │
   │   grid of WidgetCard → WidgetRenderer(switch widget.type) → widgets/* (recharts/SVG)   │
   │   LastUpdated + status pill (fresh|stale|error|restricted), poll /api/widgets every 60s│
   └──────────────────────────────────────────────────────────────────────────────────────┘
```

**Reading the flow:** an adapter's normalized payload is computed **once** and reused by both the
widget controller (for display) and the trigger engine (for `metrics`). Both go through
`cache.getOrFetch`, so a single upstream call serves both the chart and the trigger evaluation.

---

## 3. The Source Adapter contract (sources → normalized payload)

Every file under `server/src/sources/**` exports the exact shape pinned in **CONTRACTS §2**:

```js
module.exports = {
  id, name, category,           // 'public' | 'keyed' | 'scraper'
  sensitive, ttlSeconds, refresh,
  widget: { type, title, question, description },
  async fetch(ctx) { ... },     // ctx = { http, env, log, cfg }; returns RAW upstream
  normalize(raw) { ... },       // RAW -> { ...widgetData (§4), metrics:{ numeric keys } }
  sample() { ... },             // deterministic fixture -> normalize(inlineRaw)
  trigger?: { metric, comparator, threshold, sopId, sopTitle, assignee, slaHours, severity },
};
```

Invariants enforced across the codebase:

- **Adapters never touch the network directly.** They call `ctx.http` (= `lib/fetchWithRetry.http`),
  which centralises retries/backoff/timeouts (*CONTRACTS §8*). Adapters never `require` `node:fetch`.
- **Adapters never touch the DB or cache.** Caching is the cache layer's job; persistence is the
  controllers'/engine's job. This keeps "swap a provider = edit one file" true (*CONTRACTS §13*).
- **Three categories, one shape:**
  - `public` (A1–A8): no key. Always attempts live; falls back to `sample()`.
  - `keyed` (B1–B10): reads `ctx.env.<VAR>`; if absent throws `MissingKeyError(VAR)` (from
    `lib/AppError`) so the cache layer degrades to `sample()`/stale gracefully.
  - `scraper` (C1–C7): config-driven. `buildCtx` injects `cfg = loadScraperConfig(id)` (the YAML).
    If `cfg.enabled === false`, the adapter returns `sample()` and makes no request.
- **`sample()` is load-bearing**, not a placeholder. It must return realistic widget data so the
  dashboard is fully populated with zero keys and the engine can fire SOP cards from it.

`lib/adapterContext.buildCtx(adapter)` assembles `ctx`:
`http = fetchWithRetry.http`, `env = config.keys`, `log = logger`, and for scrapers
`cfg = loadScraperConfig(adapter.id) || {}` (else `{}`).

The registry loader `config/sources.js` synchronously `require`s every `*.js` (excluding
`*.test.js`) under the three subfolders, validates each has an `id`, sorts by id
(numeric-aware), and memoizes. It tolerates missing folders so the server boots before adapter
files land, and exposes `getAdapters()`, `getAdapter(id)` (case-insensitive), and
`loadScraperConfig(id)` (`scrapers/config/<id-lower>.yaml` via `js-yaml`).

---

## 4. Cache → stale-while-revalidate model (CONTRACTS §7)

`cache/cache.js` is a SQLite-backed TTL cache keyed by `adapter.id`. The `cache` table stores
`(key, value JSON, fetched_at ISO, ttl_seconds, status)`.

`getOrFetch(key, ttlSeconds, fetchFn, {force})` semantics:

| State                                   | Behaviour                                                        | Returned `status` |
|-----------------------------------------|------------------------------------------------------------------|-------------------|
| Cached & `age < ttl` & not forced       | Return cached immediately                                        | `fresh`           |
| Cached & stale & not forced             | Return stale **now**; revalidate in the background (deduped)     | `stale`           |
| No cached value (or `force:true`)       | `await fetchFn`; store fresh; return it                          | `fresh`           |
| `fetchFn` throws, but a prior value exists | Return last cached value                                      | `stale`           |
| `fetchFn` throws and nothing cached     | Return `{ value: null }`                                          | `error`           |

Two properties make the "zero keys" guarantee hold:

1. **Never throws to the caller.** Both the widget controller and the trigger engine can rely on
   getting *something* back. They then layer their own `sample()` fallback on top.
2. **No stampede.** Background revalidations are tracked in an in-flight `Set`, so concurrent
   readers of a stale key trigger at most one upstream refresh.

`peek(key)`/`get(key)` return `{value,lastUpdated,status}|null`; `set(key,value,ttl,status)`
upserts. The `status` written by `getOrFetch` after a successful fetch is always `fresh`; the
controller/engine downgrade to `stale` when they substitute `sample()`.

---

## 5. Widgets → typed render contract (CONTRACTS §4 + §5)

`controllers/widgets.controller.buildPayload(adapter, user, {force})` produces a **WidgetPayload**:

```
WidgetPayload = {
  id, name, category, sensitive,
  widget: { type, title, question, description },
  data: <widgetData|null>, metrics: {…}|null,
  status: 'fresh'|'stale'|'error'|'restricted', lastUpdated: ISO|null, error?: string
}
```

Construction order:

1. **RBAC gate.** If `adapter.sensitive` and the user is not `founder`/`admin`, short-circuit to
   `{ data:null, metrics:null, status:'restricted' }` — the upstream is never even consulted.
2. **Resolve through cache.** `cache.getOrFetch(adapter.id, ttl, () => normalize(fetch(ctx)), {force})`.
3. **`sample()` fallback.** If the result is `error` or `value` is null, substitute `adapter.sample()`
   and mark `status:'stale'` with a `lastUpdated` of now. A widget therefore never renders empty.
4. **Split.** `normalize()` returns `{ ...widgetData, metrics }`; the controller peels `metrics` out
   and puts the rest under `data`, matching the per-type shapes in *CONTRACTS §4*.

The frontend `WidgetRenderer` switches on `widget.type` and delegates to a component per type
(`Kpi`, `Sparkline`, `LineW`, `BarW`, `TableW`, `HeatmapW`, `GaugeW`, `AvatarGrid`, `WordCloud`,
`BubbleW`, `CandlestickW`, `TimelineW`, `KanbanW`, `SankeyW`); unknown types fall back to a table/JSON
view. Every `WidgetCard` shows the `question` badge, the **LastUpdated** timestamp, and a status pill
(`fresh`/`stale`/`error`/`restricted`). An error boundary guarantees one bad card never crashes the grid.

---

## 6. Triggers → idempotency → SLA model (CONTRACTS §9)

`triggers/rules.getRules()` derives the **Rule** table: every adapter with a `.trigger` becomes
`{ sourceId, sopId, sopTitle, metric, comparator, threshold, assignee, slaHours, severity }`, served
at `GET /api/triggers/rules`. This is the human-readable "which SOP fires on which metric" registry.

`triggers/engine.evaluateAll()` runs the rules:

1. For each triggered adapter, resolve the normalized payload via `cache.getOrFetch`, with a
   `sample()` fallback baked in so `metrics` exist even with zero keys.
2. Read `metrics[trigger.metric]`; skip if missing/`NaN`.
3. Compare against `trigger.threshold` using the comparator:
   `gt`, `lt`, `gte`, `lte`, `eq`, `abs_gt` (`|v|>t`), `abs_gte` (`|v|>=t`).
4. On breach, **upsert** an Action with
   `idemKey = ` `` `${sourceId}:${sopId}:${YYYY-MM-DD(UTC)}` `` via `INSERT OR IGNORE`.

**Idempotency:** `actions.idem_key` is `UNIQUE`. The UTC-day bucket means a breach produces **exactly
one card per source/SOP per day** — re-running the engine (cron, startup, or `POST /api/refresh`) is a
no-op once the card exists. A successful insert writes an `audit_log` row (`action.created`).

**SLA:** on creation `firedAt = now`, `dueAt = now + slaHours*3600s`, `status = 'open'`. Operators
**ack** (`status:'ack'`, records `ackAt`) and **resolve** (`status:'done'`, records `resolvedAt`,
computes `metSla = resolvedAt <= dueAt`). The API also derives `breached` on read: an unresolved card
past `dueAt`, or one resolved after `dueAt`, is `breached:true`. The frontend renders a live SLA
countdown from `dueAt`.

The **Action** shape (CONTRACTS §5) carries everything an operator needs to act without leaving the
queue: `metric/comparator/threshold/value`, `severity`, `assignee`, `sopId/sopTitle`, and the SLA fields.

---

## 7. Request lifecycle through the backend

A request to `/api/...` traverses a fixed pipeline (wired in `server/src/index.js`):

```
client request
   │
   ▼
[1] CORS            cors({origin: whitelist(CORS_ORIGIN), credentials:true})
   │                only the configured origin(s) may send the `sid` cookie
   ▼
[2] cookieParser    parses the HttpOnly `sid` cookie
   │
   ▼
[3] express.json    JSON body parser (1mb limit)
   │
   ▼
[4] GATEWAY         gateway/index.js = [ entryGuard, rateLimiter ]
   │                entryGuard: assigns X-Request-Id, logs method/url/status/latency on finish
   │                rateLimiter: per-IP fixed window (300 req/min) → 429 + Retry-After on overflow
   ▼
[5] attachUser      middleware/auth.js: sid → session → req.user (or null). Never blocks.
   │
   ▼
[6] ROUTER          /api/{auth,widgets,actions,triggers,refresh,health}
   │                route-level guards: requireAuth, requireRole('founder','admin'|'admin')
   ▼
[7] CONTROLLER      validates input (middleware/validate.js + zod), then:
   │                  ├─ widgets → cache.getOrFetch → adapter.fetch/normalize → sample() fallback
   │                  ├─ actions → db reads/writes (RBAC + IDOR checks) + audit()
   │                  └─ auth    → auth/auth.js (bcrypt, sessions) + Set-Cookie
   ▼
[8] RESPONSE        JSON envelope (WidgetPayload / Action / Rule / user)
   │
   ▼
[9] errorHandler    middleware/errorHandler.js: AppError → {status, code, message}; unknown → 500
```

Cross-cutting:

- **Health:** `GET /api/health` returns `{status:'ok', uptimeSec, version, checks:{db,cache,sourcesLoaded}}`
  by probing SQLite (`SELECT 1`), the cache (`set`+`get` a sentinel), and the adapter registry count.
- **Unknown `/api` route** → 404 JSON (`NOT_FOUND`), never the SPA fallback.
- **Production static serving:** when `NODE_ENV=production`, Express serves `client/dist` with an SPA
  fallback for non-`/api` paths.
- **Startup side effects** run only when `index.js` is the main module and `NODE_ENV!=='test'`:
  `startRefreshJob()` schedules the cron, and `runOnce()` immediately warms caches + evaluates triggers
  so the dashboard and Action Queue are populated the moment the server is up.

---

## 8. Auth & RBAC model (CONTRACTS §5, §10)

**Authentication.** `auth/auth.js` uses `bcryptjs` (10 rounds). A session is a random 32-byte hex id
stored in `sessions(id, user_id, expires_at, created_at)` with a 7-day expiry, delivered as an
**HttpOnly** cookie `sid` (`SameSite=Lax`; `Secure` only under `NODE_ENV=production`). `attachUser`
resolves the cookie → session → `req.user` on every request (expired sessions are deleted on read).

Endpoints (*CONTRACTS §5*):

| Route                          | Guard                          | Notes                                   |
|--------------------------------|--------------------------------|-----------------------------------------|
| `POST /api/auth/register`      | —                              | 201 `{user}` + Set-Cookie               |
| `POST /api/auth/login`         | —                              | 200 `{user}` + Set-Cookie / 401         |
| `POST /api/auth/logout`        | —                              | 204, clears cookie + destroys session   |
| `GET  /api/auth/me`            | —                              | 200 `{user}` \| 401                     |
| `GET  /api/widgets`            | `requireAuth`                  | sensitive → `data:null,status:restricted` for non-priv |
| `POST /api/widgets/:id/refresh`| `requireRole('founder','admin')` | forced cache refresh                  |
| `GET  /api/actions`            | `requireAuth`                  | analyst sees only `assignee='analyst'`  |
| `POST /api/actions/:id/{ack,resolve}` | `requireAuth` + IDOR check | analyst may act only on analyst cards   |
| `POST /api/refresh`            | `requireRole('admin')`         | 202 — run engine + refresh now          |

**RBAC.** `founder` and `admin` are privileged; `analyst` is restricted. Two enforcement points:

1. **Field-level (sensitive widgets):** `widgets.controller` returns `status:'restricted'` with null
   data for `sensitive` sources (A1 CoinGecko treasury, B1 Alpha Vantage investor quote) to non-priv
   users. The data never leaves the server.
2. **Object-level / IDOR (the documented example, *CONTRACTS §10*):** `actions.controller.list`
   filters analysts to `assignee='analyst'`, and `assertCanAccess` makes `ack`/`resolve` on a
   non-analyst card return **404 (not 403)** for an analyst — refusing to even confirm the card exists,
   so an attacker can't enumerate ids.

Every privileged mutation (`ack`, `resolve`, engine-created cards) writes an `audit_log` row
`(ts, actor, action, entity, detail)`.

---

## 9. Scraper YAML model (CONTRACTS §3)

Scraper adapters (C1–C7) are **config-driven** so a site's crawl policy lives in data, not code. Each
has a sibling `server/src/sources/scrapers/config/<id-lower>.yaml` with:

```yaml
id: c1
enabled: true            # false → adapter returns sample() and makes NO request
userAgent: "OpsDashboard/1.0 (founders-office@demo.local)"
robots: "Allowed: data.sec.gov serves JSON submissions; throttle per SEC fair-access note"
rateLimitPerSec: 1       # politeness budget the adapter honours
endpoint: "https://data.sec.gov/submissions/CIK0000320193.json"
notes: "CIK 0000320193 = Apple Inc. — latest filings; look for 8-K material events"
```

The adapter loads it via `loadScraperConfig(id)` (injected as `ctx.cfg`), sets the `User-Agent` from
`cfg.userAgent`, honours `cfg.enabled === false` by returning `sample()`, and records the `robots` note
for auditability. Two sources (C5 Yahoo Finance, C7 India MCA) are intentionally `sample()`-first
because the real endpoints are JS-rendered or require a CSV download rather than a portal scrape — their
YAML documents *why*, and the adapter attaches a `note` to the widget data.

---

## 10. Deployment & observability

**Run scripts (CONTRACTS §12, npm workspaces).**
- `npm install` at ROOT installs both `server` and `client` workspaces.
- `npm run dev` → `concurrently` runs the API on `:4000` and Vite on `:5173` (Vite proxies `/api` →
  `http://localhost:4000`). Fully cross-platform; no bash-only scripts.
- `npm run build` builds the client; `npm start` runs `NODE_ENV=production node server` serving
  `client/dist`.
- `npm test` runs server tests via `node --test` (built-in `node:test`/`node:assert` + `supertest`).

**Containers.** `Dockerfile` builds the client then runs the server in production mode; `docker-compose.yml`
maps `:4000` and mounts a volume for `./server/data` (the SQLite file). Secrets are supplied via
environment variables / an `.env` file — **never** baked into the image (*CONTRACTS §13*).

**Configuration & secrets.** `config/env.js` loads `.env` (root, then server-local) via `dotenv` and
exposes a typed `config` object: `port`, `nodeEnv`, `sessionSecret`, `demoPassword`, `refreshCron`,
`corsOrigin`, and `keys` (all 16 provider vars, blank by default). `.env` is gitignored;
`.env.example` documents every variable. The app boots and serves all 25 widgets with every key blank.

**Scheduled work.** `jobs/refresh.js` uses `node-cron` (`REFRESH_CRON`, default `*/10 * * * *`) to
force-refresh every `refresh:true` adapter and re-run the trigger engine. `runOnce()` also runs on
startup and is guarded against overlapping runs.

**Observability:**
- **Structured request logs** — `entryGuard` logs `requestId method url -> status latencyMs` for every
  request; `X-Request-Id` is echoed in the response (and accepted from the client for correlation).
- **Audit trail** — `audit_log` records who acked/resolved which action and every engine-created card.
- **Health probe** — `GET /api/health` for liveness/readiness, including a live count of loaded sources.
- **Rate-limit headers** — `X-RateLimit-Limit/Remaining/Reset` on every response; `Retry-After` on 429.
- **Cache visibility** — each widget's `status` + `lastUpdated` make freshness observable from the UI;
  the cache `status` column records the last persisted state per key.
- **Leveled logging** — `lib/logger.js` provides `info/warn/error`; cache revalidation failures,
  missing keys, and per-adapter engine errors are logged without ever crashing a request.

---

## 11. Conformance checklist (maps to CONTRACTS §13 non-negotiables)

- [x] Every upstream call goes through `cache.getOrFetch`; adapters hit the network only via `ctx.http`.
- [x] No secret in code or git — only `.env` (gitignored) / `.env.example` placeholders.
- [x] Every widget shows a visible **Last Updated** timestamp and degrades to `sample()`/stale with zero keys.
- [x] Swapping a provider = editing exactly one adapter file (self-contained `fetch`/`normalize`/`sample`).
- [x] `npm install` + `npm run dev` on Windows with NO keys shows all 25 widgets populated and an Action
      Queue populated by the trigger engine.

See **[`SOURCES.md`](SOURCES.md)** for the full 25-source registry and **[`sops/`](sops/)** for the 25 SOP
one-pagers that the Action Queue cards reference.
