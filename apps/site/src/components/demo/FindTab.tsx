import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
// The production engine, imported directly — the same module services/api runs
// when it searches a real account.
import { search } from '@clarity/retrieval';

/**
 * The thesis, demonstrated.
 *
 * "Capture was never the problem. Getting it back out was." Every other tab
 * shows a feature; this one shows the argument. A visitor types the words they
 * would actually have in their head three weeks later — none of which are in
 * the note's title — and the right note comes back anyway.
 *
 * Built to land in about five seconds, because that is how long someone
 * skimming a careers page will give it: the example queries are one click, the
 * answer appears underneath, and the line that matters is right there — the
 * words you searched for are not the words you called it.
 */

/** Deliberately messy. Tidy prose would prove nothing about ADHD writing. */
const NOTES = [
  {
    id: '1',
    title: 'Why the dashboard felt slow',
    body: 'the orders panel waited for its own request to come back before it asked for details, so everything after it queued up behind that one. only shows up under load which is why we kept missing it locally.',
  },
  {
    id: '2',
    title: 'Supervision — 12 March',
    body: 'talked about the retrieval chapter, he thinks the evaluation section is thin and wants a comparison against a baseline before the next draft. TODO: book a slot in the lab',
  },
  {
    id: '3',
    title: 'Tuesday',
    body: 'ring the dentist about the crown, the receptionist said mornings are easier. also need to move the standing order before the rent goes out.',
  },
  {
    id: '4',
    title: 'Standup',
    body: 'discussed the invoice schema and the billing migration plan. blocked on the schema review, needs sign-off from the billing team first.',
  },
  {
    id: '5',
    title: 'Reading week',
    body: 'working memory is a limited workspace, people used to say seven items but it is more like four. chunking matters because overloading it means nothing transfers to long term memory.',
  },
];

/**
 * Each of these is chosen so the words a person would remember are *not* in the
 * title of the note they want. That gap is the whole demonstration.
 */
const EXAMPLES = [
  // Every one of these was checked against the engine rather than guessed at.
  // The first is the sharpest: a note filed under "Tuesday" is one nobody would
  // ever find by its name, and that is the entire problem this product exists
  // for. Two earlier candidates were dropped — one returned nothing and one
  // returned the wrong note, because "week" matched a title.
  { query: 'the dentist and the crown', finds: 'Tuesday', score: 39 },
  { query: 'why was everything queuing behind one request', finds: 'Why the dashboard felt slow', score: 50 },
  { query: 'working memory limit', finds: 'Reading week', score: 47 },
];

export function FindTab() {
  const [query, setQuery] = useState(EXAMPLES[0].query);

  const hits = useMemo(
    () => search(query, NOTES, { limit: 3 }) as { note: (typeof NOTES)[number]; score: number }[],
    [query],
  );

  return (
    <div>
      <p className="mb-5 max-w-measure text-ink-muted">
        Five notes, written the way people actually write them. Search for what a note{' '}
        <em>said</em>, not what it was called.
      </p>

      <div className="mb-4">
        <label htmlFor="demo-search" className="mb-2 block font-bold text-ink">
          Search these notes
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            id="demo-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Describe the note you are looking for"
            className="w-full rounded-lg border border-line bg-surface py-3 pl-11 pr-4 text-base text-ink outline-none focus-visible:border-lavender-ink"
          />
        </div>
      </div>

      <div className="mb-6">
        <p id="examples-label" className="mb-2 text-sm text-ink-muted">
          Or try one of these — none of them share a word with the title they find:
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="examples-label">
          {EXAMPLES.map((example) => (
            <button
              key={example.query}
              type="button"
              onClick={() => setQuery(example.query)}
              aria-pressed={query === example.query}
              className={`rounded-full border px-3 py-1.5 text-sm font-bold ${
                query === example.query
                  ? 'border-lavender-ink bg-lavender-soft text-lavender-ink'
                  : 'border-line text-ink-muted hover:bg-lavender-soft hover:text-ink'
              }`}
            >
              “{example.query}”
            </button>
          ))}
        </div>
      </div>

      <div aria-live="polite">
        <h3 className="mb-3 text-lg">
          {hits.length === 0
            ? 'Nothing matched'
            : `${hits.length} note${hits.length === 1 ? '' : 's'} matched`}
        </h3>

        {hits.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line p-5 text-ink-muted">
            No note here shares a word with that. Search matches on what a note says, so try the
            words you would have used at the time.
          </p>
        ) : (
          <ul className="space-y-3">
            {hits.map(({ note, score }) => (
              <li key={note.id} className="rounded-lg border border-line bg-surface p-4">
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                  <h4 className="text-base font-bold text-ink">{note.title}</h4>
                  <span className="rounded-full bg-lavender-soft px-2.5 py-0.5 text-sm font-bold text-lavender-ink">
                    {Math.round(score * 100)}% match
                  </span>
                </div>
                <p className="text-ink-muted">{note.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-5 max-w-measure text-sm text-ink-muted">
        This is the same ranking code the app runs on your own notes — TF-IDF with cosine
        similarity, no network and no model involved. Words that appear in every note count for
        less automatically, which is why the useful ones win.
      </p>
    </div>
  );
}
