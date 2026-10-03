# Backend roadmap: Phases 4–7 (12 weeks)

**Written 2 October 2026. Owner: Peter Fasae.** This continues [BUILD.md](../../BUILD.md), which covers Phases 0–3. The target design is in [`backend-architecture.md`](backend-architecture.md) and the evidence is in [`../research/neurodiversity-evidence.md`](../research/neurodiversity-evidence.md).

**Target:** a strong, grant-reviewable backend in **8 weeks**, and a polished, pilot-ready version within **12**. Correctness, privacy, reliability, accessibility and *demonstrable evidence* come before feature count. Deploy early: a real staging environment exists by the end of week 2, and every gate after that is checked against it, not only against localhost.

**Priority order:** integrity and trust, then low-friction capture, then reliable reminders and resurfacing, then learning and memory support. Privacy is a hard constraint throughout, and every AI capability has a non-AI fallback.

BUILD.md's rules of engagement still apply: hard gates, honest reporting, never weaken a test, `docs/status.json` in the same commit. This plan adds one more: **consequential decisions are proposed and approved before they are built** (see the decisions queue).

---

## Where Phase 3 actually left off (2 October 2026)

**Built and tested locally (121 tests):**
- DynamoDB and Cognito API with ownership enforced on every route.
- Origin-allowlist CORS.
- zod contract in `packages/core`.
- Compute-on-write summary and actions.
- In-Lambda TF-IDF search.
- Preferences sync.
- GDPR export and delete.
- The AI engine seam, behind consent and off by default, with a recorder test proving zero calls while off.
- Alarms.
- An accessibility audit with honestly named gaps.

**Not done, and carried forward:**
- First deploy → Phase 4.
- Deployed latency measurement against report §5.4 → Phase 4.
- Real screen-reader testing, zoom at 200% and 400%, Lighthouse, an independent audit, and testing with neurodivergent users → Phase 7, plus the later frontend phase.
- The LLM engine (`services/api/lib/ai/claude.js`) has only ever answered a local recorder, never a real endpoint → replaced and contract-tested in Phase 6.

---

## Decisions queue

Each item is proposed using the decision template in `docs/adr/0000-template.md` and decided by Peter in his own words. It is recorded as an ADR and in `docs/decision-log.md` **before** implementation starts. "Needed by" is the latest week a decision can land without delaying its phase.

