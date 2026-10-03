# ENGINEERING.md

Engineering map for Clarity. This file covers **how the system is built**. See [CONTEXT.md](CONTEXT.md) for what it is and why, and [BUILD.md](BUILD.md) for the phased spec and acceptance criteria.

> **Status (3 October 2026): Phases 0–3 are built, locally only. Nothing has been deployed.** The workspace below exists and 243 tests pass (121 when Phase 3 closed). This file was written as the target state before Phase 0 and describes the Serverless Framework v3 setup, which is being replaced: the region (London), the infrastructure tooling (AWS CDK in TypeScript on Node.js 24) and the local test rig were decided on 3 October 2026 in [ADR 0005](docs/adr/0005-london-region.md), [ADR 0006](docs/adr/0006-cdk-typescript-node24.md) and [ADR 0007](docs/adr/0007-in-process-test-rig-and-route-manifest.md), and the code has not been moved over yet. Until it is, treat the Serverless-specific sections below (layout, commands, route wiring) as a description of today's code, not of where it is going. The plan is [`docs/plan/backend-roadmap.md`](docs/plan/backend-roadmap.md). The target design is [`docs/plan/backend-architecture.md`](docs/plan/backend-architecture.md).

---

## Workspace layout

One repository, npm workspaces. Always run commands from the root unless noted.

```
clarity/
  package.json                  # workspaces root; scripts fan out
  CONTEXT.md ENGINEERING.md BUILD.md KICKOFF.md
  docs/
    research-report.pdf         # the 60pp source of record
    decisions.md                # ADRs — one per non-obvious call made during the build
    accessibility-statement.md  # written in Phase 3, after the audit
    status.json                 # the feature-status registry (see below)
  packages/
    retrieval/                  # THE engine. ESM, zero dependencies, 25 tests.
      index.js  ( summarise, extractActions, search, tokenise, splitSentences, buildIndex )
      retrieval.test.js
    core/                       # canonical types + zod schemas + API contract
      note.ts  preferences.ts  api.ts
  services/
    api/                        # Serverless Framework v3 → Lambda + DynamoDB + Cognito
      serverless.yml
      functions/                # one handler per operation
      lib/                      # dynamo.js, auth.js, respond.js, ai/
      tests/
  apps/
    web/                        # the product SPA — Vite + React + TS + shadcn/ui + Tailwind
    site/                       # the marketing site — standalone, no API dependency
```

**Why a monorepo:** `packages/retrieval` is imported by `services/api` (compute on write, search), `apps/web` (optimistic local preview) *and* `apps/site` (the live demo). One implementation, one test suite, no drift — the marketing demo runs the same code as production. See CONTEXT.md §4.3.

---

## Commands

```bash
npm install                  # root; installs all workspaces
npm test                     # all workspaces. packages/retrieval's 25 tests must stay green.
npm run build                # typecheck + build every workspace
npm run lint

npm run dev -w apps/web      # product SPA
npm run dev -w apps/site     # marketing site
npm run dev -w services/api  # serverless offline → http://localhost:3000/dev

npm run deploy -w services/api   # npx serverless deploy
```

`packages/retrieval` has **no build step** — it is plain ESM and is consumed directly. Keep it that way; the absence of a toolchain is why it can be imported from three places without friction.

---

## The canonical data contract

This is the single most important section. The predecessor codebase had two incompatible note shapes and nothing mapped between them, so every per-note action in the UI was silently broken. That entire bug class is eliminated by having exactly one type definition.

**`packages/core/note.ts` is the only place a `Note` is defined.** `services/api`, `apps/web` and any test import it. Handlers serialise *through* it. If persistence and API drift apart, it becomes a type error rather than an `undefined` at runtime.

### Persisted shape — DynamoDB `NotesTable`

Per report §4.3C.

