# SOP-A1 — Treasury Reserve Review

| Field | Value |
|-------|-------|
| **SOP ID** | SOP-A1 |
| **Source** | A1 — CoinGecko (BTC/ETH spot + 24h change) |
| **Owner / Assignee** | Founder |
| **SLA** | 24 hours from trigger |
| **Severity** | High |
| **Sensitivity** | Sensitive (founder/admin only) |

## Dashboard question answered
**Trigger** — "Has a treasury-relevant threshold been crossed that requires the Founder to act?"
(The widget's `question` badge is `trigger`.)

## Trigger condition (plain English)
Fire when the **absolute** 24-hour price change of the crypto reserve exceeds **10%** —
i.e. `|changePct| > 10`. A swing of this size moves the value of the company's on-chain reserves
enough to warrant an explicit treasury decision rather than passive holding.

## Inputs / Data source
- CoinGecko simple-price endpoint: BTC & ETH spot in USD + `include_24hr_change`.
- Normalized metric: `metrics.changePct` (largest absolute 24h move across tracked assets).
- The internal treasury ledger (current units held per asset, target allocation band).

## Procedure
1. Open the A1 widget; confirm the firing asset and the exact `changePct` value on the card.
2. Cross-check the move against a second source (exchange ticker) to rule out a CoinGecko data glitch.
3. Pull current holdings from the treasury ledger and compute the USD delta this move represents.
4. Compare resulting allocation against the policy band (e.g. crypto ≤ X% of total reserves).
5. Decide: rebalance (convert to stablecoin/fiat), hold, or top up — and size the trade.
6. If rebalancing, execute via the approved custodian/desk and record the trade reference.
7. Update the treasury ledger and the running reserve note; attach the trade confirmation.
8. Acknowledge then resolve the Action card, summarising the decision and rationale.

## Escalation path
Founder is the owner. If the move breaches the policy band by more than 2× or implies a same-day
liquidity need, convene the finance committee (Founder + CFO/fractional-CFO + lead investor advisor)
within the SLA window. If custody access is blocked, escalate to the custodian's priority support.

## Definition of done
A documented treasury decision (rebalance/hold/top-up) with rationale, any executed trade recorded in
the ledger with confirmation attached, allocation back within (or explicitly waived from) the policy
band, and the Action card resolved within 24h (`metSla = true`).
