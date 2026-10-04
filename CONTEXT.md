# CONTEXT.md — Clarity

**The founder's brief.** What Clarity is, who it's for, the rules it must obey, the decisions that are already settled, and what may and may not be said about it in public.

Companion docs:
- [ENGINEERING.md](ENGINEERING.md) — the engineering map. Architecture, data contract, commands, inherited bugs.
- [BUILD.md](BUILD.md) — the phased build spec with acceptance criteria.
- [KICKOFF.md](KICKOFF.md) — the short prompt for starting or resuming a session.

**Sources of record.** `docs/research-report.pdf` — *"Creating a Cloud-Based Note-Taking System for People with ADHD: Improving Accessibility with Neurodiverse-Centred Design and AI"* (60pp). Claims marked **[report]** trace to it with a section number. Claims marked **[code]** were verified against the two source repositories on 2026-08-10.

**This document has no open questions.** Every decision that was previously open is answered in §4 with its rationale. If you find yourself weighing an alternative that §4 rules out, the answer is no — the reasoning is written down so it doesn't have to be re-litigated.

---

## 1. The one-paragraph version

Clarity is a cloud note-taking platform built for the way ADHD brains actually work — non-linear, burst-driven, and easily taxed by the admin work that other note apps quietly demand. Every mainstream tool (Notion, OneNote, Evernote, Apple Notes) assumes intact executive function: that you'll tag it, file it, name it well, and find it again later. That assumption *is* the product, and for someone with ADHD it is also the failure point. Clarity inverts it. Capture costs one keystroke and no decisions. Summary and action items are **computed on save, never entered**. Search matches what a note *says*, not what you happened to call it. The interface adapts to you — font, contrast, motion, focus — instead of asking you to adapt to it.

**Positioning:** *A cognitive ally, not a filing cabinet.*
**Mechanism:** *Capture was never the problem. Getting it back out was.*

Those two lines are not alternatives. The first is the **why** — it comes from the research and it is how the product is sold. The second is the **how** — it is the engineering thesis and it is what the code actually does. Marketing leads with the first; architecture is governed by the second. Any time they appear to conflict, the second wins in code and the first wins in copy.

---

## 2. Why it exists

### The problem, stated precisely

Note-taking is real-time multitasking: listen, judge importance, structure, and write — simultaneously. **[report §2.1]** For people with ADHD this stacks directly on the three functions the condition affects most: sustained attention, working memory, and executive function. The observable results are consistent:

- **Capture is all-or-nothing.** Transcribe everything or nothing, sometimes both in one session depending on where focus went. Output is unusable either way.
- **Organisation is deferred forever.** Tagging, foldering, and naming are executive-function taxes charged at the exact moment attention is lowest.
- **Retrieval fails.** Notes exist but can't be found, so the effort of taking them returns nothing. *This is the failure Clarity is named after.*
- **It's emotional, not just cognitive.** Overwhelm, frustration, and task aversion compound. Failed sessions erode confidence, which makes the next session harder. **[report §2.1.4]**

The gap in the market isn't features. It's that **the burden of adaptation sits on the user.** Neurodiverse users are made to conform to the tool. **[report §1.2]**

### Who it's for

| Segment | The moment of need | What wins them |
|---|---|---|
| **University students (primary)** | Fast lectures, no time to filter, notes unusable by revision week | Voice capture during lecture, a summary that makes revision possible |
| **Working adults with ADHD** | Back-to-back meetings, action items lost, "I know I wrote that somewhere" | Zero-ceremony capture, computed actions, search that actually finds it |
| **Late-diagnosed adults** | Trying tool after tool, each abandoned within two weeks | An interface that doesn't punish inconsistency; no streak guilt |
| **Disability services / DSA assessors (channel)** | Recommending assistive tech to students | Accessibility evidence, WCAG conformance, institutional pricing |

The last row is the commercial unlock: in the UK, Disabled Students' Allowance and workplace access schemes pay for assistive technology. That is a *procurement* channel, not a consumer funnel, and it demands evidence — an accessibility conformance statement, a defensible privacy posture, and ideally user-testing data. Build consumer, sell institutional.

### The seven design rules

These are **build constraints, not aspirations.** Any feature that violates one gets cut or reworked. Rules 1–5 are the report's own principles **[report §2.1.5]**; 6 and 7 are earned by the report but not listed as principles, and are equally binding.

