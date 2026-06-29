# CONTRACTS.md — the single source of truth for The Operations Dashboard

Every build agent MUST read this and conform exactly. It pins all interfaces so independently-built
files drop in together. Do not invent alternative shapes. If something is unspecified, follow the
closest pattern here and keep it minimal and runnable.

## 0. Repo layout (absolute root)
ROOT = `C:/Users/Vignesh/OneDrive/文档/Desktop/operationsDashboard`

```
ROOT/
  package.json                  # npm workspaces ["server","client"] + scripts (dev/build/start/test)
  .gitignore                    # ignores node_modules, .env, *.sqlite, client/dist, coverage
  .env.example                  # ALL env vars (keys + config). Real .env is gitignored.
  README.md                     # how to run
  CONTRACTS.md                  # this file
  Dockerfile
  docker-compose.yml
  .github/workflows/ci.yml
  docs/
    ARCHITECTURE.md
    sops/SOP-A1.md ... SOP-C7.md (25 one-pagers)
  server/
    package.json
    src/
      index.js                  # express app, mounts routes, health, serves client/dist in prod
      config/env.js             # loads dotenv, exports typed config object
      config/sources.js         # registry loader: auto-requires every adapter under sources/**
      lib/fetchWithRetry.js     # http(url,opts) retry/backoff wrapper
      lib/logger.js
      lib/AppError.js
      cache/cache.js            # SQLite-backed TTL cache w/ stale-while-revalidate
      db/db.js                  # better-sqlite3 connection + schema bootstrap + seed
      gateway/index.js          # rate limiting + entry guard middleware
      middleware/auth.js        # requireAuth, requireRole, attachUser
      middleware/validate.js    # zod validation helper
      middleware/errorHandler.js
      auth/auth.js              # bcrypt hashing, sessions, login/register/logout/me logic
      triggers/rules.js         # aggregates adapter.trigger into a rules table
      triggers/engine.js        # evaluateAll(): idempotent action creation + SLA
      controllers/widgets.controller.js
      controllers/actions.controller.js
      controllers/auth.controller.js
      routes/widgets.routes.js
      routes/actions.routes.js
      routes/auth.routes.js
      routes/health.routes.js
      jobs/refresh.js           # node-cron scheduled refresh + on-startup run
      sources/public/a1..a8.js
      sources/keyed/b1..b10.js
      sources/scrapers/c1..c7.js
      sources/scrapers/config/c1..c7.yaml
    tests/unit/*.test.js
    tests/integration/*.test.js
  client/
    package.json
    vite.config.js              # dev proxy /api -> http://localhost:4000
    index.html
    src/
      main.jsx, App.jsx, api.js, theme.css
      auth/AuthContext.jsx, pages/Login.jsx, pages/Dashboard.jsx
      components/WidgetCard.jsx, WidgetRenderer.jsx, LastUpdated.jsx, ActionQueue.jsx, Nav.jsx
      components/widgets/*  (Kpi, Sparkline, LineW, BarW, TableW, HeatmapW, GaugeW,
                            AvatarGrid, WordCloud, BubbleW, CandlestickW, TimelineW, KanbanW, SankeyW)
```

## 1. Tech + module systems (DO NOT DEVIATE)
- **server**: CommonJS (`require` / `module.exports`). Node 22. deps: `express`, `better-sqlite3`,
  `bcryptjs`, `js-yaml`, `node-cron`, `dotenv`, `cookie-parser`, `cors`, `zod`. devDeps: `supertest`.
  Tests use built-in `node:test` + `node:assert`.
- **client**: ESM + React + Vite. deps: `react`, `react-dom`, `recharts`. devDeps: `vite`,
  `@vitejs/plugin-react`. Plain CSS (theme.css), no Tailwind.
- Server listens on `PORT` (default **4000**). Vite dev server on **5173**, proxies `/api` -> 4000.
- Use global `fetch` (built into Node 22). No `axios`/`node-fetch`.

