# SOP-A5 — Compliance Audit

| Field | Value |
|-------|-------|
| **SOP ID** | SOP-A5 |
| **Source** | A5 — WHO GHO (NCD mortality, NCDMORT3070) |
| **Owner / Assignee** | Analyst |
| **SLA** | 168 hours (7 days) from trigger |
| **Severity** | Low |
| **Sensitivity** | Standard |

## Dashboard question answered
**Trigger** — "Have the health/compliance indicators we track worsened enough to schedule an audit?"
(The widget's `question` badge is `trigger`.)

## Trigger condition (plain English)
Fire when a tracked indicator worsened quarter-over-quarter — i.e. `worsenedQoQ > 0` (one or more
geographies/segments deteriorated). For clients in regulated or health-adjacent sectors, a worsening
trend is the cue to verify that compliance controls still match the operating environment.

## Inputs / Data source
- WHO Global Health Observatory NCD mortality dataset (probability of dying 30–70 from NCDs).
- Normalized metric: `metrics.worsenedQoQ` (count of segments worse than the prior quarter).
- Client compliance register (applicable frameworks, last audit date, open findings).

## Procedure
1. Read the A5 heatmap; identify which segments/geographies worsened and by how much.
2. Map the worsening segments to client companies operating in those markets.
3. Pull each affected client's compliance register and last-audit date.
4. Decide audit scope: full review, targeted control check, or documentation refresh only.
5. Schedule the audit and assign reviewers; book any external assessor if required.
6. Notify affected client compliance owners of the scheduled review and evidence requests.
7. Open tracking items for each control to be re-verified.
8. Acknowledge and resolve the Action card once the audit is scheduled and owners notified.

## Escalation path
Analyst schedules and runs the audit. If the worsening indicator coincides with a control already
flagged in a prior finding, escalate to the Founder and the client's compliance lead immediately
rather than waiting for the scheduled audit. Material regulatory exposure escalates to external counsel.

## Definition of done
Affected clients identified, audit scope and date set with reviewers assigned, owners notified with
evidence requests issued, tracking items opened for each control, and the Action card resolved within
7 days.