1. **Simplified interfaces.** Fewer elements on screen. Visual noise is the leading cause of disengagement.
2. **Chunking and task segmentation.** Big things broken into small, obviously-completable pieces.
3. **Real-time feedback.** Progress indicators, completion states, timely nudges — behaviour reinforcement and emotional validation.
4. **Multimodal input and output.** Voice, text, audio, visual. The user picks the channel that matches their current capacity.
5. **Adaptive personalisation.** Layout, font, colour, reminder cadence — all user-controlled. Personalisation here is *cognitive empowerment*, not decoration. **[report §2.2.5.2]**
6. **Motivation without coercion.** Gamification helps ADHD users with initiation, but streaks-and-shame mechanics cause anxiety and abandonment. Opt-in, encouraging, never comparative. **[report §2.3.6]**
7. **Ethics as architecture.** Minimal data collection, plain-language consent, no invasive behavioural logging, the right to opt out of any AI feature without losing core function, a clear deletion policy. Neurodiverse users are already over-surveilled in academic and work settings. **[report §2.3.4]**

### The three product decisions that fall out of those rules

Inherited from Clarity's existing design and retained without change:

**Capture is one keystroke.** `⌘N` focuses the box, `⌘↵` saves. Nothing to name, nothing to file, no folder to choose. A title is derived from the first line if you don't give one. Anything that adds friction to writing something down gets cut. *(Rules 1, 2.)*

**Summary and actions are computed, never entered.** Both are recomputed on every write, so there is one source of truth for what a note says and they cannot drift from it. Doing it on write rather than on read means the work happens once per edit instead of once per search. *(Rules 2, 3.)*

**Search matches the note, not the filename.** TF-IDF with cosine similarity over title and body. The inverse document frequency is the part that earns its place: a word appearing in every note tells you nothing about which note you want, so it is weighted down automatically as the collection grows. Searching *"why was the page slow"* finds a note titled *"Why the dashboard felt slow"* without those words having to line up. *(This is the direct answer to the retrieval failure in §2.)*

---

## 3. Where this comes from

Clarity is a merge of three things. Knowing which part came from where prevents re-deriving decisions and prevents reproducing bugs.

| Source | Contributes | Do not carry over |
|---|---|---|
| **`clarity` repo** (github.com/PeterFasae/clarity) | `shared/retrieval.js` — pure, dependency-free, **25 passing tests**. Extractive `summarise()`, pattern-based `extractActions()`, TF-IDF `search()`. The compute-on-write rule. The one-keystroke capture model. The store-as-a-seam handler style. | The in-memory `Map` store. No auth. No accessibility layer. |
| **`adhd-notetaker-system`** (Focus Flow Notes) | The ADHD positioning and audience research. The design tokens and type scale. The finished marketing site, including working `FocusMode.tsx` and `PreferencesContext.tsx`. The shadcn/Tailwind component base. | Every bug in ENGINEERING.md §"Inherited bugs". `node-summarizer`. `default-user`. The `_id`/`id` mismatch. |
| **`docs/research-report.pdf`** | The evidence base. The seven design rules. The AWS architecture (§3.3, §4.2). The endpoint table (§4.5). The published performance results (§5.4). | The MUI/Redux/Axios frontend stack — superseded by shadcn/Tailwind/Context, which suits a low-stimulation aesthetic better. |

**The most important consequence:** three separate summarisation implementations existed across these sources (`node-summarizer` in the old Lambda, `public_website/src/lib/summarize.ts`, and `retrieval.js`). Only one is tested. `packages/retrieval` is now the **single** implementation, imported by the API, the app, and the marketing site. Do not add a fourth.

---

## 4. The eight settled decisions

Each of these was an open question. Each is now closed. The rationale is recorded so it doesn't get reopened by accident.

### 4.1 — Name and thesis: **Clarity**, with the ADHD framing kept

The product is Clarity. The positioning stays explicitly ADHD and neurodiverse-centred; retrieval is the *mechanism*, not the pitch. See §1 for how the two lines divide between copy and code.

*Rules out:* "Focus Flow Notes" anywhere in shipped code, copy, or config. Any framing that drops the ADHD audience to become a generic notes app.
*Action item:* domain and trademark check before the marketing site goes live — the site is where a name becomes expensive to change.

### 4.2 — Purpose: **a real product with real users**

Not a portfolio piece. This ships publicly and holds other people's data.

*Consequences, all mandatory:* real authentication, ownership enforcement on every handler, GDPR export and deletion, CORS locked to known origins, request validation, least-privilege IAM. None of these are deferrable.

