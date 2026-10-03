# Backend architecture: target design

**Status: proposed, 2 October 2026.** This is where Phases 4–7 are heading. It is not a description of what exists. Every section marked **[ADR]** is a consequential decision: it is proposed, approved by Peter, and recorded in `docs/adr/` before any implementation starts. A section here is the recommended starting point for that proposal, not the decision itself.

**Decided on 3 October 2026**, each recorded in `docs/adr/` and the decision log:
- [ADR 0001](../adr/0001-immutable-revision-per-version.md): one immutable revision per accepted version (§3).
- [ADR 0002](../adr/0002-per-user-change-log.md): the per-user change log and note membership list (§2–4, §13).
- [ADR 0003](../adr/0003-honest-notification-states.md): honest notification states (§7).
- [ADR 0004](../adr/0004-durable-operation-receipts.md): durable operation receipts, keyed request fingerprints and content-free responses (§3, §4).

Everything else here is still a proposal.

Evidence IDs (E1–E12) refer to [`docs/research/neurodiversity-evidence.md`](../research/neurodiversity-evidence.md).

---

## 0. The four priorities, as architecture

In order. When two of them conflict, the higher one wins.

1. **Integrity and trust.**
   - No accepted write is ever lost.
   - Every destructive action can be undone within its retention period.
   - Retries are safe.
   - Conflicts are detected, and both sides are kept.
   - The user is always told the truth about state: saved or not saved; sent, shown on their device, or couldn't reach them. Nothing a provider has only accepted is ever called "delivered" (ADR 0003).
2. **Low-friction capture.** There is one capture command with many entry points: web, mobile web, email, voice, share. Capture never waits on AI, on organisation, or on a second step.
3. **Reliable reminders and resurfacing.** There is one scheduler, one notification service, and one attention budget. Reliability matters more than volume (E2, E5).
4. **Learning and memory support.** It is built on the same notes, events, scheduler and notification service, not bolted on beside them (E9, E10).

**Hard constraints that apply to all four:**
- Privacy.
- Every AI capability has a non-AI fallback.
- No shame mechanics (E6).
- Evidence over feature count.

**The backbone they share.** These are not four features. They are four uses of one set of mechanisms:

| Mechanism | Integrity | Capture | Reminders & resurfacing | Learning |
|---|---|---|---|---|
| Versioned write path (§3) | ✔ core | ✔ every channel uses it | ✔ reminders are versioned entities | ✔ review state is versioned |
| Change feed / sync (§4) | ✔ offline replay | ✔ offline capture | ✔ next-open triggers | — |
| Event backbone (§5) | ✔ purge, reconciliation | ✔ capture.received | ✔ schedule sync | ✔ review items from notes |
| Scheduler (§7) | ✔ trash purge, exports | — | ✔ core | ✔ review due dates |
| Notification service (§7) | ✔ "couldn't save" / "couldn't reach you" | — | ✔ core | ✔ review nudges, through the same budget |
| Search (§8) | ✔ find anything you lost | — | ✔ related-note resurfacing | ✔ find what to review |

---

## 1. Shape of the system

```
 clients ── web app, installed PWA, email-in, share target, voice
    │  HTTPS · Cognito JWT (passkeys first, email code fallback)
    ▼
 API Gateway (REST, /v1) ── throttling · body-size limits · Cognito authorizer
    ▼
 Lambda handlers (TypeScript, Node.js 24, arm64) ── zod at the boundary
   capture · notes · revisions · trash · changes · search · reminders
   review · inbox · preferences · me (export / delete) · push subscriptions
    │  TransactWriteItems (note head + revision + change-log entry, atomically)
    ▼
 DynamoDB
   NotesTable        note heads; the report's design (PK noteId, GSI UserIdIndex)
   UserDataTable     everything else a user owns, under PK USER#<sub>
   PreferencesTable  unchanged (ADR 0.8), extended
    │  DynamoDB Streams = the outbox
    ▼
 eventRouter ──► EventBridge bus "clarity-<stage>" ──► consumers (idempotent, each with a DLQ)
   enrichment (local always; AI optional, async)   search indexer   schedule sync
   purge cascade   resurfacing candidates   aggregate metrics (research opt-in only)
    ▼
 EventBridge Scheduler ──► SQS ──► dispatch ──► Notification service
                                                attention budget · quiet hours · digest
                                                push (VAPID) → email (SES) → in-app inbox
 S3 (SSE-KMS, lifecycle expiry): audio · exports · raw inbound email
 AI gateway ──► Amazon Bedrock, eu-west-2 in-region or EU geo profile only [ADR]
```

Region: **eu-west-2 (London)**, decided on 3 October 2026 ([ADR 0005](../adr/0005-london-region.md)). Nothing is deployed yet, so moving from eu-north-1 has no data-migration cost. Residency is described with AWS's documented exceptions, and nothing here claims London is faster or cheaper.

---

## 2. Data model [ADR: data model v2]

### Note heads stay in NotesTable

The partition key stays `noteId`, and the `UserIdIndex` GSI stays (`userId`, `updatedAt`). That keeps the report's design (§4.3C), and its published figures, comparable. New attributes:

| Attribute | Purpose |
|---|---|
| `version` (N) | Starts at 1. Goes up by 1 on every accepted change. Drives optimistic concurrency |
| `contentHash` (S) | SHA-256 of `content`. Makes replays and duplicate detection exact |
| `deletedAt`, `purgeAt` (epoch seconds) | Soft delete. Trash retention [decision: proposed 30 days]. `purgeAt` is not a DynamoDB TTL attribute: the purge is a transaction that also removes the note's membership item (§3, item 7; ADR 0002) |
| `source`, `capturedAt`, `deviceId` | Which entry point, the client clock (informational only), and an opaque device id |
| `aiExcluded` (BOOL) | Per-note "never send this to AI". Default false; the client can default it on for some notes |
| `enrichedVersion` | The `version` that `summary`/`actions` were computed from |
| `lastOpenedAt` | Used only for resurfacing. User-visible, deletable, and removed if resurfacing is off [privacy decision] |
| `reviewEnabled` (BOOL) | "Learn this" opt-in |