| Attribute | Type | Notes |
|---|---|---|
| `noteId` | S | **Partition key.** UUID. |
| `userId` | S | Cognito `claims.sub`. **GSI `UserIdIndex` partition key.** |
| `updatedAt` | S | ISO-8601. **GSI sort key** — gives free reverse-chronological listing. |
| `createdAt` | S | ISO-8601 |
| `title` | S | Derived from the first line of `content` if not supplied |
| `content` | S | The note body as the user wrote it |
| `summary` | S | **Computed.** Never user-entered, never written into `content`. |
| `actions` | L\<S\> | **Computed.** |
| `summarySource` | S | `"local"` \| `"llm"` — which engine produced `summary`/`actions` |
| `tags` | L\<S\> | User-set today; LLM-suggested later, always dismissible |
| `pinned` | BOOL | |
| `archived` | BOOL | |
| `reminders` | L\<S\> | ISO-8601 timestamps |

**GSI `UserIdIndex`:** PK `userId`, SK `updatedAt`. Every list, filter and search path goes through it. Filter views (`pinned`, `archived`) apply a `FilterExpression` after the query — as report §4.3C describes. Pagination uses `ExclusiveStartKey`, surfaced to clients as an opaque `cursor` string.

### Naming rulings — do not relitigate

Three of these exist specifically to kill inherited bugs:

1. **Persist `content`, not `body`.** The report (§4.3C) and the old Mongo schema both say `content`. `packages/retrieval` is text-in/text-out and never names a field, so **the 25 tests do not change** — only the caller's property access does. Clarity's old `body` naming does not survive the merge.
2. **The API returns `id`, never `noteId`.** Serialisation happens in one place (`services/api/lib/respond.js`), so no handler can forget.
3. **`pinned` and `archived` everywhere.** Not `isPinned`/`isArchived`. Not both.

### Preferences

Stored per user (`PreferencesTable`, or a `USER#<sub>` item — either is fine, pick one and record it in `docs/decisions.md`):

```
theme:    "light" | "dark" | "high-contrast" | "low-stimulation"
font:     "system" | "atkinson" | "dyslexic"
textSize: "s" | "m" | "l" | "xl"
motion:   "full" | "reduced"
aiEnabled: boolean          // default FALSE — see CONTEXT.md §4.5
```

Client-side these mirror `apps/site`'s existing `PreferencesContext`: state is reflected onto `<html>` as classes and CSS does the rendering. Server persistence is what makes them follow the user across devices (report §2.2.5.1). `localStorage` remains the offline cache and the pre-login source — **no cookies, so no cookie banner.**

---

## API

All routes sit behind an API Gateway REST API with a **Cognito JWT authorizer**. `userId` comes from `claims.sub` and is never accepted from the client. Every handler asserts ownership before returning or mutating; a note belonging to another user returns **403, not 404**, and there is a test for it.

| Method | Path | Notes |
|---|---|---|
| `POST` | `/notes` | Create. Computes summary + actions on write. |
| `GET` | `/notes` | `?q=` search · `?filter=pinned\|archived` · `?limit=` · `?cursor=` |
| `GET` | `/notes/{id}` | **Missing in the predecessor despite the frontend calling it.** |
| `PUT` | `/notes/{id}` | Recomputes summary + actions. |
| `DELETE` | `/notes/{id}` | |
| `GET` | `/notes/{id}/summary` | Report §4.5 names this route. Returns the stored summary. |
| `POST` | `/notes/{id}/summarize` | Force recompute. `?mode=local\|llm`, subject to the user's `aiEnabled`. |
| `GET` | `/actions` | Every action across the user's notes, each with `noteId` + `noteTitle`. Derived at read time from stored `actions`, never a separate store. |
| `GET`/`PUT` | `/me/preferences` | |
| `POST` | `/me/export` | GDPR. All notes + preferences as JSON. |
| `DELETE` | `/me` | GDPR. Hard delete, confirmed. |

CORS is restricted to the known app and site origins. **Never `*`.** Request bodies are validated with zod schemas from `packages/core` at the handler boundary.

---

## How the engine is wired

### Compute on write

```js
// services/api/lib/enrich.js — the rule, inherited from Clarity and kept
function enrich(note, engine) {
  return {
    ...note,
    summary: engine.summarise(note.content),
    actions: engine.extractActions(note.content),
    summarySource: engine.name,
    updatedAt: new Date().toISOString(),
  };
}
```

