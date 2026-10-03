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

---

## Phase 1 — data, auth, API

### 1.1 — `deleteNote` holds DeleteItem and nothing else

Report §4.3E asks for per-function least privilege, and BUILD.md names this
function specifically: "`deleteNote` gets `DeleteItem` on the table and nothing
else." The obvious implementation contradicts that — you have to read the note
to know whose it is before you can answer 403 rather than 404, and reading needs
GetItem. The way out is `ReturnValuesOnConditionCheckFailure: ALL_OLD`: the
delete carries `ConditionExpression: attribute_exists(noteId) AND userId =
:userId`, and when that condition fails DynamoDB hands back the item it refused
to touch. An item present means someone else's note (403); nothing means no such
note (404). One statement, one action, both outcomes distinguishable.
`updateNote` genuinely does need GetItem, because a partial update has to merge
onto what is there.

### 1.2 — CORS preflight is a Lambda, not API Gateway's mock integration

`cors: true` on a serverless `http` event generates a mock OPTIONS integration
with one hardcoded `Access-Control-Allow-Origin`, which for a multi-origin
allowlist means either a wildcard or picking a favourite. Instead there is one
`preflight` function on `OPTIONS /{proxy+}` — the only route without an
authorizer, because browsers send no credentials on a preflight — answering from
the same allowlist in `lib/respond.js` as every other response. There is no code
path in the service that can emit `*`.

### 1.3 — CORS is proved in a unit test, not only over HTTP

`serverless offline` decorates every response with Hapi's own CORS headers, and
neither `--corsAllowOrigin` nor the absence of `cors:` on the events stops it —
an unlisted origin gets echoed back by the emulator regardless of what the
handler returned. That would have made an HTTP-level assertion meaningless, so
the guarantee lives in `tests/respond.test.js`, which calls the real functions
in-process, plus two integration checks that go through the emulator's
Lambda-invocation API (`/2015-03-31/functions/…/invocations`) and so see the raw
handler response with nothing added. In production a proxy integration sends the
handler's headers and nothing else, which is exactly what those tests pin.

### 1.4 — A title the user typed survives; a derived one keeps following the first line

The predecessor re-derived the title from the first line on every write, so
toggling `pinned` would silently rename a note somebody had named. The rule now:
if the request supplies a title, use it; otherwise re-derive only when the
stored title still equals `deriveTitle(oldContent)` — that is, only when it was
derived in the first place. Comparing against the *old* content is what makes
"was this typed or derived?" answerable without storing a flag for it.

### 1.5 — `?mode=llm` without `aiEnabled` is refused, not downgraded

`POST /notes/{id}/summarize?mode=llm` returns 409 `ai_disabled` when the user's
`aiEnabled` is false, rather than quietly falling back to the local engine. Off
has to mean off in a way the user can verify. The silent fallback that *does*
exist — Phase 3's "if the LLM errors or times out, the local engine answers" —
is a different case: there the user has opted in and the priority is that an AI
outage never blocks a save.

### 1.6 — `POST /notes/{id}/summarize` returns the note, not the summary

`GET /notes/{id}/summary` returns `SummaryResponse` as the contract says. The
POST is a write and moves `updatedAt`, so it returns the whole `NoteResponse` —
otherwise every client would have to follow it with a GET to stay consistent.

### 1.7 — Integration tests run against DynamoDB Local and `serverless offline`

> **Superseded in part by [ADR 0007](adr/0007-in-process-test-rig-and-route-manifest.md) (3 October 2026).** DynamoDB Local and one shared table definition stay. `serverless offline` and `serverless.yml` as the source of the tables are replaced by in-process handlers, a loopback-only adapter and a route manifest, once the replacement passes all existing tests.

The rig starts the real DynamoDB engine as a Java process and the real routing
and authorizer layer, and builds both tables from the CloudFormation resources
in `serverless.yml` rather than from a second copy of the schema — so a schema
change cannot pass the tests and fail on deploy. A hand-written in-memory fake
would have agreed with the handlers by construction and proved nothing about
expressions, reserved words, GSI behaviour or conditional writes. The jar is
~64MB, cached at `services/api/.dynamodb` and gitignored; `npm run
dynamo:install -w services/api` fetches it. The `dynamodb-local` package's own
`launch()` does not resolve under Node 23, so the rig spawns the jar directly
and uses that package only for the download.

