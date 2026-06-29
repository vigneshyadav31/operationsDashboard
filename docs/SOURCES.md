# SOURCES — the 25-signal registry

Authoritative endpoint registry for The Operations Dashboard, built from **[`../CONTRACTS.md`](../CONTRACTS.md) §3**.
Each row is one Source Adapter (`server/src/sources/**`) conforming to *CONTRACTS §2*. The app runs with
**zero keys**: every adapter has a deterministic `sample()` fixture, and keyed/scraper sources degrade to
that fixture when their key or config is absent.

Legend:
- **Category** — `public` (no key), `keyed` (env var key, `MissingKeyError` if absent), `scraper` (YAML-config driven).
- **Auth** — what authenticates the upstream call (env var names match `config/env.js` `keys`).
- **TTL** — cache time-to-live in seconds (`adapter.ttlSeconds`); default 300 unless noted.
- **Widget** — canonical widget type (*CONTRACTS §4*). Note: `stacked-bar`/`kpi-tiles` map to `bar`/`kpi-strip`.
- **SOP trigger** — `metric comparator threshold` → SOP (assignee, SLA, severity). "—" = no trigger.
- **Sensitive** — founder/admin-only widget (non-priv users get `status:'restricted'`).

---

## PUBLIC sources (A1–A8) — no API key required

| ID | Name | Category | Endpoint | Auth | TTL | Widget | SOP trigger |
|----|------|----------|----------|------|-----|--------|-------------|
| **A1** | CoinGecko — crypto treasury | public · **sensitive** | `GET https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true` | none | 300 | `kpi-sparkline` | `changePct abs_gt 10` → **SOP-A1 Treasury Reserve Review** (founder, 24h, high) |
| **A2** | Frankfurter — FX rates | public | `GET https://api.frankfurter.dev/v1/latest?from=USD&to=EUR,GBP,INR` (+ `/v1/{start}..{end}` for 30d) | none | 300 | `multiline` | `wowPct abs_gt 2` → **SOP-A2 Cross-border Invoicing** (analyst, 48h, medium) |
| **A3** | World Bank — India CPI inflation | public | `GET https://api.worldbank.org/v2/country/IND/indicator/FP.CPI.TOTL.ZG?format=json` | none | 300 | `bar` | `inflationSd gt 2` → **SOP-A3 Pricing Review** (analyst, 72h, medium) |
| **A4** | Hacker News — top stories | public | `GET https://hacker-news.firebaseio.com/v0/topstories.json` then `/v0/item/{id}.json` (top 20) | none | 300 | `table` | `clientOnFrontPage eq 1` → **SOP-A4 Inbound Press Response** (founder, 24h, high) |
| **A5** | WHO GHO — NCD mortality | public | `GET https://ghoapi.azureedge.net/api/NCDMORT3070` | none | 300 | `heatmap` | `worsenedQoQ gt 0` → **SOP-A5 Compliance Audit** (analyst, 168h, low) |
| **A6** | Open-Meteo — air quality (Hyderabad) | public | `GET https://air-quality-api.open-meteo.com/v1/air-quality?latitude=17.385&longitude=78.4867&hourly=pm2_5,pm10,ozone,us_aqi` | none | 300 | `gauge` | `aqi gt 200` → **SOP-A6 WFH Advisory** (analyst, 12h, high) |
| **A7** | RandomUser — HRIS seam | public | `GET https://randomuser.me/api/?results=24&nat=us,in,gb&seed=opsdash` | none | 300 | `avatar-grid` | — (no trigger) |
| **A8** | Reddit r/Entrepreneur — sentiment | public | `GET https://www.reddit.com/r/Entrepreneur/top.json?limit=25&t=day` (User-Agent header) | none | 300 | `wordcloud` | `complaintSpike abs_gt 2` → **SOP-A8 Competitive Intelligence** (analyst, 48h, medium) |

---

## KEYED sources (B1–B10) — env-var key; `MissingKeyError` → `sample()` fallback