### 4.3 — Merge shape: **npm workspaces monorepo, Clarity at the core**

One repository. `packages/retrieval` holds the tested engine verbatim; `packages/core` holds the canonical types; `services/api`, `apps/web` and `apps/site` consume them.

*Why this over rebuilding fresh:* it preserves the 25 tests unmodified, and it makes `retrieval.js` importable by the API, the product app *and* the marketing site — which collapses the three-summariser duplication in a single move. The marketing site's live demo then runs the *actual* production summariser, so the demo cannot drift from the product.

*Rules out:* keeping three unrelated npm projects; a second copy of any retrieval logic.

### 4.4 — Backend: **AWS Lambda + DynamoDB + Cognito**

> **Updated 3 October 2026.** The stack stands. The region is now Europe (London), `eu-west-2` ([ADR 0005](docs/adr/0005-london-region.md)), and the tooling is AWS CDK v2 in TypeScript on Node.js 24 ([ADR 0006](docs/adr/0006-cdk-typescript-node24.md)), replacing the Serverless Framework v3 and `eu-north-1` setup this section was written around.

Exactly the architecture the research report describes. **[report §3.3, §4.2, §4.3]**

*Why:* the report documents this stack as the deployed system and publishes measured results against it. Building it makes the dissertation **true** rather than something that has to be amended. It also fits the institutional/DSA story, where an AWS-native, IAM-isolated, encrypted-at-rest posture is easier to procure against.

*Rules out:* MongoDB Atlas (what the old backend actually used); the in-memory `Map`; a single Express service.
*Accepted cost:* cold starts (report §4.6 names this; mitigate with provisioned concurrency on the hot paths), and DynamoDB's lack of text search — addressed in 4.6.

### 4.5 — AI: **deterministic by default, Claude behind a per-user opt-in flag**

`packages/retrieval` is the default engine and the offline/privacy fallback. An LLM provider sits behind a per-user preference, **default off**, for abstractive summaries, suggested tags, and smarter action extraction.

*Why:* the report itself anticipates exactly this — §4.4 proposes "a transformer model like BART or GPT through a feature flag" — and §4.6 concedes that frequency-based summarisation "performs best with well-structured content" while "users with free-form ADHD writing posed parsing difficulties." That is precisely the input this product receives. So the local engine alone is not good enough, and an LLM alone breaks rule 7.

*The point:* the choice between them **is** the privacy story, not a compromise of it. A user who never turns the flag on has genuinely never had a note leave the system. That is a claim worth being able to make.

*Rules out:* `node-summarizer` (superseded, untested, and the source of the §4.6 complaint). Any AI feature that is on by default. Any AI feature whose absence breaks core function.

### 4.6 — Search: **in-Lambda scoring over the user's own notes**

`getNotes` queries the `UserIdIndex` GSI with a projection, runs `search()` inside the Lambda, and hydrates the top N.

*Why:* it keeps `packages/retrieval` as the single tested source of truth for relevance, and it honours the GSI design the report already specifies **[report §4.3C]**. TF-IDF needs the corpus to compute inverse document frequency; scoping the "corpus" to one user's notes is both correct (relevance is personal) and bounded.

*Known ceiling:* comfortable to roughly 1–2k notes per user. The upgrade path — a term→noteIds inverted-index table written on save — is documented in ENGINEERING.md and deliberately **not built yet**. The `search()` signature takes notes and returns scored hits precisely so the scorer can be swapped without touching callers.