## 2. Source Adapter contract  (every file in server/src/sources/**)
Each adapter file does `module.exports = { ... }` with this exact shape:
```js
module.exports = {
  id: 'A1',                       // unique, matches table id (A1..A8,B1..B10,C1..C7)
  name: 'CoinGecko — crypto',
  category: 'public',             // 'public' | 'keyed' | 'scraper'
  sensitive: false,               // true => founder/admin only (analyst gets {restricted:true})
  ttlSeconds: 300,                // cache TTL
  refresh: true,                  // include in scheduled refresh job
  widget: {
    type: 'kpi-sparkline',        // one of the canonical widget types (section 4)
    title: 'Treasury — Crypto',
    question: 'refresh',          // 'trigger' | 'sla' | 'refresh'  (the 3 dashboard questions)
    description: 'BTC/ETH spot + 24h trend',
  },
  // Fetch RAW upstream data. ctx = { http, env, log, cfg }. `http` = fetchWithRetry.
  // For keyed sources read env via ctx.env.<VAR>; if key missing, throw new MissingKeyError(VAR)
  //   (require from lib/AppError) so the cache layer degrades to seed/stale gracefully.
  async fetch(ctx) { /* ... */ return raw; },
  // Transform raw -> { ...widgetData (section 4), metrics: { <numeric keys for triggers> } }
  normalize(raw) { return { value, unit, delta, series, metrics: { changePct: 12.3 } }; },
  // Deterministic fallback used when fetch fails / key missing, so the UI always renders.
  sample() { return this.normalize(/* a small inline raw fixture */); },
  // Optional trigger rule:
  trigger: {
    metric: 'changePct',          // key inside normalize().metrics
    comparator: 'abs_gt',         // gt|lt|gte|lte|eq|abs_gt|abs_gte
    threshold: 10,
    sopId: 'SOP-A1',
    sopTitle: 'Treasury Reserve Review',
    assignee: 'founder',          // 'founder' | 'analyst' | 'admin'
    slaHours: 24,
    severity: 'high',             // 'low' | 'medium' | 'high'
  },
};
```
Rules: adapters never call `fetch` directly for the network — they receive `ctx.http`. Adapters never
touch the DB or cache. `sample()` must return realistic data so the dashboard is fully populated even
with zero API keys. Keep each adapter self-contained (single-file provider swap).

## 3. Endpoint registry / data the adapters target
The 25 sources, their real endpoints, auth, and trigger semantics are listed in
`docs/SOURCES.md` (the deploy/docs agent creates it from the brief). Adapter agents: use the real
endpoints below.

PUBLIC (no key):
- A1 CoinGecko  GET https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true  | widget kpi-sparkline | trigger abs_gt 10 changePct (Treasury Reserve Review, founder, 24h, high, sensitive:true)
- A2 Frankfurter GET https://api.frankfurter.dev/v1/latest?from=USD&to=EUR,GBP,INR  (+ /v1/{start}..{end} for 30d) | multiline | trigger abs_gt 2 wowPct (Cross-border Invoicing, analyst, 48h, medium)
- A3 World Bank GET https://api.worldbank.org/v2/country/IND/indicator/FP.CPI.TOTL.ZG?format=json | bar | trigger gt 2 inflationSd (Pricing Review, analyst, 72h, medium)
- A4 Hacker News GET https://hacker-news.firebaseio.com/v0/topstories.json then /v0/item/{id}.json (top 20) | table | trigger eq 1 clientOnFrontPage (Inbound Press Response, founder, 24h, high)
- A5 WHO GHO GET https://ghoapi.azureedge.net/api/NCDMORT3070 | heatmap | trigger gt 0 worsenedQoQ (Compliance Audit, analyst, 168h, low)
- A6 Open-Meteo GET https://air-quality-api.open-meteo.com/v1/air-quality?latitude=17.385&longitude=78.4867&hourly=pm2_5,pm10,ozone,us_aqi | gauge | trigger gt 200 aqi (WFH Advisory, analyst, 12h, high)
- A7 RandomUser GET https://randomuser.me/api/?results=24&nat=us,in,gb&seed=opsdash | avatar-grid | no trigger (HRIS seam)
- A8 Reddit GET https://www.reddit.com/r/Entrepreneur/top.json?limit=25&t=day (UA header) | wordcloud | trigger abs_gt 2 complaintSpike (Competitive Intelligence, analyst, 48h, medium)

