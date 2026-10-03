# Neurodiversity evidence base

**Researched: 2 October 2026.** This is the evidence Clarity's backend is designed against. Every capability in [`docs/plan/backend-roadmap.md`](../plan/backend-roadmap.md) cites an evidence ID from this file (E1–E12). If a feature cannot point at one, it has to justify itself some other way, or it does not get built.

It also governs what may be said in public. Section 5 lists claims that the evidence does **not** support, and section 6 maps each capability to the claim it does support.

The research report (`docs/research-report.pdf`) remains the source of record for the original design rules. This file adds what the report's literature review did not cover: the core ADHD cognitive science, learning science, the cognitive-accessibility standards, and the claims that turn out to be myths.

---

## How to read the strength labels

| Label | Meaning |
|---|---|
| **Strong** | Meta-analysis or systematic review in a relevant population |
| **Moderate** | Several experiments or an RCT, in a relevant population |
| **Emerging** | One study, a lab task, or a non-ADHD population. A plausible mechanism, not a guarantee |
| **Practice** | A standard or guideline. It tells us how to build, not that an outcome will follow |

Much of the timing and prospective-memory research was done with children. Notification research mostly uses general populations. Clarity designs on the mechanism and then measures the result in the pilot (section 7). It never assumes the result.

---

## 1. Who Clarity is for, and why now (UK)