### 1.8 — Test JWTs are unsigned

`serverless offline` decodes a Cognito authorizer's token without verifying it,
which is correct for an emulator — signature verification is API Gateway's job
and happens before a Lambda is ever invoked. So the tests mint unsigned
Cognito-shaped tokens. What they establish is what the handlers do with a
`sub` once one exists, and that a request carrying no token at all never reaches
one. Verifying Cognito's signature would be testing AWS.

### 1.9 — The latency gate passes locally, and that is a weaker claim than it looks

Measured over a seeded 500-note corpus, 100 samples after 20 warm-up calls,
against `serverless offline` + DynamoDB Local on an M-series laptop:

| operation | avg | p50 | p95 | max |
|---|---|---|---|---|
| createNote | 2.7ms | 2.6ms | 3.5ms | 4.1ms |
| getNotes (list) | 4.2ms | 4.1ms | 5.3ms | 5.9ms |
| getNotes (search) | 29.2ms | 29.0ms | 32.2ms | 36.5ms |
| summarize | 4.1ms | 4.0ms | 5.4ms | 5.8ms |
| getNote | 2.0ms | 1.9ms | 3.0ms | 3.5ms |

Every operation is far inside the 350ms p95 budget, but **this is not a
reproduction of report §5.4's 240/275/310ms averages.** Those were measured
against a deployed stack; this run has no API Gateway hop, no cross-AZ DynamoDB
call and no Lambda container, so it is a lower bound and a regression detector.
What it does establish is that no handler does anything pathological, and that
the fixed cost of the work itself is single-digit milliseconds — which means the
deployed figures will be dominated by network and platform overhead rather than
by anything in this repository. Running `npm run latency -w services/api --
--base <deployed-stage-url>` against a real stage is the measurement the
dissertation's numbers should be compared against, and it needs AWS credentials
this build does not have.

### 1.10 — The search ceiling, measured

The same harness at 2,000 notes puts `getNotes (search)` at 87.4ms avg / 109.1ms
p95, against 29.2ms / 32.2ms at 500 — roughly linear in corpus size, as an
in-Lambda TF-IDF build should be. That is the evidence behind the "comfortable
to roughly 1–2k notes per user" ceiling in ENGINEERING.md: add the ~250ms of platform
and network overhead that separates these numbers from the deployed ones and a
2,000-note search lands at the 350ms budget rather than inside it. The upgrade
path — a term→noteIds inverted-index table written on save — stays unbuilt until
a real user is near that number, and `search(query, notes, opts) → [{note,
score}]` is shaped so the scorer can be replaced without touching a caller.

### 1.11 — `npm run dev:local` reuses the test rig

> **Superseded in part by [ADR 0007](adr/0007-in-process-test-rig-and-route-manifest.md) (3 October 2026).** `dev:local` will keep reusing the test rig, which becomes the in-process rig plus the loopback adapter.

`npm run dev -w services/api` is plain `serverless offline` against real AWS
tables, which needs a deployed stage. `dev:local` raises DynamoDB Local and
builds both tables from `serverless.yml` first, on the stage and port
`apps/web` already defaults to. It imports the same setup module the
integration tests use rather than keeping a second copy, so "it passed the
tests" and "it works in the app" cannot come apart.

---

## Phase 2 — the ADHD product layer

### 2.1 — The app's whole data layer was replaced, not adapted

`notesService.ts` and `NotesContext.tsx` spoke the predecessor's broken shape —
`isPinned`, `isArchived`, `isShared`, no auth, no search, four hardcoded list
endpoints — and every one of those is a bug in ENGINEERING.md's inherited-bugs
table. Adapting them would have meant keeping a translation layer between two
note shapes, which is precisely the thing `packages/core` exists to abolish. They
are deleted. `src/lib/api.ts` types every call from `@clarity/core`, so the
server's shape and the client's expectation cannot drift apart without it being
a compile error. `Layout`, `Sidebar`, `NotesList`, `SpeechToText` and
`TagsManager` went with them; `components/ui/` is untouched.

