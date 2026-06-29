# SOP-B1 — Investor Update

| Field | Value |
|-------|-------|
| **SOP ID** | SOP-B1 |
| **Source** | B1 — Alpha Vantage (RELIANCE.BSE global quote) |
| **Owner / Assignee** | Founder |
| **SLA** | 24 hours from trigger |
| **Severity** | High |
| **Sensitivity** | Sensitive (founder/admin only) |

## Dashboard question answered
**Trigger** — "Has a benchmark equity moved enough to require a proactive investor update?"
(The widget's `question` badge is `trigger`.)

## Trigger condition (plain English)
Fire when the tracked equity's daily change exceeds **5%** in absolute terms — i.e. `|changePct| > 5`.
A move of this size in a bellwether holding/benchmark is the cue to get ahead of investor questions
rather than wait for them.

## Inputs / Data source
- Alpha Vantage `GLOBAL_QUOTE` for the tracked symbol (limited to 25 requests/day; 6h cache TTL).
- Normalized metric: `metrics.changePct` (daily percentage change).
- The cap table / investor list and the last investor update sent.

## Procedure
1. Confirm the firing `changePct` on the B1 candlestick widget and the day's price action.
2. Identify the driver (earnings, sector news, macro) using NewsAPI (B3) and Yahoo (C5) context.
3. Assess exposure: how this move affects valuation marks, runway assumptions, or comparables.
4. Draft a concise investor note: what moved, why, our read, and any action we are taking.
5. Clear the note with the Founder (and counsel if it touches material non-public info).
6. Send the update to the relevant investor segment via the standard channel.
7. Log the update in the investor-comms register with the trigger value.
8. Acknowledge and resolve the Action card with the sent note linked.

## Escalation path
Founder owns investor comms. If the move implies a covenant breach, a down-round signal, or a
materiality question, escalate to the board chair and external counsel before sending. Coordinate with
Crisis Comms (SOP-B3) if the driver is reputational.

## Definition of done
Driver identified, a cleared investor note sent to the right audience, the update logged in the
investor-comms register, and the Action card resolved within 24h.