*Rules out:* OpenSearch (cost and a second service to secure, for a problem we don't have yet); embeddings (drops the deterministic guarantee and adds a per-write inference cost).

### 4.7 — Scope: **four phases with hard gates**

Phase 0 merge and scaffold → Phase 1 data, auth, API → Phase 2 the ADHD product layer → Phase 3 trust, AI, launch. Each has written acceptance criteria in BUILD.md. **A phase does not begin until the previous phase's criteria pass.**

*Why:* it survives context compaction, it makes partial progress reviewable, and it prevents the classic failure where an unauthenticated app accumulates features and auth becomes a rewrite.

### 4.8 — Deliverable form: **committed docs, not a mega-prompt**

Vision, architecture and spec live in version-controlled markdown in the repo. Sessions start from KICKOFF.md, which points at them.

*Why:* context docs can be re-read after compaction; a single long prompt degrades silently as a session grows.

---

## 5. What the merge resolves

The old brief carried a P0–P3 backlog. This is what the merge decision does to it — much of it is now a *port* or an *import* rather than a build.

| Old backlog item | Status under the merge |
|---|---|
| P0 #1 — Fix the `_id`/`id`, `isPinned`/`pinned` data contract | **Structurally eliminated.** One `Note` type in `packages/core`, imported by every consumer. Drift becomes a compile error. |
| P0 #2 — Fix summarisation overwriting note content | **Eliminated by design.** Compute-on-write puts summary and actions in their own fields; `content` is never written by the summariser. |
| P0 #3 — Authentication and ownership | **Phase 1.** Cognito user pool + JWT authorizer; `userId` from `claims.sub`; ownership assertion in every handler. |
| P0 #4 — Lock down the API | **Phase 1.** CORS to known origins, zod validation, per-function least-privilege IAM. **[report §4.3E]** |
| P0 #5 — Server-side search and pagination | **Already written.** `packages/retrieval` `search()` + GSI query + cursor pagination via `ExclusiveStartKey`. **[report §4.3C]** |
| P1 #6 — Focus mode | **A port, not a build.** `public_website/src/components/FocusMode.tsx` is complete and accessible: Esc to exit, focus trap, focus restoration, `inert` backdrop, `aria-live` announcements, reduced-motion path. |
| P1 #7 — Accessibility settings, persisted | **A port plus a sync.** `public_website/src/context/PreferencesContext.tsx` handles theme/font/motion against `localStorage` with no cookies. Add server persistence so settings follow the user across devices. **[report §2.2.5.1]** |
| P1 #8 — Real WCAG 2.1 AA pass | **Phase 3, with a known defect to fix first:** brand lavender `#9b87f5` on white measures ≈2.9:1, and even `#7c69d4` only ≈4.35:1 — both under the 4.5:1 AA floor for body text. Use `lavender-ink #5F49BC` (≈6.7:1) for all purple text and links; reserve `#9b87f5` for fills and large display type. |
| P1 #9 — Reminders | **Phase 2.** The field exists in the model and has never been wired. |
| P1 #10 — Test infrastructure | **Partly solved.** 25 tests arrive with `packages/retrieval`. Phase 1 adds API integration tests; Phase 3 adds axe in CI. |
| P2 #11 — Better AI | **Decision 4.5.** Provider seam with local default and Claude opt-in. |
| P2 #12–15, P3 #16–19 | Unchanged and still ahead: real transcription, offline-first, PWA, sharing UI, collaborative editing, non-punitive motivation, integrations, and user research with actual ADHD users. |

**The honest read:** the merge converts the two hardest unbuilt items (search, and a defensible AI story) into imports, and two flagship UI items (focus mode, preferences) into ports. What genuinely remains to build is auth, the AWS data layer, and the product surface that ties it together.

---

## 6. Claims discipline

This governs the marketing site, the accessibility statement, and any institutional or DSA conversation. It is not optional politeness — several of these are regulated claims.

**Safe to say:**
- Built on published research in neurodiverse-centred design, universal design for learning, and assistive technology.
- Designed around documented ADHD cognitive patterns.
- Accessibility-first architecture; WCAG 2.1 AA is the target, with an honest published record of where we currently are.
- Privacy-preserving by design: minimal collection, no behavioural profiling, exportable and deletable.
- Summarisation, action extraction and search run locally and deterministically by default, with **no third-party API involved unless the user turns AI assistance on.**

**Not safe to say:**
- Any efficacy or outcome claim ("improves recall by X%", "helps you focus better").
- WCAG conformance, until the Phase 3 audit has actually run.
- "Tested with ADHD users" — the report explicitly names limited user testing as its headline limitation.
- Any clinical or therapeutic benefit. This is a productivity tool, not a treatment.
- Unqualified "your notes never leave your device" — **false once the AI flag is on.** The claim must always carry the condition.

**How the unsafe claims become safe:** run the Phase 3 accessibility audit, and run a user study with a diverse ADHD cohort. Both convert directly into marketable evidence, and the second is what turns this from a well-argued product into a validated one.

**Enforcement:** `docs/status.json` is the single registry of what is built, in progress, or planned. Both the app and the marketing site read it. No public copy may describe a feature in the present tense unless its status is `built`. This is what stops "Coming soon" labels from rotting after a feature ships or slips.

---

## 7. Explicitly out of scope

Emotion sensing via camera, EEG neurofeedback, and typing-pattern affect detection appear in the report as research directions **[report §2.3.5]**. They are ethically heavy, hard to do well, and would poison the privacy story that rule 7 depends on. **Park them. Say nothing about them publicly.**

---

## 8. The public website

> *Goal: someone with ADHD lands on this page and thinks "oh — this one was built by someone who gets it," within eight seconds and without scrolling.*

Lives at `apps/site`. Standalone, statically renderable, **no backend dependency** — an API outage must not break the marketing site.

### Three jobs, in priority order

1. **Recognition.** Name the visitor's daily experience so precisely that they feel seen. This converts harder than any feature list.
2. **Proof.** Show the product working — a live, touchable demo in the page, not screenshots.
3. **Credibility.** Research-grounded, accessibility-serious, privacy-clean. This is what unlocks institutional conversations.

Conversion goal at launch is an **email waitlist**, not signup. "In development, built openly" is an asset with this audience, not a liability.

### The core insight to design around

This is a marketing page for people who bounce off marketing pages, so **the site must itself obey the seven rules. The website is the first demo of the product.** If it's a dense, animated, popup-riddled, scroll-jacked SaaS template, the pitch is dead before they read a word.

Concretely: no carousels, no auto-playing motion, no scroll hijacking, no exit-intent modal, no cookie wall, no chat bubble. One clear action per screen. Generous whitespace — roughly double a conventional SaaS page. Short lines, measure capped around 65 characters.

### Narrative arc

```
Recognition  →  Reframe  →  Proof  →  Substance  →  Trust  →  Invitation
"that's me"     "not your    "watch    "here's how   "who's    "join the
                 fault"       it work"  it works"     behind"   waitlist"
```

### Pages

- **`/`** — the full arc, seven sections.
- **`/how-it-works`** — deeper walkthrough for people who need detail before committing.
- **`/accessibility`** — the conformance statement. What's supported, what isn't yet, how to report a barrier. Real, not boilerplate. This page is a sales asset.
- **`/research`** — plain-language summary of the report plus citations. Signals seriousness to institutions.
- **`/privacy`** — plain language first, legal text second. What's collected, why, and what isn't. *"We don't track your attention"* is a feature; say it out loud. Must also state plainly what changes when AI assistance is switched on.
- **`/blog`** — later. Building-in-public plus ADHD-productivity content is the organic acquisition channel.

### Home, section by section

**1 · Hero.** Nothing above the fold but a headline, one line of support, one button, one calm visual.

> # Notes that don't ask you to be organised first.
> Clarity is a note-taking app for ADHD brains. Speak or type, and it handles the summarising, sorting, and remembering — so capturing a thought costs you nothing.
>
> **[ Join the waitlist ]** · *Free while in development. No card, no spam.*

Headlines worth testing: *"Your brain isn't the problem. Your notes app is."* · *"Capture the thought. We'll do the filing."* · *"Everything you wrote down, findable again."*

**2 · Recognition — the four cards.** One lived moment each, in the user's own voice. The highest-value section on the page; write it with care. 2×2 grid, generous padding, muted fills, no icons competing with the words.

> **"I wrote it down. I have no idea where."** — Notes exist. Retrieval doesn't. So the effort bought you nothing.
> **"I either transcribe everything or nothing."** — Filtering in real time takes the exact bandwidth the lecture is already using.
> **"I'll tag it later." (Never tags it.)** — Every app charges an organisation tax at the moment you have least to spend.
> **"I've tried eleven apps."** — They all assumed you'd meet them halfway. Then quietly blamed you.

Optional quiet line beneath: *Sound familiar? You're describing executive function, not laziness.*

**3 · Reframe — the thesis.** One centred paragraph, big type, lots of air.

> Most note apps are filing cabinets. They work beautifully — if you already have the focus to file.
>
> ADHD doesn't work like that. Attention arrives in bursts, thinking runs sideways, and the admin work is exactly what falls off. So we built the opposite: **capture with no ceremony, and let the software do the organising.**
>
> Not a tool you have to keep up with. A tool that keeps up with you.

**4 · Proof — the interactive demo.** The centrepiece. A working thing on the page, running entirely client-side, importing `packages/retrieval` so **the demo is the real engine**. Three tabs:

- **Speak it.** A real mic button. The visitor talks; live transcript appears (Web Speech API: the browser's own recognition, which in Chrome can use an online speech service, so the page must say the audio may leave the device). Nothing else on this page converts as hard as watching your own voice become text. *Unsupported browsers get a "play sample" button that types a pre-recorded transcript at natural speed — never show a broken mic.*
- **Find it.** A small seeded set of messy notes and a search box. The visitor types something that doesn't match any title, and the right note comes back. **This is the thesis, demonstrated.** Show the match score.
- **Focus mode.** Click, and the entire page — nav, sections, footer — fades to one note on a calm field. Click again, it returns. Demonstrating focus mode *by doing it to the marketing page* is the most memorable moment available to this site.

A summarise view can sit alongside, showing the condensed version **beside** the original rather than replacing it — which visually communicates the principle: *you never lose your words.*

**5 · Substance — how it works.** Four blocks, verb-first headings, one idea each.

| Heading | Body |
|---|---|
| **Capture however your brain is working today** | Voice, typing, or one keystroke. No title required, no folder to choose. Switch mid-thought. |
| **Let the software do the sorting** | Summaries and action items are pulled out automatically on save — every one optional, every one dismissible. It suggests. You decide. |
| **Find it again without remembering what you called it** | Search matches what the note says, not what it's named. |
| **Make the interface fit you** | Dyslexia-friendly fonts, text size, high contrast, low-stimulation mode, motion off. Set once; it follows you to every device. |

Every one of these must carry a status pulled from `docs/status.json`. **Anything not built says so.** This audience has been over-promised by every productivity tool they've abandoned; being the one that told the truth is worth more than the extra signup.

**6 · Trust.** Three quiet columns.

> **Grounded in research** — Built on published work in neurodiverse-centred design, universal design for learning, and assistive technology. → *Read the research*
> **Accessible by construction, not by patch** — Keyboard navigable, screen-reader tested, WCAG 2.1 AA as the target with an honest record of where we are. → *Accessibility statement*
> **We don't monitor you** — No attention tracking. No behavioural profiling. No selling data. Summaries and search run on our servers, not a third party's, unless you switch AI assistance on. Your notes are yours, exportable and deletable, always. → *Privacy in plain English*

Column three matters more than it looks. Every "AI productivity tool for ADHD" implies surveillance; explicitly refusing it is a differentiator, and it's consistent with rule 7.

**7 · Invitation.**

> ## Be first in.
> We're building in the open with ADHD users shaping what ships. Join the waitlist and help decide what gets built next.
>
> **[ email ] [ Join the waitlist ]** · *One email when we launch. Nothing else.*

Keep the existing optional post-signup question — *"What's the one thing every notes app gets wrong for you?"* That is the research pipeline and the copy source for v2.

### Visual language

| Token | Value | Use |
|---|---|---|
| Lavender | `#9b87f5` | Brand accent — fills, large display type, illustration. **Never body text** (≈2.9:1). |
| Lavender ink | `#5F49BC` | All purple text, links, small UI. ≈6.7:1 on white. |
| Blue-grey | `#8E9196` | Secondary text |
| Soft blue | `#D3E4FD` | Calm section fills |
| Soft green | `#F2FCE2` | Success, positive states |
| Off-white | `#F6F6F7` | Page and section backgrounds |
| Radius | `0.75rem` | Everything. Rounded reads as calm. |

**Type:** Atkinson Hyperlegible as the default face — designed for low-vision legibility, and it reads as an accessibility signal to anyone who recognises it. OpenDyslexic available as a user toggle. Body 18px minimum, line-height 1.7, measure ~65 characters. Both fonts are already self-hosted in `public/fonts/`.

**Motion:** slow, low-amplitude, purposeful. One entrance animation per section, ≤300ms, ease-out. Nothing looping, nothing parallax, nothing scroll-hijacked. Full `prefers-reduced-motion` support **plus a visible reduce-motion toggle** — a visitor whose OS setting isn't configured still deserves the option, and showing the toggle is itself part of the pitch.

**Imagery:** abstract, soft, low-contrast shapes. No stock photos of frustrated students holding their heads — that framing is patronising and this audience reads it instantly.

### What the website must not do

- Claim WCAG conformance before the audit. Say *"WCAG 2.1 AA is our standard — here's where we currently are"* and link the honest statement.
- Imply clinical or therapeutic benefit. No outcome statistics, no medical framing.
- Describe unbuilt features in the present tense. Check `docs/status.json`.
- Use ADHD as decoration — no scattered-brain graphics, no lightning bolts, no "squirrel!" jokes. The tone is *respectful and matter-of-fact*, written by someone who assumes competence.
- Deploy a cookie banner. Don't set the cookies that would require one.
