# SOP-C5 — Market Event Memo

| Field | Value |
|-------|-------|
| **SOP ID** | SOP-C5 |
| **Source** | C5 — Yahoo Finance (AAPL chart, scraper/YAML-driven, sample()-first) |
| **Owner / Assignee** | Founder |
| **SLA** | 24 hours from trigger |
| **Severity** | High |
| **Sensitivity** | Standard |

## Dashboard question answered
**Trigger** — "Has an intraday market move occurred that needs a market-event memo?"
(The widget's `question` badge is `trigger`.)

## Trigger condition (plain English)
Fire when the tracked equity's change exceeds **5%** in absolute terms — i.e. `|changePct| > 5`. A move
of this size in a benchmark name often reflects a market-wide event (rates, sector shock, macro print)
that the Founder's Office should interpret for clients and the firm.

## Inputs / Data source
- Yahoo Finance chart endpoint for the tracked symbol (intraday OHLC). The endpoint is JS-rendered, so
  the adapter is **`sample()`-first** and attaches a note; it attempts the live call only if reachable.
- Scraper config `c5.yaml` (enabled, User-Agent, robots note, rate limit) loaded as `ctx.cfg`.
- Normalized metric: `metrics.changePct` (intraday percentage change) — candlestick widget.

## Procedure
1. Confirm the firing `changePct` on the C5 candlestick and note the adapter's data-source note.
2. Cross-check the move against Alpha Vantage (B1) and current headlines (B3) to confirm it is real.
3. Identify the market driver (macro print, sector news, single-name catalyst).
4. Write a short market-event memo: what moved, the likely driver, and the implication for clients/firm.
5. Flag any client portfolios or models that need updating in light of the move.
6. Distribute the memo to the relevant internal/client audience.
7. File the memo in the market-events log with the trigger value and data note.
8. Acknowledge and resolve the Action card with the memo attached.

## Escalation path
Founder owns market-event memos. Moves implying client portfolio risk coordinate with Investor Update
(SOP-B1). If the live Yahoo data is unavailable and only `sample()` is shown, note the data limitation
in the memo and source the move from B1/B3 before acting.

## Definition of done
The move confirmed against a second source, a market-event memo written and distributed, affected
client models/portfolios flagged, the memo filed in the market-events log, and the Action card resolved
within 24h.
