# 0009: Input limits, generated-field limits and Unicode-safe text

- **Status:** Accepted on 3 October 2026.
- **Date:** 2026-10-03
- **Decision owner:** Peter Fasae
- **Roadmap item:** Defect 3 in [`docs/plan/backend-roadmap.md`](../plan/backend-roadmap.md); the limits table in [`backend-architecture.md`](../plan/backend-architecture.md) §2.
- **Supersedes:** the first limits proposal of 3 October 2026 (100,000 characters and a 256 KB body), which Peter did not accept, and the limits table in architecture §2 as it stood that morning.
- **Evidence** (measured on 3 October 2026 with a throwaway script outside the repository, against DynamoDB Local; the same checks are repeated on staging):
  - AWS's [item-size rules](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/CapacityUnitCalculations.html): an item's size is the sum of its attribute names and values, with strings counted in UTF-8 bytes, 3 bytes of overhead for a list or map, and 1 byte of overhead for each list or map element. The [constraints page](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html) sets the limit at 400 KB, names and values included.
  - DynamoDB Local accepts an item of exactly 409,600 bytes and rejects 409,601, which matches those rules applied to the marshalled item.
  - **Today's code already fails.** The extractive summary is the whole note when it has no full stop, and action extraction is unbounded, so the stored item holds the content twice or more. Measured: 100,000 Chinese characters with no full stop gives a 600 KB item, 60,000 emoji gives 480 KB, and a note of 60,000 `todo` lines gives 2.4 MB. All three are rejected by DynamoDB, so the API returns a 500.
  - **100,000 four-byte characters can never fit.** They measure 437 KB to 449 KB with the other fields present.
  - **With the limits below and every field at its cap** (four-byte text throughout, and all the week 3 attributes present), the item measured 289,464 bytes and DynamoDB Local accepted it. The automated test that saves the largest note through the API and measures the stored item, before the week 3 attributes exist, measured 286,973 bytes (its content has 238,410 bytes, because the `todo` lines that force the maximum generated output start with ASCII).
  - **A request can be larger than the text in it.** The largest valid request is 244,998 bytes as plain UTF-8 JSON, 732,998 bytes when every non-ASCII character is written as a `\uXXXX` escape (Python's `json.dumps` does this by default), and 360,014 bytes for 60,000 control characters each written as `\u0001`. A 256 KB body limit would have refused valid notes.
  - [Lambda quotas](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html): 6 MB request payload for synchronous invocation, so 1 MiB is well inside it.

## Problem
`content` has only `min(1)` (`packages/core/api.ts`), and the derived `summary` and `actions` are unbounded, so a note the API accepts can become an item DynamoDB refuses. The first proposal then set a body limit smaller than a valid note could need, and counted characters in a way that treats an emoji as two.

## Proposed approach
**How text is counted.** In Unicode code points of the decoded JSON string. No trimming, no normalisation: a precomposed "é" is 1 and a decomposed one is 2, an emoji is 1, a family emoji joined with zero-width joiners is 7, and CRLF is 2. User-facing messages call these "characters".

**Limits.**

| Thing | Limit | Violation |
|---|---|---|
| Decoded request body | 1,048,576 bytes | `413 payload_too_large` |
| `content` | 60,000 code points | `422 limit_exceeded` |
| `title` | 200 code points | `422 limit_exceeded` |
| `tags` | at most 20, each at most 40 code points | `422 limit_exceeded` |
| `reminders` | at most 20, each at most 40 characters | `422 limit_exceeded` |
| Generated `summary` | at most 1,000 code points | bounded before saving |
| Generated `actions` | at most 50, each at most 200 code points | bounded before saving |
| Complete stored item | at most 350,000 bytes | `422 note_too_large` |

- The 40-character cap on each reminder is the only number here that is not in Peter's list. It comes from the proposal he approved, and it keeps the item-size guarantee honest, because a date-time string has no natural length limit.
- The body limit is for JSON encoding overhead and for protecting the application. It is not space reserved for anything else; operation receipts (ADR 0004) are separate DynamoDB items.
- A body that is base64 encoded is measured after decoding.

**Unicode validity.** Text the user wrote (content, title, tags) must not contain an unpaired UTF-16 surrogate: `422 invalid_text`. Valid control characters, including tab, newline, carriage return and NUL, stay accepted. Generated text is cleaned so that an unpaired surrogate can never reach the store. The error body and the logs never contain the offending text.

**Truncation.** Generated fields only, and always on code-point boundaries. The ellipsis counts inside the limit: a 1,000-code-point summary is 999 code points plus "…". `deriveTitle` keeps its existing rule (first non-empty line, leading `#` removed, capped at 60) but now counts code points instead of UTF-16 units. A user's `content` is never truncated, trimmed or normalised.

**The ceiling.** Generated fields are bounded before marshalling. The store then measures the complete item (attribute names, values, and list and map overhead, on the marshalled form) and refuses to write it if it is over 350,000 bytes. Nothing is dropped silently to make an item fit. With the caps above the ceiling cannot be reached, so `note_too_large` is a safety net for future attributes, and a test proves the maximum valid input plus the maximum generated output stays below it and saves.

**Which code wins** when one request breaks several rules: `sharing_not_available` (ADR 0008), then `invalid_text`, then `limit_exceeded`, then `validation_failed`. The `details` list still names every path that failed.

## Alternatives considered
- **The first proposal** (100,000 characters, 256 KB body). Rejected: internally inconsistent, and ignored generated fields.
- **A limit in UTF-8 bytes instead of code points.** Exact for DynamoDB, but a message such as "too long at 65,000 characters" would be confusing for someone writing in Chinese.
- **Keep 100,000 and store long notes in S3.** More machinery than a notes-first product needs now; it can come with D16 if long transcripts need it.
- **Drop the summary and actions when the item is large.** Rejected by Peter: nothing may be removed silently.

## Trade-offs
60,000 characters is roughly 10,000 words of English (an estimate, at about six characters a word). That is long for a quick note and short for a lecture transcript, which D16 will handle separately. Raising a limit later is safe for clients; lowering one is not, so the starting numbers are conservative. The ceiling limits content to roughly 72,000 four-byte characters before the item layout would have to change.

## Cost
No running cost. Effort is a day or so of code and tests.

## Privacy and security
Error bodies and logs carry field names and limits, never text. `invalid_text` stops text that DynamoDB might alter on storage from being saved, which protects "the user's words are stored as written". The body gate runs before parsing, so an oversized request costs almost nothing to refuse.

## Migration risk
Nothing is deployed, so no stored note can break. A 500 for oversized notes becomes a clear `422` or `413`. The error catalogue grows by four stable codes. The size function is a new module used by the store and the tests.

## Recommendation
As approved below.

---

## Decision
Peter's words, 3 October 2026. First, on the proposal that came before this one:
> Limits — Not accepted as written; revise and return
>
> The proposed 256 KB raw-body limit conflicts with the proposed 100,000-character content limit. A valid string under the character limit can exceed 256 KB when encoded as UTF-8 or JSON.
>
> The DynamoDB safety calculation must also cover the complete marshalled item, including:
> - content;
> - title and tags;
> - reminders and metadata;
> - summary and actions generated by enrichment;
> - DynamoDB attribute-name and type overhead.
>
> A valid note must never fail merely because generated summary or action data made the item too large. Bound derived fields or fall back to empty/bounded derived values while preserving the user’s content.

Then:
> 2. I approve the revised limits with these requirements:
>
> - decoded request body: 1,048,576 bytes maximum; larger requests return 413 payload_too_large;
> - content: 60,000 Unicode code points;
> - title: 200 Unicode code points;
> - tags: at most 20, each at most 40 Unicode code points;
> - reminders: at most 20;
> - generated summary: at most 1,000 Unicode code points;
> - generated actions: at most 50, each at most 200 Unicode code points;
> - persisted DynamoDB note safety ceiling: 350,000 bytes;
> - field or collection limit violations return 422 limit_exceeded;
> - a final item exceeding the safety ceiling returns 422 note_too_large.
>
> All textual limits and truncation must be Unicode-code-point-safe, including deriveTitle. The ellipsis must fit inside the stated limit, for example 999 code points plus the ellipsis for a 1,000-code-point summary.
>
> Never truncate, trim or normalise the user’s note content. Preserve the existing intentional title behaviour unless separately proposed.
>
> Do not silently remove summary or actions when the item approaches the safety ceiling. Bound generated fields before marshalling, then reject the write if the final complete item still exceeds 350,000 bytes. A test must prove that the maximum valid user input plus maximum permitted generated output remains below the ceiling and saves successfully.
>
> Measure the complete DynamoDB item using the documented sizing rules, including attribute names and nested/list overhead. Keep the DynamoDB Local 409,600-byte boundary test and repeat it against staging later.
>
> The 1 MiB request-body limit is for JSON encoding overhead and application protection. Do not describe it as space for D4 receipt fields; receipts are separate DynamoDB items.
>
> 3. I approve 422 invalid_text for unpaired UTF-16 surrogates. Apply Unicode validation to user-authored text and ensure generated/truncated text cannot introduce an unpaired surrogate. Valid control characters may remain accepted as proposed. Never echo invalid content into logs or error bodies.

## Consequences
- `packages/core` gains code-point helpers (`text.ts`) and the limits (`limits.ts`), and the request schemas use them. Four error codes join the catalogue: `payload_too_large`, `limit_exceeded`, `invalid_text` and `note_too_large`.
- The shared handler wrapper measures the body before parsing. The enrichment wrapper bounds generated fields. The store measures the item before writing.
- Gate 4 and Gate 5 repeat the 409,600-byte boundary test and the maximum-note save against staging.
- Architecture §2's limits table is replaced by this one.

## How to explain this
Every limit is counted in characters a person would recognise (Unicode code points), and the ceiling is measured in the bytes DynamoDB actually charges. The numbers were chosen backwards from the 400 KB item limit: the largest note, all its metadata and the largest generated summary and actions measure about 287 to 289 KB, and the store refuses to write anything over 350,000. Generated text is capped and shortened by the server, so a long note can never make itself unsaveable, and the user's own text is never cut. The request-body limit is separate and larger, because the same note can be sent as plain text or fully escaped and has to fit either way. A refusal always says which part was too long and changes nothing.

## Questions a reviewer will ask
- **Q:** Why 60,000 characters and not more?
  **A:** Four-byte characters are real (emoji), and 100,000 of them cannot fit in a DynamoDB item. With 60,000, the worst case measured 289,464 bytes against a 350,000 ceiling and a 409,600 hard limit.
- **Q:** Why is the request limit 1 MiB when a note is at most about 240 KB?
  **A:** A valid note written as `\uXXXX` escapes is 732,998 bytes, so a smaller limit would refuse valid notes. 1 MiB covers that with room to spare.
- **Q:** What stops a note from becoming unsaveable because of the summary or actions?
  **A:** They are capped before saving (1,000 code points; 50 actions of 200). A test saves the largest possible note with the largest possible output and measures the stored item.
- **Q:** How do you know your size calculation matches DynamoDB?
  **A:** A test finds the real boundary on DynamoDB Local (409,600 bytes accepted, 409,601 refused) and checks it against the function. The same test runs on staging.
- **Q:** Why reject unpaired surrogates?
  **A:** They are not valid Unicode text, and we cannot prove every storage path preserves them. Refusing them keeps "stored as written" true.
