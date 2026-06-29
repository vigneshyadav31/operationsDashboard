# SOP-A8 — Competitive Intelligence

| Field | Value |
|-------|-------|
| **SOP ID** | SOP-A8 |
| **Source** | A8 — Reddit r/Entrepreneur top posts |
| **Owner / Assignee** | Analyst |
| **SLA** | 48 hours from trigger |
| **Severity** | Medium |
| **Sensitivity** | Standard |

## Dashboard question answered
**Trigger** — "Is there a spike in complaints/competitor chatter worth investigating?"
(The widget's `question` badge is `trigger`.)

## Trigger condition (plain English)
Fire when complaint-related terms spike more than **2×** their baseline in the day's top posts —
i.e. `|complaintSpike| > 2`. A sudden surge in complaint language around a category, a competitor, or
a client signals a market shift or a brewing reputation issue worth a same-week scan.

## Inputs / Data source
- Reddit r/Entrepreneur `top.json` for the day (titles, scores, comment counts) via UA header.
- Normalized metric: `metrics.complaintSpike` (ratio of complaint-term frequency vs baseline).
- Word-cloud of dominant terms and the source rows behind it; competitor/client watchlist.

## Procedure
1. Open the A8 word-cloud and identify the complaint terms driving the spike.
2. Read the underlying posts; classify each as competitor issue, category issue, or client mention.
3. Determine whether any thread names a client or directly competitive product.
4. Summarise the signal in 3–5 bullets: who, what, how loud, and the so-what.
5. If it reveals a competitor weakness, draft a positioning/messaging note for sales/marketing.
6. If it reveals a risk to a client, alert that client's owner and consider a crisis-comms check.
7. File the intelligence note in the competitive-intel log with links.
8. Acknowledge and resolve the Action card with the note attached.

## Escalation path
Analyst produces the intel note. If the spike concerns a client by name with negative sentiment,
escalate to the Founder and trigger Inbound Press Response (SOP-A4) / Crisis Comms (SOP-B3) as needed.
Strategic competitor moves escalate to the Founder for a positioning decision.

## Definition of done
Spike investigated and classified, an intelligence note filed with links, the relevant team (sales,
marketing, or a client owner) briefed where actionable, and the Action card resolved within 48h.
