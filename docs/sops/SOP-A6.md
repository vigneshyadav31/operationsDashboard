# SOP-A6 — WFH Advisory (Open-Meteo)

| Field | Value |
|-------|-------|
| **SOP ID** | SOP-A6 |
| **Source** | A6 — Open-Meteo Air Quality (Hyderabad, US AQI) |
| **Owner / Assignee** | Analyst |
| **SLA** | 12 hours from trigger |
| **Severity** | High |
| **Sensitivity** | Standard |

## Dashboard question answered
**Trigger** — "Is local air quality hazardous enough to issue a work-from-home advisory?"
(The widget's `question` badge is `trigger`.)

## Trigger condition (plain English)
Fire when the US AQI for the office location exceeds **200** — i.e. `aqi > 200` (the "Very Unhealthy"
band). At this level the duty of care to on-site staff justifies advising remote work and limiting
commuting and outdoor activity.

## Inputs / Data source
- Open-Meteo air-quality endpoint (pm2_5, pm10, ozone, us_aqi) for the office coordinates.
- Normalized metric: `metrics.aqi` (current US AQI gauge value).
- Office roster, on-site dependencies, and the cross-checked AQICN reading (see SOP-B10).

## Procedure
1. Confirm the firing `aqi` value on the A6 gauge and cross-check against AQICN (B10).
2. Check the short-term forecast to judge whether this is a spike or a sustained event.
3. Decide advisory level: optional WFH, recommended WFH, or mandatory office closure.
4. Identify roles that cannot work remotely and arrange mitigations (N95 masks, purifiers, shifts).
5. Draft and send the advisory to all staff via the standard channel, with the effective window.
6. Update the office status board and notify facilities/reception.
7. Set a re-check time to lift or extend the advisory based on the next reading.
8. Acknowledge and resolve the Action card once the advisory is issued.

## Escalation path
Analyst issues the advisory. If AQI exceeds 300 (Hazardous) or persists beyond the forecast window,
escalate to the Founder/admin for a mandatory-closure decision and inform any client whose on-site
delivery is affected. Coordinate with facilities for building-level HVAC measures.

## Definition of done
Advisory level decided and communicated to all staff with an effective window, mitigations arranged
for non-remote roles, the office status board updated, a re-check scheduled, and the Action card
resolved within 12h.
