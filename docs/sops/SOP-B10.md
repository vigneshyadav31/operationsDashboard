# SOP-B10 — WFH Advisory (AQICN)

| Field | Value |
|-------|-------|
| **SOP ID** | SOP-B10 |
| **Source** | B10 — AQICN / WAQI (Hyderabad AQI feed) |
| **Owner / Assignee** | Analyst |
| **SLA** | 12 hours from trigger |
| **Severity** | High |
| **Sensitivity** | Standard |

## Dashboard question answered
**Trigger** — "Does the AQICN reading confirm hazardous air that warrants a WFH advisory?"
(The widget's `question` badge is `trigger`.)

## Trigger condition (plain English)
Fire when the AQICN feed AQI exceeds **150** — i.e. `aqi > 150` (the "Unhealthy" band). This is the
lower, earlier-warning counterpart to Open-Meteo's 200 threshold (SOP-A6); B10 catches deterioration
sooner and cross-validates the air-quality signal.

## Inputs / Data source
- AQICN/WAQI city feed for the office location (AQI, dominant pollutant, station) — heatmap.
- Normalized metric: `metrics.aqi` (current AQI from the AQICN station).
- The Open-Meteo reading (SOP-A6) for cross-checking, office roster, and advisory templates.

## Procedure
1. Confirm the firing `aqi` on the B10 heatmap and the dominant pollutant.
2. Cross-check against Open-Meteo (A6); if both agree, treat as confirmed.
3. Decide advisory level given the 150–200 band: optional vs. recommended WFH.
4. Identify non-remote roles and arrange mitigations (masks, purifiers, shift changes).
5. Issue the advisory to staff with the effective window and the source readings.
6. Update the office status board and notify facilities.
7. Set a re-check time to escalate (to A6's mandatory band) or lift the advisory.
8. Acknowledge and resolve the Action card once the advisory is issued.

## Escalation path
Analyst issues the advisory. If AQI climbs above 200, hand off to SOP-A6's mandatory-WFH path and
involve the Founder/admin for closure decisions. Discrepancy between B10 and A6 readings escalates to a
data-quality check before acting on a single source.

## Definition of done
The AQI confirmed against a second source, an advisory level decided and communicated with mitigations
for non-remote roles, the status board updated, a re-check scheduled, and the Action card resolved
within 12h.
