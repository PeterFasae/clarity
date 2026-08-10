# BUILD.md — the phased spec

The executable half of the brief. [CONTEXT.md](CONTEXT.md) says what Clarity is; [ENGINEERING.md](ENGINEERING.md) says how it's built; this says **what to do, in what order, and how you know it worked.**

## Rules of engagement

1. **Gates are hard.** A phase does not begin until every acceptance criterion of the previous phase passes. If a criterion can't be met, stop and say so — do not proceed past a failed gate and mention it later.
2. **Report honestly.** If tests fail, show the output. If something was skipped, say which and why. "Done" means verified.
3. **Record non-obvious calls** as short ADRs in `docs/decisions.md`: what was decided, what was rejected, why. One paragraph each.
4. **Do not reopen CONTEXT.md §4.** Those eight decisions are settled with reasons.
5. **Never weaken a test to make it pass.** `packages/retrieval`'s 25 tests are the contract.
6. **Update `docs/status.json` in the same commit** as any change to what a feature does. Public copy is gated on it.
7. **Accessibility is not Phase 3.** Every interactive element ships keyboard-operable with a visible focus style and an accessible name, from Phase 0. Phase 3 audits; it does not retrofit.

**Source material:**
- `~/Downloads/adhd-notetaker-system-main/` — `frontend/`, `backend/`, `public_website/`
- `github.com/PeterFasae/clarity` — `shared/retrieval.js`, `tests/retrieval.test.js`
- `docs/research-report.pdf` — already in this repo

---

## Phase 0 — Merge and scaffold

**Goal:** one repository where everything builds and the inherited tests pass, before a line of new logic is written.

### Tasks

1. `git init`; wire the remote to `github.com/PeterFasae/clarity`. Do not push until the user asks.
2. Root `package.json` with npm workspaces: `packages/*`, `services/*`, `apps/*`. Root scripts (`test`, `build`, `lint`, `dev:*`) fan out. Vitest at the root.
3. **`packages/retrieval`** — copy `shared/retrieval.js` from the clarity repo to `index.js` **verbatim**, and `tests/retrieval.test.js` alongside it. ESM, zero dependencies, no build step. Do not refactor, rename, or "improve" it in this phase.
4. **`packages/core`** — the canonical `Note`, `ActionItem`, `Preferences` types and their zod schemas, plus the API request/response contract. Exactly as specified in ENGINEERING.md § "The canonical data contract". This is the file that kills the `_id`/`id` bug class.
5. **`apps/site`** — move `public_website/` in. It already builds. Rename "Focus Flow Notes" → "Clarity" throughout copy, `package.json`, and `<title>`/OG tags. Repoint its demo at `packages/retrieval` and **delete `src/lib/summarize.ts`** — it is now a duplicate implementation.
6. **`apps/web`** — move `frontend/` in. Keep `src/components/ui/` (shadcn), the Tailwind config, and the fonts. **Delete `pages/Index.tsx`** (the auto-redirecting placeholder with the false WCAG claim). Delete `lovable-tagger` from the dev toolchain.
7. **`services/api`** — scaffold Serverless v3 (`nodejs20.x`, `eu-north-1`) with the handler folder structure and `lib/{dynamo,auth,respond}.js` as stubs. **Do not port `backend/functions/*` — they are written against Mongo and carry the inherited bugs.** Read them for intent, then write fresh.
8. **`docs/status.json`** — seed with every feature named in CONTEXT.md §8 and in the app, all `planned` except what genuinely exists.
9. Fix the contrast defect at the token level in both Tailwind configs: `lavender.ink = #5F49BC` for text and links; `#9b87f5` restricted to fills and large display type.
10. Root `README.md` — short. What Clarity is, how to run it, where the docs are.

### Acceptance criteria — all must pass

- [ ] `npm install && npm test` — green, with **all 25 `packages/retrieval` tests passing unmodified**. Print the count.
- [ ] `npm run build` — clean across every workspace, no TypeScript errors.
- [ ] `npm run dev -w apps/site` serves the marketing site, and its demo tab runs `packages/retrieval` (verify by editing the engine and seeing the demo output change).
- [ ] `npm run dev -w apps/web` serves the app shell without runtime errors.
- [ ] `grep -ri "focus flow" apps/ packages/ services/` returns nothing.
- [ ] `grep -rn "node-summarizer\|summarize.ts\|lovable-tagger" .` returns nothing.
- [ ] `grep -rn "#9b87f5" apps/` — every hit is a fill or display-type usage, none is body text.

---

## Phase 1 — Data, auth, API

**Goal:** a secured, tested API on the architecture the research report describes. Nothing in Phase 2 works without this, and retrofitting auth later is a rewrite.

### Tasks

