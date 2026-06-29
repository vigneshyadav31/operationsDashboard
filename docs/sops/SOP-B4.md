# SOP-B4 — Pricing Review (CPI)

| Field | Value |
|-------|-------|
| **SOP ID** | SOP-B4 |
| **Source** | B4 — FRED (US CPI, CPIAUCSL) |
| **Owner / Assignee** | Analyst |
| **SLA** | 72 hours from trigger |
| **Severity** | Medium |
| **Sensitivity** | Standard |

## Dashboard question answered
**Trigger** — "Has US month-over-month inflation risen enough to revisit USD pricing?"
(The widget's `question` badge is `trigger`.)

## Trigger condition (plain English)
Fire when US CPI month-over-month change exceeds **0.3%** — i.e. `cpiMoM > 0.3` (roughly a >3.6%
annualised pace). For USD-priced contracts and US-based cost lines, a hot MoM print is the cue to
re-examine pricing and escalation clauses.

## Inputs / Data source
- FRED series observations for CPIAUCSL (seasonally adjusted CPI level) via `api_key`.
- Normalized metric: `metrics.cpiMoM` (latest month-over-month percentage change).
- USD price book, US-denominated vendor contracts, and active CPI-escalation clauses.

## Procedure
1. Read the firing `cpiMoM` value and the latest CPI level from the B4 line widget.
2. Identify US-priced products and US-based cost lines most exposed to the print.
3. Recompute margins at the implied cost trajectory; flag lines below the target floor.
4. Check which contracts have CPI-escalation clauses that can be invoked vs. need renegotiation.
5. Draft proposed adjustments (invoke clause, re-quote, or hold) per affected line.
6. Review with the Founder and relevant account owners; assess churn risk.
7. Schedule approved changes with effective dates and a client comms plan.
8. Acknowledge and resolve the Action card with the pricing decision attached.

## Escalation path
Analyst prepares the review; changes require Founder sign-off. If invoking an escalation clause is
disputed by a strategic client, escalate to the Founder for a retain-vs-reprice decision. Persistent
hot prints escalate to a structural pricing-policy review (coordinate with SOP-A3).

## Definition of done
Exposed lines identified, a documented pricing recommendation with margin analysis approved by the
Founder, escalation clauses invoked or changes scheduled with a comms plan, and the Action card
resolved within 72h.