| ID | Name | Category | Endpoint | Auth | TTL | Widget | SOP trigger |
|----|------|----------|----------|------|-----|--------|-------------|
| **B1** | Alpha Vantage — RELIANCE.BSE quote | keyed · **sensitive** | `GET https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=RELIANCE.BSE&apikey=${ALPHAVANTAGE_KEY}` | `ALPHAVANTAGE_KEY` (query) | 21600 (25/DAY!) | `candlestick` | `changePct abs_gt 5` → **SOP-B1 Investor Update** (founder, 24h, high) |
| **B2** | OpenWeatherMap — Hyderabad weather | keyed | `GET https://api.openweathermap.org/data/2.5/weather?lat=17.385&lon=78.4867&appid=${OPENWEATHER_KEY}&units=metric` | `OPENWEATHER_KEY` (query) | 300 | `kpi-strip` | `severe gt 0` → **SOP-B2 Business Continuity** (analyst, 12h, high) |
| **B3** | NewsAPI — US business headlines | keyed | `GET https://newsapi.org/v2/top-headlines?country=us&category=business` | `NEWSAPI_KEY` (X-Api-Key header) | 300 | `table` | `negativeMentions gt 0` → **SOP-B3 Crisis Comms** (founder, 24h, high) |
| **B4** | FRED — US CPI (CPIAUCSL) | keyed | `GET https://api.stlouisfed.org/fred/series/observations?series_id=CPIAUCSL&api_key=${FRED_KEY}&file_type=json` | `FRED_KEY` (query) | 300 | `line` | `cpiMoM gt 0.3` → **SOP-B4 Pricing Review** (analyst, 72h, medium) |
| **B5** | USAJOBS — compliance postings | keyed | `GET https://data.usajobs.gov/api/Search?Keyword=compliance&LocationName=Washington,DC` | `USAJOBS_KEY` (Authorization-Key), `USAJOBS_EMAIL` (User-Agent), Host header | 300 | `bar` | `newPostings gt 0` → **SOP-B5 Capture Management** (analyst, 168h, low) |
| **B6** | Clockify — project utilization | keyed | `GET https://api.clockify.me/api/v1/workspaces/${CLOCKIFY_WORKSPACE}/projects` | `CLOCKIFY_KEY` (X-Api-Key header) | 300 | `bar` (stacked-bar) | `utilization gte 90` → **SOP-B6 Capacity Reallocation** (admin, 72h, medium) |
| **B7** | Notion — SOP review board | keyed | `POST https://api.notion.com/v1/databases/${NOTION_DB_ID}/query` | `NOTION_TOKEN` (Bearer), Notion-Version 2022-06-28 | 300 | `kanban` | `unreviewed6mo gt 0` → **SOP-B7 SOP Refresh** (admin, 168h, medium) |
| **B8** | Airtable — client onboarding | keyed | `GET https://api.airtable.com/v0/${AIRTABLE_BASE}/Clients` | `AIRTABLE_PAT` (Bearer) | 300 | `gauge` | `onboardingDays gt 7` → **SOP-B8 Escalate Onboarding** (founder, 48h, high) |
| **B9** | Trello — delivery boards | keyed | `GET https://api.trello.com/1/members/me/boards?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}` | `TRELLO_KEY` + `TRELLO_TOKEN` (query) | 300 | `bar` | `blockedDays gt 3` → **SOP-B9 Escalate Blocked** (admin, 48h, medium) |
| **B10** | AQICN / WAQI — Hyderabad AQI | keyed | `GET https://api.waqi.info/feed/hyderabad/?token=${AQICN_TOKEN}` | `AQICN_TOKEN` (query) | 300 | `heatmap` | `aqi gt 150` → **SOP-B10 WFH Advisory** (analyst, 12h, high) |

---

## SCRAPER sources (C1–C7) — YAML-config driven; honour `enabled`, `userAgent`, `rateLimitPerSec`, robots note

| ID | Name | Category | Endpoint | Auth | TTL | Widget | SOP trigger |
|----|------|----------|----------|------|-----|--------|-------------|
| **C1** | SEC EDGAR — filings (Apple CIK) | scraper | `GET https://data.sec.gov/submissions/CIK0000320193.json` | User-Agent from `cfg` (name + email) | 300 | `timeline` | `new8K gt 0` → **SOP-C1 Material Event Memo** (founder, 24h, high) |
| **C2** | HN "Who is hiring" — hiring signal | scraper | `GET https://hn.algolia.com/api/v1/search?query=who%20is%20hiring&tags=story` (or topstories approx) | User-Agent from `cfg` | 300 | `bar` | `clientHiring gt 0` → **SOP-C2 Org Design Refresh** (analyst, 168h, low) |
| **C3** | RemoteOK — comp benchmark | scraper | `GET https://remoteok.com/api` (drop first element = legal notice) | User-Agent from `cfg` | 300 | `bubble` | — (quarterly benchmark, no trigger) |
| **C4** | Wikipedia summary — Infosys | scraper | `GET https://en.wikipedia.org/api/rest_v1/page/summary/Infosys` | User-Agent + contact from `cfg` | 300 | `kpi-strip` (kpi-tiles) | `leadershipChange gt 0` → **SOP-C4 Re-introduction Call** (founder, 72h, medium) |
| **C5** | Yahoo Finance — AAPL chart | scraper | `GET https://query1.finance.yahoo.com/v8/finance/chart/AAPL?range=1d&interval=5m` (JS-rendered; `sample()`-first) | User-Agent from `cfg` | 300 | `candlestick` | `changePct abs_gt 5` → **SOP-C5 Market Event Memo** (founder, 24h, high) |
| **C6** | Wikipedia Pageviews — Infosys | scraper | `GET https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia.org/all-access/user/Infosys/daily/20240101/20240131` | User-Agent per policy from `cfg` | 300 | `line` | `viewsVsMean gt 2` → **SOP-C6 Reputation Audit** (analyst, 72h, low) |
| **C7** | India MCA — corporate status | scraper | CSV download (no portal scrape; `sample()`-first table) | User-Agent from `cfg` | 300 | `table` | `statusChange gt 0` → **SOP-C7 KYC/Compliance Refresh** (admin, 168h, medium) |