1. **DynamoDB.** `NotesTable` — PK `noteId`, GSI `UserIdIndex` (PK `userId`, SK `updatedAt`). Encryption at rest, on-demand capacity. Preferences storage per ENGINEERING.md. Define in `serverless.yml` resources.
2. **Cognito.** User pool + app client. API Gateway JWT authorizer on **every** route. `userId` from `claims.sub`, never from the request body.
3. **`lib/dynamo.js`** — the only file that knows DynamoDB exists. `lib/respond.js` — the only place a note is serialised to the wire (`noteId` → `id`) and the only copy of the CORS headers, with an **origin allowlist, never `*`**. `lib/auth.js` — extract and verify the caller; `assertOwnership(note, userId)` throws a 403.
4. **Handlers**, one per operation, per the route table in ENGINEERING.md. Every one: validate with the zod schema from `packages/core`, assert ownership, respond through `lib/respond.js`.
5. **`lib/enrich.js`** — compute summary and actions on every create and update. Separate fields. **`content` is never written by the summariser.**
6. **Search** — `getNotes` queries `UserIdIndex` with a `ProjectionExpression`, runs `search()` from `packages/retrieval`, hydrates the top N with `BatchGetItem`, returns hits with scores.
7. **Pagination** — `ExclusiveStartKey` in, opaque `cursor` string out.
8. **IAM** — per-function least privilege. `deleteNote` gets `DeleteItem` on the table and nothing else. Report §4.3E specifies this; it is also a procurement talking point.
9. **Seed + load script** — generate N realistic notes for a test user, for the latency gate below.
10. **Integration tests** in `services/api/tests/` against `serverless offline`.

### Acceptance criteria — all must pass

- [ ] Every route in ENGINEERING.md's table exists and returns its documented shape. **Including `GET /notes/{id}`**, which the predecessor's frontend called and which had no route.
- [ ] A request with no JWT returns **401** on every route.
- [ ] **User A requesting user B's note returns 403**, for read, update *and* delete. This test is the reason Phase 1 exists — write it first.
- [ ] Create a note, then read it: `summary` is populated, `actions` is populated, and **`content` is byte-identical to what was sent.**
- [ ] Update a note: `summary` and `actions` are recomputed; `content` still matches the new input exactly.
- [ ] Search finds a note by words that appear in the body but **not** in the title. Use the README's own example: a note titled *"Why the dashboard felt slow"* is returned for the query *"why was the page slow"*.
- [ ] Pagination: two pages of results, no duplicates across the boundary, stable ordering.
- [ ] `GET /actions` returns items across multiple notes, each carrying `noteId` and `noteTitle`.
- [ ] CORS: a request from an unlisted origin is rejected. `grep -rn '"\*"' services/api` finds no CORS wildcard.
- [ ] **Performance gate — reproduce the report's published figures.** Seed 500 notes for one user, then measure: `createNote`, `getNotes`, and `summarize` **p95 under 350ms warm**. Report §5.4 publishes 240/275/310ms average with max 590ms. Record actual numbers in `docs/decisions.md`. *If the gate fails, that is a finding worth reporting, not a reason to lower the bar — the dissertation's numbers depend on it.*

---

## Phase 2 — The ADHD product layer

**Goal:** the part that makes this an ADHD product rather than a notes CRUD app. Two of these are ports of finished, accessible code — do not rewrite them.

### Tasks

1. **Quick capture.** `⌘N` focuses the capture box from anywhere; `⌘↵` saves. No title field, no folder picker, no tag prompt. Title derives from the first non-empty line, `#` stripped, 60 chars. **Target: thought → saved in under two seconds with zero decisions.**
2. **Summary beside the original.** Collapsible panel above the note body with a dismiss control. The original is always intact and visible. Label which engine produced it (`summarySource`).
3. **Actions view.** All actions across all notes, each linking back to its source note. Checking one off is a note edit, since actions are derived.
4. **Search UI.** Server-backed. Show the matched note and why it matched. Empty and no-results states written with care — this audience reads a blank screen as their own failure.
5. **Focus mode.** **Port `public_website/src/components/FocusMode.tsx`.** It already handles Esc, focus trap, focus restoration, `inert` backdrop, `aria-live` announcements, and an instant path under reduced motion. Wire it to a real note and add the optional timer.
6. **Preferences panel.** **Port `public_website/src/context/PreferencesContext.tsx`**, extend to the full set (theme incl. high-contrast and low-stimulation, font incl. Atkinson and OpenDyslexic, text size, motion), then sync to `/me/preferences` so settings follow the user across devices. `localStorage` stays the offline cache and pre-login source. **No cookies.**
7. **Voice capture.** `useSpeechRecognition` over the Web Speech API. **Degrade to the text path on unsupported browsers — never render a broken mic button.**
8. **Text-to-speech playback** of note or summary. Web Speech synthesis; cheap and directly serves design rule 4.
9. **Reminders.** Due dates on notes, browser notifications. The field has existed in the model since the beginning and has never been wired.
10. **Pin / archive / tag** — working this time, against `pinned`/`archived`/`tags`.
11. **Loading, empty and error states** everywhere. Design rule 3 is real-time feedback; a silent failure is a violation, not a rough edge.

