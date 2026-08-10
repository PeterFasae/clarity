import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useActions, useUpdateNote } from '@/hooks/useNotes';
import { ApiError, api } from '@/lib/api';

/**
 * Everything you said you would do, gathered from every note.
 *
 * These are derived at read time from what each note says, never stored
 * separately — which is why ticking one off is an edit to the note rather than
 * a write to a second list that then disagrees with it. Removing the line is
 * the honest way to complete it, because the line is the only record.
 */
export function Actions() {
  const actions = useActions();

  return (
    <div className="mx-auto w-full max-w-3xl p-4 lg:p-6">
      <h1>Things to do</h1>
      <p className="-mt-2 mb-6 text-muted-foreground">
        Pulled out of your notes as you wrote them. Every one links back to where it came from, so
        you can see what it was about before deciding.
      </p>

      <div aria-live="polite">
        {actions.isPending && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Gathering them up…
          </p>
        )}

        {actions.isError && (
          <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
            {actions.error instanceof ApiError
              ? actions.error.readable
              : 'Could not load your actions just now.'}{' '}
            <button type="button" onClick={() => void actions.refetch()} className="rounded font-bold underline">
              Try again
            </button>
          </p>
        )}

        {actions.isSuccess && actions.data.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6">
            <p className="font-bold">Nothing here yet, and that is fine.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Clarity picks these up from lines like <em>TODO: book the room</em>,{' '}
              <em>I need to email Sam</em>, <em>Remember to chase the invoice</em>, or a{' '}
              <code className="rounded bg-muted px-1">- [ ]</code> checkbox. Write however you
              normally would — it looks for the shapes you already use.
            </p>
          </div>
        )}

        {actions.isSuccess && actions.data.length > 0 && (
          <ul className="space-y-2">
            {actions.data.map((action) => (
              <ActionRow
                key={`${action.noteId}:${action.text}`}
                text={action.text}
                noteId={action.noteId}
                noteTitle={action.noteTitle}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ActionRow({
  text,
  noteId,
  noteTitle,
}: {
  text: string;
  noteId: string;
  noteTitle: string;
}) {
  const update = useUpdateNote();

  /**
   * Completing an action rewrites the line it came from, marking it done in the
   * note itself. That keeps one source of truth: the note still says what
   * happened, and the list simply stops showing it. The note has to be read
   * first, because this is a text edit rather than a flag.
   */
  async function complete() {
    const current = await api.getNote(noteId);
    const content = current.content
      .split('\n')
      .map((line) => (lineMatches(line, text) ? `${line}  ✓ done` : line))
      .join('\n');
    update.mutate({ id: noteId, content });
  }

  return (
    <li className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
      <input
        type="checkbox"
        id={`action-${noteId}-${slug(text)}`}
        onChange={() => { void complete(); }}
        disabled={update.isPending}
        className="mt-1 h-5 w-5 shrink-0 rounded border-input"
      />
      <div className="min-w-0 flex-1">
        <label htmlFor={`action-${noteId}-${slug(text)}`} className="block cursor-pointer">
          {text}
        </label>
        <Link
          to={`/?note=${noteId}`}
          className="mt-1 inline-block rounded text-sm text-muted-foreground underline underline-offset-2"
        >
          from “{noteTitle}”
        </Link>
      </div>
    </li>
  );
}

/** The extractor strips leading markers and trailing punctuation, so match loosely. */
function lineMatches(line: string, action: string): boolean {
  return line.toLowerCase().includes(action.toLowerCase()) && !line.includes('✓ done');
}

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
