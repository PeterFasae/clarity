# Decisions

Short ADRs for non-obvious calls made during the build. One paragraph each: what
was decided, what was rejected, why. The eight settled decisions in
[CONTEXT.md §4](../CONTEXT.md) are upstream of these and are not relitigated here.

---

## Phase 0 — merge and scaffold

### 0.1 — The monorepo is the existing `clarity` repository, not a fresh one

BUILD.md Phase 0 task 1 says `git init` and wire the remote. The repository
already existed here with the remote set and two commits of real history, the
first of which (`2d3e044`) is the original engine that ENGINEERING.md says must never
be force-pushed over. So the merge was done *in place*: the engine moved from
`shared/` to `packages/retrieval/` as a git rename, preserving its history.
Rejected: initialising a new repository and copying files in, which would have
detached the engine from the history that makes its 25 tests credible.

### 0.2 — The root-level demo app was deleted, not ported

The old repo root carried `src/` (a small React client) and `server/` (an
Express app over an in-memory `Map`). Both are superseded — `apps/web` is the
product surface and `services/api` is the API — and CONTEXT.md §3 lists the
in-memory store explicitly under "do not carry over". They are removed rather
than parked in a folder; git has them at `542549f` if the handler style is ever
worth re-reading.

### 0.3 — `search()` names `note.title` and `note.body`; the caller adapts

ENGINEERING.md's naming section says the engine "is text-in/text-out and never names
a field". That is not quite true: `buildIndex()` reads `note.id`, `note.title`
and `note.body`, and six of the 25 tests pass fixtures in that shape. Since the
engine is vendored and the tests are the contract, **the engine keeps `body` and
the caller does the mapping** — `services/api` will project its persisted
`content` into `{ id, title, body }` on the way into `search()` and read the
result back out. Persistence, the API and the UI all still say `content`; only
the six lines that call the scorer know about `body`. Rejected: renaming the
field inside the engine, which would have meant editing tests to make them pass.

### 0.4 — One line of the test file changed: the import specifier

`tests/retrieval.test.js` imported `../shared/retrieval.js`. The file now sits
next to the engine, so the specifier is `./index.js`. Nothing else in the file
was touched, no assertion was altered, and all 25 tests pass. Recording it here
because "unmodified" is the acceptance criterion and this is the one edit.

### 0.5 — `packages/core` compiles to `dist`; the apps alias to source

`services/api` runs on Node and needs the zod schemas at runtime, so
`packages/core` has a `tsc` build with declarations, wired to a `prepare` script
so `npm install` produces it. The Vite apps alias `@clarity/core` and
`@clarity/retrieval` straight at the source files instead, so a change to the
contract or the engine shows up in dev without a rebuild in between. Same source
either way, so there is no drift — only two resolution paths to it.

### 0.6 — The wire `Note` drops `userId`

`StoredNote` has `userId`; `Note` does not. The client already knows who it is,
and shipping the field invites a handler somewhere to start trusting it. The
`noteId` → `id` mapping and this omission both happen in exactly one function,
`services/api/lib/respond.js`.

### 0.7 — `deriveTitle()` lives in `packages/core`

ENGINEERING.md describes `packages/core` as types, schemas and the API contract, and
`deriveTitle` is a function. It goes there anyway because both the API (on
write) and the app (for its optimistic preview) need it and they must agree
character-for-character — the title rule is part of the contract in everything
but syntax. Rejected: a copy in each, which is how the three-summariser problem
started.

### 0.8 — Preferences get their own table

ENGINEERING.md leaves the choice between a `PreferencesTable` and a `USER#<sub>` item
in the notes table, and asks for the decision to be recorded. **A separate
table.** The notes table's partition key is `noteId` and its GSI is built for
reverse-chronological listing; a user-preferences item would sit in it as a
special case that every scan and every GDPR delete has to remember to handle.
A second on-demand table costs nothing at this scale and keeps
`deleteEverythingForUser` obvious.