### 2.2 — A local sign-in for development, compiled out of production

Phase 1 stood up a Cognito pool but there is no deployed stage, so without
something the app could not run at all. `VITE_LOCAL_AUTH=true` signs in against
a locally-derived identity and mints an unsigned token, which works because
`serverless offline` does not verify signatures — API Gateway does that, before
a Lambda is ever invoked. Two locks: the env var, and `import.meta.env.DEV`,
which is false in a production build, so Vite removes the branch. A token minted
this way is rejected by the real gateway regardless.

### 2.3 — The Cognito SDK is loaded on demand

`amazon-cognito-identity-js` is 90KB and expects Node's `global`, which crashed
the app on first load. It is now behind a dynamic import, so a local build never
touches it and a deployed one fetches it only when a real sign-in happens. The
main bundle came down from 509KB to 419KB as a side effect.

### 2.4 — Preferences: the server wins on sign-in, localStorage covers the rest

`localStorage` is read synchronously on first paint, so the interface is already
in the right theme, font and size before anything renders — landing in the wrong
one and having it change underneath you is exactly the kind of jolt this product
exists to avoid. Once signed in, whatever the account holds replaces it, because
that is what "set it once and it follows you" has to mean. Writes go to both,
debounced by 600ms so a run of clicks is one request. No cookies, so no banner.

### 2.5 — Motion has two switches and either one is enough

`prefers-reduced-motion` alone is not sufficient: someone whose OS was never
configured still deserves the choice, and someone whose OS asks for less motion
may still want it here. So the media query is scoped to
`:root:not([data-motion="full"])` and the in-app toggle also sets a
`.reduce-motion` class. The OS asks; the toggle overrules, in both directions.

### 2.6 — Ticking off an action edits the note

Actions are derived from what a note says and are never stored separately, so
there is nowhere to record "done" except the note itself. Completing one appends
a marker to the line it came from. The alternative — a second table of completion
state — is how the list and the note start disagreeing, and the whole reason
actions are derived is that they cannot.

### 2.7 — The focus-mode timer counts up and nothing happens when it stops

Ported straight from the marketing site, which already had Esc, the focus trap,
focus restoration, an `inert` backdrop and the announcements. The one addition is
a timer, and it counts up rather than down. A countdown that runs out is a small
failure event, and design rule 6 rules out anything that works by making you feel
behind.

### 2.8 — Reminders are honest about what they are not

They fire from an interval while the tab is open, and the UI says so in as many
words: no service worker, no push, nothing reaches a closed browser or a phone.
A reminder you believe in and that does not arrive is worse than no reminder,
and this audience has been let down by exactly that before. A missed one is also
not replayed on next open — a wall of overdue notifications is its own kind of
harm.

### 2.9 — What was verified, and how

Against the local rig, in the browser:

- ⌘↵ in the capture box saved a note with a derived title, both actions
  extracted, no other input required.
- **Content is byte-identical after summarising** — checked against the API
  rather than the UI, as the criterion asks.
- Search found a note by "queue", a word that appears only in the body.
- Preferences written through the API appeared in the app after a reload:
  high-contrast applied, text size `l` resolved to an 18px root. That is the
  two-client criterion.
- Focus mode: Esc exited, focus returned to the trigger, the backdrop carried
  both `inert` and `aria-hidden`, and entering and leaving were announced.
- The motion toggle took a 500ms transition to 0.01ms and back, on a machine
  whose OS does not ask for reduced motion.
- All 24 enabled focusable elements on the notes screen are reachable, every one
  has an accessible name, and every one has a visible focus ring.

Not verified here: the OS→reduced-motion direction, which needs the media query
emulated rather than a class toggled, and the full keyboard walkthrough on a
real screen reader. Both belong to the Phase 3 audit, and neither is claimed as
done.

---

## Phase 3 — trust, AI, and launch

### 3.1 — The engine interface gained `analyse()`, and `enrich()` uses it

