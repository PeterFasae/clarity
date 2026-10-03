# 0008: Remove the dormant `sharedWith` surface

- **Status:** Accepted on 3 October 2026.
- **Date:** 2026-10-03
- **Decision owner:** Peter Fasae
- **Roadmap item:** Defect 7 in [`docs/plan/backend-roadmap.md`](../plan/backend-roadmap.md) (a security control, so it was proposed first)
- **Supersedes:** the `sharedWith` array and the `shared` filter in the Phase 1 contract (`packages/core`).
- **Evidence** (checked on 3 October 2026):
  - `packages/core/api.ts:38` lets a client write `sharedWith` through `PUT /notes/{id}`, and `services/api/functions/updateNote.js:29` stores it. `createNote.js:39` stores an empty array.
  - Another user's note is always a 403 (`tests/ownership.test.js`), so nothing grants a listed address any access. The field has no authorisation effect.
  - `docs/status.json` lists Sharing as `planned`.
  - The web app never writes `sharedWith`. It shows a "Shared" tab (`apps/web/src/pages/Notes.tsx:17,262`) that filters on it.
  - `services/api/lib/dynamo.js:125` implements `?filter=shared`, and `tests/listing.test.js:38` checks it returns nothing when nothing is shared.

## Problem
The API accepts and stores arbitrary email addresses with a `read` or `write` permission, for people who have not agreed to anything, and the permission does nothing. That is personal data held for no purpose, and a promise of a feature that does not exist. A future sharing design needs an invitation and authorisation model, not this array.

## Proposed approach
Remove the whole surface now, because nothing is deployed and there is no working sharing:
1. `sharedWith` leaves the request schemas.
2. `sharedWith` leaves the stored and response note schemas.
3. The `shared` filter leaves the API (`NoteFilterSchema`, the `dynamo.js` expression and the listing test).
4. The non-functional Shared tab leaves the app. This is the minimal frontend change that keeps the app matching the API.
5. A request body that contains `sharedWith` gets **`422` with code `sharing_not_available`**, not a silent strip. The message is plain language, for example "Sharing isn't available yet."
6. Sharing stays `planned` in `docs/status.json`.

## Alternatives considered
- **Remove it from update requests only, keep the stored field and the filter.** Smaller, but leaves a dormant surface the next design would inherit.
- **Strip it silently.** A client would believe it had shared a note.
- **Keep it as it is.** Stores third-party email addresses for nothing.

## Trade-offs
Removal is a visible API change, which is why it is recorded. No client uses the field, so nothing breaks. The cost is a few lines of code and one test change. A future sharing design starts clean.

## Cost
None.

## Privacy and security
Stops the service storing third-party email addresses for people who have not consented. The `422` makes a client's wrong assumption visible instead of hidden.

## Migration risk
Nothing is deployed, so there are no stored values to clean up. The listing test for the shared filter is replaced by a test that the filter is refused (`?filter=shared` is no longer a valid value, so it returns the standard validation error). Test count does not go down: the removed case is replaced by at least one new case for the `422`.

## Recommendation
Remove it completely.

---

## Decision
Peter's words, 3 October 2026:
> sharedWith — Approved as a separate decision, with the complete-removal alternative
>
> Nothing is deployed and there is no working sharing or authorisation model, so remove the dormant surface now:
> - remove sharedWith from request schemas;
> - remove it from the stored and response note schemas;
> - remove the shared filter from the API;
> - remove the non-functional Shared tab from the app;
> - keep Sharing marked planned in status.json.
>
> A request containing sharedWith must get 422 sharing_not_available rather than being silently stripped. A future sharing design should introduce a deliberate invitation and authorisation model instead of inheriting this unused email array.

## Consequences
- Code and tests change after the review Peter asked for, as routine implementation of this decision.
- `sharing_not_available` joins the error catalogue in `packages/core`.
- The roadmap's defect 7 is marked decided.
- `docs/status.json` keeps Sharing as `planned`.

## How to explain this
To be filled in when this lands.

## Questions a reviewer will ask
To be filled in when this lands.
