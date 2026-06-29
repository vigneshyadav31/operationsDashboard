# SOP-C2 — Org Design Refresh

| Field | Value |
|-------|-------|
| **SOP ID** | SOP-C2 |
| **Source** | C2 — HN "Who is hiring" (scraper/YAML-driven) |
| **Owner / Assignee** | Analyst |
| **SLA** | 168 hours (7 days) from trigger |
| **Severity** | Low |
| **Sensitivity** | Standard |

## Dashboard question answered
**Trigger** — "Is a client/competitor visibly hiring in a way that signals an org-design shift?"
(The widget's `question` badge is `trigger`.)

## Trigger condition (plain English)
Fire when a tracked company appears in the monthly "Who is hiring" signal — i.e. `clientHiring > 0`.
Visible hiring (especially role mix and seniority) reveals where a client or competitor is investing,
which informs org-design and headcount advice the Founder's Office gives.

## Inputs / Data source
- HN Algolia search for the "Who is hiring" story / its comments (or topstories approximation).
- Scraper config `c2.yaml` (enabled, User-Agent, robots note, rate limit) loaded as `ctx.cfg`.
- Normalized metric: `metrics.clientHiring` (count of tracked-company hiring mentions) — bar widget.

## Procedure
1. Open the C2 bar widget and identify which tracked companies are hiring and the role volume.
2. Categorise the roles (eng, GTM, ops, leadership) to infer the strategic direction.
3. Compare against the client's current org chart and stated plan; flag gaps or contradictions.
4. Draft an org-design observation: what the hiring implies and a recommended response.
5. For clients, prepare a talking point for the next strategy review (build vs. buy, structure).
6. For competitors, note the signal in the competitive-intel log (link to SOP-A8).
7. Share the observation with the relevant client owner or strategy lead.
8. Acknowledge and resolve the Action card with the observation filed.

## Escalation path
Analyst produces the observation. Significant strategic shifts (a client over- or under-hiring against
plan) escalate to the Founder for a direct client conversation. Competitor leadership hires escalate to
the Founder for positioning implications.

## Definition of done
Tracked-company hiring categorised and interpreted, an org-design observation drafted and shared with
the relevant owner, competitor signals logged, and the Action card resolved within 7 days.