ENGINEERING.md specifies `{ name, summarise, extractActions, suggestTags }`.
Against a local engine that is three cheap function calls; against an LLM it is
three round trips for one note, at triple the cost and latency — and worse, the
summary and the actions could come back disagreeing about what the note says,
which is the exact drift `enrich()` exists to prevent. Both engines now also
implement `analyse(text) → { summary, actions, tags }`, and `enrich()` calls
that. The three named methods remain, implemented in terms of it, so a caller
that wants only a summary is unchanged.

### 3.2 — A save uses the account's engine, not always the local one

`selectEngine` with no explicit mode returns the LLM when the account has
`aiEnabled` set. The alternative — local on write, LLM only on an explicit
button — keeps capture instant, but it makes the preference do nothing until
you press something else, which is a confusing product for a feature whose
whole point is "my summaries get better". The cost is real and is stated here:
with the flag on, `createNote` waits on the LLM. It is bounded by
`ANTHROPIC_TIMEOUT_MS` (6s by default) and falls back locally, so the worst case
is a slow save rather than a failed one. **Phase 1's p95 < 350ms latency gate
was measured with the flag off, which is the default and the state the
overwhelming majority of accounts will be in.** A deployed run with the flag on
is a separate measurement and has not been taken.

### 3.3 — Consent is a stored timestamp the server checks, not a screen we promise to show

`Preferences` gained `aiConsentedAt`. `PUT /me/preferences` refuses
`aiEnabled: true` with a 422 unless a consent timestamp is already stored or
supplied in the same request. That turns "the user was shown the consent copy"
into something the server verified rather than something the UI claims, and it
means the flag cannot be switched on by a stray request or a well-meaning
client that skipped the screen. The copy itself leads with the sentence that
matters — that the text of every note is sent to another company — rather than
burying it under benefits.

### 3.4 — The SDK's zod helper wants zod 4; the contract package is on zod 3

`zodOutputFormat` reads zod 4's internals and threw `Cannot read properties of
undefined (reading 'def')` against the zod 3 this workspace uses. Upgrading
`packages/core`'s validator — the file that defines the whole data contract —
to satisfy a formatting helper is the wrong way round. The JSON Schema is
written out by hand for the request, and a zod schema validates the response.
Worth noting how this surfaced: the note still saved, with a local summary,
because the fallback did exactly what it exists to do. The failure was only
visible in the logs, which is the correct outcome for a user and the wrong one
for a developer — hence `RIG_VERBOSE=1` on the test rig.

### 3.5 — Proving a negative: a recorder, not a mock

The acceptance criterion is "with `aiEnabled: false`, zero outbound calls to
Anthropic — prove it with a test that fails if one is made." Mocking the SDK
would only prove the mock was not called. Instead `ANTHROPIC_BASE_URL` points at
a small HTTP recorder inside the test rig, so any request the API makes — by any
path, intended or not — is counted. `tests/ai.test.js` exercises create, update,
summarize, search, actions and export with the flag off and asserts the count is
exactly zero. The tests immediately after turn the flag on and assert the count
goes up, because a zero that could never be anything else proves nothing.

### 3.6 — The timeout knob had to be declared, and the test caught it

`ANTHROPIC_TIMEOUT_MS` was read from the environment but not declared in
`serverless.yml`, so the Lambda never saw the rig's 1500ms override and fell
back after the 6000ms default instead. The hang test failed on the elapsed-time
assertion, which is exactly what it was for. Declared alongside the other
environment config.

### 3.7 — The accessibility audit found two real contrast defects, both of the same kind

Both were colours that had been checked against the wrong background.

`apps/web`'s muted text measured 4.34:1 on the `accent` surface. It cleared
4.5:1 on white, which is where it had been reasoned about, but white is not
where it sits — it sits on selected rows, selected cards and inline code. The
token was darkened to clear 4.5:1 on the lightest surface it ever appears on.

`apps/site` was worse. The `#5F49BC` purple was hardcoded as a literal hex in
forty places, and the dark theme's own comment claimed "lavender text lightened
so it still passes AA on the dark surface" — describing something no code did.
In dark mode it measured **2.05–2.71:1** across fourteen elements. It is now a
theme-aware variable. Fixing it surfaced a second problem immediately: filled
buttons went to 2.42:1, because `lavender-ink` is both a text colour *and* a
fill, and those need opposite foregrounds per theme. Hence the paired
`--lavender-ink-on`.