`content` is still never written by enrichment.

### Everything else a user owns goes in UserDataTable

PK `USER#<sub>`, with sort-key prefixes:

| SK | Entity | TTL |
|---|---|---|
| `REV#<noteId>#<version, zero-padded>` | Revision snapshot: content, title, tags, hash, device, reason (`edit`, `restore`, `merge`, `conflict-copy`, `delete`). One per accepted version, written once and never updated (ADR 0001) | D9, undecided (§13) |
| `SEQ` | The user's change counter: `seq`, the last number allocated, and `lastExpiresAt` (§4) | Account lifetime |
| `CHG#<seq, zero-padded>` | Change-log entry: `noteId`, `version`, `type`, `opId`, `committedAt`, `expiresAt`. **No content** (§4) | 30 days [decision, D10] |
| `NOTE#<noteId>` | Note membership: one item for each note that exists, live or in the trash. Put in the create transaction, deleted in the permanent-delete transaction (§4, ADR 0002) | Until the note is permanently deleted |
| `IDM#<opId>` | The exact response to a successful mutation: status and content-free body (§3, item 2) | 30 days |
| `OPR#<opId>` | Operation receipt: type, entity id, resulting version, change-log number, applied time, and a keyed request fingerprint with its key id and canonicalisation version. No note text, but the fingerprint is protected derived data (§3, item 2; ADR 0004) | Account lifetime; removed by account deletion |
| `REM#<reminderId>` | Reminder | Until done or cancelled, plus 30 days |
| `ATT#<reminderId>#<attempt>` | Notification attempt: channel, state (§7), timestamps, and a hash of the acknowledgement token if one was requested. No endpoint, no content | 30 days |
| `PUSH#<subscriptionId>` | Web Push subscription (endpoint and keys stored encrypted) | Until revoked or expired |
| `RVW#<itemId>` | Review item: FSRS state, prompt type, source note and version, created by (`local` or `llm`) | Until disabled |
| `CAP#EMAIL` | Hashed capture-address token and allowed sender addresses | — |
| `AIL#<isoTime>#<id>` | AI activity log: note id, version, feature, model, region, token counts, outcome. **No content** | 12 months [decision] |
| `BUD#<yyyy-mm-dd>` | Attention-budget counters | 3 days |
| `CNS#<type>#<version>` | Consent records (`ai`, `research`): accepted at, hash of the text shown | Account lifetime |

**One rule, and why:** *everything a user owns lives under `USER#<sub>`, except note heads.* Export and deletion then become one strongly consistent partition query, which includes the `NOTE#` membership list, plus a consistent read of each listed note head: no index, and no special cases to forget. That is the failure mode ADR 0.8 was worried about. Start with no GSIs and add one only for a measured access pattern.

### PreferencesTable stays (ADR 0.8) and gains

- `timezone` (IANA)
- `quietHours`
- `dailyInterruptBudget`
- `digest {enabled, times[]}`
- `resurfacing {enabled, perDay}`
- `review {enabled, dailyCap}`
- `timeAnchors {morning, afternoon, evening}`, which resolve "tomorrow morning" (E1)
- `aiConsentVersion`

### Limits, enforced by zod at the boundary

> **Not accepted as written (3 October 2026).** Peter found two faults in this table: the 256 KB body limit conflicts with the 100,000-character content limit, and the item-size reasoning ignores generated summary and actions and DynamoDB's attribute overhead. "Far below 400 KB" is also wrong for 4-byte text. A revised proposal is waiting for his decision. Do not build to this table.

| Field | Limit |
|---|---|
| `content` | ≤ 100,000 characters, keeping the item far below DynamoDB's 400 KB |
| `title` | ≤ 200 characters |
| `tags` | ≤ 20 tags, each ≤ 40 characters |
| Reminders | ≤ 20 per note |
| JSON request body | ≤ 256 KB |

Audio never goes through the API; it uses presigned S3 uploads. Exceeding a limit returns a plain-language 413 or 422, never a 500.

---

## 3. Write path: never lose anything [ADR: concurrency and versioning]

1. **Client-generated ids (UUIDv7)** for notes, reminders and review items. A create is a `Put` with `attribute_not_exists(noteId)`:
   - same id and same `contentHash` → `200` with a content-free receipt (a replay; item 2);
   - same id, different content → `409 id_conflict`.