Summary and actions are **computed, never entered**, and recomputed on every write. One source of truth for what a note says; they cannot drift from it. Doing it on write means the work happens once per edit instead of once per search — and capture stays instant either way because the write is already a round trip.

`summary` and `actions` are separate fields. **`content` is never written by the summariser.** The predecessor overwrote the note body with its summary; that is the single worst inherited bug and the reason this is stated three times in this document.

### Search

```
getNotes(q):
  Query UserIdIndex  PK = userId
    ProjectionExpression: noteId, title, content, updatedAt   # keep the payload small
  → search(q, projected)          # packages/retrieval, unchanged
  → take top N, BatchGetItem to hydrate
  → return with scores
```

`search()` builds a TF-IDF index over the projected set and ranks by cosine similarity. Scoping the corpus to one user is both correct — relevance is personal — and what makes the in-Lambda approach viable.

**Known ceiling:** comfortable to roughly 1–2k notes per user. Beyond that, the query payload and index build dominate. The upgrade path is a term→noteIds inverted-index table written on save; `search(query, notes, opts) → [{note, score}]` is deliberately shaped so the scorer can be replaced without touching a single caller. **Do not build the index table until measurement says it's needed.**

### AI providers

```
services/api/lib/ai/
  index.js        selectEngine(userPrefs, requestedMode) → LocalEngine | ClaudeEngine
  local.js        wraps packages/retrieval. name: "local"
  claude.js       Anthropic SDK. name: "llm"
```

Both expose the same interface: `{ name, summarise(text), extractActions(text), suggestTags(text) }`.

- **`local` is the default and the fallback.** If `aiEnabled` is false, or the LLM call errors or times out, the local engine answers. **An AI outage must never block a save.**
- **`claude` is opt-in per user, default off.** Model: `claude-sonnet-5`. Consent copy is shown before the flag can be turned on, and it says plainly that note text is sent to Anthropic when enabled.
- `summarySource` records which engine produced the stored values, so the UI can label it and a user turning the flag off can have their notes recomputed locally.

---

## Frontend

`apps/web` — Vite + React 18 + TypeScript, shadcn/ui on Tailwind. `@/` aliases `src/`.

**Signature interactions, all of which are the product:**

- **Quick capture.** `⌘N` focuses the capture box from anywhere; `⌘↵` saves. No title field, no folder picker, no tag prompt. Title derives from the first non-empty line, stripped of leading `#`, capped at 60 chars.
- **Summary beside the original.** A collapsible panel *above* the note body, with a dismiss control. The user is always in charge of simplification, and the original is always intact and visible.
- **Actions list.** A view across all notes, each item linking back to its source note.
- **Focus mode.** One note, all chrome gone. **Port `public_website/src/components/FocusMode.tsx` — do not rewrite it.** It already handles Esc to exit, focus trap, focus restoration to the trigger, `inert` on the backdrop, `aria-live` announcements, and an instant (non-animated) path under reduced motion.
- **Preferences panel.** **Port `public_website/src/context/PreferencesContext.tsx`**, then add server sync. Same pattern: state → classes on `<html>` → CSS.
- **Voice capture.** Web Speech API via a `useSpeechRecognition` hook. Chrome-only in practice; **always degrade to a working text path, never a broken mic button.** Server-side transcription is a later phase.

`apps/site` — the marketing site, already largely built. Standalone; imports `packages/retrieval` for the live demo so the demo cannot drift from production behaviour.

---

## Inherited bugs — fix, do not reproduce

Every one of these is present in `~/Downloads/adhd-notetaker-system-main/`. If you find yourself faithfully porting one, stop.