---

## Trigger rules summary (derived `Rule` table → `GET /api/triggers/rules`)

Every adapter with a `.trigger` becomes a Rule
`{ sourceId, sopId, sopTitle, metric, comparator, threshold, assignee, slaHours, severity }`
(*CONTRACTS §5*). The 23 triggered sources (A7 and C3 have none):

| Source | SOP | Metric | Comparator | Threshold | Assignee | SLA (h) | Severity |
|--------|-----|--------|-----------|-----------|----------|---------|----------|
| A1 | SOP-A1 Treasury Reserve Review | changePct | abs_gt | 10 | founder | 24 | high |
| A2 | SOP-A2 Cross-border Invoicing | wowPct | abs_gt | 2 | analyst | 48 | medium |
| A3 | SOP-A3 Pricing Review | inflationSd | gt | 2 | analyst | 72 | medium |
| A4 | SOP-A4 Inbound Press Response | clientOnFrontPage | eq | 1 | founder | 24 | high |
| A5 | SOP-A5 Compliance Audit | worsenedQoQ | gt | 0 | analyst | 168 | low |
| A6 | SOP-A6 WFH Advisory | aqi | gt | 200 | analyst | 12 | high |
| A8 | SOP-A8 Competitive Intelligence | complaintSpike | abs_gt | 2 | analyst | 48 | medium |
| B1 | SOP-B1 Investor Update | changePct | abs_gt | 5 | founder | 24 | high |
| B2 | SOP-B2 Business Continuity | severe | gt | 0 | analyst | 12 | high |
| B3 | SOP-B3 Crisis Comms | negativeMentions | gt | 0 | founder | 24 | high |
| B4 | SOP-B4 Pricing Review | cpiMoM | gt | 0.3 | analyst | 72 | medium |
| B5 | SOP-B5 Capture Management | newPostings | gt | 0 | analyst | 168 | low |
| B6 | SOP-B6 Capacity Reallocation | utilization | gte | 90 | admin | 72 | medium |
| B7 | SOP-B7 SOP Refresh | unreviewed6mo | gt | 0 | admin | 168 | medium |
| B8 | SOP-B8 Escalate Onboarding | onboardingDays | gt | 7 | founder | 48 | high |
| B9 | SOP-B9 Escalate Blocked | blockedDays | gt | 3 | admin | 48 | medium |
| B10 | SOP-B10 WFH Advisory | aqi | gt | 150 | analyst | 12 | high |
| C1 | SOP-C1 Material Event Memo | new8K | gt | 0 | founder | 24 | high |
| C2 | SOP-C2 Org Design Refresh | clientHiring | gt | 0 | analyst | 168 | low |
| C4 | SOP-C4 Re-introduction Call | leadershipChange | gt | 0 | founder | 72 | medium |
| C5 | SOP-C5 Market Event Memo | changePct | abs_gt | 5 | founder | 24 | high |
| C6 | SOP-C6 Reputation Audit | viewsVsMean | gt | 2 | analyst | 72 | low |
| C7 | SOP-C7 KYC/Compliance Refresh | statusChange | gt | 0 | admin | 168 | medium |

Comparators (*CONTRACTS §9*): `gt`, `lt`, `gte`, `lte`, `eq`, `abs_gt` (`|v|>t`), `abs_gte` (`|v|>=t`).
Each breach creates **one** Action card per source/SOP per UTC day (idempotent on
`idemKey = ${sourceId}:${sopId}:${YYYY-MM-DD}`). The full procedures live in [`sops/`](sops/).
