# SOP-B5 — Capture Management

| Field | Value |
|-------|-------|
| **SOP ID** | SOP-B5 |
| **Source** | B5 — USAJOBS (compliance roles, Washington DC) |
| **Owner / Assignee** | Analyst |
| **SLA** | 168 hours (7 days) from trigger |
| **Severity** | Low |
| **Sensitivity** | Standard |

## Dashboard question answered
**Trigger** — "Have new relevant public-sector postings appeared that signal capture opportunities?"
(The widget's `question` badge is `trigger`.)

## Trigger condition (plain English)
Fire when one or more new relevant government postings appear since the last check — i.e.
`newPostings > 0`. New compliance-role hiring by target agencies is a leading indicator of budget and
program activity that the firm can pursue for client capture/BD.

## Inputs / Data source
- USAJOBS search for compliance roles in the target location (title, agency, grade, posted date).
- Normalized metric: `metrics.newPostings` (count of postings new since last evaluation).
- Capture pipeline / BD tracker and the target-agency watchlist.

## Procedure
1. Open the B5 bar widget and list the new postings and their hiring agencies.
2. Map each posting to a potential program, contract vehicle, or client opportunity.
3. Qualify fit: relevance to a client's offering, competition, and our right to play.
4. For qualified items, create a capture pipeline entry with owner and next step.
5. Gather supporting intel (program office, incumbent, timeline) from public sources.
6. Brief the relevant client/BD owner on the opportunity and recommended pursuit.
7. Update the capture tracker with status and decision (pursue / watch / pass).
8. Acknowledge and resolve the Action card with the qualified opportunities listed.

## Escalation path
Analyst runs qualification. High-value or strategic opportunities escalate to the Founder for a
pursue/no-pursue decision and resourcing. If a client conflict of interest is detected, escalate to
the Founder before any outreach.

## Definition of done
New postings reviewed and qualified, pipeline entries created for fits with owners and next steps,
the relevant BD owner briefed, the capture tracker updated, and the Action card resolved within 7 days.