KEYED (read env; MissingKeyError if absent):
- B1 Alpha Vantage GET https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=RELIANCE.BSE&apikey=${ALPHAVANTAGE_KEY} | ttl 21600 (25/DAY!) | candlestick | trigger abs_gt 5 changePct (Investor Update, founder, 24h, high, sensitive:true)
- B2 OpenWeatherMap GET https://api.openweathermap.org/data/2.5/weather?lat=17.385&lon=78.4867&appid=${OPENWEATHER_KEY}&units=metric | kpi-strip | trigger gt 0 severe (Business Continuity, analyst, 12h, high)
- B3 NewsAPI GET https://newsapi.org/v2/top-headlines?country=us&category=business (header X-Api-Key=${NEWSAPI_KEY}) | table | trigger gt 0 negativeMentions (Crisis Comms, founder, 24h, high)
- B4 FRED GET https://api.stlouisfed.org/fred/series/observations?series_id=CPIAUCSL&api_key=${FRED_KEY}&file_type=json | line | trigger gt 0.3 cpiMoM (Pricing Review, analyst, 72h, medium)
- B5 USAJOBS GET https://data.usajobs.gov/api/Search?Keyword=compliance&LocationName=Washington,DC (headers Authorization-Key=${USAJOBS_KEY}, User-Agent=${USAJOBS_EMAIL}, Host=data.usajobs.gov) | bar | trigger gt 0 newPostings (Capture Management, analyst, 168h, low)
- B6 Clockify GET https://api.clockify.me/api/v1/workspaces/${CLOCKIFY_WORKSPACE}/projects (header X-Api-Key=${CLOCKIFY_KEY}) | stacked-bar (use widget type 'bar') | trigger gte 90 utilization (Capacity Reallocation, admin, 72h, medium)
- B7 Notion POST https://api.notion.com/v1/databases/${NOTION_DB_ID}/query (Bearer ${NOTION_TOKEN}, Notion-Version: 2022-06-28) | kanban | trigger gt 0 unreviewed6mo (SOP Refresh, admin, 168h, medium)
- B8 Airtable GET https://api.airtable.com/v0/${AIRTABLE_BASE}/Clients (Bearer ${AIRTABLE_PAT}) | gauge | trigger gt 7 onboardingDays (Escalate Onboarding, founder, 48h, high)
- B9 Trello GET https://api.trello.com/1/members/me/boards?key=${TRELLO_KEY}&token=${TRELLO_TOKEN} | bar | trigger gt 3 blockedDays (Escalate Blocked, admin, 48h, medium)
- B10 AQICN GET https://api.waqi.info/feed/hyderabad/?token=${AQICN_TOKEN} | heatmap | trigger gt 150 aqi (WFH Advisory, analyst, 12h, high)

