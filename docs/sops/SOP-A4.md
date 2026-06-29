# SOP-A4 — Inbound Press Response

| Field | Value |
|-------|-------|
| **SOP ID** | SOP-A4 |
| **Source** | A4 — Hacker News (top 20 stories) |
| **Owner / Assignee** | Founder |
| **SLA** | 24 hours from trigger |
| **Severity** | High |
| **Sensitivity** | Standard |

## Dashboard question answered
**Trigger** — "Is a client (or the firm) currently on the HN front page and needs a response?"
(The widget's `question` badge is `trigger`.)

## Trigger condition (plain English)
Fire when a tracked client company, the firm, or a portfolio brand appears on the Hacker News front
page — i.e. `clientOnFrontPage == 1`. Front-page exposure is a time-boxed window where a fast,
on-message response can convert attention into inbound, or contain a negative thread.

## Inputs / Data source
- Hacker News top-stories endpoint, hydrated to the top 20 items (title, url, score, comments).
- Normalized metric: `metrics.clientOnFrontPage` (1 when a watched entity matches a story).
- Watchlist of client/portfolio names and domains; pre-approved messaging snippets.

## Procedure
1. Open the A4 widget and identify the matching story, its rank, score, and comment velocity.
2. Read the thread to classify sentiment (positive launch, neutral, or critical) and key concerns.
3. Notify the affected client's primary contact immediately with a link and a 2-line summary.
4. Decide the response posture: engage in-thread, publish a statement, amplify, or stay silent.
5. If engaging, draft a factual, non-defensive reply and clear it with the client/Founder.
6. Post the response (from the appropriate account) and monitor for follow-up questions.
7. Capture inbound leads/contacts generated and route them to sales.
8. Acknowledge and resolve the Action card with the link, posture chosen, and outcome.

## Escalation path
Founder owns the response. If the thread is reputationally damaging or legal-sensitive, pull in the
client's comms/legal lead before posting and treat it as a crisis-comms event (see SOP-B3). If the
matched story concerns a competitor naming a client, route a copy to Competitive Intelligence (SOP-A8).

## Definition of done
The affected party notified within the hour, a response posture chosen and (if engaging) a cleared
reply posted, inbound leads captured and routed, and the Action card resolved within 24h while the
story is still live.
