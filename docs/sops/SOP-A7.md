# SOP-A7 — HRIS Roster Reconciliation

| Field | Value |
|-------|-------|
| **SOP ID** | SOP-A7 |
| **Source** | A7 — RandomUser (HRIS seam, seeded roster) |
| **Owner / Assignee** | Admin |
| **SLA** | 168 hours (7 days) — periodic, not event-driven |
| **Severity** | Low |
| **Sensitivity** | Standard |

## Dashboard question answered
**Refresh** — "What is the current people roster, and is the HRIS view in sync?"
(The widget's `question` badge is `refresh`; A7 is the **HRIS seam** and has **no automated trigger**
in CONTRACTS §3 — it is a deliberate placeholder for a real HRIS such as BambooHR/Workday.)

## Trigger condition (plain English)
None automated. A7 carries no `trigger` in the source registry. This SOP is run on a **periodic weekly
cadence** by the admin as a roster-hygiene check, or ad hoc when onboarding/offboarding occurs. When a
real HRIS replaces the RandomUser seam, this SOP becomes the reconciliation runbook for that provider.

## Inputs / Data source
- A7 avatar-grid roster (name, role, country) — the seeded stand-in for the HRIS feed.
- The authoritative people directory (contracts, access lists, payroll).
- Pending onboarding/offboarding tickets.

## Procedure
1. Open the A7 widget and review the current roster grid (headcount, roles, locations).
2. Diff the roster against the authoritative directory; list adds, removes, and role changes.
3. For each discrepancy, confirm the correct state with the relevant manager.
4. Reconcile access/tooling entitlements against the corrected roster (joiner/leaver/mover).
5. Confirm payroll and contract records match the reconciled roster.
6. Record the reconciliation outcome and any tickets opened to fix mismatches.
7. Schedule the next weekly reconciliation.

## Escalation path
Admin owns reconciliation. Unresolved discrepancies affecting access security (e.g. a leaver retaining
access) escalate immediately to the Founder and IT for revocation. When migrating to a production HRIS,
escalate integration gaps to the Founder for tooling sign-off.

## Definition of done
Roster reconciled against the authoritative directory, all discrepancies confirmed and ticketed,
access/payroll/contract records aligned, the outcome recorded, and the next reconciliation scheduled.
