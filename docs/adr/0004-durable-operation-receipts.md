# 0004: Durable operation receipts for safe retries

- **Status:** Accepted on 3 October 2026.
- **Date:** 2026-10-03
- **Decision owner:** Peter Fasae
- **Roadmap item:** D4 in [`docs/plan/backend-roadmap.md`](../plan/backend-roadmap.md)
- **Supersedes:** the 24-hour idempotency record in [`backend-architecture.md`](../plan/backend-architecture.md) §3, item 2 (the draft of 2 October 2026); the 3 October proposal that treated the sync token as proof of an operation's age; and this ADR's first draft, which stored a plain hash of the request.
- **Evidence** (checked 3 October 2026):
  - The IETF draft [The Idempotency-Key HTTP Header Field](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/), version 07, now expired and not a standard. It suggests `400` for a missing key and `422` for a key reused with a different payload, and asks servers to publish their key-expiry policy.
  - [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html), Problem Details for HTTP APIs: consumers "MUST use the 'type' URI" as the problem's primary identifier, and `title` is advisory.
  - [RFC 6585](https://www.rfc-editor.org/rfc/rfc6585.html), section 3: `428 Precondition Required` means the server requires the request to be conditional, typically to prevent lost updates.
  - [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785.html), the JSON Canonicalization Scheme: deterministic property sorting and fixed serialisation of JSON values.
  - AWS KMS [HMAC keys](https://docs.aws.amazon.com/kms/latest/developerguide/hmac.html) support only `GenerateMac` and `VerifyMac`, "never leave AWS KMS unencrypted", "do not support automatic key rotation", and take a message of "up to 4,096 bytes". On [`GenerateMac`](https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateMac.html): "If you generate an HMAC for a hash digest of a message, you must verify the HMAC of the same hash digest."
  - [KMS pricing](https://aws.amazon.com/kms/pricing/): $1 a month per key, and $0.03 per 10,000 standard requests after a free 20,000 a month. The page doesn't list HMAC requests separately; a [third-party breakdown](https://cloudburn.io/blog/aws-kms-pricing) bills them at the standard rate. Check in the Pricing Calculator.
  - DynamoDB transactions, TTL and prices, as cited in ADR 0002.

## Problem
A client can resend an operation at any age: after a lost response, a crash, or weeks offline. The server has to tell three cases apart, and keep telling them apart after any stored response has expired:
1. **never applied:** apply it now, or report a conflict;
2. **already applied, original response expired:** don't apply it again, and say so;
3. **conflicts with newer state:** don't apply it, and say why.

A record that expires, after 24 hours or after 30 days, can't separate case 1 from case 2 once it has gone: an applied operation looks new. Resending it through the merge path could then create a duplicate conflict copy. The signed sync token proves how recently a client synced, not whether an operation was applied.

## Peter's decisions, in summary
- Durable operation receipts, kept for the account's lifetime and removed by account deletion.
- A keyed request fingerprint, never a plain hash, with deterministic canonicalisation and documented key rotation.
- Content-free responses: a success is a receipt (identifiers, version, timestamps), and a `409` carries the current version and a stable code. Content comes from reads.
- Exact successful responses are stored for 30 days. Failed mutations are not covered by that guarantee, because they did not change state.
- Token statuses: missing `428`; malformed or invalid signature `400`; a valid token for another user `403`; valid but expired `410`.
- Stable, documented, machine-readable error codes.

## Proposed approach
**1. One durable receipt per applied operation.**
- Every mutation carries `Idempotency-Key`: the client's operation id, a UUIDv7 that is new for each operation and never reused.
- When a mutation commits, the same transaction puts `OPR#<opId>` under `USER#<sub>`, on condition `attribute_not_exists`. It holds the operation type, entity id, resulting version, change-log number, applied time and the keyed request fingerprint (item 3). It is kept for the account's lifetime and removed only by account deletion.
- The same transaction puts `IDM#<opId>`: the exact status and body, kept for 30 days. Reads ignore it once `expiresAt` has passed, and TTL cleans it up.
- A failed mutation writes neither. It changed nothing, so there is nothing to replay.

**2. How a request is classified**, after authentication and the sync-token check:

| Receipt `OPR#<opId>` | Case | Response |
|---|---|---|
| There, fingerprint matches, stored response under 30 days old | Already applied | The exact original status and body, byte for byte. Header `Clarity-Replay: original` |
| There, fingerprint matches, stored response expired | 2: already applied, original response expired | `200` with `outcome: already_applied` and the receipt's fields (ids, version, change-log number, applied time). Not byte-identical, and labelled as such. Header `Clarity-Replay: receipt` |
| There, fingerprint doesn't match | Key reused | `422 idempotency_key_reused` |
| Absent, preconditions hold | 1: never applied | Applied now: `2xx` with a new receipt, `outcome: applied` |
| Absent, preconditions fail | 3: conflicts with newer state | `409` or `404` with a stable code (`version_conflict`, `note_in_trash`, `note_not_found` …) and, for a `409`, the current version. No note text. Nothing written |

- **No extra read for a new operation.** The receipt's put condition does the check inside the transaction. A replay cancels the transaction on that condition, and only then does the server read the receipt to classify it.
- **Two copies of one request racing** are the same case: one commits, and the other is cancelled and reads the winner's receipt.
- **Why it is exact:** the receipt is written in the same transaction as the effect, and it never expires while the account exists. So "no receipt" means never applied and "receipt" means applied, at any age, with no clock and no timing assumption.

**3. The request fingerprint is keyed, never a plain hash.** A plain hash of a request that contains a pasted password would let anyone holding the data test guesses offline, and would keep a trace of a secret purged under D9.
- **Computation.** HMAC-SHA-256 by AWS KMS (`GenerateMac`) with a dedicated HMAC key, key spec `HMAC_256`, used for nothing else. The MAC is taken over the SHA-256 digest of the canonical request. KMS accepts at most 4,096 bytes, so it receives the digest, never note text, and the digest itself is never stored.
- **Stored with it:** the KMS key id and the canonicalisation version.
- **Checking a replay:** `VerifyMac` with the key the receipt names, over the digest of the new request's canonical form. A match is a replay; a mismatch is `422 idempotency_key_reused`.
- **Canonical request, version 1**, defined in architecture §3, item 2:
  - the tag `fp1`;
  - the method;
  - the normalised path;
  - the validated body, serialised with RFC 8785.

  The four parts are joined with newlines. Headers are left out, and request schemas carry no per-attempt fields, so an honest retry always produces the same bytes.
- **Rotation.** HMAC keys don't rotate automatically, and a fingerprint can't be moved to a new key without the original request, which isn't kept. So rotating means creating a new key for new receipts. Each old key is kept for `VerifyMac` only, for as long as any receipt names it. A canonicalisation change works the same way: a new version for new receipts, with the old one kept while receipts use it.
- **What it is:** protected derived data, not "no content". It is derived from the request, note text included. It is never logged or exported, it is removed with the account, and testing a guess against it needs the KMS key, which only the API's functions can use and CloudTrail audits.

**4. The sync token forces stale clients to resync, and does nothing else.**
- Pulls (`GET /v1/changes` pages and full resync) return a token holding the user's id and the issue time, signed with HMAC-SHA-256. The keys live in SSM. Retired keys stay available for checking only, so a genuine old token is recognised as expired, never mistaken for a forgery.
- Every mutation carries the client's latest token, checked before anything else. The statuses are Peter's:
  - a missing token gets `428 sync_token_required`;
  - a malformed one gets `400 sync_token_malformed`;
  - one whose signature doesn't verify gets `400 sync_token_invalid`;
  - a valid token for another user gets `403 sync_token_wrong_user`;
  - a valid token more than 30 days old gets `410 sync_token_expired`.
- After resyncing, the client resends each queued operation **unchanged**: same operation id, same body, fresh token. The receipts sort them:
  - already applied: dropped;
  - never applied: applied, or refused as a conflict.

  Only a genuine conflict goes to the merge path, as a new operation with a new id. So an operation that was already applied can never become a duplicate conflict copy.

**5. Every operation is also safe to repeat on its own**, as a second line of defence:
- create: client UUIDv7 id, `attribute_not_exists`;
- edit, merge, soft delete and restore: conditioned on `version` and trash state;
- permanent delete: conditioned on the note being in the trash;
- reminder change and snooze: conditioned on the reminder's version;
- review grade: conditioned on the card's version and a review id;
- nothing increments or appends without a version condition.

**6. Responses carry no note text.** A success is a receipt. A `409` gives the current version and its code. The client reads the latest note before merging, or sends its own text to the merge endpoint, which merges on the server.

## Alternatives considered
- **A plain hash of the method, path and body**, as first drafted. It lets anyone holding the data test guesses offline at whatever the body contained, including a pasted password, and it outlives a D9 purge. Peter rejected it.
- **An HMAC key held in SSM and used inside the function.** There's no per-request KMS call or charge, but the key material sits in function memory and could be copied out. A KMS HMAC key can't be.
- **A per-device operation sequence with a durable high-water mark.** One small item per device, so storage stays bounded. But "at or below the mark" only means "applied" if every numbered operation was applied. A rejected operation must then block the device's queue or have its outcome stored, which brings back per-operation records. It also forces strictly in-order, one-at-a-time sending per device. And a device restored from a backup would resend numbers the server has already seen, with no way to tell which were applied.
- **Expiring records only, with the token gate**, as first proposed. These can't tell case 1 from case 2 after expiry, which was Peter's objection.
- **Keep the exact response for the account's lifetime.** Exact replay at any age, but it keeps every full response forever, beyond the 30 days Peter set.
- **Infer "applied" from revisions**, with an operation id on each. This works for note edits only, not for reminders, grades or deletes, and it depends on D9's revision retention.

## Trade-offs
Exact at any age and simple to state. The costs: one small item per operation, kept for the account's lifetime; one KMS request per write; and fingerprint keys that can't be deleted while receipts name them. Storage grows with use. If that ever matters, receipts older than a year could be compacted, for example into per-device high-water marks.

## Cost
- **Writes.** Two small items in each mutation's transaction: about 4 more write units. With ADR 0002's items, an edit of a 4 KB note is about 24 write units and a create about 26.
- **The fingerprint key.** $1 a month per stage, plus one `GenerateMac` request per write. A 30-user pilot saving 100 times a day makes about 90,000 a month: about $0.27 at the standard rate, less after the free tier. Each retired key that's kept adds $1 a month.
- **Latency.** One KMS round trip per write adds a few milliseconds. Gate 5's latency measurements include it.
- **Storage.** About 250 bytes per receipt, fingerprint and key id included. A heavy user saving 200 times a day adds about 18 MB a year; 30 such users, about 0.55 GB a year, about 14 cents a month at US East storage prices.

## Privacy and security
- **What is stored.** Receipts and stored responses hold no note text. Receipts do hold a keyed fingerprint, which is protected derived data (item 3). Both are personal data, so they are covered by export (receipts without their fingerprints) and by deletion, and they have retention periods: 30 days for responses, and the account's lifetime for receipts. The privacy notice states both.
- **After a permanent delete.** Receipts outlive a permanently deleted note, deliberately: they stop a stale replay from bringing the note back. A secret purged under D9 leaves no readable trace in them, and checking a guess against its fingerprint needs the KMS key.
- **Who can use the key.** The fingerprint key's policy allows `GenerateMac` and `VerifyMac` for the API's functions only, and a retired key allows `VerifyMac` only. Every use is logged in CloudTrail.
- **Logging.** Tokens and fingerprints are never logged.

## Migration risk
None for data: nothing is deployed. The client contract gains:
- an `Idempotency-Key` and the latest sync token on every mutation;
- content-free receipts and `409`s;
- resending queued operations unchanged after a resync;
- the error codes in architecture §4.

Request schemas must carry no per-attempt fields, or honest retries would produce different fingerprints.

## Recommendation
Adopt account-lifetime receipts with keyed fingerprints. They are the smallest durable record that tells all three cases apart at any age, without keeping anything a guess could be tested against offline.

## Gate 5
The roadmap's Gate 5 carries the approved wording. Besides the three cases and the 30-day exact responses, it tests what Peter added on 3 October 2026:
- two simultaneous requests with the same operation key;
- the same key with a different request, before and after 30 days;
- a replay after the note was permanently deleted;
- account deletion removing every `OPR#` and `IDM#` item;
- the token statuses;
- fingerprint canonicalisation.

---

## Decision
Peter's words, 3 October 2026. First:
> Decision 4 is not approved yet
> The signed sync token is useful for forcing stale clients to resync, but it is not durable proof that an old operation was never previously applied. After IDM and CHG records expire, an already-applied operation may no longer be discoverable. Resending it as a new operation could, for example, create a duplicate conflict copy.
>
> Please propose a durable, content-free operation identity mechanism, such as:
> - an account-lifetime minimal operation receipt; or
> - a per-device monotonically increasing operation sequence with a durable high-water mark.
>
> The design must distinguish:
> 1. operation never applied;
> 2. operation already applied but its original response expired;
> 3. operation conflicts with newer state.
>
> For mutation responses: yes, make successful mutation responses content-free receipts. Return identifiers, version and timestamps, but not note content. Content should be obtained through reads.
>
> For HTTP status handling:
> - 410 may be used for a correctly signed but expired sync token/cursor that requires resync.
> - Missing, malformed, tampered, or wrong-user tokens must not return 410; use the appropriate authentication, authorization, validation, or precondition response.
> - Document stable machine-readable error codes rather than relying only on HTTP status text.
>
> Store exact successful responses for 30 days. Be explicit that failed mutations are not covered by the exact-response replay guarantee because they did not change state.

Then:
> Decision 4 answers:
>
> 1. I approve durable operation receipts as the mechanism and approve the proposed Gate 5 direction, subject to the fingerprint correction below.
> 2. Yes, 409 responses should be content-free. Return the current version and stable error code, but not note text. The client can read the latest note before merging.
> 3. Yes, retain operation receipts for the life of the account. That retention is necessary for the “never applied twice at any age” guarantee, and account deletion must remove them.
>
> Required fingerprint correction:
> - Do not store a plain hash of method, path and body. The body can contain note content or an accidentally pasted password; a permanent plain hash would permit offline guessing and contradict the claim that purged secrets are not retained.
> - Use a keyed request fingerprint, such as HMAC-SHA-256 with a dedicated managed key and key identifier.
> - Define deterministic canonicalisation of the validated method, path and semantic request body.
> - Document key rotation: old fingerprints must remain verifiable for as long as their receipts exist, or be safely migrated.
> - Describe the fingerprint as protected derived data, not simply “no content”.
>
> After approving content-free 409s, update architecture §3 item 4 and §4’s contention section. They currently still say a 409 returns the server’s note through ALL_OLD; that would contradict the approved content-free response.
>
> Add Gate 5 tests for:
> - two simultaneous requests with the same operation key;
> - the same key with a different request, both before and after 30 days;
> - replay after the affected note was permanently deleted;
> - account deletion removing every OPR and IDM item;
> - the token status mappings;
> - request-fingerprint canonicalisation.
>
> I approve the proposed token mappings:
> - missing: 428;
> - malformed or invalid signature: 400;
> - valid token belonging to another user: 403;
> - valid but expired: 410.

Accepted:
> "Once these wording and fingerprint changes are made, mark ADR 0001, ADR 0002, ADR 0003 and ADR 0004 Accepted."

## Consequences
- **Architecture:** §2 (`OPR#`, `IDM#`), §3 (items 1–4), §4 (contention, costs and error responses) and §13 (retention, deletion, export and logging).
- **Roadmap:** D4, Week 2 and Gate 5.
- **Instructions:** CLAUDE.md and `rules/backend.md`.
- **Sequencing:** Week 2 now creates UserDataTable and the fingerprint key, because the receipts need both. The sync-token check arrives with the changes feed in week 4.
- **Client contract:** the changes listed under "Migration risk".

## How to explain this
To be written when this lands.

## Questions a reviewer will ask
To be written when this lands.