SCRAPERS (config-driven YAML; respect enabled flag, UA, rate, robots note):
- C1 SEC EDGAR GET https://data.sec.gov/submissions/CIK0000320193.json (UA from cfg: name+email) | timeline | trigger gt 0 new8K (Material Event Memo, founder, 24h, high)
- C2 HN Who-is-hiring: use https://hacker-news.firebaseio.com/v0/topstories.json approximation (or Algolia https://hn.algolia.com/api/v1/search?query=who%20is%20hiring&tags=story) | bar | trigger gt 0 clientHiring (Org Design Refresh, analyst, 168h, low)
- C3 RemoteOK GET https://remoteok.com/api (first element is legal notice — drop it) | bubble | no trigger (quarterly benchmark)
- C4 Wikipedia summary GET https://en.wikipedia.org/api/rest_v1/page/summary/Infosys (UA+contact) | kpi-tiles (use 'kpi-strip') | trigger gt 0 leadershipChange (Re-introduction Call, founder, 72h, medium)
- C5 Yahoo Finance: training-only/JS-rendered — adapter returns sample() candlestick with a note; attempt GET https://query1.finance.yahoo.com/v8/finance/chart/AAPL?range=1d&interval=5m if reachable | candlestick | trigger abs_gt 5 changePct (Market Event Memo, founder, 24h, high)
- C6 Wikipedia Pageviews GET https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia.org/all-access/user/Infosys/daily/20240101/20240131 (UA per policy) | line | trigger gt 2 viewsVsMean (Reputation Audit, analyst, 72h, low)
- C7 India MCA: download CSV (don't scrape portal) — adapter returns sample() table with note | table | trigger gt 0 statusChange (KYC/Compliance Refresh, admin, 168h, medium)

Every scraper YAML config has: `id`, `enabled: true`, `userAgent`, `robots: "<note>"`, `rateLimitPerSec`, `endpoint`, `notes`. The adapter loads its YAML via `config/sources.js` helper `loadScraperConfig(id)` (js-yaml) and honors `enabled:false` by returning `sample()`.

## 4. Canonical widget types + widgetData shapes (frontend renders these)
`WidgetRenderer` switches on `widget.type`. Build a component per type; unknown -> TableW/JSON fallback.
- `kpi`            -> { value, unit, delta, label }
- `kpi-sparkline`  -> { value, unit, delta, series:[{t,v}] }
- `kpi-strip`      -> { items:[{label,value,unit,delta}] }
- `line`           -> { series:[{name,points:[{x,y}]}], xLabel, yLabel }
- `multiline`      -> same as line (multiple series)
- `bar`            -> { categories:[...], series:[{name,values:[...]}], stacked?:bool }
- `table`          -> { columns:[{key,label}], rows:[{...}] }
- `heatmap`        -> { xLabels:[...], yLabels:[...], cells:[{x,y,value}] }
- `gauge`          -> { value, min, max, unit, thresholds:[{at,color}], forecast?:[{t,v}] }
- `avatar-grid`    -> { people:[{name,avatar,role,country}] }
- `wordcloud`      -> { words:[{text,weight}], rows?:[{...}] }
- `bubble`         -> { points:[{x,y,r,label}], xLabel, yLabel }
- `candlestick`    -> { candles:[{t,o,h,l,c}], news?:[{title}] }
- `timeline`       -> { events:[{date,title,detail,tag}] }
- `kanban`         -> { columns:[{name,cards:[{title,meta}]}] }
- `sankey`         -> { nodes:[{name}], links:[{source,target,value}] }
Common envelope returned by the API per widget (section 5). Every widget card shows a **Last Updated**
timestamp (LastUpdated.jsx) and a status pill (fresh/stale/error/restricted).

## 5. HTTP API contract (server)  — all under /api
Auth via HttpOnly cookie `sid` (SameSite=Lax; Secure when NODE_ENV=production). JSON bodies.
- `POST /api/auth/register` {email,password,name,role?} -> 201 {user:{id,name,email,role}} + Set-Cookie
- `POST /api/auth/login`    {email,password} -> 200 {user} + Set-Cookie  (401 on bad creds)
- `POST /api/auth/logout`   -> 204, clears cookie
- `GET  /api/auth/me`       -> 200 {user} | 401
- `GET  /api/widgets`       -> 200 [ WidgetPayload ]   (RBAC: sensitive widgets for non-founder/admin return data:null, status:'restricted')
- `GET  /api/widgets/:id`   -> 200 WidgetPayload | 404 | 403
- `POST /api/widgets/:id/refresh` -> 200 WidgetPayload (requireRole founder/admin)
- `GET  /api/actions`       -> 200 [ Action ]  (founder/admin see all; analyst sees only assignee=='analyst')
- `POST /api/actions/:id/ack`     -> 200 Action  (records ackAt; audit)
- `POST /api/actions/:id/resolve` -> 200 Action  (records resolvedAt, metSla = resolvedAt<=dueAt; audit)
- `GET  /api/triggers/rules`-> 200 [ Rule ]  (the derived rules table)
- `POST /api/refresh`       -> 202 {ran:n} (requireRole admin) runs engine + refresh now
- `GET  /api/health`        -> 200 {status:'ok', uptimeSec, version, checks:{db,cache,sourcesLoaded}}

WidgetPayload = {
  id, name, category, sensitive,
  widget:{type,title,question,description},
  data: <widgetData|null>, metrics:{...}|null,
  status:'fresh'|'stale'|'error'|'restricted', lastUpdated:ISO|null, error?:string
}
Action = {
  id, idemKey, sourceId, sopId, sopTitle, assignee, severity,
  metric, comparator, threshold, value,
  firedAt:ISO, dueAt:ISO, slaHours, status:'open'|'ack'|'done',
  ackAt:ISO|null, resolvedAt:ISO|null, metSla:bool|null, breached:bool
}
Rule = { sourceId, sopId, sopTitle, metric, comparator, threshold, assignee, slaHours, severity }

## 6. DB schema (server/src/db/db.js, better-sqlite3, file ./data/ops.sqlite)
Bootstrap these tables if absent + create indexes; seed two demo users on first run.
```
users(id TEXT PK, email TEXT UNIQUE, name TEXT, password_hash TEXT, role TEXT, created_at TEXT)
sessions(id TEXT PK, user_id TEXT, expires_at TEXT, created_at TEXT)             -- idx user_id
cache(key TEXT PK, value TEXT, fetched_at TEXT, ttl_seconds INTEGER, status TEXT)
actions(id TEXT PK, idem_key TEXT UNIQUE, source_id TEXT, sop_id TEXT, sop_title TEXT,
        assignee TEXT, severity TEXT, metric TEXT, comparator TEXT, threshold REAL, value REAL,
        fired_at TEXT, due_at TEXT, sla_hours INTEGER, status TEXT,
        ack_at TEXT, resolved_at TEXT, met_sla INTEGER)                          -- idx status, assignee
audit_log(id TEXT PK, ts TEXT, actor TEXT, action TEXT, entity TEXT, detail TEXT)
```
Seed users (password = env DEMO_PASSWORD or 'demo1234', bcrypt-hashed):
- founder@demo.local  role 'founder'  name 'Founder'
- analyst@demo.local  role 'analyst'  name 'Analyst'
(Also allow an 'admin' via register.) Document demo creds in README.

## 7. Cache contract (server/src/cache/cache.js)
```
getOrFetch(key, ttlSeconds, fetchFn, {force=false}) -> Promise<{value, lastUpdated, status}>
  // 'fresh' if within ttl; else stale-while-revalidate: return stale immediately + refresh in bg;
  // if no cached value, await fetchFn; on fetchFn throw, return last cached (status 'stale') or
  // status 'error' with value null. Never throws to caller.
peek(key) -> {value,lastUpdated,status}|null
set(key,value,ttlSeconds,status)   get(key)
```

## 8. fetchWithRetry (server/src/lib/fetchWithRetry.js)
```
http(url, { method, headers, body, timeoutMs=10000, parse='json' }) -> data
  // retry on 429 + 5xx: backoff 1s,2s,4s (capped 8s), max 4 attempts; honor Retry-After header.
  // fail FAST on other 4xx. AbortController timeout. Throw AppError(status,message) on final failure.
```

## 9. Trigger engine (server/src/triggers/engine.js)
```
evaluateAll() -> for each adapter with .trigger: read normalized metrics from cache (getOrFetch),
  compare metrics[trigger.metric] vs threshold using comparator; on breach -> upsert Action with
  idemKey = `${sourceId}:${sopId}:${YYYY-MM-DD}` (UTC day bucket) => exactly one card per event/day.
  Set firedAt=now, dueAt=now+slaHours*3600s, status 'open'. Insert audit row. Idempotent (UNIQUE idem_key, INSERT OR IGNORE).
comparator impl: gt,lt,gte,lte,eq,abs_gt(|v|>t),abs_gte(|v|>=t).
```
`triggers/rules.js` exports `getRules()` = adapters.filter(a=>a.trigger).map(...) in Rule shape.

## 10. Auth (server/src/auth/auth.js + middleware/auth.js)
bcryptjs (10 rounds). Sessions: random 32-byte hex id stored in sessions table, 7-day expiry, set as
HttpOnly cookie `sid`. `attachUser` middleware reads cookie -> loads session+user -> req.user.
`requireAuth` -> 401 if no req.user. `requireRole(...roles)` -> 403 if req.user.role not in roles.
RBAC: founder & admin are privileged; analyst restricted from `sensitive` widgets and sees only its
own actions. Object-level (IDOR) example documented in actions controller (assignee check).

## 11. Frontend behavior
- AuthContext fetches /api/auth/me on load; Login page posts /api/auth/login.
- Dashboard: top bar (role, logout, "Refresh all" for founder/admin, global Last-Updated),
  ActionQueue panel (the SOP queue — scannable, with SLA countdown + ack/resolve buttons),
  responsive grid of WidgetCards. Each WidgetCard: title, question badge, status pill, LastUpdated,
  and the chart via WidgetRenderer. Restricted widgets show a lock state. Errors never crash a card
  (error boundary / fallback). Poll /api/widgets every 60s.
- Use recharts for line/bar/area/scatter/composed; custom lightweight SVG/CSS for gauge, heatmap,
  wordcloud, sparkline, sankey(approx), candlestick(use recharts Bar/Composed or custom), timeline, kanban, avatar-grid.
- theme.css: clean dark-on-light operations look, system font, CSS grid, accessible (aria labels, semantic landmarks).

## 12. Run scripts (ROOT package.json, npm workspaces)
- `npm install` at ROOT installs both workspaces.
- `npm run dev` -> concurrently runs server (nodemon/node) on :4000 and vite on :5173.
- `npm run build` -> builds client. `npm start` -> NODE_ENV=production node server serving client/dist.
- `npm test` -> runs server tests (node --test).
Use the `concurrently` dev dependency at ROOT. Keep everything cross-platform (Windows). No bash-only scripts.

## 13. Non-negotiables (the rules that never bend)
- Every upstream API call goes through cache.getOrFetch. Adapters never hit network directly except via ctx.http.
- No secret in code or git — only .env (gitignored) / .env.example placeholders.
- Every widget shows a visible Last Updated timestamp + degrades gracefully (sample/stale) with zero keys.
- Swapping a provider = editing one adapter file.
- The whole app must `npm install` and `npm run dev` on Windows with NO API keys and show all 25 widgets populated from sample() data, with the Action Queue populated by the trigger engine.