- **Adult ADHD is common and under-recognised.** Meta-analyses put adult prevalence at 2–3%. Recorded diagnoses in England are far lower: 0.74% of men and 0.20% of women. ([NHS England ADHD Taskforce, Part 1, 2025](https://www.england.nhs.uk/long-read/report-of-the-independent-adhd-taskforce-part-1/))
- **People wait years for assessment.** Waits run "up to 8+ years for adults". In September 2025 "up to 700,123 people" may have been waiting for an ADHD assessment. ([Taskforce](https://www.england.nhs.uk/long-read/report-of-the-independent-adhd-taskforce-part-1/); [NHS England Digital, ADHD Management Information, Nov 2025](https://digital.nhs.uk/data-and-information/publications/statistical/mi-adhd/november-2025))
- **Support should not need a diagnosis.** The Taskforce says support should be "needs-led" and should "not rely on or require clinician provided diagnosis." **Design consequence: Clarity never asks for, stores, or depends on a diagnosis.** Anyone who finds it useful can use it.
- **Students.** One in five UK higher-education students disclosed a disability in 2022/23. Learning differences such as dyslexia, dyspraxia and ADHD were the largest group, at nearly 140,000 students. ([Times Higher Education, reporting HESA data](https://www.timeshighereducation.com/news/fifth-uk-students-report-disability-true-total-likely-higher))
- **Conditions overlap.** About 28% of autistic people also have ADHD ([Lai et al., 2019, *Lancet Psychiatry*](https://www.thelancet.com/journals/lanpsy/article/PIIS2215-0366(19)30289-5/abstract)). Dyslexia and developmental coordination disorder (dyspraxia) also frequently co-occur with ADHD. **Design consequence: ADHD-first, not ADHD-only.** Section 3 covers the co-occurring needs.

---

## 2. The cognitive profile, and what it means for the backend

| ID | Need | What the research shows | Strength | What the backend must do |
|---|---|---|---|---|
| **E1** | **Time perception ("time blindness")** | A meta-analysis of 55 studies found consistent timing deficits in ADHD. The effect is medium for duration discrimination and reproduction, small-to-medium for estimation, and small for production ([Marx et al., 2021, *JAACAP*](https://www.jaacap.org/article/S0890-8567(21)02045-1/fulltext); [summary](https://www.adhdevidence.org/blog/time-blindness-found-to-be-a-consistent-feature-of-adhd)) | Strong | Put time outside the person's head. Store absolute UTC times plus the user's IANA timezone. Accept relative times ("in 20 minutes", "tomorrow morning") against anchors the user sets. Return fields a client can render as "in 2 hours". Never assume the user is watching the clock. |
| **E2** | **Prospective memory** (remembering to do something later) | Time-based intentions are typically harder than event-based ones in ADHD, because event cues do some of the work ([Talbot, Müller & Kerns, 2018 review, children](https://www.researchgate.net/publication/320662319_Prospective_memory_in_children_with_attention_deficit_hyperactivity_disorder_a_review); [CHADD summary](https://chadd.org/adhd-news/adhd-news-adults/attention-monthly-remembering-the-future-how-adhd-affects-prospective-memory/)). External reminders lifted lab accuracy from about 52–60% to 94–98% ([Gilbert, 2020](https://pubmed.ncbi.nlm.nih.gov/31448938/)). A single lab experiment with 320 undergraduates, not an ADHD sample, **suggests** that once reminders have proved reliable, people may stop rehearsing the intention themselves, and that when a trusted reminder is then unexpectedly withdrawn, performance can fall below baseline ([Dupre & Ball, 2026, *Psychonomic Bulletin & Review*](https://pmc.ncbi.nlm.nih.gov/articles/PMC13486017/)). It has not been replicated, or tested with ADHD users or in everyday use, so treat it as a hypothesis. Episodic future thinking improved everyday prospective memory in adults with ADHD ([Altgassen, Heinrich & Edel, 2026](https://doi.org/10.1177/10870547261416467)) | Moderate for the benefit of reminders; Emerging for the trust effect | **Reliability is the feature.** Reminders are scheduled on the server, never in a browser tab. Each one records an honest state: a push service accepting it is not delivery (RFC 8030). Time-critical reminders ask the device to confirm, and fall back to email if it doesn't. A reminder no channel accepted is visible to the user, never silent. Support event-based triggers ("next time I open Clarity") alongside time-based ones, and store implementation-intention fields ("When ___, I will ___"). |
| **E3** | **Working memory** | Working-memory deficits persist into adulthood, both verbal and visuospatial ([Alderson et al., 2013, meta-analysis, *Neuropsychology*](https://pubmed.ncbi.nlm.nih.gov/23688211/)) | Strong | Capture must never require holding something in mind while navigating. Persist every input as soon as it is received. No multi-step forms, no required fields beyond the text itself. A draft never disappears because a session expired. |
| **E4** | **Task initiation and procrastination** | Across 11 studies (N = 2,788), ADHD symptoms were consistently linked with procrastination (r ≈ .42–.51), with inattention the strongest correlate ([Suriano, 2026, systematic review](https://www.sciencedirect.com/science/article/pii/S089142222600137X)). If-then plans ("implementation intentions") improved response inhibition in children with ADHD ([Gawrilow & Gollwitzer, 2008](https://www.socmot.uni-konstanz.de/publications/implementation-intentions-facilitate-response-inhibition-adhd-children)) | Strong (link) / Emerging (intervention) | Actions can carry a "first tiny step" and an if-then cue. Deterministic prompts ("What is the very first physical thing you'd do?") work with no AI. AI task breakdown is optional and never required. |
| **E5** | **Interruptions and notifications** | Two weeks with notifications on raised inattention (d = .44) and hyperactivity (d = .45) compared with notifications off ([Kushlev, Proulx & Dunn, 2016, CHI, N = 221](https://dl.acm.org/doi/10.1145/2858036.2858359)). Batching notifications three times a day lowered stress (d = 0.56) and raised perceived productivity (d = 0.57) and control. Switching notifications off entirely *raised* anxiety through fear of missing out (d = 0.59) ([Fitz et al., 2019, *Computers in Human Behavior*, N = 237](https://www.kushlev.com/s/2019-Fitz-Kushlev-etal-2019.pdf)). Interrupted people finish faster but with more stress, frustration and effort ([Mark, Gudith & Klocke, 2008](https://dl.acm.org/doi/10.1145/1357054.1357072)) | Moderate | **An attention budget, not more notifications.** One notification service is the only way anything reaches the user. Non-urgent items default to batched digests. Interruptive pushes are capped per day, and quiet hours are respected in the user's timezone. Nothing goes silent without the user knowing. Every limit is user-tunable. |
| **E6** | **Emotion regulation** | Across 13 studies (2,535 participants), adults with ADHD showed markedly higher emotion dysregulation, Hedges' g = 1.17 ([Beheshti et al., 2020, *BMC Psychiatry*](https://pmc.ncbi.nlm.nih.gov/articles/PMC7069054/)) | Strong | No shame mechanics. That means no streaks, overdue counters, walls of missed reminders or red badge totals. Missed items roll into one calm line in the next digest. Notification and error wording is reviewed for blame. |
| **E7** | **Spontaneous thought** | Excessive mind-wandering is associated with ADHD and with impairment ([Mowlem et al., 2019, *J Atten Disord*](https://www.researchgate.net/publication/303781857_Validation_of_the_Mind_Excessively_Wandering_Scale_and_the_Relationship_of_Mind_Wandering_to_Impairment_in_Adult_ADHD)) | Moderate | Thoughts arrive when they arrive, so capture from wherever they appear: quick capture, email-in, share sheet, voice. All channels feed one capture command. Capture is never blocked by the network, by AI, or by organisation. |
| **E8** | **Re-finding** | In 345 users and more than 85,000 re-finding operations, people who filed email into folders were *no more successful* at finding it again, and slightly slower, than people who searched and scrolled ([Whittaker, Matthews et al., 2011, CHI](https://www.semanticscholar.org/paper/Am-I-wasting-my-time-organizing-email:-a-study-of-Whittaker-Matthews/b946e48d2d4872631e7245f67d5cd5f954b7c6a7)) | Moderate | Organising is never a prerequisite for finding. Invest in search instead: typo-tolerant, phonetic, and eventually meaning-based. Structure is computed rather than demanded. This is the evidence behind Clarity's "getting it back out" thesis. |
| **E9** | **Learning, not just storing** | Practice testing and spaced practice rated *high* utility. Summarisation, highlighting and rereading rated *low* ([Dunlosky et al., 2013](https://pubmed.ncbi.nlm.nih.gov/26173288/)). College students with ADHD benefit from retrieval practice as much as their peers: Knouse et al., 2016 and [2020](https://www.semanticscholar.org/paper/How-much-do-college-students-with-ADHD-benefit-from-Knouse-Rawson/457eb945dcc3caa9d15dda7bb4a562a276b82550), both replicated by [Minear et al., 2023](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2023.1186566/full). Minear also found that unmedicated students encoded less well in the first place | Strong | **A summary helps you skim. It does not help you learn.** "Remember what you learned" means retrieval prompts plus spacing. Use free recall and cloze prompts with no AI, and AI-written questions only as an opt-in. Schedule with FSRS ([open-source](https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler)), with a capped daily load. |
| **E10** | **Reviewing notes** | Reviewing notes (their "external storage" function) contributes substantially to learning ([Kobayashi, 2006, meta-analysis](https://www.researchgate.net/publication/247513702_Combined_Effects_of_Note-Taking-Reviewing_on_Learning_and_the_Enhancement_through_Interventions_A_meta-analytic_review)). Guided notes are associated with more complete notes and better quiz scores, including for students with disabilities ([Konrad, Joseph & Eveleigh, 2009, meta-analytic review](https://www.researchgate.net/publication/236799495_A_Meta-Analytic_Review_of_Guided_Notes)) | Moderate | Resurface notes so review happens without the user having to plan it. Support optional capture templates; the UI comes later and the backend stores template ids. |
| **E11** | **Predictability** (autism, anxiety, and everyone under load) | W3C COGA: "Ensure controls and content do not move unexpectedly"; "Let users control when the content moves or changes" ([COGA, 2021](https://www.w3.org/TR/coga-usable/)) | Practice | Stable ordering, never reshuffled silently. Changes made by the system, such as AI summaries or merged edits, are labelled and reversible. Nothing important changes without the user being told. |
| **E12** | **Memory-free authentication** | WCAG 2.2 SC 3.3.8 (AA): no cognitive function test, such as remembering a password, in any authentication step unless an alternative or a mechanism exists. Passkeys and email magic links satisfy it ([W3C Understanding 3.3.8](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html)). COGA: "Provide a login that does not rely on memory" | Practice | Passkeys first, an email one-time code as the fallback, and no password complexity rules. A forgotten password costs this audience far more than it costs most users. |

---

## 3. Co-occurring needs

**Dyslexia.** The [BDA Dyslexia Style Guide 2023](https://cdn.bdadyslexia.org.uk/uploads/documents/Advice/style-guide/BDA-Style-Guide-2023.pdf) recommends:
- sans-serif text at 12–14pt (16–19px);
- line spacing of 1.5;
- dark text on a light, not white, background;
- left-aligned text;
- bold rather than italics or underline;
- no continuous capitals;
- short sentences of about 60–70 characters.

Backend consequences: spelling-tolerant and phonetic search (E8), text-to-speech-friendly plain-text summaries, and plain-language error and notification copy.

**Autism.** The main needs are predictability (E11), unambiguous wording, sensory control over motion and sound, and advance notice of change. Notifications say exactly what they are about and never use vague urgency such as "Don't miss out!".

**Dyspraxia (DCD).** Reduce motor demands: voice input, keyboard-first operation, WCAG 2.2 SC 2.5.8 target size (24×24 CSS px minimum) and SC 2.5.7 (no dragging-only operations). For the backend this mostly means capture channels that need no fine motor control (voice, email, share).

**Anxiety and low mood** are common alongside all of the above. Defaults should be calm: digest over push, no counters, nothing that implies the user is behind.

---

## 4. Standards that apply

- **WCAG 2.2 AA** is the target. CONTEXT.md still says 2.1. Updating it is proposed in Phase 5 as a small ADR. The criteria that bite the backend:
  - **3.3.8** Accessible Authentication (E12).
  - **3.3.7** Redundant Entry: don't make people re-enter what they already gave you.
  - **3.2.6** Consistent Help.
  - The COGA pattern **"Avoid data loss and timeouts"**.
- **W3C COGA, *Making Content Usable for People with Cognitive and Learning Disabilities*** (W3C Group Note, 29 April 2021). Its eight objectives, and where each lands in the backend:

| COGA objective | Backend responsibility |
|---|---|
| 1. Help users understand what things are and how to use them | Stable, documented API semantics, so the client can be consistent |
| 2. Help users find what they need | Search (E8) and resurfacing (E10) |
| 3. Use clear and understandable content | A plain-language error and notification catalogue |
| 4. Help users avoid mistakes and know how to correct them | Undo, trash, version history, idempotent retries, no data loss on timeout |
| 5. Help users focus ("Limit interruptions") | The attention budget (E5) |
| 6. Ensure processes do not rely on memory | Passwordless auth (E12) and reminders (E2) |
| 7. Provide help and support | Honest status, including "we couldn't reach you about this reminder" (E2) |
| 8. Support adaptation and personalisation | Synced preferences, user-controlled notification rules |

---

## 5. Claims we must not make

| Tempting claim | Why not | What to do instead |
|---|---|---|
| "Dyslexia-friendly font that improves reading" | OpenDyslexic showed "no improvement in reading rate or accuracy", and Dyslexie "does not have the desired effect" ([International Dyslexia Association](https://dyslexiaida.org/do-special-fonts-help-people-with-dyslexia/); [Wery & Diliberto, 2017](https://pubmed.ncbi.nlm.nih.gov/26993270/)) | Offer it as a **preference** ("some people prefer it"). Never claim a benefit. |
| Bionic Reading or bolded word-starts | No reading-time benefit ([Snell, 2024, *Acta Psychologica*](https://www.researchgate.net/publication/380485238_No_Bionic_Reading_does_not_work)). A registered eye-tracking study found no gain in speed or comprehension ([2025](https://link.springer.com/article/10.3758/s13414-025-03067-w)) | Don't build it. |
| Streaks, points, badges "for motivation" | Gamification evidence in ADHD is mostly children and attention training ([meta-analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC12743074/)), not adult productivity. Loss-framed streaks collide with E6 | If ever used: opt-in, never comparative, no loss framing, never on by default. |
| "More reminders keep you on track" | Interruptions raise inattention (E5). People over-rely on reminders when underconfident ([Gilbert, 2020](https://pubmed.ncbi.nlm.nih.gov/31448938/)) | Fewer, trusted, well-timed reminders. Say so. |
| "AI that understands your ADHD brain" | No evidence. It also implies profiling, which breaks design rule 7 | AI is optional, scoped per feature, and always has a non-AI fallback. |
| "Reduces ADHD symptoms" / "manages your ADHD" | Under MHRA guidance, a product's intended purpose and claims, **including social media posts**, decide whether it is a regulated medical device ([MHRA DMHT guidance, July 2025](https://assets.publishing.service.gov.uk/media/6866572fadfe29730ea3a9d5/MHRA_guidance_on_DMHT_-_Device_characterisation_regulatory_qualification_and_classification.pdf)) | **Intended purpose:** a note-taking and personal-organisation tool designed with and for neurodivergent people. It is not for diagnosing, treating, monitoring or managing any condition. |
| "Your notes never leave our servers" | False once AI is switched on. Also false for voice: the browser speech API sends audio to a remote service by default unless on-device recognition is available ([Web Speech on-device explainer](https://github.com/WebAudio/web-speech-api/blob/main/explainers/on-device-speech-recognition.md)) | State the conditions every time. Prefer on-device recognition. |
| "Tested with ADHD users" / "proven" | Not yet | After the pilot, say exactly what was measured, with whom, and how many. |

---

## 6. Capability → evidence → what we can say

| Backend capability | Evidence | Safe public wording (once `docs/status.json` says `built`) |
|---|---|---|
| Version history, trash, undo, conflict copies | E3, E6, COGA 4 | "Nothing you write is lost by accident. Deleted notes wait in the bin for 30 days, and every version is kept." *(Use the retention numbers that are actually configured.)* |
| Idempotent, offline-tolerant capture | E3, E7 | "Capture works on bad Wi-Fi. If it didn't save, Clarity tells you, and nothing is duplicated." |
| Capture channels (quick, email, share, voice) | E7, dyspraxia | "Get a thought in from wherever you are." |
| Typo-tolerant, phonetic, meaning-based search | E8, dyslexia | "Find a note by describing it, even if you can't remember what you called it or how you spelled it." |
| Server-scheduled reminders with honest send states, device confirmation and fallback | E2 | "Reminders are sent from our servers, so they don't depend on Clarity being open. If your device doesn't confirm a time-critical reminder, Clarity emails you too, if email is on. If a reminder can't be sent at all, Clarity tells you." |
| Event-based reminders ("next time I open Clarity") | E2 | "Remind me next time I'm here." |
| Attention budget, digests, quiet hours | E5, E6 | "Clarity caps how often it interrupts you, and you set the limit." |
| Resurfacing forgotten notes | E8, E10 | "Clarity brings back notes you've forgotten, a few at a time." |
| Spaced review | E9 | "Built on retrieval practice and spacing, the two study techniques with the strongest evidence." *(Describe the technique, never an outcome for Clarity users.)* |
| Passwordless sign-in | E12 | "Sign in without remembering a password." |
| Optional AI with non-AI fallbacks | Rule 7 | "AI is off by default. When it's on, notes are processed in the UK/EU and never used for training." *(Use the processing region the ADR actually chose.)* |

---

## 7. Evaluating Clarity honestly (pilot)

The report names limited user testing as its headline limitation. The pilot is how that gets fixed, and it must be designed so it cannot overclaim.

- **Questions.** Is Clarity usable? Does it lower the workload of capturing and re-finding? Do reminders arrive and get acted on? Does notification load stay within the budget? Do people use spaced review?
- **Standard instruments.** These are short, widely used and comparable:
  - System Usability Scale (Brooke, 1996).
  - UMUX-Lite (Lewis, Utesch & Maher, 2013).
  - NASA-TLX, raw scores, for workload (Hart & Staveland, 1988).
- **Behavioural measures, computed privately.** No note content, ever.
  - Time from opening capture to a saved note.
  - Re-find success: a search followed by opening a result.
  - Reminder send states (accepted, shown on device, unconfirmed, no channel accepted) and acted-on rates.
  - Notifications per user per day against the budget.
  - Review completion.
- **Inclusion.**
  - Participants self-identify as neurodivergent; no diagnosis is required (the Taskforce's needs-led principle).
  - Pay participants.
  - Provide accessible, plain-language consent with an audio option.
  - People can withdraw at any time.
- **Ethics.** Run the study through a university ethics process (Middlesex alumni or partner academic routes) or an independent review before recruiting.
- **Scale.** 10–20 participants is right for usability and workload. It is **not** powered for efficacy, and nothing from it is reported as an outcome claim.
- **Data.**
  - Research mode is a separate, explicit opt-in, distinct from AI consent.
  - Only aggregates are reported, with small-cell suppression (k ≥ 5).
  - Research data has its own retention period and deletion path.

---

## 8. Limits of this evidence

- Timing and prospective-memory findings come largely from children and lab tasks. Adult, real-world effects may be smaller.
- The notification studies (E5) used general populations. Effects may be larger or smaller for ADHD users, and the pilot should measure this rather than assume it.
- The trusted-reminder finding in E2 comes from one lab experiment with undergraduates. It is a reason to handle reminder failures carefully, and a hypothesis for the pilot, not an established fact.
- Implementation-intention evidence in ADHD is mostly from children (E4).
- Correlations, such as ADHD and procrastination, are not causal.

The design response is the same throughout: build on the mechanism, make it optional and tunable, measure it, and claim only what was measured.
