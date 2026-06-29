# SOP-C3 — Compensation Benchmark Review

| Field | Value |
|-------|-------|
| **SOP ID** | SOP-C3 |
| **Source** | C3 — RemoteOK (comp/role benchmark, scraper/YAML-driven) |
| **Owner / Assignee** | Analyst |
| **SLA** | Quarterly cadence (periodic; no event SLA) |
| **Severity** | Low |
| **Sensitivity** | Standard |

## Dashboard question answered
**Refresh** — "What is the current external compensation/role benchmark for our roles?"
(The widget's `question` badge is `refresh`; C3 carries **no automated trigger** in CONTRACTS §3 — it
is a **quarterly benchmark**, run on a calendar cadence rather than fired by a threshold.)

## Trigger condition (plain English)
None automated. C3 has no `trigger` in the source registry. This SOP runs **once per quarter** (or when
the Founder requests a comp review) to refresh external salary/role benchmarks used in offers, raises,
and client org-design advice.

## Inputs / Data source
- RemoteOK `api` feed (the first element — a legal notice — is dropped by the adapter) — bubble widget
  of role vs. compensation vs. demand.
- Scraper config `c3.yaml` (enabled, User-Agent, robots note, rate limit) loaded as `ctx.cfg`.
- Internal salary bands and the current open-roles list.

## Procedure
1. Open the C3 bubble widget; review role clusters by compensation and apparent demand.
2. Map external benchmarks to our internal role bands and open roles.
3. Identify bands that are materially below or above market.
4. Recommend band adjustments and flag any retention risks for under-paid critical roles.
5. For clients we advise, prepare benchmark talking points relevant to their roles.
6. Document the benchmark snapshot with date and source for auditability.
7. Schedule the next quarterly review.

## Escalation path
Analyst produces the benchmark. Band changes with budget impact escalate to the Founder/admin for
approval. Acute retention risk on a critical role escalates to the Founder immediately rather than
waiting for the quarterly cycle.

## Definition of done
A dated benchmark snapshot produced and mapped to internal bands, recommended adjustments and retention
flags documented, client talking points prepared where relevant, and the next quarterly review
scheduled.
