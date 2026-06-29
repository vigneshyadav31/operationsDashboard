# SOP-C7 — KYC / Compliance Refresh

| Field | Value |
|-------|-------|
| **SOP ID** | SOP-C7 |
| **Source** | C7 — India MCA (corporate status, CSV-based, sample()-first) |
| **Owner / Assignee** | Admin |
| **SLA** | 168 hours (7 days) from trigger |
| **Severity** | Medium |
| **Sensitivity** | Standard |

## Dashboard question answered
**Trigger** — "Has a client/vendor's registered corporate status changed, requiring a KYC refresh?"
(The widget's `question` badge is `trigger`.)

## Trigger condition (plain English)
Fire when a tracked company's MCA status changes — i.e. `statusChange > 0` (e.g. Active → Strike-Off /
Under Liquidation, director or charge changes). A registry status change can invalidate contracts and
payments, so KYC and counterparty records must be refreshed.

## Inputs / Data source
- India MCA corporate data. Per policy the adapter consumes a **downloaded CSV** (it does not scrape the
  MCA portal) and is **`sample()`-first**, attaching a note when only the fixture is shown.
- Scraper config `c7.yaml` (enabled, User-Agent, robots note, rate limit) loaded as `ctx.cfg`.
- Normalized metric: `metrics.statusChange` (count of companies whose status changed) — table widget.

## Procedure
1. Open the C7 table and identify which companies changed status and the new status.
2. Verify the change against the official MCA record / latest CSV (note if only `sample()` is shown).
3. Map each affected company to our client/vendor relationships and active contracts/payments.
4. Assess impact: payment holds, contract validity, KYC re-verification, and risk rating change.
5. Take protective action — pause payments, request fresh KYC documents, or flag the contract.
6. Update the counterparty/KYC register with the new status and risk rating.
7. Notify finance and the relationship owner of any holds or required re-verification.
8. Acknowledge and resolve the Action card once protective actions and updates are complete.

## Escalation path
Admin runs the KYC refresh. A status change implying insolvency or fraud on a material counterparty
escalates immediately to the Founder and finance (and counsel) to protect outstanding payments and
contracts, rather than waiting out the SLA.

## Definition of done
Status changes verified and mapped to relationships, protective actions taken (holds / KYC requests /
contract flags), the counterparty/KYC register updated with new risk ratings, finance and owners
notified, and the Action card resolved within 7 days.