The lesson worth keeping: a colour is not a value, it is a value **and** the
surface it sits on, and a design token that does not participate in theming will
be wrong in exactly the theme nobody looked at.

### 3.8 — Programmatic `.focus()` cannot verify a focus ring

An earlier audit script called `element.focus()` on every control and read
`outlineStyle`, and reported everything passing. That method is wrong:
`:focus-visible` deliberately does not match for programmatic or mouse focus, so
the script was measuring the browser's heuristic rather than the stylesheet. The
walkthrough now sends real `Tab` presses and reads the focused element on
`keyup`. Same conclusion in the end, but only the second method was evidence.

### 3.9 — Claims audit: four corrections

- The homepage said notes are "exportable and deletable, always" in the present
  tense, while `/privacy` said "when the app ships, your notes **will be**".
  Same claim, two tenses, and the present-tense one was on the busiest page.
- The homepage said "built for screen readers". Nobody has run one. It now
  describes what was actually verified — keyboard reachability, visible focus,
  measured contrast — and points at the statement for the rest.
- `/accessibility` claimed "light, dark, and low-stimulation themes". The
  marketing site has light and dark only; low-stimulation exists in the app.
- The demo section said "three pieces of Clarity" and there are now four.

The contrast table on that page was also rebuilt from values measured in the
running browser in both themes, rather than the light-theme-only figures it had
been carrying — which is precisely how the dark-mode defect went unnoticed.

### 3.10 — The deploy is prepared, not done, and the numbers stay unclaimed

`serverless package` runs clean for both stages and the generated template was
inspected: 102 resources, 13 per-function IAM roles with no wildcards, 12 of 13
methods behind the Cognito authorizer, all seven environment variables present
including `ANTHROPIC_TIMEOUT_MS`, both tables with SSE, PITR and a retain
policy. CloudWatch alarms were added for error *rate* (not count — a ratio is
the only thing that distinguishes a bad hour from a quiet one), DynamoDB
throttling on both tables, and a log-metric filter on the LLM fallback, because
a fallback that works is invisible and invisible failure is still failure.

There are no AWS credentials and no AWS CLI on this machine, so the stack has
never been created. Report §5.4's published figures remain unreproduced, and the
local numbers stay labelled as a lower bound. `docs/deployment.md` carries the
exact commands and the smoke test; it also warns that `${env:...}` resolves from
the deploying shell, which is how a test-only `ANTHROPIC_BASE_URL` could
otherwise end up baked into a production Lambda.

### 3.11 — VoiceOver could not be run, and the substitute found a defect anyway

VoiceOver will not start from a script (`tell application "VoiceOver" to
activate` times out; `VoiceOverStarter` does nothing), and even running it could
not have been driven, because this shell has System Events query permission but
not keystroke permission — `osascript is not allowed to send keystrokes (1002)`.
Behind both: VoiceOver's output is speech, and the best available capture is its
caption panel, a transcript that by construction cannot show how speech flows.

What was done instead was reading the accessibility tree control by control.
That is not a screen-reader test and the statement says so in as many words. It
did, however, find the worst accessibility defect in the app: **the entire notes
list was inside an `aria-live` region.** A live region announces its whole
subtree on any change, so every search keystroke would have read out every
matching note in full — a wall of speech, at exactly the audience this product
exists to protect from one. No axe rule flags this; nothing but reading the tree
or using a screen reader would have caught it.

A second defect followed from re-running the sweep at a narrow viewport: the
mobile header bar sat outside any landmark. It is `md:hidden`, so a desktop-width
run skips it as hidden and reports clean. The earlier "zero violations" was
therefore true only at the width it was measured at, which is worth remembering
about every automated pass — it tests the page as rendered, not the page.
