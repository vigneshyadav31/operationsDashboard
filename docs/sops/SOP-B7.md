# SOP-B7 — SOP Refresh

| Field | Value |
|-------|-------|
| **SOP ID** | SOP-B7 |
| **Source** | B7 — Notion (SOP review board) |
| **Owner / Assignee** | Admin |
| **SLA** | 168 hours (7 days) from trigger |
| **Severity** | Medium |
| **Sensitivity** | Standard |

## Dashboard question answered
**Trigger** — "Are there SOPs that have not been reviewed in 6+ months and need refreshing?"
(The widget's `question` badge is `trigger`.)

## Trigger condition (plain English)
Fire when one or more SOPs have gone unreviewed for more than six months — i.e. `unreviewed6mo > 0`.
Stale procedures drift from reality and create compliance and execution risk, so they must be brought
back into review.

## Inputs / Data source
- Notion database query of the SOP register (title, owner, last-reviewed date, status) — Kanban view.
- Normalized metric: `metrics.unreviewed6mo` (count of SOPs past the 6-month review window).
- The master SOP index (this `docs/sops/` set) and recent process/regulatory changes.

## Procedure
1. Open the B7 Kanban and list SOPs in the "overdue review" column.
2. Assign each overdue SOP a reviewer (its owner or a delegate).
3. For each, check whether the procedure still matches current process, tooling, and regulation.
4. Update the SOP content, trigger thresholds, owners, and SLAs as needed.
5. Record the new last-reviewed date and bump the version.
6. Move the card to "reviewed" on the Notion board.
7. Communicate any material procedure changes to affected owners and teams.
8. Acknowledge and resolve the Action card once all overdue SOPs are reviewed.

## Escalation path
Admin coordinates the refresh. SOPs touching compliance or finance require the relevant owner
(Founder/finance/counsel) to approve changes. If an SOP is found materially wrong (not just stale),
escalate immediately rather than waiting for the scheduled refresh.

## Definition of done
All overdue SOPs reviewed and updated, last-reviewed dates and versions bumped, Notion cards moved to
reviewed, material changes communicated, and the Action card resolved within 7 days.
