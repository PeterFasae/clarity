import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Search, X } from 'lucide-react';
import type { NoteFilter } from '@clarity/core';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { QuickCapture } from '@/components/QuickCapture';
import { NoteCard } from '@/components/NoteCard';
import { NoteEditor } from '@/components/NoteEditor';
import { useNote, useNoteList, useNoteSearch } from '@/hooks/useNotes';
import { ApiError, type ScoredNote } from '@/lib/api';

const FILTERS: { id: NoteFilter | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pinned', label: 'Pinned' },
  { id: 'archived', label: 'Archived' },
  { id: 'shared', label: 'Shared' },
];

/**
 * The main surface: capture at the top, notes below, one open note beside them.
 *
 * Search and the filters share the list, because they are the same question
 * asked two ways. The selected note lives in the URL so that reloading, or
 * following a link from the actions view, lands you back where you were.
 */
export function Notes() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  const filter = (params.get('filter') as NoteFilter | null) ?? undefined;
  const openId = params.get('note');

  // Long enough not to fire a search per keystroke, short enough that the
  // results feel like they are following you.
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query), 250);
    return () => window.clearTimeout(id);
  }, [query]);

  const searching = debounced.trim().length > 0;
  const list = useNoteList(filter);
  const search = useNoteSearch(debounced);
  const open = useNote(openId);

  const results = useMemo<ScoredNote[]>(
    () => (searching ? (search.data?.notes ?? []) : (list.data?.notes ?? [])),
    [searching, search.data, list.data],
  );

  const active = searching ? search : list;

  function select(note: ScoredNote | null) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (note) next.set('note', note.id);
        else next.delete('note');
        return next;
      },
      { replace: true },
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 p-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:p-6">
      {/* The page's own heading. Hidden visually because a banner saying "Your
          notes" above a screen full of notes is exactly the chrome design rule 1
          asks us to remove — but a screen reader still needs somewhere to land,
          and the heading order has to start at one. */}
      <h1 className="sr-only">Your notes</h1>

      <div className="min-w-0">
        <QuickCapture />

        <div className="mt-6">
          <label htmlFor="search" className="sr-only">
            Search your notes
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Describe it — not what you called it"
              className="pl-9"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear the search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {!searching && (
            <div role="group" aria-label="Filter notes" className="mt-3 flex flex-wrap gap-2">
              {FILTERS.map((option) => {
                const selected = (filter ?? 'all') === option.id;
                return (
                  <Button
                    key={option.id}
                    type="button"
                    size="sm"
                    variant={selected ? 'default' : 'outline'}
                    aria-pressed={selected}
                    onClick={() =>
                      setParams((current) => {
                        const next = new URLSearchParams(current);
                        if (option.id === 'all') next.delete('filter');
                        else next.set('filter', option.id);
                        return next;
                      })
                    }
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>
          )}
        </div>

        {/* The live region covers the *status* only — the count, the loading
            line, an error, the empty state. It deliberately does not wrap the
            list: an aria-live region announces its entire subtree when anything
            inside it changes, so putting the <ul> in here meant every keystroke
            of a search read out every matching note in full. For an audience
            this product exists to protect from overwhelm, that is about the
            worst possible failure. The list below is a plain region a screen
            reader navigates on its own terms. */}
        <div aria-live="polite" className="mt-4">
          {active.isPending && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Looking…
            </p>
          )}

          {active.isError && (
            <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
              {active.error instanceof ApiError
                ? active.error.readable
                : 'Could not load your notes just now.'}{' '}
              <button type="button" onClick={() => void active.refetch()} className="rounded font-bold underline">
                Try again
              </button>
            </p>
          )}

          {active.isSuccess && results.length === 0 && (
            <EmptyState searching={searching} query={debounced} filter={filter} />
          )}

          {results.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {searching
                ? `${results.length} note${results.length === 1 ? '' : 's'} match “${debounced}”`
                : `${results.length} note${results.length === 1 ? '' : 's'}`}
            </p>
          )}
        </div>

        {results.length > 0 && (
          <ul aria-label={searching ? 'Search results' : 'Your notes'} className="mt-2 space-y-2">
            {results.map((note) => (
              <NoteCard key={note.id} note={note} selected={note.id === openId} onOpen={select} />
            ))}
          </ul>
        )}
      </div>

      <div className="min-w-0">
        {open.isPending && openId && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Opening…
          </p>
        )}

        {open.isError && (
          <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
            {open.error instanceof ApiError ? open.error.readable : 'Could not open that note.'}
          </p>
        )}

        {open.data ? (
          <NoteEditor note={open.data} onClose={() => select(null)} />
        ) : (
          !openId && (
            <div className="rounded-lg border border-dashed border-border p-8 text-muted-foreground">
              <p>Pick a note on the left, or write a new one above.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/**
 * Empty and no-results states, written carefully on purpose.
 *
 * A blank screen reads as personal failure to someone who has abandoned a
 * dozen note apps. Every one of these says what happened, why, and what to do
 * next — and none of them implies the user did something wrong.
 */
function EmptyState({
  searching,
  query,
  filter,
}: {
  searching: boolean;
  query: string;
  filter?: NoteFilter;
}) {
  if (searching) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6">
        <p className="font-bold">Nothing matched “{query}”.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Search looks at what your notes say, so try the words you would have used at the time
          rather than the title. Two or three is usually better than a whole sentence.
        </p>
      </div>
    );
  }

  if (filter === 'pinned') {
    return (
      <div className="rounded-lg border border-dashed border-border p-6">
        <p className="font-bold">Nothing pinned.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Pinning keeps a note at hand for a while. It is for the thing you are on this week, not
          a filing system.
        </p>
      </div>
    );
  }

  if (filter === 'archived') {
    return (
      <div className="rounded-lg border border-dashed border-border p-6">
        <p className="font-bold">Nothing archived.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Archiving moves a note out of the way without deleting it. Search still finds it.
        </p>
      </div>
    );
  }

  if (filter === 'shared') {
    return (
      <div className="rounded-lg border border-dashed border-border p-6">
        <p className="font-bold">Nothing shared.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Sharing a note with someone else is still being built.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-border p-6">
      <p className="font-bold">No notes yet.</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Write anything in the box above and press ⌘ and Enter. There is nothing to name and
        nowhere to file it — the summary, the things to do and the title all come out of what you
        wrote.
      </p>
    </div>
  );
}
