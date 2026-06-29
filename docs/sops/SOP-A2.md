# SOP-A2 — Cross-border Invoicing

| Field | Value |
|-------|-------|
| **SOP ID** | SOP-A2 |
| **Source** | A2 — Frankfurter (USD→EUR/GBP/INR FX) |
| **Owner / Assignee** | Analyst |
| **SLA** | 48 hours from trigger |
| **Severity** | Medium |
| **Sensitivity** | Standard |

## Dashboard question answered
**Trigger** — "Has an FX move large enough to affect cross-border invoicing occurred?"
(The widget's `question` badge is `trigger`.)

## Trigger condition (plain English)
Fire when any tracked USD pair moves more than **2%** week-over-week, in either direction —
i.e. `|wowPct| > 2`. A 2% swing meaningfully changes the local-currency amount clients are billed
and the margin on existing fixed-price contracts.

## Inputs / Data source
- Frankfurter latest rates (USD→EUR, GBP, INR) plus the 30-day series for context.
- Normalized metric: `metrics.wowPct` (largest absolute week-over-week move across the pairs).
- Open invoice register (currency, amount, payment terms) for affected clients.

## Procedure
1. Identify the firing pair and `wowPct` from the A2 widget; note direction (USD stronger/weaker).
2. List open and upcoming invoices denominated in or settled in the affected currency.
3. For fixed-price contracts, recompute realised margin at the new rate; flag any below threshold.
4. Decide per invoice whether to re-quote, apply a contractual FX clause, or hold the original rate.
5. Coordinate with finance to set the rate to be used on invoices issued this week.
6. Notify affected client owners of any re-quote with a short, factual explanation.
7. Update the invoice register with the applied rates and any adjustments.
8. Acknowledge and resolve the Action card with the list of invoices touched.

## Escalation path
Analyst owns the review. If a single contract's margin erosion exceeds the agreed limit or a client
disputes a re-quote, escalate to the Founder (for client-facing decisions) and finance (for hedging).
For systemic moves (>5% sustained), recommend a standing FX-hedging policy to the Founder.

## Definition of done
Affected invoices identified and repriced or explicitly held, the applied FX rate recorded, client
owners notified where re-quotes occurred, the invoice register updated, and the Action card resolved
within 48h.