### Acceptance criteria — all must pass

- [ ] **Keyboard-only walkthrough of every flow**, no mouse: capture, save, search, open, summarise, enter and exit focus mode, change preferences, delete. Focus is always visible; focus never gets lost or trapped outside a dialog.
- [ ] `⌘N` → type → `⌘↵` saves a note with a derived title, in under two seconds, with no other input required.
- [ ] Summarising a note leaves `content` untouched — verify against the API, not just the UI.
- [ ] Focus mode: Esc exits, focus returns to the trigger, the backdrop is `inert` and hidden from assistive tech, and entry/exit is announced.
- [ ] Preferences set on one client appear on a second client after reload.
- [ ] `prefers-reduced-motion: reduce` disables every animation, and the in-app toggle overrides the OS setting in both directions.
- [ ] Speech recognition unsupported → a working text path and an honest message. No dead button.
- [ ] Every feature touched has a current entry in `docs/status.json`.

---

## Phase 3 — Trust, AI, and launch

**Goal:** make the public claims true, then make them publicly.

### Tasks

1. **AI provider seam.** `services/api/lib/ai/` with `local.js` (wraps `packages/retrieval`) and `claude.js` (Anthropic SDK, `claude-sonnet-5`), same interface, selected per request from the user's `aiEnabled` preference.
   - **Default off.** Consent copy before the flag can be enabled, stating plainly that note text is sent to Anthropic when on.
   - **Local is the fallback:** if the LLM errors or times out, the local engine answers. **An AI outage must never block a save.**
   - Turning the flag off offers to recompute affected notes locally.
   - Adds: abstractive summaries, suggested tags, better action extraction on free-form writing — the exact weakness report §4.6 identifies in frequency-based summarisation.
2. **GDPR.** `POST /me/export` returns all notes and preferences as JSON. `DELETE /me` hard-deletes everything, behind an explicit confirmation. Both documented in plain language on `/privacy`.
3. **Accessibility audit.** `axe-core` in CI on both `apps/web` and `apps/site`. Full keyboard walkthrough. Screen-reader pass (VoiceOver). Contrast audit across all four themes. Fix everything found.
4. **`docs/accessibility-statement.md`** and the `/accessibility` page — what conforms, what doesn't yet, how to report a barrier. **Honest, not boilerplate.** This is a DSA sales asset.
5. **Marketing site finish.** Clarity naming throughout, the "Find it" demo tab (§8 of CONTEXT.md — the thesis, demonstrated), real `<meta>` and Open Graph tags, and a real waitlist endpoint. Every claim gated on `docs/status.json`.
6. **Deploy.** API to AWS; both frontends to Vercel with SPA rewrites. Separate dev and prod stages. Provisioned concurrency on the hot paths to blunt cold starts (report §4.6).
7. **CloudWatch** log groups, alarms on error rate > 5% and on DynamoDB throttling — as report §5.2 describes.

### Acceptance criteria — all must pass

- [ ] `aiEnabled: false` → **zero outbound network calls to Anthropic.** Prove it with a test that fails if one is made.
- [ ] LLM timeout or error → the note still saves, with a local summary and `summarySource: "local"`.
- [ ] Export returns every note for the user and nothing belonging to anyone else. Delete leaves no residue — verify by direct table query.
- [ ] **Zero axe-core violations** on every page of both apps.
- [ ] **Lighthouse accessibility 100** on every page of `apps/site`, and on the app's main views.
- [ ] Every colour pair used for text meets 4.5:1 (3:1 for large text) in all four themes.
- [ ] `docs/accessibility-statement.md` exists, is dated, and names real gaps rather than claiming none.
- [ ] **Claims audit:** every present-tense feature claim on the site maps to a `built` entry in `docs/status.json`. No efficacy claim, no WCAG conformance claim beyond what the audit supports, no clinical framing, no unqualified "your notes never leave" — cross-check against CONTEXT.md §6.
- [ ] No cookie banner, because no cookies are set. Verify in devtools.

---

## Definition of done

Clarity is done when a person with ADHD can sign up, capture a thought in one keystroke, find it three weeks later by describing it rather than naming it, read it in a font and contrast that suit them, and delete everything they've ever written in one action — and when every claim on the marketing site is one you could defend to a disability services assessor with the audit in hand.
