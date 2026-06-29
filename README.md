# The Operations Dashboard

A production-grade, full-stack **Founder's Office** dashboard. It pulls signals from 25 external
sources (markets, FX, news, weather/air quality, hiring, project tools, regulatory filings, and more),
renders each as a purpose-built widget, and — most importantly — turns those signals into an
**Action Queue**: a list of SOP-driven cards ("a thing happened → here's the playbook → here's who
owns it → here's the SLA clock").

> **Runs with ZERO API keys.** Every data source has a deterministic `sample()` fallback, so a fresh
> clone shows all 25 widgets fully populated and the Action Queue pre-filled by the trigger engine —
> no signup, no secrets. Add real keys later to go live, one source at a time.

---

## The three questions

Every widget answers one of three operational questions, shown as a badge on the card:

- **trigger** — "did something cross a line I should act on?" (fires Action Queue cards)
- **sla** — "is an obligation aging toward a deadline?"
- **refresh** — "what's the current state of the world?"

---

## Architecture in brief

```
┌─────────────┐         /api (HttpOnly cookie auth)        ┌────────────────────────────┐
│  React +    │  ───────────────────────────────────────► │  Express API (CommonJS)    │
│  Vite (5173)│  ◄───────────────────────────────────────  │  (4000)                    │
│  recharts   │            WidgetPayload / Action JSON      │                            │
└─────────────┘                                             │  ┌──────────────────────┐  │
                                                            │  │ 25 Source Adapters    │  │
   Dashboard                                                │  │ public / keyed /scrape│  │
   ├─ WidgetCard ─ WidgetRenderer ─ <chart per type>        │  └──────────┬───────────┘  │
   └─ ActionQueue (SLA countdown, ack/resolve)              │       ctx.http (retry)      │
                                                            │  ┌──────────▼───────────┐  │
                                                            │  │ Cache (SQLite TTL,    │  │
                                                            │  │ stale-while-revalidate│  │
                                                            │  └──────────┬───────────┘  │
                                                            │  ┌──────────▼───────────┐  │
                                                            │  │ Trigger Engine        │  │
                                                            │  │ metrics → Actions     │  │
                                                            │  └──────────┬───────────┘  │
                                                            │  ┌──────────▼───────────┐  │
                                                            │  │ better-sqlite3        │  │
                                                            │  │ users/sessions/cache/ │  │
                                                            │  │ actions/audit_log     │  │
                                                            │  └───────────────────────┘  │
                                                            │   node-cron refresh job     │
                                                            └────────────────────────────┘
```

**Key design rules** (full spec in [`CONTRACTS.md`](./CONTRACTS.md)):

- **Single-file provider swap.** Each source is one self-contained adapter (`fetch` → `normalize` →
  `sample` → optional `trigger`). Swapping a provider = editing one file.
- **Everything goes through the cache.** Adapters never touch the network directly (they use
  `ctx.http`, a retry/backoff wrapper) and never touch the DB. The cache layer does TTL +
  stale-while-revalidate and degrades to `sample()`/stale data so a widget *always* renders.
- **Idempotent triggers.** The engine compares a normalized metric against a threshold and upserts at
  most one Action card per source per UTC day (`idemKey = sourceId:sopId:YYYY-MM-DD`).
- **RBAC + sessions.** bcrypt-hashed passwords, server-side sessions in an HttpOnly cookie. `founder`
  and `admin` are privileged; `analyst` is restricted from `sensitive` widgets and sees only its own
  actions.

---

## Prerequisites

- **Node.js 20 or newer** (Node 22 recommended — the server uses global `fetch` and the built-in
  test runner). Check with `node -v`.
- **npm 9+** (ships with Node).
- A C/C++ toolchain is only needed if `better-sqlite3` has to compile from source; prebuilt binaries
  cover Node 20/22 on Windows, macOS, and Linux, so most users need nothing extra.
- _(Optional)_ **Docker** if you want to run the container instead of a local Node process.

---

## Quick start

```bash
# 1) Install both workspaces (server + client) from the repo root
npm install

# 2) Create your env file (it runs fine with everything left blank)
cp .env.example .env          # Windows PowerShell: copy .env.example .env

# 3) Start the API (:4000) and the Vite dev server (:5173) together
npm run dev

# 4) Open the app
#    http://localhost:5173
```

The Vite dev server proxies `/api` → `http://localhost:4000`, so the front end and back end work
together with no extra config. On first boot the server creates `server/data/ops.sqlite`, seeds the
two demo users, runs every adapter once (populating the cache from `sample()` data), and lets the
trigger engine fill the Action Queue.

### Demo credentials

The database is seeded with two ready-to-use accounts (password is `DEMO_PASSWORD`, default
`demo1234`):

| Email                | Password   | Role      | Sees                                                        |
| -------------------- | ---------- | --------- | ----------------------------------------------------------- |
| `founder@demo.local` | `demo1234` | founder   | Everything, incl. **sensitive** widgets; all actions        |
| `analyst@demo.local` | `demo1234` | analyst   | Non-sensitive widgets (sensitive show a lock); own actions  |

You can also self-register an **admin** via the API (`POST /api/auth/register` with `role: "admin"`);
admins are privileged like founders and can run the global refresh.

> **No API keys required.** With a blank `.env`, all 25 widgets render from deterministic sample data
> and the Action Queue is populated by the trigger engine. Keys only swap sample data for live data.

---

## Environment variables

All variables live in `.env` (copied from `.env.example`, which is the authoritative list). `.env` is
git-ignored — **never commit secrets**. Leave any key blank to keep that source on `sample()` data.

### Core configuration

| Variable         | Default                   | What it does                                              |
| ---------------- | ------------------------- | -------------------------------------------------------- |
| `PORT`           | `4000`                    | Port the API listens on.                                 |
| `NODE_ENV`       | `development`             | `development` \| `production` \| `test`.                 |
| `SESSION_SECRET` | _(dev fallback)_          | Hardens session handling. Set a random string in prod.   |
| `DEMO_PASSWORD`  | `demo1234`                | Password for the seeded demo users.                      |
| `REFRESH_CRON`   | `*/10 * * * *`            | node-cron schedule for the background refresh job.       |
| `CORS_ORIGIN`    | `http://localhost:5173`   | Comma-separated allowed browser origins.                 |

### Provider keys (all optional — blank ⇒ sample data)

| Variable             | Source | Where to get it                                                                        |
| -------------------- | ------ | -------------------------------------------------------------------------------------- |
| _(none)_             | A1–A8  | **Public sources** (CoinGecko, Frankfurter, World Bank, Hacker News, WHO, Open-Meteo, RandomUser, Reddit) need no key. |
| `ALPHAVANTAGE_KEY`   | B1     | Free key at <https://www.alphavantage.co/support/#api-key> (⚠️ 25 requests/**day**).   |
| `OPENWEATHER_KEY`    | B2     | Free key at <https://home.openweathermap.org/api_keys>.                                |
| `NEWSAPI_KEY`        | B3     | Free key at <https://newsapi.org/register> (sent as `X-Api-Key`).                      |
| `FRED_KEY`           | B4     | Free key at <https://fred.stlouisfed.org/docs/api/api_key.html>.                       |
| `USAJOBS_KEY`        | B5     | Request at <https://developer.usajobs.gov/apirequest/> (`Authorization-Key` header).   |
| `USAJOBS_EMAIL`      | B5     | The contact email you registered with USAJOBS (sent as `User-Agent`).                  |
| `CLOCKIFY_KEY`       | B6     | Profile → API at <https://app.clockify.me/user/settings>.                              |
| `CLOCKIFY_WORKSPACE` | B6     | Your Clockify workspace id (from the workspace URL / API).                             |
| `NOTION_TOKEN`       | B7     | Internal integration token at <https://www.notion.so/my-integrations>.                 |
| `NOTION_DB_ID`       | B7     | The 32-char database id from the Notion database URL.                                   |
| `AIRTABLE_PAT`       | B8     | Personal access token at <https://airtable.com/create/tokens>.                          |
| `AIRTABLE_BASE`      | B8     | Base id (starts `app…`) from <https://airtable.com/api>.                                |
| `TRELLO_KEY`         | B9     | API key at <https://trello.com/power-ups/admin> → "API Key".                            |
| `TRELLO_TOKEN`       | B9     | Token generated from the same page (authorize your key).                                |
| `AQICN_TOKEN`        | B10    | Free token at <https://aqicn.org/data-platform/token/>.                                 |
| `SEC_EDGAR_UA`       | C1     | No signup — set a descriptive `User-Agent` per SEC policy: `"Your Name you@email.com"`. |

> The scrapers **C2–C7** use public endpoints and identify themselves via per-source YAML config
> (`server/src/sources/scrapers/config/*.yaml`: `userAgent`, `robots` note, `rateLimitPerSec`). Set
> `enabled: false` in a YAML file to force that scraper onto sample data.

### Adding a real key

1. Open `.env` and paste the value next to the matching variable (e.g. `OPENWEATHER_KEY=abc123`).
2. Restart `npm run dev` (or `docker compose up -d` for the container).
3. That source now fetches live data; if the key is wrong or the upstream is down, the cache layer
   transparently falls back to the last good value or `sample()` — the widget never breaks.

Because every source is a single self-contained adapter file, swapping a provider entirely (say,
replacing the FX source) means editing exactly one file under `server/src/sources/**`.

---

## Project structure

```
operationsDashboard/
├─ package.json              # npm workspaces ["server","client"] + dev/build/start/test scripts
├─ .env.example              # ALL env vars (copy to .env)
├─ README.md                 # you are here
├─ CONTRACTS.md              # the authoritative interface spec
├─ Dockerfile                # multi-stage build → node:22-slim runtime
├─ docker-compose.yml        # single 'dashboard' service + persistent SQLite volume
├─ .github/workflows/ci.yml  # install → build client → server tests → docker build
├─ Operations-Dashboard-Answer-Key.pdf   # reference walkthrough / answer key
├─ docs/                     # ARCHITECTURE.md + 25 SOP one-pagers (SOP-A1 … SOP-C7)
├─ server/                   # Express API (CommonJS, Node 22)
│  ├─ src/
│  │  ├─ index.js            # app entry: routes, health, serves client/dist in prod
│  │  ├─ config/             # env.js (typed config), sources.js (adapter registry loader)
│  │  ├─ lib/                # fetchWithRetry, logger, AppError, adapterContext
│  │  ├─ cache/cache.js      # SQLite TTL cache w/ stale-while-revalidate
│  │  ├─ db/db.js            # better-sqlite3 connection, schema bootstrap, seed
│  │  ├─ gateway/            # rate limiting + entry guard
│  │  ├─ middleware/         # auth (RBAC), validate (zod), errorHandler
│  │  ├─ auth/auth.js        # bcrypt + sessions
│  │  ├─ triggers/           # rules.js (rules table) + engine.js (evaluateAll)
│  │  ├─ controllers/        # widgets / actions / auth
│  │  ├─ routes/             # /api/widgets /api/actions /api/auth /api/health
│  │  ├─ jobs/refresh.js     # node-cron scheduled refresh + on-startup run
│  │  └─ sources/            # 25 adapters: public/a1..a8, keyed/b1..b10, scrapers/c1..c7 (+YAML)
│  ├─ data/                  # ops.sqlite (created at runtime, git-ignored)
│  └─ tests/                 # unit + integration (node:test + supertest)
└─ client/                   # React + Vite + recharts (ESM)
   ├─ vite.config.js         # dev proxy /api → :4000
   ├─ index.html
   └─ src/
      ├─ main.jsx, App.jsx, api.js, theme.css
      ├─ auth/AuthContext.jsx
      ├─ pages/              # Login.jsx, Dashboard.jsx
      └─ components/         # WidgetCard, WidgetRenderer, LastUpdated, ActionQueue, Nav
         └─ widgets/         # Kpi, Sparkline, LineW, BarW, TableW, HeatmapW, GaugeW,
                             # AvatarGrid, WordCloud, BubbleW, CandlestickW, TimelineW, KanbanW, SankeyW
```

---

## npm scripts (run from the repo root)

| Script            | What it does                                                                      |
| ----------------- | -------------------------------------------------------------------------------- |
| `npm install`     | Installs both workspaces (server + client).                                      |
| `npm run dev`     | Runs the API (`:4000`) and the Vite dev server (`:5173`) concurrently.           |
| `npm run build`   | Builds the client into `client/dist`.                                            |
| `npm start`       | `NODE_ENV=production` — serves the API **and** the built client from `:4000`.     |
| `npm test`        | Runs the server test suite with the built-in Node test runner.                   |

**Production preview locally:**

```bash
npm run build
npm start
# open http://localhost:4000  (API + built client served from one origin)
```

---

## Running the tests

The server tests use Node's built-in runner (`node:test` + `node:assert`) plus `supertest` for the
HTTP integration tests — no extra test framework.

```bash
npm test
# or, directly inside the server workspace:
cd server && node --test
```

Tests run with `NODE_ENV=test`, which prevents `server/src/index.js` from auto-starting a listener, so
the suite can import the app and drive it with `supertest`. CI runs exactly this and **fails the job
on any failing test**.

---

## API at a glance

All endpoints are under `/api`; auth is via the HttpOnly `sid` cookie. Full payload shapes are in
[`CONTRACTS.md`](./CONTRACTS.md) §5.

| Method & path                     | Purpose                                                              |
| --------------------------------- | ------------------------------------------------------------------- |
| `POST /api/auth/register`         | Create a user (`role?`), set session cookie.                        |
| `POST /api/auth/login`            | Log in (401 on bad creds).                                          |
| `POST /api/auth/logout`           | Clear the session.                                                  |
| `GET  /api/auth/me`               | Current user (401 if not logged in).                                |
| `GET  /api/widgets`               | All widget payloads (sensitive ones masked for non-privileged).     |
| `GET  /api/widgets/:id`           | One widget payload.                                                 |
| `POST /api/widgets/:id/refresh`   | Force-refresh a widget (founder/admin).                             |
| `GET  /api/actions`               | Action Queue (analyst sees only its own).                          |
| `POST /api/actions/:id/ack`       | Acknowledge an action.                                              |
| `POST /api/actions/:id/resolve`   | Resolve an action (records SLA result).                            |
| `GET  /api/triggers/rules`        | The derived rules table.                                           |
| `POST /api/refresh`               | Run the engine + refresh now (admin).                              |
| `GET  /api/health`                | `{ status, uptimeSec, version, checks:{db,cache,sourcesLoaded} }`.  |

---

## Deployment

The server serves the built client in production, so deploying is "build the client, run the server."

### Docker (recommended — self-contained)

```bash
# Build and run the whole app in one container
docker compose up --build
# → http://localhost:4000
```

The `Dockerfile` is multi-stage: stage 1 builds the Vite client; stage 2 is a slim `node:22` image
with only the server's production dependencies plus `client/dist`. `docker-compose.yml` maps
`4000:4000`, loads `.env`, and mounts a named volume at `/app/server/data` so the SQLite database
(users, cache, Action Queue) survives restarts. The image runs as the non-root `node` user.

```bash
# Plain Docker, if you prefer:
docker build -t operations-dashboard .
docker run -p 4000:4000 --env-file .env -v dashboard-data:/app/server/data operations-dashboard
```

### Railway / Render

Both can build straight from the `Dockerfile`:

- **Build:** use the repo's Dockerfile (no custom build command needed).
- **Start:** `node server/src/index.js` (the image's default `CMD`).
- **Port:** the platform injects `PORT`; the server already reads `process.env.PORT` (default 4000).
  Expose `4000` (or let the platform map it).
- **Env vars:** add anything from `.env.example` you want live; everything is optional.
- **Persistence:** attach a persistent disk/volume mounted at `/app/server/data` so the SQLite file
  isn't wiped on redeploy.
- **Health check:** point it at `GET /api/health`.

_Without Docker_ (Node buildpack): set build command `npm install && npm run build` and start command
`npm start`.

### Vercel

Vercel is a great fit for the **front end**. Deploy the `client/` directory as a Vite project (build
`npm run build`, output `client/dist`) and deploy the **API separately** (Railway/Render/Fly or a
container host), then point the client at it. The repo is structured so the Express server is the
single long-running process; serverless functions are not required.

---

## Reference docs

- **[`CONTRACTS.md`](./CONTRACTS.md)** — the single source of truth for every interface: adapter
  contract, widget shapes, HTTP API, DB schema, cache, trigger engine, auth, and the non-negotiables.
  Read this first if you're extending the app.
- **[`Operations-Dashboard-Answer-Key.pdf`](./Operations-Dashboard-Answer-Key.pdf)** — the reference
  walkthrough / answer key for the build.
- **`docs/ARCHITECTURE.md`** and **`docs/sops/SOP-A1.md … SOP-C7.md`** — the architecture deep-dive
  and the 25 SOP one-pagers each Action Queue card links to.

---

## Troubleshooting

- **`better-sqlite3` failed to build on install** — ensure you're on Node 20/22 (`node -v`). If a
  prebuilt binary isn't available for your platform, install a build toolchain (Windows: "Desktop
  development with C++" via Visual Studio Build Tools; macOS: `xcode-select --install`; Debian/Ubuntu:
  `sudo apt-get install -y python3 make g++`), then re-run `npm install`.
- **Port already in use** — change `PORT` in `.env` (API) and/or the `server.port` in
  `client/vite.config.js` (dev server).
- **Login fails with the demo users** — delete `server/data/ops.sqlite*` and restart; the server
  re-seeds the demo accounts with the current `DEMO_PASSWORD`.
- **A widget shows "error" / "stale"** — that source's upstream is unreachable and no key is set; it's
  expected to fall back to sample/stale data. Add the relevant key (see the table above) for live data.

---

Built for a Founder's Office: see the world, know the playbook, never miss an SLA.