### 0.9 — The contrast defect is fixed at the token level, and `#7c69d4` is gone

`apps/web` had `lavender.DEFAULT #9b87f5` (~2.9:1 on white) applied as
`text-lavender` and as a button fill under white text, plus `lavender.dark
#7c69d4` (~4.4:1) as the hover — which looks like a fix and is still under the
4.5:1 floor. The palette is now `DEFAULT #9b87f5` for fills and large display
type only, `ink #5F49BC` (~6.7:1) for every purple text, icon, border and focus
ring, and `dark #4B3A96` (~9.0:1) for hover on an ink-filled control. The
shadcn CSS variables were the real carrier of the bug — `--primary` and `--ring`
were both `#9b87f5`, so every default button in the app had white text at 2.9:1 —
and are now `#5F49BC`. `--secondary` moved from `#8E9196` (~2.9:1) to `#5B6066`
(~5.3:1) for the same reason. `apps/site` already had this right and was left
alone. The full four-theme audit is still Phase 3.

### 0.10 — `apps/web` now self-hosts its fonts

Its stylesheet pulled Atkinson Hyperlegible from Google Fonts and OpenDyslexic
from `cdnfonts.com`, so every page load told two third parties who was reading.
That is hard to square with "we don't monitor you", and it is exactly the kind
of claim CONTEXT.md §6 says must be true before it is made. The same `.woff2`
files `apps/site` already vendored are now in `apps/web/public/fonts`.

### 0.11 — `docs/status.json` is wired into the site now, not in Phase 3

Phase 0 only asked for the file to be seeded. It is also wired into
`/how-it-works` and the home page's "how it works" section, because those pages
carried hardcoded "Available now" tags on features that do not exist — a live
claims violation the moment the site is served. Feature copy and status both
come from the registry via `@/lib/status`; the site no longer states what a
feature does anywhere else. **Nothing is `built` at the end of Phase 0.**
`summaries`, `action-items`, `search`, `accounts` and `cloud-sync` are
`in-progress`; everything else is `planned`.

### 0.12 — `clarity.example` is the placeholder domain

The site's canonical origin and its accessibility contact address were
`focusflow.notes`. The real domain is an open action (CONTEXT.md §4.1 — check
the domain and the trademark before `apps/site` goes live), so they now point at
the reserved `.example` TLD rather than at a name we may not be able to have.
The accessibility page already labels the address as a placeholder. Phase 3 task
5 must replace both.

### 0.13 — `/` in `apps/web` is the notes view

`pages/Index.tsx` was a marketing landing page that redirected to `/notes` after
500ms and claimed "Fully WCAG compliant with dyslexia-friendly fonts" for
features that did not exist. Deleted. `/` and `/notes` both render the app;
marketing is a separate deploy.

### 0.14 — `apps/web`'s build now typechecks, which immediately found a bug

Its build script was `vite build` with no `tsc` in front of it, so nothing in
the app had ever been typechecked. Adding `tsc -b` surfaced a real error:
`src/types/speech-recognition.d.ts` ended with `export {}`, which makes the file
a module and module-scopes every `interface` in it — so the global
`SpeechRecognition` type the speech hook depends on did not exist. Fixed by
removing the `export {}` and the redundant `declare global`.

### 0.15 — `serverless@3` brings a noisy `npm audit`

`npm install` reports 18 advisories, effectively all of them transitive
dependencies of the Serverless Framework v3 toolchain (it bundles `aws-sdk` v2,
old `tar`, old `glob`). These are build-time dependencies of a CLI, not runtime
dependencies of any Lambda. Left as-is rather than forcing resolutions that
would break the toolchain; worth revisiting if v3 stops receiving fixes.

### 0.16 — `apps/site/public/axe.min.js` was deleted

A 553 KB copy of axe-core sat in the site's `public/` directory, unreferenced by
any source file, which means it was being copied verbatim into every production
build. Phase 3 wants axe in CI, and that is a devDependency plus a test run, not
a public asset. Removed.
