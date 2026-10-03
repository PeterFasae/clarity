# Clarity

A cloud note-taking platform for people with ADHD.

Every note app assumes intact executive function — that you'll tag it, file it,
name it well, and find it again. For someone with ADHD that assumption is the
failure point, so Clarity inverts it: capture costs one keystroke and no
decisions, summary and action items are computed on save rather than entered,
and search matches what a note *says* rather than what you called it.

*A cognitive ally, not a filing cabinet.* Capture was never the problem — getting
it back out was.

> **In development.** Nothing here is finished software yet.
> [`docs/status.json`](docs/status.json) is the registry of what actually exists,
> and no public copy may describe a feature in the present tense unless that file
> says it's `built`.
>
> Phases 0–3 are built locally and nothing has been deployed yet. The current
> plan is [`docs/plan/backend-roadmap.md`](docs/plan/backend-roadmap.md), the
> target design is [`docs/plan/backend-architecture.md`](docs/plan/backend-architecture.md),
> and decisions are recorded in [`docs/decision-log.md`](docs/decision-log.md).

## Running it

```bash
npm install
npm test                     # 243 tests; the retrieval engine's 25 must stay green
npm run build                # typecheck + build every workspace

npm run dev -w apps/web            # the product SPA     → :8080
npm run dev -w apps/site           # the marketing site  → :8081
npm run dev:local -w services/api  # the whole API, local → :3000/dev
```

`dev:local` raises DynamoDB Local alongside `serverless offline`, so the API
runs with nothing deployed. It needs Java, and a one-off
`npm run dynamo:install -w services/api` to fetch the database (~64MB,
gitignored). `npm run dev -w services/api` is the same server pointed at real
AWS tables instead.

## Layout

```
packages/retrieval   summarise, extractActions, search — pure ESM, no deps, 25 tests
packages/core        the canonical Note, Preferences and API contract
services/api         Lambda + DynamoDB + Cognito
apps/web             the product SPA
apps/site            the marketing site — imports the engine, so its demo is the real thing
docs/                the research report, the ADRs, the feature-status registry
```

`packages/retrieval` is imported by all three consumers, which is the point:
one implementation of relevance and summarisation, one test suite, no drift
between what the demo shows and what the product does.

## Docs

| | |
|---|---|
| [CONTEXT.md](CONTEXT.md) | What it is and why. The seven design rules, the eight settled decisions, claims discipline, the website spec. |
| [ENGINEERING.md](ENGINEERING.md) | The engineering map. Workspace layout, the data contract, API routes, the inherited bugs not to reproduce. |
| [BUILD.md](BUILD.md) | The phased spec and its acceptance criteria. |
| [docs/decisions.md](docs/decisions.md) | ADRs for the non-obvious calls. |
| [docs/status.json](docs/status.json) | What is built, in progress, or planned. |

## Honest limits

Summarisation is **extractive** — it scores each sentence by how much of the
note's own vocabulary it carries and keeps the best few in their original order.
It cannot invent a fact that was not in the note, which for a notes app matters
more than fluency. Search is **lexical similarity**, not embeddings: it will not
connect "invoice" to "billing" unless both words appear. Action extraction is
**pattern-based** (`TODO:`, `- [ ]`, "I need to…", "Remember to…"), so it is
predictable — you can learn what it will pick up. An optional LLM path sits
behind a per-user flag that is off by default.
