# SOP-B3 — Crisis Comms

| Field | Value |
|-------|-------|
| **SOP ID** | SOP-B3 |
| **Source** | B3 — NewsAPI (US business top headlines) |
| **Owner / Assignee** | Founder |
| **SLA** | 24 hours from trigger |
| **Severity** | High |
| **Sensitivity** | Standard |

## Dashboard question answered
**Trigger** — "Is there negative press mentioning us or a client that needs a comms response?"
(The widget's `question` badge is `trigger`.)

## Trigger condition (plain English)
Fire when one or more negative mentions of the firm or a client appear in business headlines —
i.e. `negativeMentions > 0`. Negative coverage compounds if unanswered, so a fast, coordinated comms
response within the news cycle is required.

## Inputs / Data source
- NewsAPI top business headlines (title, source, url, publishedAt) via `X-Api-Key`.
- Normalized metric: `metrics.negativeMentions` (count of negative-sentiment matches on the watchlist).
- Holding statements, the comms approval chain, and the client/firm watchlist.

## Procedure
1. Open the B3 table and read each negative headline; identify the subject and outlet.
2. Verify the claim's accuracy and assess reach (outlet tier, pickup, spread).
3. Classify severity: monitor, respond, or full crisis activation.
4. Notify the affected party (client owner or internal leadership) immediately.
5. Draft a holding statement and, if needed, a full response; clear with the Founder and counsel.
6. Issue the response through the appropriate channel and brief spokespeople on Q&A.
7. Monitor follow-on coverage and update the response as the story develops.
8. Acknowledge and resolve the Action card with the statement and coverage log attached.

## Escalation path
Founder owns crisis comms. Legal-sensitive or materially damaging stories pull in external counsel and
(for public clients) IR before any statement. If a client is the subject, the client's own comms lead
runs point with our support. Reputational equity moves coordinate with Investor Update (SOP-B1).

## Definition of done
Negative coverage verified and triaged, affected party notified, a cleared statement issued where
warranted, follow-on coverage monitored, the coverage log filed, and the Action card resolved within
24h.
