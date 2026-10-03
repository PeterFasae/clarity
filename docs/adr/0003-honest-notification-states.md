# 0003: Honest notification states, and device confirmation for time-critical reminders

- **Status:** Accepted on 3 October 2026.
- **Date:** 2026-10-03
- **Decision owner:** Peter Fasae
- **Roadmap item:** the notification service (Week 6) in [`docs/plan/backend-roadmap.md`](../plan/backend-roadmap.md). D17 sets the values this decision needs: the acknowledgement timeout, and `TTL` and `Urgency` by kind.
- **Supersedes:** "delivery receipts" and the `undelivered` state in [`backend-architecture.md`](../plan/backend-architecture.md) §7 (the draft of 2 October 2026)
- **Evidence:**
  - E2 in [`neurodiversity-evidence.md`](../research/neurodiversity-evidence.md): reminders help prospective memory. The trust effect is one lab study, not yet replicated.
  - [RFC 8030](https://www.rfc-editor.org/rfc/rfc8030.html), checked 3 October 2026: a `201` "does not indicate that the message was delivered to the user agent", and an application server "MUST include the TTL" header.
  - [Mozilla autopush](https://mozilla-services.github.io/autopush-rs/http.html): it "cannot guarantee end-to-end delivery".
  - [Amazon SES](https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html), checked 3 October 2026: `Delivery` means SES "successfully delivered the email to the recipient's mail server".
  - Issue 5 of the 2 October review.

## Problem
The draft recorded a "delivery receipt" when a push service accepted a message, and called the opposite "undelivered". Acceptance only means the push service has the message. After that, a closed browser, an offline phone or an expired subscription can still lose it, and we would have told the user it arrived. For someone relying on reminders (E2), a confident wrong status is worse than an honest unknown.

## Proposed approach
Architecture §7, items 5–8, has the detail.
- **Every channel:** record only what we know: `queued`, `accepted`, `rejected`, plus `shown_on_device` and `unconfirmed` where a device can confirm. Copy says "sent", never "delivered".
- **Time-critical reminders:** the push carries a single-use token, which the service worker posts back after showing the notification. With no confirmation by the timeout, the attempt becomes `unconfirmed`, the reminder goes to email if the user turned email on, and its inbox item is marked.
- **Every push:** `TTL` and `Urgency` by kind, and nothing is held into quiet hours.

## Alternatives considered
- **Keep calling a `201` "delivered".** Simplest, and untrue.
- **Ask for device confirmation on every reminder.** It would tell the user more, but it records device activity for every nudge, including the many where no fallback depends on it, and it adds a request and a delayed check per notification.
- **Send every reminder by push and email at once.** Higher reach, but it doubles interruptions, against the attention budget (E5).

## Trade-offs
Honest states everywhere, and a fallback where a miss costs most. The costs: one route that authenticates by token alone rather than by session, one delayed check per time-critical push, and a possible duplicate when a held push arrives after the fallback email.

## Cost
For each time-critical push: one SQS message, one small write, and an SES email only when no confirmation arrives. Negligible at pilot scale.

## Privacy and security
- New data, for time-critical reminders only: the server time at which a device confirmed showing the notification. No IP address, user agent or device details. The privacy notice says so.
- The token is random and single-use, stored only as a hash, and expires with the attempt. The route always answers `204`, so it can't be used to test tokens, and it is throttled.
- Attempt records hold no push endpoint and no content, are kept for 30 days, and are covered by export and deletion.

## Migration risk
None: nothing is built yet. The service worker gains one request after `showNotification`, as part of the later PWA work.

## Recommendation
Honest states everywhere; device confirmation and email fallback only for time-critical reminders, where a missed reminder costs most.

---

## Decision
> "Choose A everywhere, plus B for time-critical reminders. Use honest states such as queued, accepted, rejected, shown on device and unconfirmed—never call push-service acceptance 'delivered'. Time-critical reminders should request a device acknowledgement and fall back to email after a defined timeout. Every push must have an expiry and urgency."

Option A was honest states on every channel. Option B was a device acknowledgement, with a fallback.

Later on 3 October 2026:
> "Decisions 2 and 5 are approved in principle."

Accepted later the same day:
> "Once these wording and fingerprint changes are made, mark ADR 0001, ADR 0002, ADR 0003 and ADR 0004 Accepted."

## Consequences
- Updated on 3 October 2026: architecture §0, §1 (the `deliver` Lambda is renamed `dispatch`), §2, §5, §7, §13 and §14; roadmap Week 6, Gate 6 and D17; the evidence file (E2, COGA objective 7, §6 and §7); CLAUDE.md, `rules/backend.md` and `rules/claims-and-copy.md`.
- `DLV#` becomes `ATT#` (a notification attempt). `reminder.delivered` becomes `reminder.sent`, and `reminder.shown` and `reminder.unconfirmed` are added.
- Values still to decide in D17: the acknowledgement timeout (proposed 2 minutes) and `TTL` by kind (proposed 15 minutes, 1 hour and 12 hours).
- How we will know it worked: the SLO (time-critical reminders confirmed on a device, or sent to email, on time) and the share confirmed on a device, reported as an observed figure.

## How to explain this
To be written when this lands.

## Questions a reviewer will ask
To be written when this lands.
