import { Archive, ListChecks, Pin } from 'lucide-react';
import type { ScoredNote } from '@/lib/api';

/**
 * One note in a list.
 *
 * Deliberately quiet: a title, a line of what it says, and only the markers
 * that are actually true. Visual noise is the leading cause of disengagement
 * for this audience, so nothing appears here to fill space.
 */
export function NoteCard({
  note,
  selected,
  onOpen,
}: {
  note: ScoredNote;
  selected: boolean;
  onOpen: (note: ScoredNote) => void;
}) {
  // The summary if there is one — it is the better line, because it was chosen
  // for carrying the note's own vocabulary rather than for being first.
  const preview = note.summary || note.content;

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(note)}
        aria-current={selected ? 'true' : undefined}
        className={`w-full rounded-lg border p-3 text-left transition-colors ${
          selected ? 'border-primary bg-accent' : 'border-border bg-card hover:bg-accent/50'
        }`}
      >
        <div className="flex items-start gap-2">
          <h3 className="mb-0 flex-1 text-base font-bold leading-snug">{note.title}</h3>
          {note.pinned && <Pin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-label="Pinned" />}
          {note.archived && (
            <Archive className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-label="Archived" />
          )}
        </div>

        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{preview}</p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <time dateTime={note.updatedAt}>{friendlyDate(note.updatedAt)}</time>

          {note.actions.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
              {note.actions.length} to do
            </span>
          )}

          {note.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-muted px-2 py-0.5">
              {tag}
            </span>
          ))}

          {note.score !== undefined && (
            // Showing the score is a small honesty: search is ranking, not
            // magic, and seeing how strong a match is tells you whether to
            // keep reading or refine the words.
            <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-primary">
              {Math.round(note.score * 100)}% match
            </span>
          )}
        </div>
      </button>
    </li>
  );
}

/** Recent things get a relative date; older things get a real one. */
function friendlyDate(iso: string): string {
  const then = new Date(iso);
  const minutes = Math.round((Date.now() - then.getTime()) / 60_000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  if (minutes < 60 * 24 * 7) return `${Math.round(minutes / (60 * 24))}d ago`;

  return then.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