2. **Every mutation carries an `Idempotency-Key`**: the client's operation id, a UUIDv7 that is new for each operation and never reused ([ADR 0004](../adr/0004-durable-operation-receipts.md)).
   - **Responses are content-free.** A success is a receipt: identifiers, version and timestamps. A `409` carries the current version and its code. Neither ever carries note text; content comes from reads.
   - **The exact successful response is stored for 30 days** (`IDM#<opId>`). A replay within that time returns its status and body byte for byte and changes nothing. Failed mutations are not covered by that guarantee: they changed nothing, so nothing is stored, and a repeat is evaluated again against the current state.
   - **Every applied operation leaves a durable receipt** (`OPR#<opId>`), kept for the account's lifetime and removed by account deletion. The receipt and the stored response are written in the same transaction as the change. So the server can tell "never applied", "already applied, original response expired" and "conflicts with newer state" apart at any age: a late replay is never applied twice and never becomes a duplicate conflict copy.
   - **The receipt holds a keyed request fingerprint, never a plain hash.** A plain hash of a request that contains a pasted password could be tested against guesses offline.
     - The fingerprint is HMAC-SHA-256, computed by AWS KMS with a dedicated HMAC key (key spec `HMAC_256`) used for nothing else, over the SHA-256 digest of the canonical request. KMS accepts at most 4,096 bytes, so it sees the digest, never note text. The digest exists only in memory.
     - The receipt stores the fingerprint, the KMS key id and the canonicalisation version. A replay is checked with `VerifyMac`, using the key the receipt names.
     - **Canonical request, version 1.** The tag `fp1`, then the method in upper case, then the path (ids in lower-case UUID form, no trailing slash; mutations take no query parameters), then the body. The body is taken as the route's schema validated it: unknown fields dropped, no defaults filled in. It is serialised with the JSON Canonicalization Scheme (RFC 8785). The four parts are joined with newlines, which can't occur unescaped inside them. Headers are left out, because the sync and access tokens change between attempts, and request schemas carry no per-attempt fields.
     - **Versions and rotation.** A schema change that would alter the canonical form of a request already sent gets a new canonicalisation version, and each old version stays available while receipts use it. KMS doesn't rotate HMAC keys automatically, and a fingerprint can't be migrated without the original request, which isn't kept. So rotation means a new key for new receipts. Each old key stays available for `VerifyMac` only, for as long as any receipt names it.
     - **What it is:** protected derived data, not "no content". It is derived from the request, note text included. So it is never logged or exported, it is removed with the account, and a guess can't be checked against it without the KMS key, which only the API's functions can use and CloudTrail audits.
   - **Every error has a stable, machine-readable code** (§4, "Error responses"), so clients never rely on status text.
3. **Optimistic concurrency.** The request carries `baseVersion`. A single `TransactWriteItems` does all of this together:
   - updates the head with `SET …, version = version + 1`, conditioned on `version = :base AND attribute_not_exists(deletedAt)`;
   - puts `REV#<noteId>#<base+1>`, conditioned on `attribute_not_exists`, so a revision can never be overwritten;
   - advances the user's `SEQ` from `s` to `s + 1`, on condition that it is still `s` (§4);
   - puts the change entry `CHG#<s + 1>` (§4);
   - for a create, puts the membership item `NOTE#<noteId>`; for a permanent delete, deletes it (§4);
   - for a client request, puts the operation receipt `OPR#<opId>` and the stored response `IDM#<opId>`, both on condition `attribute_not_exists` (item 2).

   All of it happens or none of it does. The head can never be ahead of its history, no change commits without its place in the sync log, and the membership list always matches the notes that exist. Every accepted change has this shape, with the conditions that fit it: edits, merges, conflict copies, deletes, restores and permanent deletes. §4 lists the items for each.
4. **On a version mismatch:** `409 version_conflict` with the current version and the stable code, never the note's text (ADR 0004). The client reads the latest note before merging, or sends its own text to `POST /v1/notes/{id}/merge` with `{baseVersion, content}`, which merges on the server. Either way, it is a three-way line merge against the base revision:
   - **clean** → commit with reason `merge`;
   - **overlapping** → keep the server head **and** save the incoming text as a **conflict copy**: a new note linked by `conflictOf`, with its own revision.

   Nothing is ever silently dropped (E11: system changes are labelled and reversible).
5. **One immutable revision per accepted version** (ADR 0001). Every version the server accepts gets its own revision, written once and never updated or merged into another. Write volume is reduced before it reaches the server, by the client's autosave debounce (§4, client contract), never by overwriting or deleting history. How long revisions are kept is D9, not yet decided (§13). A history view may group revisions by editing session; that grouping is presentation only.
6. **Delete is a soft delete.**
   - It sets `deletedAt` and `purgeAt` and writes a revision with reason `delete`.
   - The note is hidden from lists and search.
   - `GET /v1/trash` lists the bin; `POST /v1/notes/{id}/restore` restores a note.
   - `DELETE /v1/trash/{id}` deletes permanently, now: one transaction deletes the head and its `NOTE#` membership item and appends a `purge` change entry (§4). Revisions and derived data follow through the purge cascade (item 7).

   **Account deletion stays immediate and total.** Rule 7's clear deletion policy is kept: trash is a safety net the user controls, not retention we impose.
7. **The trash purge is a transaction, not a TTL delete** (ADR 0002). DynamoDB TTL removes items "within a few days" of expiry and can't remove a second item with them, so it can't keep the membership list exact. Instead:
   - reads treat `purgeAt < now` as already gone;
   - a one-time EventBridge Scheduler schedule at `purgeAt` runs the same transaction as `DELETE /v1/trash/{id}`, on condition that the note is still in the trash with that `purgeAt`, so a restored or re-deleted note is left alone;
   - the daily reconciliation job purges any note past its `purgeAt` whose schedule failed, so a lost schedule can't keep deleted text;
   - a purge consumer then cascades the delete to revisions and derived data;
   - privacy copy gives honest bounds;
   - PITR backups keep data for the configured recovery period, which is disclosed [ADR: retention and backups].
8. **Reconciliation job (daily).** Every accepted version of every note must have its own revision, unless a retention rule decided in D9 has removed it; every note head must have its `NOTE#` membership item, and every membership item its head; no orphans may exist; and the change log must run without a gap from its oldest unexpired entry to `SEQ`. Any violation is an alarm, never a quiet fix.

---

## 4. Sync and offline [ADR 0002]

**Decision 3: accepted** ([ADR 0002](../adr/0002-per-user-change-log.md), 3 October 2026). The authoritative sync cursor is a per-user change log, written in the same transaction as each change, and a per-user membership list records which notes exist. `UserIdIndex` stays, for listing and search only. "All reads from GSIs and streams are eventually consistent" (AWS), and AWS gives no upper bound on the lag, so nothing that must be complete reads it: not sync, full resync, export or account deletion.

