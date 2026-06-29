# SOP-B9 — Escalate Blocked

| Field | Value |
|-------|-------|
| **SOP ID** | SOP-B9 |
| **Source** | B9 — Trello (delivery boards) |
| **Owner / Assignee** | Admin |
| **SLA** | 48 hours from trigger |
| **Severity** | Medium |
| **Sensitivity** | Standard |

## Dashboard question answered
**Trigger** — "Has a delivery card been blocked too long and needs escalation to move?"
(The widget's `question` badge is `trigger`.)

## Trigger condition (plain English)
Fire when a delivery card has sat in a blocked state for more than **3 days** — i.e. `blockedDays > 3`.
A card blocked beyond three days threatens the sprint/delivery commitment and usually needs a decision
above the team to clear it.

## Inputs / Data source
- Trello boards for the member (lists, cards, labels, last-activity) — bar of blocked-age per board.
- Normalized metric: `metrics.blockedDays` (longest time a card has been blocked).
- The delivery plan, dependency owners, and the client commitment dates.

## Procedure
1. Open the B9 widget and identify the longest-blocked card and its board.
2. Read the card to find the blocker, the dependency owner, and what is being waited on.
3. Contact the dependency owner for status and an unblock ETA.
4. Decide the path: chase the dependency, re-scope the card, or escalate to a decision-maker.
5. Take the action and assign a clear owner and deadline to clear the block.
6. If the block risks a client date, pre-warn the client owner.
7. Update the Trello card with the resolution plan and remove the blocked label when cleared.
8. Acknowledge and resolve the Action card once the block has a committed clearance plan.

## Escalation path
Admin drives unblocking. If the blocker is a cross-team or vendor dependency that the team cannot move,
escalate to the Founder for a decision or vendor pressure. Client-date risk escalates to the account
owner and Founder (coordinate with SOP-B8 if onboarding-related).

## Definition of done
The blocked card's cause identified, a clearance plan with owner and deadline agreed, the client
pre-warned if a date is at risk, the Trello card updated, and the Action card resolved within 48h.
