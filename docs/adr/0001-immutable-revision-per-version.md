# 0001: One immutable revision per accepted version

- **Status:** Accepted on 3 October 2026.
- **Date:** 2026-10-03
- **Decision owner:** Peter Fasae
- **Roadmap item:** D7 in [`docs/plan/backend-roadmap.md`](../plan/backend-roadmap.md), with a consequence for D9 (retention)
- **Supersedes:** "Revision coalescing" in [`backend-architecture.md`](../plan/backend-architecture.md) §3, item 5 (the draft of 2 October 2026). Nothing in `docs/decisions.md`.
- **Evidence:** E3, E6 and COGA objective 4 ("help users avoid mistakes and know how to correct them") in [`neurodiversity-evidence.md`](../research/neurodiversity-evidence.md); issue 2 of the 2 October review.

## Problem
The 2 October draft let autosaves from one device, within a two-minute window, update the latest revision instead of adding a new one. A version the server had accepted, and told the client was saved, could then be overwritten and never recovered. That breaks the first promise in architecture §0: no accepted write is ever lost.

## Proposed approach
- Every version the server accepts gets its own revision, `REV#<noteId>#<version>`. It is written once, in the same transaction as the head, on condition `attribute_not_exists`, so nothing can overwrite it.
- Write volume is controlled before the server: the client debounces autosave (architecture §4, client contract). Text not yet sent waits in the client's local queue.
- A history view may group revisions by editing session. Grouping is presentation only.

## Alternatives considered
- **Coalesce autosaves into the latest revision**, as drafted. Fewer items, but it overwrites versions the user was told were saved.
- **Keep every version for a while, then compact** to one per editing session. Bounded storage, but it deletes accepted history on a timer: the same break, later.
- **Store deltas instead of snapshots.** Smaller, but one damaged delta breaks every later version, and a restore needs a replay. Possible later as a storage optimisation, provided every version stays reconstructable.

## Trade-offs
More revision items and more write units per save, in return for a guarantee that is simple to state and to test: one revision per accepted version. Debounce moves volume control to the client, so a misbehaving client can write more than it should; API Gateway throttling bounds that.

## Cost
Each save writes the content twice (head and revision) in a transaction, and transactional writes cost twice the standard write units per item. Storage grows by about one snapshot per debounced save. Both stay small at pilot scale; the debounce interval is the lever (roadmap, budget guardrails).

## Privacy and security
- Text the user edits out of a note stays in its history. That is the point of history, so the privacy notice must say it.
- How long revisions are kept is D9's decision, still open. One option Peter has named for D9: an explicit, user-requested permanent purge for secrets stored by accident, documented as an exception to history retention. Until then, the only way to remove such text is to delete the note permanently.
- Export includes every revision. Permanent delete and account deletion remove them.

## Migration risk
None for data: nothing is deployed, and revisions don't exist yet. The client contract gains the debounce rule.

## Recommendation
Keep every accepted version, immutably, and control volume with client-side debounce. It is the only option that keeps "no accepted write is ever lost" true without conditions.

---

## Decision
> "Choose A. Keep an immutable revision for every accepted version. Reduce unnecessary writes by debouncing autosaves before they reach the server, not by deleting or overwriting accepted history."

Option A was one immutable revision per accepted version, with client-side autosave debounce.

Later on 3 October 2026:
> "Decisions 2 and 5 are approved in principle."
>
> Decision 2
> - Keep the immutable revision-per-accepted-version design.
> - However, revision retention is still Decision 9. Do not present “life of the note” as final yet.
> - The eventual design may allow an explicit user-requested permanent purge for accidentally stored secrets, documented as an exception to history retention.

Accepted later the same day:
> "Once these wording and fingerprint changes are made, mark ADR 0001, ADR 0002, ADR 0003 and ADR 0004 Accepted."

## Consequences
- Updated on 3 October 2026: architecture §2, §3 (items 3, 5 and 8), §4 (client contract) and §13; roadmap D7, D9, Weeks 3–4, Gate 5 and the budget guardrails; CLAUDE.md and `rules/backend.md`.
- Revision retention stays with D9, undecided. This ADR rules out only deleting or overwriting revisions to reduce writes.
- The debounce values are proposals, decided with D7.
- How we will know it worked: the Gate 5 property test (each version recoverable from its own revision, byte-identical) and the daily reconciliation job.

## How to explain this
To be written when this lands (CLAUDE.md, "How we work", step 4).

## Questions a reviewer will ask
To be written when this lands.
