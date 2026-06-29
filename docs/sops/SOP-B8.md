# SOP-B8 — Escalate Onboarding

| Field | Value |
|-------|-------|
| **SOP ID** | SOP-B8 |
| **Source** | B8 — Airtable (client onboarding tracker) |
| **Owner / Assignee** | Founder |
| **SLA** | 48 hours from trigger |
| **Severity** | High |
| **Sensitivity** | Standard |

## Dashboard question answered
**Trigger** — "Is a client onboarding running past the acceptable duration and needs escalation?"
(The widget's `question` badge is `trigger`.)

## Trigger condition (plain English)
Fire when a client's onboarding has been open longer than **7 days** — i.e. `onboardingDays > 7`.
Onboarding stalls predict churn and delayed revenue recognition, so the Founder escalates to unblock
before the relationship sours.

## Inputs / Data source
- Airtable `Clients` table (client, onboarding start date, stage, blockers) — gauge of days open.
- Normalized metric: `metrics.onboardingDays` (max days a client has been in onboarding).
- Onboarding checklist, the assigned CS owner, and the contract start date.

## Procedure
1. Open the B8 gauge and identify the client(s) past the 7-day threshold.
2. Pull the onboarding record and identify the current stage and specific blocker.
3. Contact the assigned CS owner for status and the reason for the delay.
4. Classify the blocker: internal (us), client-side, or third-party dependency.
5. Take the unblocking action — escalate internally, schedule a client call, or reassign the owner.
6. Set a concrete completion commitment and confirm it with the client.
7. Update the Airtable record with the recovery plan and new target date.
8. Acknowledge and resolve the Action card once the recovery plan is agreed.

## Escalation path
Founder owns escalation. If the blocker is a major contract/scope dispute, pull in the account owner
and (if needed) counsel. Persistent multi-client onboarding delays escalate to a CS-process review and
possible staffing change (coordinate with SOP-B6).

## Definition of done
The stalled onboarding's blocker identified and classified, an unblocking action taken with a committed
completion date confirmed with the client, the Airtable record updated, and the Action card resolved
within 48h.
