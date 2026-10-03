# 0002: A per-user change log and note membership list for sync

- **Status:** Accepted on 3 October 2026.
- **Date:** 2026-10-03
- **Decision owner:** Peter Fasae
- **Roadmap item:** D10 in [`docs/plan/backend-roadmap.md`](../plan/backend-roadmap.md). The membership list also changes how D8's trash purge and the deletion orchestrator work.
- **Supersedes:** in [`backend-architecture.md`](../plan/backend-architecture.md) (the draft of 2 October 2026), the `UserIdIndex`-based changes feed, full resync, export and account deletion (§2–4, §13), and the TTL-based trash purge (§3, item 7).
- **Evidence** (AWS documentation, checked 3 October 2026):
  - "All reads from GSIs and streams are eventually consistent" ([read consistency](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html)).
  - Index updates arrive "within a fraction of a second, under normal conditions. However, in some unlikely failure scenarios, longer propagation delays might occur" ([global secondary indexes](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html)).
  - Isolation is serialisable between a transaction and `GetItem`, and read-committed between a transaction and `Query`. A transaction holds up to 100 items and 4 MB, and writes each item twice, to prepare and to commit ([transactions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html)).
  - TTL deletes expired items "within a few days of their expiration time", and until then they still appear in queries ([TTL](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/howitworks-ttl.html)).
  - On-demand prices in US East: $0.625 per million write units and $0.25 per GB-month of storage ([pricing](https://aws.amazon.com/dynamodb/pricing/on-demand/)). The page doesn't show London.
  - Issue 3 of the 2 October review.

## Problem
The draft read `UserIdIndex` wherever it needed a user's notes: the changes feed, full resync, export and account deletion. Index reads are eventually consistent, and AWS gives no upper bound on the lag. So a device could miss a write, a resync could miss a note, an export could leave one out, and account deletion could leave one behind. `updatedAt` also comes from Lambda clocks, so it isn't commit order.

## Proposed approach
Architecture §2–4 and §13 have the full design. In short:
- **A per-user change log.** `SEQ` is a counter; `CHG#<seq>` is one entry per committed change (ids, version, type, op id; never content). A write reads `SEQ` consistently, then commits one transaction holding the counter (on condition it hasn't moved), the head, the revision and the change entry. A cancelled transaction uses no number, so there are no gaps, and sequence order is commit order.
- **A per-user membership list.** `NOTE#<noteId>` exists for every note that exists, live or in the trash. It is put in the same transaction as the create and deleted in the same transaction as the permanent delete. Read with `ConsistentRead`, it lists every note that exists for the whole of the query; a note created or permanently deleted during the query may or may not appear, and the change log reports it either way.
- **Only these serve reads that must be complete.** The feed reads `SEQ` first, then a consistent query bounded by it. Full resync, export and account deletion list notes from the membership list and read each head consistently.
- **Full resync is not a snapshot of one moment.** Changes after the high-water mark may already show in it, and the feed from that mark delivers them again, which is harmless. A note deleted after the mark gets its `purge` entry whether or not the resync left it out (architecture §4).
- **The trash purge becomes a transaction.** A TTL delete can't remove the membership item with the head, so a one-time schedule at `purgeAt` runs the permanent-delete transaction instead.
- **Account deletion closes writes first.** It sets a flag on `SEQ` that every note transaction's counter condition checks, so nothing commits after the membership list is read.
- **`UserIdIndex` stays, for listing and search only.** No correctness property reads it, so it can lag, or be rebuilt, without a missed write or a missed deletion.

## Items per transaction, contention and cost
Architecture §4, "Transaction size, contention and cost", has the table. In short:
- **Items.** 5 for a create or conflict copy (head, revision, `SEQ`, `CHG#`, `NOTE#`); 4 for an edit, merge, soft delete or restore; 4 for a permanent delete (head, `NOTE#`, `SEQ`, `CHG#`). ADR 0004 adds two small items to each client request, the operation receipt and the stored response: 7 for a create, 6 for an edit or a user's permanent delete. The scheduled trash purge stays at 4. The limit is 100.
- **Contention.** Only on `SEQ`, and only between one user's own writes. `NOTE#` adds no hot item: it changes only at create and permanent delete, and the clashes it could meet (a replay of the same create, or an edit racing a purge) are already settled by the head's condition. A lost race for `SEQ` retries with jittered backoff, at most 5 attempts, then `503` with `Retry-After`. A failed head condition is a `409` and is never retried.
- **Cost.** About 20 write units to edit a 4 KB note and 22 to create one, against 4 for today's single put, plus one read unit for `SEQ`. Membership adds about 2 write units to a create and a permanent delete, and nothing to an edit. A 30-user pilot saving 100 times a day each comes to about 1.8 million write units a month: about $1.10 at US East prices. London is a little higher.

## Alternatives considered
- **Keep the index feed, with an overlap window:** re-read the last N seconds and dedupe. Simple, but N is a guess, because index lag has no documented upper bound.
- **Full resync from the index, corrected by the change log**, as this ADR first proposed. Correct only if the index is never 30 days behind, which AWS doesn't promise.
- **DynamoDB Streams as the feed.** Also eventually consistent, kept for only 24 hours, and not readable per user.
- **Allocate with `ADD` outside the transaction.** No retry loop, but a write that fails after allocating leaves a permanent gap, and a reader can't tell a gap from a write still in flight.
- **Timestamps as the cursor.** Lambda clocks differ, so timestamp order isn't commit order.
- **Keep the TTL trash purge and fix the membership list afterwards.** Simpler, but the list would be wrong between the TTL delete and the fix, which is the gap the membership list exists to close.

## Trade-offs
Exact and gap-free, with no index and no timing assumption. The costs: one user's writes serialised through `SEQ`; one consistent read per write; two or three more items in each transaction than revisions alone need; a scheduled job for the trash purge instead of free TTL deletes; and a membership item per note to keep exact, checked daily by the reconciliation job.

## Privacy and security
The change log and membership list hold ids, versions and times, never content. They are still personal data, so export and deletion cover them, and each has a retention period: 30 days for the change log, and until the note is permanently deleted for membership. Because account deletion closes writes before it lists notes, it can't miss one created during it.

## Migration risk
None for data: nothing is deployed. The client contract changes from an opaque time cursor to a sequence number, and full resync returns the heads listed by membership.

## Recommendation
Approve the change log and the membership list together. Between them, "a device never silently misses a write" and "account deletion leaves nothing behind" hold by construction, with no index and no timing assumption.

---

## Decision
Peter's words, 3 October 2026. First:
> "Choose B in principle. Use a transactional per-user change log rather than the eventually consistent GSI as the authoritative sync cursor. Before finalising it, explain exactly how sequence numbers are allocated under concurrent writes and how contention is handled. Do not claim exactly-once behaviour unless the tests and design genuinely provide it."

Then:
> Decision 3
> - I approve the transactional per-user sequence approach in principle.
> - Do not mark ADR 0002 Accepted yet; keep it Proposed until these remaining details are approved.
> - Remove the remaining reliance on UserIdIndex for full resync, export, and account deletion.
> - Add a strongly consistent NOTE#\<noteId\> membership item to the user partition, maintained transactionally when notes are created or permanently deleted.
> - Use that membership list for full resync, export, and account deletion.
> - Explain the resulting transaction item count, contention behaviour, and cost before asking for final approval.
> - Do not make correctness depend on assuming that a GSI cannot be 30 days behind.

Then:
> ADR 0002 is approved in substance, including:
> - the transactional per-user sequence;
> - NOTE# membership items;
> - scheduled transactional trash purges;
> - the account-closing write gate;
> - the stated item counts, contention model and pilot cost.
>
> Before marking it Accepted, correct one sentence in architecture §4. It currently says every membership item created before hw must still be visible to the later membership query. That is not literally true if a permanent deletion commits after hw but before the query. Explain the actual concurrency behaviour:
> - changes after hw may alter the membership list or returned head;
> - those changes are subsequently received through the feed after hw;
> - returning a newer head twice is harmless;
> - a note deleted after hw may already be absent from the resync and will subsequently receive its purge entry.
>
> The guarantee still holds, but the explanation must not claim a fixed snapshot that DynamoDB is not providing.

Accepted:
> "Once these wording and fingerprint changes are made, mark ADR 0001, ADR 0002, ADR 0003 and ADR 0004 Accepted."

Option B was a transactional per-user change log.

## Consequences
- Architecture §2–4 and §13, roadmap D10, Weeks 3–4 and Gate 5, CLAUDE.md and `rules/backend.md` follow this ADR.
- `UserIdIndex` stays, for listing and search only.
- What the tests prove (Gate 5): no gaps or repeats under concurrent writers; pages without gaps; heads and membership items matching one to one; full resync, export and deletion unaffected by a stale or empty index; account deletion racing a create leaving nothing behind; convergence under re-delivery. What they don't prove: exactly-once delivery. Nothing claims it.

## How to explain this
To be written when this lands.

## Questions a reviewer will ask
To be written when this lands.