| # | Decision | Reopens / touches | Needed by | Recommended starting point |
|---|---|---|---|---|
| D1 | Region: eu-west-2 (London). **Decided 3 Oct (ADR 0005):** London is the primary region. Residency is described with AWS's documented exceptions, and nothing claims London is faster or cheaper until measured | CONTEXT §4.4 (region only) | Week 1 | Architecture §1; ADR 0005 |
| D2 | IaC and language: AWS CDK v2 in TypeScript, Node.js 24, handlers moved to TypeScript incrementally. **Decided 3 Oct (ADR 0006):** Node.js 24 on arm64 chosen for runway, Node.js 26 (preview) not used, no callback handlers exist, one Node version pinned everywhere. | CONTEXT §4.4 (tooling), ENGINEERING.md | Week 1 | Architecture §15; ADR 0006 |
| D3 | Replacement for the `serverless offline` test rig and local dev server. **Decided 3 Oct (ADR 0007):** DynamoDB Local, in-process handlers, a loopback-only HTTP adapter, one shared route manifest with a synth-versus-routes test, staging smoke tests as the proof of API Gateway and Cognito behaviour | ADRs 1.7, 1.11 | Week 1 | ADR 0007 |
| D4 | Concurrency and idempotency contract: `version`, `baseVersion`, 409, client UUIDv7 ids, `Idempotency-Key`. **Decided 3 Oct (ADR 0004):** durable operation receipts with keyed request fingerprints; content-free success receipts and `409`s; exact successful responses kept 30 days, failed mutations outside that guarantee; token statuses `428`, `400`, `403` and `410`; stable error codes | — | Week 2 | Architecture §3, items 1–4; §4, error responses; ADR 0004 |
| D5 | CI/CD and environments (dev only to start; GitHub OIDC to AWS) | — | Week 2 | Architecture §15 |
| D6 | Observability stack and SLOs | — | Week 2 | Architecture §14 |
| D7 | Data model v2: UserDataTable, new head attributes, limits. **Decided 3 Oct (ADR 0001):** one immutable revision per accepted version. Still open: the rest, including the autosave debounce values | ADR 0.8 (extended) | Week 3 | Architecture §2 |
| D8 | Deletion policy: a trash for notes; account deletion stays immediate and total | Rule 7 wording; comment in `lib/dynamo.js` | Week 3 | 30-day trash |
| D9 | Retention and backups: revision retention (open; ADR 0001 only rules out deleting history to reduce writes), PITR period, disclosure. To consider: an explicit, user-requested permanent purge for secrets stored by accident, documented as an exception to history retention | — | Week 3 | Architecture §13 |
| D10 | Sync protocol. **Decided 3 Oct (ADR 0002):** a per-user change log as the sync cursor; a `NOTE#` membership list for full resync, export and account deletion; scheduled transactional trash purges; the account-closing write gate. Still open: change-log retention (proposed 30 days), the retry bound (proposed 5), merge and conflict copies | — | Week 4 | Architecture §3–4 |
| D11 | Async enrichment: no AI in the write path | **Supersedes ADR 3.2** | Week 4 | Architecture §6 |
| D12 | Event backbone: Streams → router → EventBridge → consumers with DLQs | — | Week 4 | Architecture §5 |
| D13 | Search v2, golden benchmark, semantic-channel option | CONTEXT §4.6 | Week 5 | Architecture §8 |
| D14 | Passwordless authentication: passkeys plus email code; managed login or custom flow | — | Week 5 | Architecture §12 |
| D15 | Accessibility target: WCAG 2.1 AA → 2.2 AA | CONTEXT §6, §8 | Week 5 | Evidence §4 |
| D16 | Capture channels, email-in domain, audio retention | CONTEXT §4.1 action item | Week 6 | Architecture §9 |
| D17 | Attention-budget defaults: daily budget, quiet hours, digest times, channel order. For ADR 0003 (decided 3 Oct): the acknowledgement timeout, and `TTL` and `Urgency` by kind | — | Week 6 | Architecture §7 (proposed: budget 3/day, timeout 2 minutes) |
| D18 | Review and resurfacing defaults: caps, prompt types, FSRS parameters | — | Week 7 | Architecture §10 |
| D19 | AI provider and data flow: Bedrock model, routing, invocation path, consent v2, quotas | CONTEXT §4.5 (provider only; opt-in stays) | Week 7 | Architecture §11 |
| D20 | Research mode and pilot metrics | — | Week 9 | Evidence §7 |

The rest of CONTEXT §4 stays settled: the name, real product, monorepo, Lambda + DynamoDB + Cognito, deterministic engine by default, phases with gates, and docs over prompts.

---

## Defects found in the 2 October review

Each fix needs a test that fails before the fix and passes after it.

**P0. Fix in Phase 4.**

