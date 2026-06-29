# SOP-A3 — Pricing Review

| Field | Value |
|-------|-------|
| **SOP ID** | SOP-A3 |
| **Source** | A3 — World Bank (India CPI inflation, FP.CPI.TOTL.ZG) |
| **Owner / Assignee** | Analyst |
| **SLA** | 72 hours from trigger |
| **Severity** | Medium |
| **Sensitivity** | Standard |

## Dashboard question answered
**Trigger** — "Has macro inflation moved far enough from norm to require a pricing review?"
(The widget's `question` badge is `trigger`.)

## Trigger condition (plain English)
Fire when the latest India CPI inflation reading sits more than **2 standard deviations** above its
historical mean — i.e. `inflationSd > 2`. An outlier of this magnitude signals input-cost pressure
that erodes margins if list prices stay fixed.

## Inputs / Data source
- World Bank indicator FP.CPI.TOTL.ZG for India (annual CPI inflation series).
- Normalized metric: `metrics.inflationSd` (current reading expressed in σ above the series mean).
- Internal price book and cost model (COGS, salaries, vendor contracts) for client companies.

## Procedure
1. Read the firing `inflationSd` value and the underlying CPI figure from the A3 widget.
2. Map the inflation driver to the cost base most exposed (labour, hosting, vendor, logistics).
3. Recompute gross margin per product/SKU at current costs; flag any below the target floor.
4. Draft proposed price adjustments or contractual CPI-escalation clauses for affected lines.
5. Model client-churn risk of the proposed increases; identify accounts needing a softer approach.
6. Review the proposal with the Founder and the relevant account owners.
7. Schedule the price change (effective date, grandfathering rules, comms plan).
8. Acknowledge and resolve the Action card with the approved pricing decision attached.

## Escalation path
Analyst prepares the review; pricing changes require Founder sign-off. If margin on a strategic
account falls below floor and a price increase is rejected by the client, escalate to the Founder for
a retain-vs-reprice decision. Sustained multi-quarter outliers escalate to a structural pricing-policy
review.

## Definition of done
A documented pricing recommendation (adjust / hold / add escalation clause) with margin analysis,
Founder approval recorded, an implementation date and comms plan set where changes are approved, and
the Action card resolved within 72h.
