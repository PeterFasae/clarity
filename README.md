# Clarity

A note-taking app built around getting things back out.

```bash
npm install
npm run dev     # api on :3001, web on :5174
npm test        # 25 tests on the retrieval pipeline
```

## Why I built it

My notes went in fast and never came back out. Most note apps quietly assume you will
return later and organise them, and that assumption is where the whole thing failed for
me: capture was never the problem, retrieval was.

So the design question was not "how do I store this" but "what happens when I want it
back in three weeks and cannot remember what I called it".

## The three decisions

**Capture is one keystroke.** `⌘N` focuses the box, `⌘↵` saves. Nothing to name, nothing
to file, no folder to choose. A title is derived from the first line if you do not give
one. Anything that added friction to writing something down was cut.

**Summary and actions are computed, never entered.** Both are recomputed on every write,
so there is one source of truth for what a note says and they cannot drift from it.
Doing it on write rather than on read means the work happens once per edit instead of
once per search.

**Search matches the note, not the filename.** TF-IDF with cosine similarity over the
title and body. The inverse document frequency is the part that earns its place: a word
appearing in every note tells you nothing about which note you want, so it is weighted
down automatically as the collection grows. Searching "why was the page slow" finds a
note titled "Why the dashboard felt slow" without those words having to line up.

## Architecture

```
shared/retrieval.js   summarise, extractActions, search   (pure, tested)
server/index.js       Express API over an in-memory store
src/                  React front end
```

The interesting boundary is the store. Each handler is small and stateless apart from it,
because in the deployed version each one is a Lambda behind API Gateway with DynamoDB
underneath and Cognito in front. Swapping the `Map` for a DynamoDB client does not change
the handlers. Keeping that seam honest is what made the AWS version a deployment detail
rather than a rewrite.

The retrieval module has no dependencies and no I/O, which is why it can be unit tested
rather than eyeballed. That is most of the value of the split.

## Honest limits

Summarisation is **extractive**: it scores each sentence by how much of the note's own
vocabulary it carries and keeps the best few in their original order. It cannot invent a
fact that was not in the note, which for a notes app matters more than fluency. It is not
a language model and does not paraphrase.

Search is **lexical similarity**, not embeddings. It will not connect "invoice" to
"billing" unless both words appear. The plan was always to swap the scorer for
sentence embeddings behind the same `search()` interface, which is why the signature
takes notes and returns scored hits rather than exposing the vector maths.

Action extraction is **pattern-based** (`TODO:`, `- [ ]`, "I need to…", "Remember to…"),
so it is predictable: you can learn what it will pick up. That was a deliberate choice
over something cleverer and less legible.

The stemmer is a small suffix stripper so "meeting" and "meetings" land on the same term.
It is not a morphological analyser and does not pretend to be.

## Tests

25 tests on `shared/retrieval.js`, covering tokenising, sentence splitting, summary
selection, all the action patterns, and search ranking. Two of them exist because of bugs
found while building this:

- the stemmer only stripped one suffix, so "meetings" became "meeting" and never reached
  the same term as "meeting" itself
- sentence splitting treated every newline as a sentence end, which cut hard-wrapped
  prose in half and produced summaries that read like two fragments glued together

## What this is

My own project, and the note app I use. It grew out of my final-year project at
Middlesex. This repository is the version rebuilt to be readable end to end.