| # | Defect | Where | Fix |
|---|---|---|---|
| 1 | **Lost updates.** `updateNote` reads the note, awaits `enrich()` (up to `ANTHROPIC_TIMEOUT_MS`, 6s by default), then calls `putNote` with no condition. Edits from two devices silently overwrite each other | `services/api/functions/updateNote.js`, `lib/dynamo.js` `putNote` | D4: `version` + conditional write + `409 version_conflict`. Revisions and merge follow in Phase 5 |
| 2 | **Duplicate notes on retry.** Ids are generated on the server and nothing is idempotent | `functions/createNote.js` | D4: client ids + `Idempotency-Key` |
| 3 | **No size limit.** `content` has only `min(1)`. A note over DynamoDB's 400 KB item limit becomes a 500 | `packages/core/api.ts` | **Decided 3 Oct (ADR 0009):** limits counted in Unicode code points, a 1 MiB body limit, bounded generated fields and a 350,000-byte item ceiling, with plain-language `413` and `422` responses, and `422 invalid_text` for unpaired surrogates |
| 4 | **"Delete everything" leaves the Cognito user**, including the email address, behind. The handler defers to a "Phase 3 flow" that doesn't exist; the app only signs out | `functions/deleteMe.js`, `apps/web/src/pages/Settings.tsx` | `AdminDeleteUser` inside the deletion flow, with a test |
| 5 | **Deprecated runtime.** `nodejs20.x` was deprecated on 30 April 2026 | `serverless.yml` | D2 (Node.js 24) |
| 6 | **Unmaintained deploy tool.** Serverless Framework v3 has had no fixes since the end of 2024 | `services/api` | D2 (CDK) |
| 7 | **Unvalidated sharing surface.** `sharedWith` is writable through `PUT /notes/{id}` although sharing is `planned` and has no invitation or authorisation model | `packages/core/api.ts`, `getNotes` filter | **Decided 3 Oct (ADR 0008):** remove it entirely (request, stored and response schemas, the `shared` filter, and the app's Shared tab). A request containing it gets `422 sharing_not_available` |
| 8 | **Voice privacy claim.** The browser speech API sends audio to a remote recogniser by default. `docs/status.json` and the privacy copy don't say so | `apps/web` speech hook, `docs/status.json` | Correct the copy now (claims discipline). The frontend phase moves to on-device recognition where available |

**P1. Fix in Phase 5.**

| # | Defect | Fix |
|---|---|---|
| 9 | The LLM call is inside the write path (ADR 3.2) | D11 |
| 10 | Search reads the full content of every note on every query (`getNotes.js`, `runSearch`) | D13: index on write, plus a cache |
| 11 | Hard delete with no trash (`deleteNoteOwnedBy`) | D8 |
| 12 | Export is one synchronous response. It will hit Lambda's response-size limit once revisions exist | Async export to S3 with a presigned URL |
| 13 | `putPreferences` does read-merge-write with no condition | `UpdateItem` `SET` on only the supplied fields |
| 14 | The `UnprocessedKeys`/`UnprocessedItems` loops retry immediately | Exponential backoff with jitter |
| 15 | The LLM fallback logs the whole SDK error object (`enrich.js`) | Log the error class and status only, with a test that note content never reaches logs |
| 16 | No `/v1` prefix and no OpenAPI spec | Add both before any external client exists |

---

## Phase 4: Foundations and first deploy (Weeks 1–2)

**Goal:** the existing system, with its P0 defects fixed, running on modern, maintained infrastructure in the region D1 chooses (London recommended), deployed to a real staging environment by CI. Plus a baseline for evidence, security and privacy.

### Week 1
1. **Reconcile stale docs.** This is routine.
   - ENGINEERING.md's "Phase 0 not started" banner.
   - KICKOFF.md's "none of which is in this repo yet… Start with Phase 0".
   - README's pointer to the current plan.

   Point them at this file. Don't rewrite their history.
2. **Propose D1, D2 and D3.** D4 is already decided: ADR 0004. Wait for Peter's decisions, and record them.
3. **P0 fixes that don't depend on D1–D4**, with tests:
   - **#7 removing `sharedWith`.** Decided 3 October (ADR 0008).
   - **#3 limits.** Decided 3 October (ADR 0009) after the first proposal was not accepted.
   - **#15 log hygiene and #14 backoff,** pulled forward from P1. These are routine.
   - **#8 status.json and privacy copy.** A routine claims fix.
4. **Once D2 is decided:** scaffold `infra/` (CDK).
   - The Data stack reproduces NotesTable, UserIdIndex and PreferencesTable exactly.
   - The Auth stack reproduces today's Cognito setup; passwordless comes later, with D14.
   - The Api stack wraps the existing handlers with `NodejsFunction` on Node.js 24 arm64.
   - The Observability stack has today's alarms plus AWS Budgets.
   - Table definitions live in one module that the test rig also imports.
   - `cdk synth` runs clean, and cdk-nag passes or every suppression is justified in writing.

### Week 2
5. **Replace the `serverless offline` rig (D3).** Every existing test passes, and **the test count never goes down.**
6. **Implement D4** (ADR 0004): version and conditional writes, client ids, idempotency keys, operation receipts with keyed fingerprints, and 30-day stored responses. The receipts need UserDataTable and the fingerprint key, so both are created now; the rest of D7 follows in week 3, and the sync-token check arrives with the changes feed in week 4. Tests:
   - interleaved writers get exactly one success and one 409;
   - a replayed create or update changes nothing and returns the original response.
7. **Fix #4:** Cognito user deletion, with a test.
8. **CI/CD (D5)** using GitHub Actions and OIDC. On every push: lint, typecheck, tests, synth, nag, `npm audit`. On `main`: deploy dev in the D1 region, then smoke tests.
9. **Observability baseline (D6):**
   - Powertools Logger, Metrics and Tracer;
   - a correlation id on every log line;
   - a test proving note content never appears in logs.
10. **Measure on the deployed stage, AI off.** Record p50, p95 and p99 for create, list, search and summarize in `docs/decisions.md`, and compare them honestly with report §5.4 (240/275/310 ms average, 590 ms max). A miss is a finding, not a reason to move the bar.
11. **Write the baseline docs** in `docs/privacy/` and `docs/security/`:
    - threat model v1 (STRIDE, per data flow);
    - a data inventory;
    - a retention table draft;
    - a DPIA started.

### Gate 4 (end of week 2): every item must pass
- [ ] D1–D6 decided and recorded, in Peter's words.
- [ ] `infra/` synthesizes clean, and every cdk-nag suppression has a written reason.
- [ ] The deploy tooling and runtime are the ones D2 chose (recommended: CDK, with no Serverless Framework dependency left, and Node.js 24 on every function).
- [ ] **The dev stage is live in the D1 region, deployed by CI**, and smoke tests pass against it:
  - every route returns 401 without a token;
  - an unlisted origin gets no CORS header;
  - a real Cognito token completes a round trip, with `content` byte-identical.
- [ ] Every pre-existing test passes (≥ 121), plus new tests for P0 #1–4 and #7.
- [ ] A test proves note content never reaches logs.
- [ ] Budget alarms exist at £15 and £20 (forecast), and the alarm topic has a confirmed subscriber.
- [ ] Deployed latency (AI off) is recorded next to report §5.4.
- [ ] The threat model, data inventory and retention draft are committed. Stale doc banners are fixed.

---

## Phase 5: Never lose anything (Weeks 3–5)

**Goal:** the integrity guarantees, and the shared backbone that every later capability is built on.

### Week 3: data model and lifecycle (D7, D8, D9)
- UserDataTable. Revisions written **in the same transaction** as the head, together with the change-log counter and entry, and the `NOTE#` membership item on create and permanent delete (architecture §3–4; ADR 0002).
- **One immutable revision per accepted version** (ADR 0001). No coalescing: the revision put is conditioned so that it can never be overwritten.
- Trash, restore, and permanent delete. The trash purge is a scheduled transaction, not a TTL delete (architecture §3, item 7).
- The purge cascade to revisions and derived data.
- A daily reconciliation job: every version of every note has its own revision; heads and `NOTE#` items match one to one; no orphans; no gaps in the change log.
- An async export (JSON and Markdown, including revisions, trash and everything in UserDataTable), listing notes from the membership list.
- **A deletion orchestrator covering every store.** It closes the account to writes, lists notes from the membership list, and verifies with strongly consistent reads.

### Week 4: sync, events, enrichment (D10, D11, D12)
- `GET /v1/changes?after=<seq>` from the per-user change log, bounded by the high-water mark, with `410 cursor_expired` and full resync from the membership list (architecture §4).
- The merge endpoint, three-way merge, and conflict copies.
- **The reference sync client and property tests** for convergence and zero loss. The client debounces autosave as the contract says (ADR 0001) and treats feed delivery as at-least-once (ADR 0002).
- The event backbone, with idempotent consumers and DLQs.
- **Async enrichment.** The AI call leaves the write path: local summary in-request, the AI path stubbed until D19, and stale results discarded by a version check.

### Week 5: search, auth, accessibility foundations (D13, D14, D15)
- `packages/search`: typo tolerance, phonetic keys, index on write, per-container cache. The 25 vendored tests stay untouched.
- **The golden benchmark** (`docs/eval/search-golden.json`): recall@5, MRR and latency at 500 and 2,000 notes, with the numbers recorded.
- Passwordless sign-in (passkeys and email code) through Cognito Essentials, with SES configured for production sending.
- The WCAG 2.2 AA target, if approved.
- **A plain-language error catalogue**: a stable code and human copy for every error, written to the COGA guidance.
- `/v1` and OpenAPI generated from the zod schemas.
- **Finish moving handlers to TypeScript**, `strict`, with no `any`.

### Gate 5 (end of week 5)
- [ ] **Zero-loss property test:**
  - random interleavings of two devices, with retries, duplicates and reordering, converge;
  - every accepted write can be recovered from revisions: each version from its own revision, byte-identical to what was accepted (ADR 0001);
  - nothing is overwritten silently.
- [ ] **Change log and membership** (ADR 0002). Run against DynamoDB Local, then again on the deployed stage, because Local's concurrency behaviour isn't the service's:
  - with 8 or more concurrent writers for one user, the committed numbers run 1…n with no gaps or repeats, each commit has exactly one change entry, and sequence order matches commit order;
  - a reader racing those writers never receives a page with a gap;
  - forced counter conflicts exercise the backoff, and exhausting it returns `503` with nothing written; a forced version conflict returns `409` and is never retried;
  - entries past `expiresAt` give `410 cursor_expired`, whether or not TTL has removed them;
  - after random creates, permanent deletes and trash purges, including a purge racing a restore, heads and `NOTE#` items match one to one;
  - full resync, export and account deletion never read `UserIdIndex`: with the index made stale or empty on purpose (injected at the store module, because DynamoDB Local doesn't reproduce index lag), they still return, or remove, every note;
  - account deletion racing a create on another device leaves nothing behind;
  - retries per write are measured on the deployed stage and recorded;
  - re-delivering any page leaves every client in the same state. Tests and docs say "at-least-once"; nothing claims exactly-once.
- [ ] Concurrent edits:
  - non-overlapping edits auto-merge;
  - overlapping edits produce a conflict copy, with both versions recoverable.
- [ ] Delete, then restore, round-trips exactly. A purged note leaves no revisions or derived data behind (verified in dev with a short retention).
- [ ] **Never applied twice, at any age** (ADR 0004). For every mutation type, replaying it any number of times, in any order, applies its effect at most once, including after its stored response has expired (property test).
- [ ] **Three cases, told apart**, for every mutation type, with records aged past 30 days:
  - a never-applied operation is applied, or refused with a conflict code;
  - an applied one returns its exact original response within 30 days, and `already_applied` with its receipt after that;
  - one that conflicts with newer state gets `409` or `404` with a stable code and no note text, and changes nothing.
- [ ] **Exact responses for 30 days, successes only.** Within 30 days a replay returns the original status and body byte for byte. Failed mutations are outside that guarantee by design, and the API documentation says so.
- [ ] **Edge cases, each tested:**
  - two simultaneous requests with the same operation key: exactly one applies, and both get the same receipt;
  - the same key with a different request gets `422 idempotency_key_reused`, both within 30 days and after;
  - a replay after the note was permanently deleted gets its original response within 30 days, or `already_applied` with its receipt after that, and never brings the note back, even for a replayed create; an operation never applied to a note deleted since gets `404 note_not_found`;
  - account deletion removes every `OPR#` and `IDM#` item, checked with consistent reads.
- [ ] **Token statuses**, each with a test: missing → `428`; malformed or invalid signature → `400`; a valid token for another user → `403`; valid but older than 30 days → `410`, before anything is applied. No other token failure returns `410`.
- [ ] **Request fingerprints.** Golden test vectors pin canonicalisation version 1. Reordered keys, whitespace, number formats, upper-case ids in the path or a new sync token give the same fingerprint; any change to the method, the path or a body value gives a different one. No plain hash of a request is stored or logged. A receipt fingerprinted under a retired key still verifies.
- [ ] **Stale clients resync first.** A simulated client offline for 31 days resyncs, resends its queue unchanged, and ends with no lost text and no duplicate conflict copies.
- [ ] **Stable error codes.** Every error is RFC 9457 problem details with a catalogued `code`. A contract test fails on any code missing from the catalogue.
- [ ] **Capture never waits on AI:** p95 create latency on the deployed stage is unaffected by the AI flag.
- [ ] A stale enrichment result never overwrites newer content (test).
- [ ] The search benchmark beats the Phase 4 baseline on misspelled and paraphrased queries, and the numbers are recorded. p95 search at 2,000 notes is ≤ 350 ms on the deployed stage.
- [ ] Passkey and email-code sign-in work on dev, and the WCAG 2.2 SC 3.3.8 mapping is recorded.
- [ ] Export includes everything. Account deletion leaves nothing in any store or in Cognito, verified with strongly consistent reads, never through an index.
- [ ] Every error code has plain-language copy.
- [ ] All handlers are TypeScript (`strict`). The OpenAPI spec is generated and committed.

---

## Phase 6: Capture, reminders, resurfacing, learning, AI (Weeks 6–8)

**Goal:** the user-facing capabilities, each built on the backbone. Most important first.

### Week 6: capture, then scheduling and notifications (D16, D17)
- The capture command and its entry points:
  - quick capture with `source`;
  - **audio**: presigned upload, transcript ingestion, tap-to-bookmark timestamps;
  - **email-in**, if the domain is decided. If not, document it as blocked and move on.
- **Notification service:**
  - Scheduler → SQS → `dispatch`;
  - attention budget and quiet hours (timezone- and DST-correct);
  - digest;
  - Web Push (VAPID), then SES email, then the in-app inbox, with `TTL` and `Urgency` on every push;
  - honest attempt states (`queued`, `accepted`, `rejected`, `shown_on_device`, `unconfirmed`), never "delivered" (ADR 0003);
  - device acknowledgement, and email fallback when the timeout ends, for time-critical reminders;
  - reminders that no channel accepted, shown in the app.

### Week 7: reminders, resurfacing, review (D18)
- **Reminders:**
  - `at`, `relative` (against time anchors) and `nextOpen` triggers;
  - implementation-intention fields;
  - snooze, complete and cancel;
  - missed reminders collapse into one digest line.
- **Resurfacing:** deterministic score, a reason on every item, a daily cap, dismiss, and never-resurface.
- **Review:**
  - "learn this" opt-in;
  - free-recall and cloze prompts with no AI;
  - FSRS scheduling;
  - a daily cap, and overdue items spread across the following days.

### Week 8: AI on Bedrock, carefully scoped (D19)
- **AI gateway:**
  - eligibility checks and payload minimisation;
  - eu-west-2 in-region or EU-profile routing only, with IAM scoped to model ARNs;
  - per-user quotas;
  - **the AI activity log**;
  - consent v2 and per-note exclusion.
- Re-point the recorder test so it **proves zero calls while AI is off**.
- AI features, all async and all with fallbacks:
  - summary, actions and tag suggestions;
  - "first tiny step" breakdown;
  - review Q&A.
- A contract test against the real Bedrock endpoint in dev (gated, run on purpose).
- **Cost check** at pilot scale.

### Gate 6 (end of week 8): the strong, grant-reviewable backend
- [ ] Every capture path is idempotent and lands through the same versioned write path. p95 capture latency is measured on the deployed stage.
- [ ] Reminders fire from the server while the app is closed, and every attempt records an honest state (ADR 0003). A test checks that neither the state enum nor the copy catalogue contains "delivered".
- [ ] Every outgoing push carries `TTL` and `Urgency` (asserted on the request), and `TTL` never reaches into quiet hours.
- [ ] A time-critical reminder whose acknowledgement is suppressed becomes `unconfirmed` and goes to email when the timeout ends; one that is acknowledged doesn't. A forced push rejection falls back to email, and a forced email bounce to the in-app "couldn't reach you".
- [ ] **The attention budget is never exceeded**, and quiet hours hold across timezones and the DST change. Property tests cover both.
- [ ] A week of missed reminders becomes one digest line, never a list.
- [ ] Resurfacing and review respect their caps, and every resurfaced item states its reason.
- [ ] With AI switched off, every AI-backed feature still works through its fallback (a test toggles AI off and exercises each one). The recorder proves zero AI calls.
- [ ] Every AI call appears in the user's AI activity log, with no content. Routing is eu-west-2 or the EU profile only, proven by IAM policy and a test.
- [ ] Every event consumer is idempotent, with a DLQ and an alarm. A replay drill passes.
- [ ] The projected monthly cost at pilot scale (about 30 active users) fits the budget, with the calculation documented.

---

## Phase 7: Evidence and pilot readiness (Weeks 9–12)

**Goal:** make the claims true, prove them, and get ready for real users.

- **Week 9: research mode and load.**
  - Research mode (D20): separate opt-in, aggregates only, k ≥ 5.
  - **Load test the deployed stage** with k6 at pilot load and at 5× headroom.
  - Investigate the report's own limitation, "the error rate rises with load", and fix or explain it.
  - **Chaos drills:** AI down, Scheduler failure, SES failure, DynamoDB throttling. No data loss, and the user sees an honest state each time.
- **Week 10: security and privacy.**
  - Final threat model and an OWASP ASVS L2 checklist.
  - A DAST scan of dev with no open high or critical findings.
  - A dependency audit, an IAM review, and a secrets-rotation runbook.
  - **The DPIA completed.**
  - A record of processing.
  - A plain-language privacy notice, covering the AI and voice disclosures.
  - Retention verified in dev.
- **Week 11: accessibility and pilot setup.**
  - Accessibility validation of the flows the backend shapes: sign-in, errors, notification content.
  - The Phase 3 leftovers that need a human: screen readers, and zoom at 200% and 400%.
  - **Pilot pack:** consent and information sheet, ethics route, recruitment plan, support process.
  - A prod-stage plan.
- **Week 12: evidence and docs.**
  - The evidence pack (see below).
  - **A claims audit** against `docs/status.json` and the evidence file's section 5.
  - ENGINEERING.md and `docs/deployment.md` rewritten to match reality.
  - A **defence brief** for every ADR: its "How to explain this" and "Questions a reviewer will ask" sections, completed.

### Gate 7 (end of week 12): pilot-ready
- [ ] Load test: error rate < 0.5% and the SLOs hold at pilot load. The report §5.4 comparison is published honestly.
- [ ] Every chaos drill passes: no data loss, honest user-visible states.
- [ ] No open high or critical security finding. The ASVS L2 checklist is complete, with justified exceptions.
- [ ] The DPIA is complete. The retention schedule is enforced and tested. The privacy notice is ready.
- [ ] Accessibility statement updated with dated methods. A human screen-reader pass is done, or honestly listed as a gap.
- [ ] Pilot pack ready. Research mode tested end to end with synthetic data.
- [ ] Evidence pack committed. Every public claim maps to a `built` entry.

---

## Budget guardrails (about £20/month for dev plus a small pilot)

Figures are approximate. Check them in the AWS Pricing Calculator for eu-west-2 before each phase.

| Item | Expectation | Guardrail |
|---|---|---|
| Lambda, DynamoDB on-demand, S3 | Small at this scale. Each save is one transaction of four items (head, revision, change entry, counter; five for a create, which adds the membership item), and transactional writes cost twice the standard units: roughly 4–8 times the write units of a single put, depending on note size, and ADR 0004 adds two small items per write (architecture §4 has the table). Client autosave debounce (ADR 0001) is the lever | — |
| API Gateway (REST) | Low single-digit dollars per million requests | Stage throttling |
| Cognito Essentials | Free up to 10,000 MAU | — |
| KMS customer-managed keys | About $1 a month per key, plus $0.03 per 10,000 requests beyond the free 20,000 a month | One HMAC key per stage for request fingerprints (ADR 0004), at about one request per write; a data-encryption key only if D7/D9 choose one |
| CloudWatch logs and metrics | The likeliest surprise | 30-day log retention; ≤ 10 custom metrics; no per-request high-cardinality metrics |
| X-Ray | 100k traces a month free | Sampling |
| EventBridge Scheduler and bus | Effectively free at pilot scale | — |
| SES | About $0.10 per 1,000 emails | Digest-first design keeps volume low |
| Bedrock | Usage-based | Opt-in only, async, idle debounce, per-user daily quota, budget alarm |
| Transcribe | About $0.024 a minute: **expensive** | Opt-in plus a monthly minute quota. On-device transcription first |
| WAF, provisioned concurrency, Synthetics canaries | Fixed monthly costs | **Not used** until a measurement justifies them. Use a scheduled GitHub Actions smoke test instead of canaries |

Consider AWS Activate credits (see `docs/research/grant-landscape.md`).

---

## Evidence pack (what grant reviewers will see)

It is assembled continuously and finalised in week 12.

- Architecture diagram and a one-page system overview.
- The ADR index and decision log, with every consequential decision in Peter's words.
- Test report:
  - counts by type: unit, integration, property, contract;
  - coverage;
  - the zero-loss property test;
  - the search benchmark.
- Deployed SLO dashboard snapshots, load-test and chaos-drill reports, and the latency comparison with report §5.4.
- Threat model, ASVS checklist, DAST summary, DPIA, privacy notice and retention schedule.
- Accessibility statement and WCAG 2.2 / COGA mapping.
- **The evidence map:** capability → research ID → claim allowed (evidence file, section 6).
- Cost model: cost per active user per month.
- Pilot protocol and, later, pilot results, reported with their limits.

---

## The frontend boundary

This plan is backend-first. Frontend changes happen only when they are needed to exercise or verify a backend capability end to end, and they are kept minimal and labelled as such. Parked for the frontend phase:
- the offline queue UI;
- editor autosave, with the debounce in architecture §4;
- the merge and conflict-copy UI;
- trash and history views;
- the reminder composer, with relative times and if-then;
- notification settings;
- digest and inbox views;
- the review session UI;
- passkey enrolment;
- PWA install and push permission prompts;
- on-device speech recognition;
- the accessibility work in BUILD.md Phase 3 that needs a browser.
