# SOP-C4 — Re-introduction Call

| Field | Value |
|-------|-------|
| **SOP ID** | SOP-C4 |
| **Source** | C4 — Wikipedia summary (Infosys, scraper/YAML-driven) |
| **Owner / Assignee** | Founder |
| **SLA** | 72 hours from trigger |
| **Severity** | Medium |
| **Sensitivity** | Standard |

## Dashboard question answered
**Trigger** — "Has a leadership change at a tracked company occurred that warrants a re-introduction?"
(The widget's `question` badge is `trigger`.)

## Trigger condition (plain English)
Fire when a leadership change is detected for a tracked company — i.e. `leadershipChange > 0` (a CEO/
key-exec change surfaced in the company summary). A new decision-maker is the moment to re-establish the
relationship before a competitor does.

## Inputs / Data source
- Wikipedia REST summary for the tracked company (extract, key-people fields) via configured UA.
- Scraper config `c4.yaml` (enabled, User-Agent + contact, robots note, rate limit) as `ctx.cfg`.
- Normalized metric: `metrics.leadershipChange` (1 when a leadership delta is detected) — kpi-strip.

## Procedure
1. Open the C4 widget and confirm the leadership change (who left, who joined, when).
2. Verify against a second source (company press release / news) to avoid a stale-summary false positive.
3. Pull our relationship history with the company (prior contacts, deals, warm intros).
4. Identify a warm path to the new leader (mutual connection, advisor, prior champion).
5. Draft a short, value-first re-introduction note tailored to the new leader's mandate.
6. Send the outreach or request the warm intro; log it in the CRM.
7. Schedule a follow-up if no response within a set window.
8. Acknowledge and resolve the Action card with the outreach logged.

## Escalation path
Founder owns the relationship. If the company is a strategic account or large opportunity, prepare a
tailored briefing and consider an in-person/exec-sponsor approach. If our prior relationship ended
poorly, escalate to the Founder to decide whether and how to re-engage.

## Definition of done
The leadership change verified, relationship history reviewed, a warm re-introduction sent (or intro
requested) and logged in the CRM, a follow-up scheduled, and the Action card resolved within 72h.