| Bug | The fix here |
|---|---|
| `Note` used `id`/`isPinned`/`isArchived` in the frontend and `_id`/`pinned`/`archived` in Mongo, with nothing mapping between them — so `note.id` was `undefined` and every per-note call hit a bad path | One type in `packages/core`; serialisation in `lib/respond.js` |
| The summariser **overwrote `content`** with the summary; the `summary` field existed and was never populated | Separate fields; `content` is never written by `enrich()` |
| `GET /notes/{id}` was called by the frontend and had no route | Routed in `serverless.yml` |
| `isShared` sent by the UI was silently dropped | There is no sharing surface until sharing is designed; a request that sends `sharedWith` gets `422 sharing_not_available` ([ADR 0008](docs/adr/0008-remove-dormant-sharedwith.md)) |
| `userId` defaulted to the literal `"default-user"`; no handler checked ownership | Cognito `claims.sub`; ownership asserted everywhere |
| CORS `*` on every handler, each with its own copy of the headers object | One `respond.js`, origin allowlist |
| Four routes mapped to the same `getNotes.handler`, which branched on `event.path` because the frontend never sent query params | One `getNotes` handler, filters via query string |
| No test framework in either project; `npm test` was the default stub that exits 1 | Vitest at the root; 25 tests arrive with `packages/retrieval` |
| Client-side-only search over the loaded array | GSI query + `search()` in the Lambda |
| Landing page claimed "Fully WCAG compliant" and "dyslexia-friendly fonts" for features that did not exist | `docs/status.json` gates all public copy |
| Brand lavender `#9b87f5` used as body text at ≈2.9:1 | `lavender-ink #5F49BC` (≈6.7:1) for all purple text |
| `pages/Index.tsx` auto-redirected to `/notes` after 500ms | `/` is the app; the marketing site is a separate deploy |

---

## Conventions

- **`packages/retrieval` is treated as vendored and load-bearing.** Its 25 tests must keep passing unmodified. Changing behaviour there means changing search results and summaries for every consumer — do it deliberately, with a test, and an ADR in `docs/decisions.md`.
- **`packages/core` types are the contract.** Adding a field means adding it there first.
- `src/components/ui/` in `apps/web` is generated shadcn/ui. Add components with the shadcn CLI; treat existing files as vendored.
- Handlers stay small and stateless apart from the store. **The store is the seam** — `lib/dynamo.js` is the only file that knows DynamoDB exists. Keeping that boundary honest is what makes the data layer swappable.
- Environment config by variable, never hardcoded: table names, region, allowed origins, Cognito pool ids, the Anthropic key. Encrypted at rest (report §4.3E).
- Each Lambda gets its own IAM role with only the DynamoDB actions and resources it needs — `deleteNote` gets `DeleteItem` and nothing else. Report §4.3E specifies this and it is a procurement talking point.
- **Accessibility is a build constraint, not a phase.** Every interactive element ships keyboard-operable with a visible focus style and an accessible name. Phase 3 audits; it does not retrofit.
- British English in user-facing copy (*summarise*, *organise*, *personalisation*).

## Git and commits

Remote: `https://github.com/PeterFasae/clarity` (branch `main`). History starts at `2d3e044`, the original Clarity engine — **never force-push over it.**

- **Commit after every task, change or adjustment.** One logical change per commit, not one commit per session. If a change touches the engine, the API and the UI, that is still one commit if it is one change.
- **Push after each commit** unless the working tree is mid-gate and failing.
- **Commits are authored by Peter Fasae `<pfasae@gmail.com>`.** No `Co-Authored-By` trailers, no generated-with footers, no tool attribution of any kind in commits or PR bodies. This is a deliberate preference, not an oversight.
- Message style matches the existing history: a plain imperative subject line describing the change, body only when the *why* isn't obvious from the diff.
- `docs/status.json` is updated in the same commit as any change to what a feature does.

## `docs/status.json`

The single registry of what actually exists. Both `apps/web` and `apps/site` read it, so a "Coming soon" label cannot rot after a feature ships or slips.

```json
{
  "features": [
    { "id": "quick-capture", "name": "Quick capture", "status": "planned",
      "publicCopy": "One keystroke to capture. No title, no folder." }
  ]
}
```

`status` is `built` | `in-progress` | `planned`. **Public copy may only describe a feature in the present tense when its status is `built`** — see CONTEXT.md §6.
