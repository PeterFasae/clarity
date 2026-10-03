# KICKOFF.md

**The brief for picking this project back up.** Read the block below at the start of a work session in this directory — it says what Clarity is, what is already settled, and where to look for the rest.

> **Updated 3 October 2026.** This brief was written before Phase 0. Phases 0–3 of BUILD.md are now built locally, with 243 tests passing (121 when Phase 3 closed), and nothing has been deployed. Do not start at Phase 0. The current plan is [`docs/plan/backend-roadmap.md`](docs/plan/backend-roadmap.md) and the decisions made so far are in [`docs/decision-log.md`](docs/decision-log.md). The block below is kept as written, for the history and the settled product rules.

---

```
Clarity is a cloud note-taking platform for people with ADHD.

Three files carry the whole brief, in this order:
  CONTEXT.md  — what it is, who it's for, the seven design rules, the eight settled
                decisions, claims discipline, the public website spec
  ENGINEERING.md — workspace layout, the canonical data contract, API routes, how the
                engine is wired, and the inherited bugs not to reproduce
  BUILD.md    — the phased spec with acceptance criteria. Start at Phase 0.

Clarity in three sentences:
  Every note app assumes intact executive function — that you'll tag it, file it, name
  it well, and find it again. For someone with ADHD that assumption is the failure
  point, so Clarity inverts it: capture costs one keystroke and no decisions, summary
  and action items are computed on save rather than entered, and search matches what a
  note says rather than what you called it. Positioning is "a cognitive ally, not a
  filing cabinet"; the engineering thesis is "capture was never the problem, getting it
  back out was".

This is a merge of three sources (at the time of writing none of them was in this repo yet; all three are now merged):
  ~/Downloads/adhd-notetaker-system-main/   frontend/, backend/, public_website/
  github.com/PeterFasae/clarity             shared/retrieval.js + its 25 tests
  docs/research-report.pdf                  the 60pp source of record (already here)

Eight decisions are SETTLED. Do not reopen them — the rationale is in CONTEXT.md §4.
  1. Name is Clarity. ADHD positioning is the pitch; retrieval is the mechanism.
  2. Real product with real users. Auth, ownership, GDPR and locked CORS are mandatory.
  3. npm workspaces monorepo, Clarity's engine at the core.
  4. AWS Lambda + DynamoDB + Cognito — the architecture the research report describes.
  5. Deterministic engine by default; Claude behind a per-user opt-in flag, default off.
  6. Search runs in-Lambda over the user's own notes via the UserIdIndex GSI.
  7. Four phases with hard gates. A phase does not start until the last one's criteria pass.
  8. Context lives in committed docs, not in prompts.

Non-negotiables:
  - packages/retrieval is load-bearing and its 25 tests must pass UNMODIFIED. Never
    weaken a test to make it pass.
  - The summariser writes to `summary` and `actions`. It NEVER writes to `content`.
    The predecessor overwrote note bodies with summaries; that bug does not come back.
  - One Note type, in packages/core, imported everywhere. The old codebase had two
    incompatible shapes and nothing mapping between them, so every per-note action was
    silently broken. Do not recreate that.
  - userId comes from the Cognito JWT claims.sub, never from a request body. Every
    handler asserts ownership; another user's note is a 403.
  - Accessibility is a build constraint from day one, not a Phase 3 retrofit. Keyboard
    operable, visible focus, accessible name — on everything.
  - Never claim a feature in the present tense unless docs/status.json says it's built.
    No efficacy claims, no WCAG conformance claim before the audit, no clinical framing.
  - Brand lavender #9b87f5 is ~2.9:1 on white: fills and large display type only.
    Use #5F49BC for all purple text and links.

A gate that fails gets reported with its output, not worked around.
Record non-obvious calls as short ADRs in docs/decisions.md.

Start with Phase 0 in BUILD.md. (Superseded: see the note at the top of this file.)
```

---

## Resuming mid-build

Replace the last line with the current phase, and add:

```
Phases 0..N-1 are complete and their acceptance criteria passed. Before continuing,
re-read BUILD.md Phase N and verify the previous phase's criteria still hold
(`npm test && npm run build`). Then continue from where the repo actually is — check
git log and docs/decisions.md rather than assuming.
```

## Things worth remembering

- **Phase 1 first, always.** It's tempting to build the product surface before auth because it demos better. Don't — retrofitting ownership onto an app full of features is a rewrite, and the predecessor codebase is the evidence.
- **The Phase 1 latency gate is doing double duty.** Report §5.4 publishes measured results (createNote 240ms avg, summarizeNote 310ms, max 590ms). Hitting it makes the dissertation's numbers reproducible instead of unverifiable. If it fails, that's a real finding — write it down rather than moving the goalposts.
- **Two Phase 2 items are ports, not builds.** `public_website/src/components/FocusMode.tsx` and `src/context/PreferencesContext.tsx` are finished and genuinely accessible. Reviewing them beats rewriting them.
- **Open action:** check the domain and trademark for "Clarity" before `apps/site` goes live. A name gets expensive to change once the marketing site is indexed.