**What is stored** (UserDataTable, §2):
- `SEQ`: the user's counter. `seq` is the last number allocated.
- `CHG#<seq>`: one entry per committed change, holding `noteId`, `version`, `type`, `opId` (the mutation's `Idempotency-Key`), `committedAt` and `expiresAt`. Ids and versions only, never content.
  - Types: `create`, `update`, `delete`, `restore`, `merge`, `conflict-copy` and `purge`, plus `enriched` if D11 adds asynchronous write-backs.
- `NOTE#<noteId>`: one membership item for each note that exists, live or in the trash. It is put in the create transaction and deleted in the permanent-delete transaction, and nothing else changes it. Read with `ConsistentRead`, it lists every note that exists for the whole of the query. A note created or permanently deleted while the query runs may or may not appear; its change entry reports it either way.

**Allocating a number**, for every accepted change:
1. Read `SEQ` with a strongly consistent `GetItem`. Call the value `s` (0 if there is no item yet).
2. Commit one `TransactWriteItems` (§3, item 3): the head; the revision (except for a permanent delete); `SEQ` set to `s + 1` on condition `seq = s` (or `attribute_not_exists` for the first write); `CHG#<s + 1>` on condition `attribute_not_exists`; and, for a create or a permanent delete, the `NOTE#` item.
3. All of it commits, or none of it does. A cancelled transaction uses no number, so the log has no gaps. Each commit is conditioned on the number before it, so no two commits can share a number, and sequence order is commit order.

**Contention.** Only one user's own concurrent writes compete for that user's counter. Different users never contend, and autosave debounce keeps contention rare. A cancelled transaction reports which condition failed:
- **The head's condition, whatever else failed:** the note changed first. Return the §3 outcome, such as `409 version_conflict` with the current version and no note text. The server learns that version from `ReturnValuesOnConditionCheckFailure: ALL_OLD`, so no second read is needed; the rest of the returned item stays on the server. The server never retries this.
- **Only the counter's condition, or a `TransactionConflict`:** another write by the same user took the number first. Re-read `SEQ` and retry from step 1 with jittered exponential backoff, at most 5 attempts [decision, D10]. After that, return `503 busy` with `Retry-After`. Nothing was written, so the client retries with the same `Idempotency-Key`.
- **The revision, change entry or membership item contradicts the head** (already there, or missing for a delete): an invariant is broken. Alarm and return `500`. Nothing was written.

**Transaction size, contention and cost.**

| Operation | Items in its one transaction | Items | Write units, 4 KB note |
|---|---|---|---|
| Create, or conflict copy | head (put), revision, `SEQ`, `CHG#`, `NOTE#` (put) | 5 | about 22 |
| Edit, merge, soft delete or restore | head (update), revision, `SEQ`, `CHG#` | 4 | about 20 |
| Permanent delete, by the user or the trash purge | head (delete), `NOTE#` (delete), `SEQ`, `CHG#` | 4 | about 14, then about 4 per revision as the cascade removes them |
| For comparison: today's single put | head | 1 | 4 |

- Every write also reads `SEQ` once: 1 read unit. A client request also writes ADR 0004's two small items, the operation receipt and the stored response: 7 items for a create, 6 for an edit or a user's permanent delete, and about 4 more write units each. The scheduled trash purge isn't a client request, so it stays at 4. A transaction may hold 100 items and 4 MB, so these are far from the limits.
- Transactional writes cost two write units per KB per item, against one for a standard write. That, and writing the content twice (head and revision), is why an edit costs about five times today's single put.
- **Hot items.** `SEQ` is the only item every note write touches, so one user's writes are serialised through it; different users never contend. `NOTE#` items are per note and change only at create and permanent delete. A create can only clash with a replay of itself, and a permanent delete only with an edit of the same note, whose conditions can't both pass: an edit needs `deletedAt` absent, a purge needs it present.
- **Throughput.** A transaction takes tens of milliseconds, so one user could sustain dozens of writes a second. Debounced autosave from a few devices is well under one a second. Gate 5 measures the retries on the deployed stage.
- **Pilot cost.** About 30 users saving 100 times a day comes to about 1.8 million write units a month: about $1.10 at US East on-demand prices ($0.625 per million write units, checked 3 October 2026). London is a little higher; check it in the Pricing Calculator before each phase. With ADR 0004's two items it is about 2.2 million write units, about $1.35. The fingerprint key adds $1 a month and one KMS request per write: about 90,000 requests, roughly $0.27 at the standard $0.03 per 10,000.

**Reading the feed:** `GET /v1/changes?after=<seq>&limit=<n>`.
1. Read `SEQ` with a strongly consistent `GetItem`: this is the high-water mark, `hw`. A single-item read is serialisable against transactions, so every number up to `hw` belongs to a transaction that has committed.
2. `Query` from `CHG#<after + 1>` to `CHG#<min(hw, after + n)>` with `ConsistentRead`. An entry whose `expiresAt` has passed counts as missing, whether or not TTL has deleted it yet.
3. If the entries run from `after + 1` with no gap, return them with `next` (the last number in the page) and the current head of each note they mention (consistent reads; tombstones included while in the trash). Changes that commit after step 1 come on the next call.

Why `hw` is read first: a `Query` is only read-committed against transactions. Without the bound, a query that overlapped two commits could return `CHG#k+1` but not `CHG#k`, and a client that then moved past `k + 1` would never see `k`.

**Expiry.** Change entries are kept for 30 days [decision, D10]. The revisions are the history; the log is only the cursor.
- Each entry's `expiresAt` is the later of now + 30 days and the previous entry's (held on `SEQ` as `lastExpiresAt`), so entries always expire oldest first.
- Missing entries at the start of the range mean `410 cursor_expired`.
- A gap anywhere else is a bug: alarm and return `503`, never a short page.

**Full resync**, in pages (a new device, after `410 cursor_expired`, or when the client asks):
1. Read `hw`.
2. `Query` the `NOTE#` items with `ConsistentRead`.
3. Read each listed head with consistent reads (`BatchGetItem`, up to 100 at a time). A head that has gone since step 2 was permanently deleted; skip it.
4. Return the heads, with `next = hw`.

**What full resync returns, and what it doesn't.** It is not a snapshot of one moment: DynamoDB gives no single point-in-time view across a query and the reads that follow it, and other devices can keep writing while the pages are read. What holds:
- **Nothing up to `hw` is lost.** Every change numbered up to `hw` committed before step 1. Each consistent read in steps 2 and 3 returns its item as it is at that moment. So each note comes back at least as new as `hw`, unless a later change has removed it.
- **Changes after `hw` may already show.** A create, edit or permanent delete numbered after `hw` can change the membership list or a head before it is read. The resync may then return a head newer than `hw`, or include a note created after `hw`. It may also leave out a note that existed at `hw` but was permanently deleted after it.
- **The feed delivers them anyway.** The client continues from `next = hw`, so every change after `hw` then arrives through the feed. Receiving a newer head a second time is harmless: the client keeps the higher version. A note deleted after `hw` gets its `purge` entry, whether or not the resync had already left it out.
- **Deletions up to `hw` show as absence.** A note permanently deleted at or before `hw` isn't listed, so the client removes any note it had synced that the result doesn't list. Anything still waiting in its queue is kept: a queued edit to a deleted note goes to the user to resolve, never discarded.
- **The guarantee holds:** the resync plus the feed from `hw` misses no committed change. No index is read, and nothing depends on timing.

**What this guarantees, and what it doesn't.**
- No committed change is skipped. Each one reaches the client, through the feed or through a full resync.
- Full resync, export and account deletion list notes from the membership list, never from an index, so index lag can't make any of them miss a note.
- Delivery is **at-least-once**. A retry, or a crash before the client saves `next`, can repeat entries. Applying an entry is idempotent: keep the higher version, and dedupe by `seq`.
- Nothing here is exactly-once, and no doc, comment or test may say it is.

**Client contract.** It is documented now; the frontend implements it later.
- **Debounced autosave** (ADR 0001). Send when typing pauses, and straight away on blur, tab hide or navigation [decision, D7: proposed after a 2-second pause, and at least every 20 seconds while typing continues]. Text not yet sent waits in the local queue, so the debounce never puts it at risk.
- A local operation queue, carrying idempotency keys and base versions.
- Replay in order.
- On a 409, read the latest note and merge, or send the text to the merge endpoint. The 409 itself carries no note text.
- Never discard a local edit without a resolution the user can see.

**The reference sync client lives in tests.** `services/api/tests/sync/` simulates two devices with reordering, duplication, delay and retries. Property tests (fast-check) assert that state converges and that no accepted write is lost. This proves the backend semantics before any UI exists.

### Error responses (every route)

Peter approved the token statuses on 3 October 2026; the codes were accepted with ADR 0002 and ADR 0004.

- Errors are problem details (RFC 9457): `application/problem+json` with `type`, `title`, `status` and `detail`, plus a `code` member.
- Clients act on `code`. `title` and `detail` are plain-language copy from the error catalogue, and may change.
- Error bodies never carry note text. A `409` carries the current version.
- A code's meaning never changes. A new situation gets a new code.
- `410` means one thing only: resync before writing again. Missing, malformed, tampered and other-user tokens never get it.

| Situation | Status | `code` |
|---|---|---|
| No sync token on a mutation | `428` | `sync_token_required` |
| Sync token can't be parsed | `400` | `sync_token_malformed` |
| Sync token's signature doesn't verify | `400` | `sync_token_invalid` |
| Correctly signed token for another user | `403` | `sync_token_wrong_user` |
| Correctly signed token older than 30 days | `410` | `sync_token_expired` |
| Cursor isn't a whole number, or is beyond `SEQ` | `400` | `cursor_invalid` |
| Valid cursor whose next entries have expired | `410` | `cursor_expired` |
| No `Idempotency-Key` on a mutation | `400` | `idempotency_key_required` |
| Same key, different request | `422` | `idempotency_key_reused` |
| Base version is stale | `409` | `version_conflict` |
| Note id already used for different content | `409` | `id_conflict` |
| Note is in the trash, so it can't be edited | `409` | `note_in_trash` |
| Note doesn't exist, or was permanently deleted | `404` | `note_not_found` |
| Account deletion has started | `409` | `account_closing` |
| The user's counter stayed busy for 5 attempts | `503` | `busy`, with `Retry-After` |

---

## 5. Event backbone [ADR: event backbone]

- **Source of truth: DynamoDB Streams** (`NEW_AND_OLD_IMAGES`) on NotesTable and UserDataTable. `eventRouter` maps item changes to domain events on an EventBridge custom bus. The write and its event cannot diverge, so this is a transactional outbox with no extra machinery.
- **Envelope:** `{ id (UUIDv7), type, schemaVersion, occurredAt, userId, entityId, entityVersion, correlationId }`. **No note content ever goes in an event.** Consumers read by id and version. This also respects EventBridge's 256 KB limit.
- **Types:**
  - `note.created`, `note.updated`, `note.deleted`, `note.restored`, `note.purged`
  - `revision.created`
  - `reminder.scheduled`, `reminder.due`, `reminder.sent`, `reminder.shown`, `reminder.unconfirmed`, `reminder.failed`, `reminder.snoozed`, `reminder.completed`
  - `review.item.created`, `review.item.graded`
  - `capture.received`
  - `ai.processed`
  - `account.deleted`
- **Consumers** dedupe by event id and have an SQS DLQ with an alarm on depth > 0. They are replayable.

---

## 6. Enrichment: capture never waits on AI [ADR: async enrichment, superseding ADR 3.2]

ADR 3.2 put the LLM call inside `createNote`/`updateNote`, for up to 6 seconds. That makes capture slow, and it widens the read-then-write window in which edits were being lost. Instead:

- **On write:** the local engine computes `summary` and `actions` in the request, in milliseconds and deterministically. Every note has a summary immediately, with `summarySource: local` and `enrichedVersion: version`.
- **Afterwards:** if the note is AI-eligible, the enrichment consumer calls the AI gateway (§11). It writes back conditioned on `version = :enrichedFrom`, so a stale result is discarded and never overwrites newer content.
- **AI-eligible means all of these hold:**
  - the account has `aiEnabled` and current consent;
  - the note is not `aiExcluded`;
  - the note meets a minimum length;
  - the note has been idle for N minutes, so it is not re-sent on every keystroke;
  - the user is within quota.
- **Failure** keeps the local result and increments a metric. The user's note is never affected.

---

## 7. Scheduling and notifications [ADR: scheduling and attention budget]

**Reminder.** A reminder has an id, an optional note or action, a status and a snooze count. Its trigger is one of:
- `at`: absolute time plus IANA timezone;
- `relative`: resolved against `timeAnchors`, E1;
- `nextOpen`: event-based, E2;
- `digest`.

It also has an optional implementation intention `{when, then}` (E2, E4) and an urgency of `normal` or `time-critical`.

**Mechanics:**
- **`at` / `relative`** create an EventBridge Scheduler one-time schedule in a per-stage group.
  - It uses `at(…)` with the user's timezone and `ActionAfterCompletion: DELETE`.
  - Time-critical reminders have no flexible window; normal ones use a flexible window of a few minutes.
  - The target is SQS, then the `dispatch` Lambda, giving buffering, retries and a DLQ.
- **`nextOpen`** has no schedule. It is surfaced the next time the user opens the app, through `GET /v1/inbox`.
- **Digest** is a per-user recurring schedule in the user's timezone. It carries:
  - reminders that the budget deferred;
  - resurfaced notes;
  - review items due (capped);
  - **missed items, collapsed into one line**, never replayed as a wall (ADR 2.8, E6).

**The notification service is the only path to the user**, for every channel and every feature:
1. Re-check that the item is still valid (status and version).
2. **Quiet hours** in the user's timezone, DST-correct. Inside quiet hours, defer to the end of quiet hours or to the next digest.
3. **Attention budget.** Interruptive pushes per local day must stay within the budget [decision: proposed default 3, user-set]. Anything over budget goes to the digest. It is never dropped silently (E5).
4. **Channel order:** push, if a valid subscription exists; then email, if the user enabled it; then the in-app inbox, always.
5. **Honest states** (ADR 0003). Each attempt is recorded under `ATT#` in one of these states. Nothing is ever called "delivered".

   | State | What it means |
   |---|---|
   | `queued` | Ready to send, or waiting to retry after a transient failure (`429`, `5xx` or a timeout) |
   | `accepted` | A push service answered `201`, or the recipient's mail server accepted the email (the SES `Delivery` event). The provider has it; nothing more is known |
   | `rejected` | The provider refused it: a push `404` or `410` (the subscription is then removed), another permanent `4xx`, or an email bounce |
   | `shown_on_device` | Time-critical push only: the device confirmed that it displayed the notification (item 6) |
   | `unconfirmed` | Time-critical push only: accepted, but not confirmed within the acknowledgement timeout |

   - A push service's `201` "does not indicate that the message was delivered to the user agent" (RFC 8030), and Mozilla's push service "cannot guarantee end-to-end delivery". So `accepted` is the most a push state can say unless the device confirms.
   - SES's `Delivery` event means the recipient's mail server accepted the email, not that anyone read it. A complaint stops email to that address until the user turns it back on.
   - A rejected channel, or one whose retries run out, falls through to the next. If no channel accepts the reminder, it stays at the top of the in-app inbox as "We couldn't reach you about …". Early lab evidence suggests people may lean on reminders they trust (E2: one study, not yet replicated), which is one more reason to design against silent failure.
6. **Time-critical reminders ask the device to confirm.**
   - The push payload, encrypted to the device, carries a single-use acknowledgement token. The service worker shows the notification, then posts the token to `POST /v1/notifications/ack`. With several devices subscribed, each gets its own token, and one confirmation is enough.
   - That route authenticates with the token alone, because a service worker may hold no valid session. It stores only a hash of the token, accepts it once, always answers `204`, and is throttled. It records the server's time and nothing else: no IP address, user agent or device details. The privacy notice says so.
   - An SQS message delayed by the acknowledgement timeout [decision, D17: proposed 2 minutes; SQS allows up to 15] then checks the attempt. If it is still `accepted`, it becomes `unconfirmed`, the reminder goes to email if the user enabled it, and its inbox item is marked. The fallback is the same item, so it doesn't count against the attention budget twice. A confirmation that arrives later is still recorded.
   - `shown_on_device` means the browser reported that it displayed the notification. It does not mean the person saw it: Focus or Do Not Disturb modes and OS settings can still hide it. Copy never claims more.
   - Other reminders and nudges don't ask for confirmation. The most their push state can say is `accepted`, shown as "sent".
7. **Every push sets `TTL` and `Urgency`** (RFC 8030 requires `TTL`). `TTL` is how long the push service may hold the message while the device is unreachable.

   | Kind | `Urgency` | `TTL` [decision, D17] |
   |---|---|---|
   | Time-critical reminder | `high` | proposed 15 minutes |
   | Other reminder, or the digest | `normal` | proposed 1 hour |
   | Resurfacing or review nudge | `low` | proposed 12 hours |

   For anything quiet hours would hold back, `TTL` never runs past the start of the user's next quiet hours, so a held push can't arrive inside them. A time-critical push held past its acknowledgement timeout can still arrive after the fallback email. That duplicate is accepted, because missing a time-critical reminder costs more.
8. **Copy rules:** say specifically what it is about; keep it calm; no urgency theatre; no counts of missed items; British English. Say "sent" for `accepted` and "shown on your device" for `shown_on_device`; never "delivered", "received" or "seen".

**Channels:**
- **Web Push** uses VAPID keys held in SSM Parameter Store as a SecureString. On iOS it needs the app installed to the home screen; that is the client's job.
- **Email** goes through SES in London. Production access must be requested. Cognito's email codes use SES too.

---

## 8. Search [ADR: search v2]

- **`packages/retrieval` stays the lexical core**, vendored and with its 25 tests untouched.
- **A new `packages/search`** wraps it:
  - query normalisation;
  - **typo tolerance**: Damerau–Levenshtein distance ≤ 1 for terms of 4–7 characters and ≤ 2 for 8 or more, matched against the user's own vocabulary;
  - **phonetic keys** (Double Metaphone) for spellings by sound (E8, dyslexia);
  - field boosts and a recency tie-break;
  - later, an optional semantic channel fused with Reciprocal Rank Fusion.

  It is deterministic and has its own tests.
- **Index on write.** The search-indexer consumer stores compact per-note term statistics and phonetic keys. A query then reads index rows instead of every note's full content, which is the cost today. Results are cached per container, keyed by (`userId`, latest `updatedAt`).
- **Semantic channel options**, decided by measurement rather than taste:
  - (a) none: lexical plus typo plus phonetic;
  - (b) a small local embedding model running inside Lambda, so content never leaves our compute;
  - (c) Titan Text Embeddings V2 in eu-west-2, which is available in-region there, opt-in under AI consent.

  The benchmark is `docs/eval/search-golden.json`: 50–100 deliberately messy notes and queries, including misspellings and paraphrases. It measures recall@5, MRR and p95 latency at 500 and 2,000 notes.
- **`GET /v1/notes/{id}/related`** reuses the same scorer. It feeds resurfacing.

---

## 9. Capture [ADR: capture channels]

**One command:** `capture({ id, content, title?, source, capturedAt, idempotencyKey })`. It uses the same versioned write path as everything else and has inbox semantics. Filing is never required (E8).

- **Quick capture:** `POST /v1/capture`, with `source` set by the entry point.
- **Email-in.** Each user gets a secret, rotatable address at `in.<domain>`. It is blocked until the domain decision is made (CONTEXT §4.1).
  - SES receiving in London writes the raw message to S3 (SSE-KMS, 7-day lifecycle).
  - A Lambda then:
    - checks the SES spam, virus, SPF, DKIM and DMARC verdicts;
    - requires the sender to be one of the user's verified addresses;
    - enforces size limits;
    - strips quoted replies and signatures;
    - stores plain text only;
    - enforces a rate limit.
- **Voice and audio.**
  - `POST /v1/capture/audio` returns a presigned S3 PUT, with a size cap and SSE-KMS.
  - The client then posts a transcript with segments and **tap-to-bookmark** timestamps. On-device recognition is preferred, for privacy and for cost.
  - Audio retention is the user's choice [decision].
  - Server transcription (Amazon Transcribe) is opt-in only, with a monthly minute quota. It costs about $0.024 a minute, so it cannot be a default on a £20 budget; check current prices.
- **Share target and clipper:** the same endpoint, with `source: share`.

---

## 10. Resurfacing and learning [ADR: review and resurfacing]

**Resurfacing (E8, E10)** uses a deterministic, explainable score. It favours notes with open actions, notes not opened for a long time, pinned notes, and notes related to recent captures.
- Daily cap [decision: proposed 1–3].
- Dismissing a note hides it for 90 days.
- Each note can be set to never resurface.
- Every item carries its reason: "You wrote this 3 weeks ago and it has 2 open actions."

**Review (E9).**
- **Per-note opt-in** ("learn this").
- **Prompts:**
  - free recall: show the title, ask the user to recall the main points, then reveal the summary;
  - cloze: deterministic, built from the key sentences;
  - Q&A: written by AI, opt-in and editable.
- **Scheduling** uses FSRS (`ts-fsrs`).
- **Daily cap** [decision: proposed 10]. Overdue items are spread over the following days, never piled up. No streaks.
- **Endpoints:** `GET /v1/review/queue`, `POST /v1/review/{id}/grade`, `PUT /v1/notes/{id}/review`.

---

## 11. AI gateway [ADR: AI provider and data flow]

Every AI call goes through one module. That module:
1. Checks eligibility (§6).
2. **Minimises the payload:** this note's text only, never the corpus. Optional redaction of emails and phone numbers.
3. Calls **Amazon Bedrock in eu-west-2**: in-region where the chosen model allows it, otherwise the EU geographic profile. **Never global routing.**
   - IAM allows only the specific model and profile ARNs.
   - Calls have timeouts and per-user quotas.
4. Writes the AI activity log and emits metrics.

AWS states that Bedrock "doesn't store customer input data and model output data, share the data with third-party model providers, or use the data to train models" ([AWS re:Post](https://repost.aws/knowledge-center/amazon-bedrock-model-data-use)). The ADR must re-check the following on the day:
- model availability in London;
- in-region versus EU-profile routing;
- whether structured JSON output is supported on the chosen invocation path. If it isn't, use tool-use output and keep the existing zod validation as the safety net.

**Fallbacks, which the tests enforce:**

| AI feature | Non-AI fallback |
|---|---|
| Summary | Extractive summary (`packages/retrieval`) |
| Actions | Pattern-based extraction |
| Tag suggestions | Top distinctive terms, as suggestions only |
| Task breakdown ("first tiny step") | Template prompts |
| Review questions | Free recall and cloze |
| Semantic search | Lexical plus typo plus phonetic |

**Consent v2:**
- names AWS Bedrock as the processor;
- names the region;
- states the retention position;
- explains per-note exclusion;
- is versioned, so a provider change requires fresh consent.

The existing recorder test, re-pointed at the Bedrock endpoint, proves zero calls while AI is off.

---

## 12. Identity [ADR: passwordless authentication]

- Cognito user pool on the **Essentials** plan, which includes passwordless sign-in and covers 10,000 MAU in its free tier ([pricing](https://aws.amazon.com/cognito/pricing/)).
- **Passkeys first**, with an **email one-time code** fallback (E12, WCAG 2.2 SC 3.3.8).
- Long-lived refresh tokens, so nobody is signed out mid-thought.
- Account deletion calls `AdminDeleteUser` as part of the deletion orchestrator.

---

## 13. Privacy controls (hard constraints)

**Retention schedule [decision; proposed values]:**

| Data | Retention |
|---|---|
| Notes | Until deleted |
| Trash | 30 days |
| Revisions | Not decided: D9. ADR 0001 rules out deleting revisions to reduce writes. If D9 adopts it, an explicit, user-requested permanent purge of a revision holding a secret stored by accident would be a documented exception to history retention |
| Notification attempts | 30 days |
| Change log (`CHG#`) | 30 days [D10] |
| Note membership (`NOTE#`) | Until the note is permanently deleted |
| AI activity log | 12 months |
| Audio | User's choice |
| Raw inbound email | 7 days |
| Logs | 30 days |
| Exact successful responses (`IDM#`) | 30 days (ADR 0004) |
| Operation receipts (`OPR#`), with their keyed fingerprints | Account lifetime; removed by account deletion (ADR 0004) |
| Fingerprint keys (KMS) | While any receipt names them; a retired key is kept for `VerifyMac` only (ADR 0004) |
| PITR backups | Configured period (DynamoDB allows 1–35 days), disclosed |

**Deletion orchestrator.** On `account.deleted`:
1. **Close the account to writes** (ADR 0002). Set `closing` on `SEQ`. Every note transaction's counter condition requires `closing` to be absent, and writes that don't touch `SEQ` (reminders, preferences) check the same flag in their transaction. From then on nothing commits, so the membership list is final.
2. **Remove the data** from:
   - NotesTable, listing heads from the `NOTE#` membership items with `ConsistentRead` (ADR 0002);
   - the UserDataTable partition, including every operation receipt (`OPR#`) and stored response (`IDM#`);
   - PreferencesTable;
   - the S3 prefixes;
   - Scheduler schedules, found by name prefix;
   - push subscriptions;
   - Cognito.
3. **Verify with strongly consistent reads**, never through an index, and write a content-free audit record.

**Export** is an async job. It lists notes from the `NOTE#` membership items with consistent reads, never from an index (ADR 0002). It writes JSON and Markdown to S3 and returns a short-lived presigned URL. It includes revisions, trash, reminders, notification attempts, the change log, operation receipts (without their fingerprints), stored responses, review items, the AI activity log and consents.

**Logging** uses the Powertools Logger with redaction. Logs never contain:
- note content or titles;
- transcripts;
- email bodies;
- push endpoints;
- sync tokens or request fingerprints.

Ids and sizes only. **A test enforces this.**

**Encryption:** SSE on every table and bucket (a customer-managed KMS key is a small fixed monthly cost [decision]) and TLS 1.2 or higher.

**No third-party analytics.** Research mode is a separate opt-in that produces aggregates only, with k ≥ 5 small-cell suppression.

**No diagnosis questions. No inference of health, mood or attention.** User-declared state only (ICO: inferring special-category data makes it special-category data).

---

## 14. Observability and SLOs [ADR: SLOs]

- The Powertools Logger, Tracer and Metrics. The API Gateway request id becomes the correlation id and is carried into events.
- **Proposed SLOs:**
  - capture availability of 99.5% a month;
  - p95 warm latency for create and list ≤ 350 ms, comparable with report §5.4;
  - reminders handed over on time: ≥ 99% `accepted` by a push service or mail server within the send window, measured from `ATT#` records. This measures our side only;
  - time-critical reminders: ≥ 99% `shown_on_device` before the acknowledgement timeout, or sent to email when it ends. The share confirmed on a device is reported as an observed figure, not a target;
  - **zero lost writes**, checked by the reconciliation job.
- **Alarms:**
  - error rate;
  - throttles;
  - DLQ depth > 0;
  - reminders no channel accepted;
  - LLM fallbacks;
  - Scheduler errors;
  - AWS Budgets at £15 and £20 (forecast).
- No provisioned concurrency until a measurement shows cold starts hurt (the deployment notes already say this).

---

## 15. Infrastructure and delivery [ADR: CDK, TypeScript, London]

- **AWS CDK v2 in TypeScript**, in a new `infra/` workspace.
  - Stacks: Data, Auth, Api, Events, Observability.
  - `dev` (staging) first, `prod` later; dev data is disposable until prod exists.
  - Region eu-west-2.
  - Node.js 24 on arm64 via `NodejsFunction` (esbuild).
  - cdk-nag, with a written reason for every suppression.
- **Table definitions live in one module** that both CDK and the local test rig import. That keeps ADR 1.7's guarantee: a schema change cannot pass tests and fail on deploy.
- **Local development:**
  - DynamoDB Local, with handlers invoked in-process for tests;
  - a thin local HTTP adapter so `apps/web` can still run against a local API.

  This replaces `serverless offline` ([ADR 0007](../adr/0007-in-process-test-rig-and-route-manifest.md), decided 3 October 2026): handlers run in-process with API Gateway-shaped events, a loopback-only adapter serves the web app, and one route manifest feeds CDK, the adapter and the tests, with a synth-versus-routes test.
- **CI/CD:** GitHub Actions with an OIDC role, so there are no long-lived AWS keys.
  - Pull request: lint, typecheck, tests, synth, nag, dependency audit.
  - `main`: deploy dev, then smoke tests.
  - Tags: prod, later.
