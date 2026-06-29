# SOP-C6 — Reputation Audit

| Field | Value |
|-------|-------|
| **SOP ID** | SOP-C6 |
| **Source** | C6 — Wikipedia Pageviews (Infosys, scraper/YAML-driven) |
| **Owner / Assignee** | Analyst |
| **SLA** | 72 hours from trigger |
| **Severity** | Low |
| **Sensitivity** | Standard |

## Dashboard question answered
**Trigger** — "Has public attention to a tracked entity spiked enough to warrant a reputation audit?"
(The widget's `question` badge is `trigger`.)

## Trigger condition (plain English)
Fire when daily pageviews exceed **2×** the trailing mean — i.e. `viewsVsMean > 2`. A surge in
encyclopedic interest usually trails a news event (positive or negative), so it is the cue to check
whether the entity's public reputation needs attention.

## Inputs / Data source
- Wikimedia Pageviews API (per-article daily views for the tracked entity) via UA per policy.
- Scraper config `c6.yaml` (enabled, User-Agent per policy, robots note, rate limit) as `ctx.cfg`.
- Normalized metric: `metrics.viewsVsMean` (latest day's views ÷ trailing mean) — line widget.

## Procedure
1. Open the C6 line widget and confirm the spike magnitude and the day it occurred.
2. Identify the likely driver (correlate with HN (A4), Reddit (A8), and news (B3)).
3. Determine sentiment of the driving event (positive milestone vs. negative incident).
4. If negative, assess reputational exposure and whether a comms response is needed (link SOP-B3).
5. If positive, capture the moment for marketing/amplification where appropriate.
6. Summarise the audit: cause, sentiment, exposure, and recommended action.
7. Share the summary with the relevant owner (client or internal marketing/comms).
8. Acknowledge and resolve the Action card with the audit summary filed.

## Escalation path
Analyst runs the audit. A negative driver with material reputational risk escalates to the Founder and
into Crisis Comms (SOP-B3). If the spike concerns a client, brief that client's owner before any public
action.

## Definition of done
The pageview spike's driver and sentiment identified, reputational exposure assessed, a recommended
action documented and shared with the right owner (and escalated to comms if negative), and the Action
card resolved within 72h.
