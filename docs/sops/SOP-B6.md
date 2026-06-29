# SOP-B6 — Capacity Reallocation

| Field | Value |
|-------|-------|
| **SOP ID** | SOP-B6 |
| **Source** | B6 — Clockify (project utilization) |
| **Owner / Assignee** | Admin |
| **SLA** | 72 hours from trigger |
| **Severity** | Medium |
| **Sensitivity** | Standard |

## Dashboard question answered
**Trigger** — "Is a team/project running too hot on utilization and needs capacity reallocated?"
(The widget's `question` badge is `trigger`.)

## Trigger condition (plain English)
Fire when project utilization reaches or exceeds **90%** — i.e. `utilization >= 90`. Sustained
utilization at or above 90% leaves no buffer for delivery risk and predicts burnout and slipped
deadlines, so capacity must be rebalanced.

## Inputs / Data source
- Clockify workspace projects with tracked hours vs. capacity (stacked-bar utilization).
- Normalized metric: `metrics.utilization` (highest project/team utilization percentage).
- Staffing plan, bench availability, and project priority/deadline list.

## Procedure
1. Open the B6 widget and identify which project/team is at or above the 90% threshold.
2. Confirm the cause: genuine overload, mis-tracked time, or a one-off crunch.
3. Review deadlines and priority of the over-utilized project against others.
4. Identify reallocation options: bench staff, shift scope, extend timeline, or add contractor.
5. Decide and assign the reallocation; update the staffing plan.
6. Communicate the change to affected leads and the client owner if delivery dates move.
7. Set a follow-up to confirm utilization normalises after the change.
8. Acknowledge and resolve the Action card with the reallocation decision recorded.

## Escalation path
Admin owns capacity. If reallocation requires new hiring spend or a client deadline must move,
escalate to the Founder for budget and client-comms approval. Repeated breaches on the same team
escalate to a structural staffing review.

## Definition of done
The over-utilized team identified, cause confirmed, a reallocation decision made and applied to the
staffing plan, affected leads/clients informed of any date changes, a normalisation check scheduled,
and the Action card resolved within 72h.
