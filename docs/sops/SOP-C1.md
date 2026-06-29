# SOP-C1 — Material Event Memo

| Field | Value |
|-------|-------|
| **SOP ID** | SOP-C1 |
| **Source** | C1 — SEC EDGAR (filings, scraper/YAML-driven) |
| **Owner / Assignee** | Founder |
| **SLA** | 24 hours from trigger |
| **Severity** | High |
| **Sensitivity** | Standard |

## Dashboard question answered
**Trigger** — "Has a tracked company filed a material event (8-K) that needs a memo?"
(The widget's `question` badge is `trigger`.)

## Trigger condition (plain English)
Fire when a new Form 8-K (material event) appears in a tracked company's EDGAR filings — i.e.
`new8K > 0`. An 8-K signals a material corporate event (acquisition, leadership change, results,
restructuring) that may affect a client, competitor, or investment, warranting a short internal memo.

## Inputs / Data source
- SEC EDGAR submissions JSON for the tracked CIK (filing type, date, accession) via configured UA.
- Scraper config `c1.yaml` (enabled flag, User-Agent, robots note, rate limit) loaded as `ctx.cfg`.
- Normalized metric: `metrics.new8K` (count of new 8-K filings since last check) — timeline widget.

## Procedure
1. Open the C1 timeline and identify the new 8-K filing(s) and filer.
2. Open the filing on EDGAR and read the item codes to determine the event type.
3. Assess relevance: is the filer a client, competitor, customer, or portfolio company?
4. Summarise the event in a short memo: what happened, item codes, and the so-what for us/clients.
5. Identify any follow-on actions (notify a client owner, update a model, brief investors).
6. Distribute the memo to the relevant internal audience.
7. File the memo and the filing link in the material-events log.
8. Acknowledge and resolve the Action card with the memo attached.

## Escalation path
Founder owns material-event memos. If the 8-K concerns a public client/investment with materiality
implications, coordinate with Investor Update (SOP-B1) and counsel before any external comment. Events
affecting a client's business escalate to that client's relationship owner.

## Definition of done
The new 8-K read and classified, a concise material-event memo written and distributed to the right
audience, follow-on actions logged, the filing recorded in the material-events log, and the Action card
resolved within 24h.
