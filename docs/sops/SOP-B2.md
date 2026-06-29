# SOP-B2 — Business Continuity

| Field | Value |
|-------|-------|
| **SOP ID** | SOP-B2 |
| **Source** | B2 — OpenWeatherMap (Hyderabad current weather) |
| **Owner / Assignee** | Analyst |
| **SLA** | 12 hours from trigger |
| **Severity** | High |
| **Sensitivity** | Standard |

## Dashboard question answered
**Trigger** — "Is there severe weather that threatens office/operations continuity?"
(The widget's `question` badge is `trigger`.)

## Trigger condition (plain English)
Fire when a severe-weather condition is detected for the office location — i.e. `severe > 0`
(storm/extreme-temperature/flood flags derived from the current conditions). Severe weather threatens
commuting, power, and on-site delivery, so the continuity plan must be primed.

## Inputs / Data source
- OpenWeatherMap current-weather endpoint for the office coordinates (conditions, temp, wind).
- Normalized metric: `metrics.severe` (count/flag of severe conditions present).
- Business-continuity plan, on-call roster, and client SLAs with on-site dependencies.

## Procedure
1. Confirm the `severe` flag and the underlying condition on the B2 widget.
2. Check the forecast window and the local advisory/warning level.
3. Activate the relevant continuity playbook (remote-work, power-loss, transport disruption).
4. Notify staff with guidance and confirm the on-call roster is reachable.
5. Identify client deliverables at risk and pre-warn affected client owners.
6. Verify backup connectivity/power for any critical on-site systems.
7. Set a monitoring cadence until the event clears.
8. Acknowledge and resolve the Action card once the playbook is activated and comms sent.

## Escalation path
Analyst activates the playbook. If the event threatens a client SLA breach or building safety,
escalate to the Founder/admin and the client's continuity contact. Coordinate WFH advisory with SOP-A6
if air quality is also affected.

## Definition of done
The correct continuity playbook activated, staff and on-call notified, at-risk client deliverables
flagged to owners, critical systems verified on backup, a monitoring cadence set, and the Action card
resolved within 12h.
